package com.civicpulse.certificateservice.service.impl;

import com.civicpulse.certificateservice.dto.*;
import com.civicpulse.certificateservice.entity.*;
import com.civicpulse.certificateservice.event.*;
import com.civicpulse.certificateservice.kafka.CertificateEventProducer;
import com.civicpulse.certificateservice.repository.CertificateRepository;
import com.civicpulse.certificateservice.service.CertificateService;
import com.civicpulse.certificateservice.util.CertificatePdfGenerator;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Service
public class CertificateServiceImpl implements CertificateService {

    private final CertificateRepository repository;
    private final CertificatePdfGenerator pdfGenerator;
    private final CertificateEventProducer eventProducer;

    private final AtomicLong appSeq;
    private final AtomicLong certSeq;

    // ── Certificate type → Department routing map ─────────────────────────────
    // This is the single source of truth for which department handles which cert.
    // When an officer logs in, only certs whose assignedDepartment matches their
    // department are returned to them by the filtered controller endpoint.
    private static final Map<CertificateType, String> TYPE_TO_DEPT = Map.of(
    CertificateType.BIRTH,            "Health Department",
    CertificateType.DEATH,            "Health Department",
    CertificateType.INCOME,           "Revenue Department",
    CertificateType.RESIDENCE,        "Revenue Department",
    CertificateType.MARRIAGE,         "Municipal Administration",
    CertificateType.TRADE_LICENSE,    "Municipal Administration",
    CertificateType.SHOP_LICENSE,     "Municipal Administration",
    CertificateType.BUILDING_PERMIT,  "Engineering Department",
    CertificateType.WATER_CONNECTION, "Water Department"
);

    public CertificateServiceImpl(CertificateRepository repository,
                                   CertificatePdfGenerator pdfGenerator,
                                   CertificateEventProducer eventProducer) {
        this.repository    = repository;
        this.pdfGenerator  = pdfGenerator;
        this.eventProducer = eventProducer;
        long appCount  = repository.count();
        long certCount = repository.countByCertificateNumberIsNotNull();
        this.appSeq  = new AtomicLong(appCount + 1);
        this.certSeq = new AtomicLong(certCount + 1);
    }

    // ── Helper: resolve department for a certificate type ─────────────────────

    public static String resolveDepartment(CertificateType type) {
        return TYPE_TO_DEPT.getOrDefault(type, "General Administration");
    }

    // ── Apply (submit new application) ────────────────────────────────────────

    @Override
    public CertificateResponse apply(CertificateRequest request, String appliedBy) {
        boolean duplicate = repository.existsActiveApplicationForType(
                request.getCitizenId(), request.getCertificateType());
        if (duplicate) {
            throw new IllegalStateException(
                    "An active application for " + request.getCertificateType()
                    + " already exists for this citizen. You can re-apply only after rejection.");
        }

        Certificate cert = new Certificate();
        cert.setApplicationNumber(generateAppNumber());
        cert.setCitizenId(request.getCitizenId());
        cert.setCitizenName(request.getCitizenName());
        cert.setCitizenAddress(request.getCitizenAddress());
        cert.setAadhaarNumber(request.getAadhaarNumber());
        cert.setCertificateType(request.getCertificateType());
        cert.setStatus(CertificateStatus.SUBMITTED);
        cert.setAppliedBy(appliedBy);
        // ── Auto-route to the correct department at submission time ──────────
        cert.setAssignedDepartment(resolveDepartment(request.getCertificateType()));

        Certificate saved = repository.save(cert);

        try {
            eventProducer.publishSubmitted(new ApplicationSubmittedEvent(
                    saved.getId(), saved.getApplicationNumber(),
                    saved.getCitizenId(), saved.getCitizenName(),
                    saved.getCertificateType().name(), saved.getStatus().name()));
        } catch (Exception e) {
            // Kafka unavailable — not critical, continue
        }

        return toResponse(saved);
    }

    // ── Verify ────────────────────────────────────────────────────────────────

