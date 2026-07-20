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

public CertificateServiceImpl(CertificateRepository repository,
                               CertificatePdfGenerator pdfGenerator,
                               CertificateEventProducer eventProducer) {
    this.repository    = repository;
    this.pdfGenerator  = pdfGenerator;
    this.eventProducer = eventProducer;
    // Seed sequences from DB so restart doesn't cause duplicate key errors
    long appCount  = repository.count();
    long certCount = repository.countByCertificateNumberIsNotNull();
    this.appSeq  = new AtomicLong(appCount + 1);
    this.certSeq = new AtomicLong(certCount + 1);
}

 

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

        Certificate saved = repository.save(cert);

        try {
            eventProducer.publishSubmitted(new ApplicationSubmittedEvent(
                    saved.getId(), saved.getApplicationNumber(),
                    saved.getCitizenId(), saved.getCitizenName(),
                    saved.getCertificateType().name(), saved.getStatus().name()));
        } catch (Exception e) {
            // Kafka unavailable — event not critical, continue
        }

        return toResponse(saved);
    }

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

    @Override
    public CertificateResponse reject(Long id, RejectionRequest request, String officerUsername) {
        Certificate cert = findOrThrow(id);
        if (cert.getStatus() == CertificateStatus.CERTIFICATE_GENERATED
                || cert.getStatus() == CertificateStatus.DOWNLOADED) {
            throw new IllegalStateException("Cannot reject a certificate that has already been generated.");
        }

        cert.setStatus(CertificateStatus.REJECTED);
        cert.setRejectionReason(request.getReason());
        cert.setDecidedBy(officerUsername);
        cert.setDecidedAt(LocalDateTime.now());

        return toResponse(repository.save(cert));
    }

    @Override
    public CertificateResponse generateCertificate(Long id) {
        Certificate cert = findOrThrow(id);
        if (cert.getStatus() != CertificateStatus.APPROVED) {
            throw new IllegalStateException(
                    "Only APPROVED applications can have a certificate generated. Current: " + cert.getStatus());
        }

        cert.setStatus(CertificateStatus.CERTIFICATE_GENERATED);
        cert.setCertificateNumber(generateCertNumber(cert.getCertificateType()));
        cert.setIssuedAt(LocalDateTime.now());

        Certificate saved = repository.save(cert);

        eventProducer.publishGenerated(new CertificateGeneratedEvent(
                saved.getId(), saved.getApplicationNumber(),
                saved.getCitizenId(), saved.getCitizenName(),
                saved.getCertificateType().name(), saved.getStatus().name()));

        return toResponse(saved);
    }

    @Override
    public byte[] downloadPdf(Long id) {
        Certificate cert = findOrThrow(id);
        if (cert.getStatus() != CertificateStatus.CERTIFICATE_GENERATED
                && cert.getStatus() != CertificateStatus.DOWNLOADED) {
            throw new IllegalStateException(
                    "Certificate must be GENERATED before download. Current: " + cert.getStatus());
        }

        cert.setStatus(CertificateStatus.DOWNLOADED);
        cert.setDownloadCount(cert.getDownloadCount() + 1);
        repository.save(cert);

        try {
            return pdfGenerator.generate(cert);
        } catch (IOException e) {
            throw new UncheckedIOException("PDF generation failed", e);
        }
    }

    @Override
    public List<CertificateResponse> getAll() {
        return repository.findAll().stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public CertificateResponse getById(Long id) {
        return toResponse(findOrThrow(id));
    }

    @Override
    public List<CertificateResponse> getByCitizen(Long citizenId) {
        return repository.findByCitizenId(citizenId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public List<CertificateResponse> getByStatus(CertificateStatus status) {
        return repository.findByStatus(status).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    @Override
public List<CertificateResponse> search(String citizenName, CertificateStatus status, CertificateType type) {
    List<Certificate> all = repository.findAll();
    
    return all.stream()
            .filter(c -> citizenName == null || citizenName.isBlank() || 
                    c.getCitizenName().toLowerCase().contains(citizenName.toLowerCase()))
            .filter(c -> status == null || c.getStatus() == status)
            .filter(c -> type == null || c.getCertificateType() == type)
            .map(this::toResponse)
            .collect(Collectors.toList());
}

    @Override
    public Map<String, Long> getStats() {
        List<Certificate> all = repository.findAll();
        return Map.of(
                "total",           (long) all.size(),
                "submitted",       count(all, CertificateStatus.SUBMITTED),
                "underVerification", count(all, CertificateStatus.UNDER_VERIFICATION),
                "verified",        count(all, CertificateStatus.VERIFIED),
                "approved",        count(all, CertificateStatus.APPROVED),
                "rejected",        count(all, CertificateStatus.REJECTED),
                "generated",       count(all, CertificateStatus.CERTIFICATE_GENERATED),
                "downloaded",      count(all, CertificateStatus.DOWNLOADED)
        );
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private long count(List<Certificate> all, CertificateStatus status) {
        return all.stream().filter(c -> c.getStatus() == status).count();
    }

    private Certificate findOrThrow(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Certificate not found: " + id));
    }

    private String generateAppNumber() {
        return String.format("APP-%d-%06d", Year.now().getValue(), appSeq.getAndIncrement());
    }

    /**
     * Generates a unique certificate / permit reference number.
     * Certificates use short prefix codes; permits use domain-specific codes.
     */
    private String generateCertNumber(CertificateType type) {
        String prefix = switch (type) {
            // Certificates
            case BIRTH           -> "BC";
            case DEATH           -> "DC";
            case INCOME          -> "IC";
            case RESIDENCE       -> "RC";
            case MARRIAGE        -> "MC";
            // Permits & Licences
            case TRADE_LICENSE   -> "TL";
            case SHOP_LICENSE    -> "SL";
            case BUILDING_PERMIT -> "BP";
            case WATER_CONNECTION-> "WC";
        };
        return String.format("%s-%d-%04d", prefix, Year.now().getValue(), certSeq.getAndIncrement());
    }

    private CertificateResponse toResponse(Certificate c) {
        return new CertificateResponse(
                c.getId(), c.getApplicationNumber(), c.getCitizenId(),
                c.getCitizenName(), c.getCitizenAddress(), c.getAadhaarNumber(),
                c.getCertificateType(), c.getStatus(),
                c.getAppliedBy(), c.getVerifiedBy(), c.getDecidedBy(),
                c.getRejectionReason(), c.getRemarks(),
                c.getCertificateNumber(), c.getDownloadCount(),
                c.getAppliedAt(), c.getVerifiedAt(), c.getDecidedAt(), c.getIssuedAt()
        );
    }
}