    @Override
    public CertificateResponse verify(Long id, VerificationRequest request, String officerUsername) {
        Certificate cert = findOrThrow(id);
        if (cert.getStatus() != CertificateStatus.SUBMITTED
                && cert.getStatus() != CertificateStatus.UNDER_VERIFICATION) {
            throw new IllegalStateException(
                    "Can only verify SUBMITTED or UNDER_VERIFICATION applications. Current: " + cert.getStatus());
        }

        cert.setStatus(request.getVerified()
                ? CertificateStatus.VERIFIED
                : CertificateStatus.UNDER_VERIFICATION);
        cert.setVerifiedBy(officerUsername);
        cert.setVerifiedAt(LocalDateTime.now());
        if (request.getRemarks() != null) cert.setRemarks(request.getRemarks());

        Certificate saved = repository.save(cert);

        if (request.getVerified()) {
            eventProducer.publishVerified(new DocumentVerifiedEvent(
                    saved.getId(), saved.getApplicationNumber(),
                    saved.getCitizenId(), saved.getCitizenName(),
                    saved.getCertificateType().name(), saved.getStatus().name()));
        }

        return toResponse(saved);
    }

    // ── Approve ───────────────────────────────────────────────────────────────

    @Override
    public CertificateResponse approve(Long id, String officerUsername) {
        Certificate cert = findOrThrow(id);
        if (cert.getStatus() != CertificateStatus.VERIFIED) {
            throw new IllegalStateException(
                    "Only VERIFIED applications can be approved. Current: " + cert.getStatus());
        }

        cert.setStatus(CertificateStatus.APPROVED);
        cert.setDecidedBy(officerUsername);
        cert.setDecidedAt(LocalDateTime.now());

        Certificate saved = repository.save(cert);
        eventProducer.publishApproved(new CertificateApprovedEvent(
                saved.getId(), saved.getApplicationNumber(),
                saved.getCitizenId(), saved.getCitizenName(),
                saved.getCertificateType().name(), saved.getStatus().name()));

        return toResponse(saved);
    }

    // ── Reject ────────────────────────────────────────────────────────────────

    @Override
    public CertificateResponse reject(Long id, DecisionRequest request, String officerUsername) {
        Certificate cert = findOrThrow(id);
        if (cert.getStatus() == CertificateStatus.CERTIFICATE_GENERATED
                || cert.getStatus() == CertificateStatus.DOWNLOADED) {
            throw new IllegalStateException("Cannot reject an already-issued certificate.");
        }

        cert.setStatus(CertificateStatus.REJECTED);
        cert.setDecidedBy(officerUsername);
        cert.setDecidedAt(LocalDateTime.now());
        cert.setRejectionReason(request.getRejectionReason());

        return toResponse(repository.save(cert));
    }

    // ── Generate certificate PDF ──────────────────────────────────────────────

    @Override
    public CertificateResponse generate(Long id, String officerUsername) {
        Certificate cert = findOrThrow(id);
        if (cert.getStatus() != CertificateStatus.APPROVED) {
            throw new IllegalStateException("Only APPROVED applications can have certificates generated.");
        }

        cert.setStatus(CertificateStatus.CERTIFICATE_GENERATED);
        cert.setCertificateNumber(generateCertNumber(cert.getCertificateType()));
        cert.setIssuedAt(LocalDateTime.now());

        Certificate saved = repository.save(cert);

        try {
            pdfGenerator.generate(saved);
        } catch (IOException e) {
            throw new UncheckedIOException("PDF generation failed for cert " + id, e);
        }

        try {
            eventProducer.publishGenerated(new CertificateGeneratedEvent(
                    saved.getId(), saved.getApplicationNumber(),
                    saved.getCitizenId(), saved.getCitizenName(),
                    saved.getCertificateType().name(), saved.getStatus().name()));
        } catch (Exception ignored) { }

        return toResponse(saved);
    }

    // ── Download (increment count) ────────────────────────────────────────────

    @Override
    public byte[] downloadPdf(Long id) {
        Certificate cert = findOrThrow(id);
        if (cert.getStatus() != CertificateStatus.CERTIFICATE_GENERATED
                && cert.getStatus() != CertificateStatus.DOWNLOADED) {
            throw new IllegalStateException("Certificate PDF not yet available.");
        }

        cert.setDownloadCount(cert.getDownloadCount() + 1);
        cert.setStatus(CertificateStatus.DOWNLOADED);
        repository.save(cert);

        try {
            return pdfGenerator.getPdfBytes(cert);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read certificate PDF for cert " + id, e);
        }
    }

    // ── Query methods ─────────────────────────────────────────────────────────

    @Override
    public CertificateResponse getById(Long id) {
        return toResponse(findOrThrow(id));
    }

    @Override
    public List<CertificateResponse> getAll() {
        return repository.findAll().stream().map(this::toResponse).toList();
    }

    /**
     * Returns only certificates assigned to the given department.
     * Used by officers so they only see applications relevant to their dept.
     */
    @Override
    public List<CertificateResponse> getByDepartment(String department) {
        return repository.findByAssignedDepartment(department)
                .stream().map(this::toResponse).toList();
    }

    @Override
    public List<CertificateResponse> getByCitizen(Long citizenId) {
        return repository.findByCitizenId(citizenId).stream().map(this::toResponse).toList();
    }

    @Override
    public List<CertificateResponse> getPending() {
        return repository.findPendingApplications().stream().map(this::toResponse).toList();
    }

    @Override
    public List<CertificateResponse> getByStatus(CertificateStatus status) {
        return repository.findByStatus(status).stream().map(this::toResponse).toList();
    }

    @Override
    public List<CertificateResponse> getByType(CertificateType type) {
        return repository.findByCertificateType(type).stream().map(this::toResponse).toList();
    }

    @Override
    public Map<String, Long> getStats() {
        List<Certificate> all = repository.findAll();
        return Map.of(
                "total",            (long) all.size(),
                "submitted",        all.stream().filter(c -> c.getStatus() == CertificateStatus.SUBMITTED).count(),
                "underVerification",all.stream().filter(c -> c.getStatus() == CertificateStatus.UNDER_VERIFICATION).count(),
                "verified",         all.stream().filter(c -> c.getStatus() == CertificateStatus.VERIFIED).count(),
                "approved",         all.stream().filter(c -> c.getStatus() == CertificateStatus.APPROVED).count(),
                "rejected",         all.stream().filter(c -> c.getStatus() == CertificateStatus.REJECTED).count(),
                "generated",        all.stream().filter(c -> c.getStatus() == CertificateStatus.CERTIFICATE_GENERATED).count(),
                "downloaded",       all.stream().filter(c -> c.getStatus() == CertificateStatus.DOWNLOADED).count()
        );
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private Certificate findOrThrow(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Certificate not found: " + id));
    }

    private String generateAppNumber() {
        return String.format("APP-%d-%06d", Year.now().getValue(), appSeq.getAndIncrement());
    }

    private String generateCertNumber(CertificateType type) {
        String prefix = switch (type) {
            case BIRTH            -> "BC";
            case DEATH            -> "DC";
            case INCOME           -> "IC";
            case RESIDENCE        -> "RC";
            case MARRIAGE         -> "MC";
            case TRADE_LICENSE    -> "TL";
            case SHOP_LICENSE     -> "SL";
            case BUILDING_PERMIT  -> "BP";
            case WATER_CONNECTION -> "WC";
        };
        return String.format("%s-%d-%04d", prefix, Year.now().getValue(), certSeq.getAndIncrement());
    }

    private CertificateResponse toResponse(Certificate c) {
        CertificateResponse r = new CertificateResponse();
        r.setId(c.getId());
        r.setApplicationNumber(c.getApplicationNumber());
        r.setCitizenId(c.getCitizenId());
        r.setCitizenName(c.getCitizenName());
        r.setCitizenAddress(c.getCitizenAddress());
        r.setAadhaarNumber(c.getAadhaarNumber());
        r.setCertificateType(c.getCertificateType());
        r.setStatus(c.getStatus());
        r.setAssignedDepartment(c.getAssignedDepartment());
        r.setAppliedBy(c.getAppliedBy());
        r.setVerifiedBy(c.getVerifiedBy());
        r.setDecidedBy(c.getDecidedBy());
        r.setRejectionReason(c.getRejectionReason());
        r.setRemarks(c.getRemarks());
        r.setCertificateNumber(c.getCertificateNumber());
        r.setDownloadCount(c.getDownloadCount());
        r.setAppliedAt(c.getAppliedAt());
        r.setVerifiedAt(c.getVerifiedAt());
        r.setDecidedAt(c.getDecidedAt());
        r.setIssuedAt(c.getIssuedAt());
        return r;
    }
}