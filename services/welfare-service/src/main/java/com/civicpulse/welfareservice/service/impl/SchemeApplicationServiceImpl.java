package com.civicpulse.welfareservice.service.impl;

import com.civicpulse.welfareservice.entity.Beneficiary;
import com.civicpulse.welfareservice.entity.SchemeApplication;
import com.civicpulse.welfareservice.entity.WelfareScheme;
import com.civicpulse.welfareservice.repository.BeneficiaryRepository;
import com.civicpulse.welfareservice.repository.SchemeApplicationRepository;
import com.civicpulse.welfareservice.repository.WelfareSchemeRepository;
import com.civicpulse.welfareservice.dto.SchemeApplicationDtoRequest;
import com.civicpulse.welfareservice.dto.SchemeApplicationDtoResponse;
import com.civicpulse.welfareservice.service.AuditLogService;
import com.civicpulse.welfareservice.service.SchemeApplicationService;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SchemeApplicationServiceImpl implements SchemeApplicationService {

    private final SchemeApplicationRepository applicationRepo;
    private final BeneficiaryRepository beneficiaryRepo;
    private final WelfareSchemeRepository schemeRepo;

    private final AuditLogService auditLogService;

public SchemeApplicationServiceImpl(SchemeApplicationRepository applicationRepo,
                                    BeneficiaryRepository beneficiaryRepo,
                                    WelfareSchemeRepository schemeRepo,
                                    AuditLogService auditLogService) {
    this.applicationRepo = applicationRepo;
    this.beneficiaryRepo = beneficiaryRepo;
    this.schemeRepo = schemeRepo;
    this.auditLogService = auditLogService;
}

    @Override
    public SchemeApplicationDtoResponse submitApplication(SchemeApplicationDtoRequest request) {
        WelfareScheme scheme = schemeRepo.findById(request.getSchemeId())
                .orElseThrow(() -> new RuntimeException("Scheme not found"));

        // Block if citizen already has a PENDING application for this scheme
        var existing = applicationRepo.findBySchemeIdAndStatus(request.getSchemeId(), "PENDING")
                .stream().filter(a -> a.getCitizenId().equals(request.getCitizenId())).findFirst();
        if (existing.isPresent())
            throw new RuntimeException("You already have a pending application for this scheme");

        // Rate limit: max 3 new applications per citizen per day (excluding WITHDRAWN)
        LocalDateTime startOfDay = LocalDateTime.now().toLocalDate().atStartOfDay();
        long todayCount = applicationRepo.findByCitizenId(request.getCitizenId())
                .stream()
                .filter(a -> a.getCreatedAt() != null
                        && a.getCreatedAt().isAfter(startOfDay)
                        && !"WITHDRAWN".equals(a.getStatus()))
                .count();
        if (todayCount >= 3)
            throw new RuntimeException("You have reached the limit of 3 applications per day. Please try again tomorrow.");

        SchemeApplication app = new SchemeApplication();
        app.setApplicationCode("APP-" + System.currentTimeMillis());
        app.setCitizenId(request.getCitizenId());
        app.setCitizenName(request.getCitizenName());
        app.setCitizenEmail(request.getCitizenEmail());
        app.setScheme(scheme);
        app.setDocuments(request.getDocuments());
        app.setRemarks(request.getRemarks());

        return mapToResponse(applicationRepo.save(app));
    }

    @Override
    public SchemeApplicationDtoResponse getApplicationById(Long id) {
        return mapToResponse(applicationRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Application not found")));
    }

    @Override
    public List<SchemeApplicationDtoResponse> getApplicationsByCitizen(Long citizenId) {
        return applicationRepo.findByCitizenId(citizenId).stream()
                .map(this::mapToResponse).collect(Collectors.toList());
    }

    @Override
    public List<SchemeApplicationDtoResponse> getApplicationsByScheme(Long schemeId) {
        return applicationRepo.findBySchemeId(schemeId).stream()
                .map(this::mapToResponse).collect(Collectors.toList());
    }

    @Override
    public List<SchemeApplicationDtoResponse> getPendingApplicationsByScheme(Long schemeId) {
        return applicationRepo.findBySchemeIdAndStatus(schemeId, "PENDING").stream()
                .map(this::mapToResponse).collect(Collectors.toList());
    }

    @Override
    public SchemeApplicationDtoResponse verifyApplication(Long id, String reviewedBy) {
        SchemeApplication app = applicationRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        if (!app.getStatus().equals("PENDING"))
            throw new RuntimeException("Only PENDING applications can be approved");

        app.setStatus("APPROVED");
        app.setReviewedBy(reviewedBy);
        app.setReviewedAt(LocalDateTime.now());
        SchemeApplication updated = applicationRepo.save(app);

        auditLogService.log("APPROVE_APPLICATION", "APPLICATION", updated.getId(),
        updated.getApplicationCode(), reviewedBy,
        "Scheme: " + updated.getScheme().getName() + " | Citizen: " + updated.getCitizenName());

        // Auto-create beneficiary record
        Beneficiary beneficiary = new Beneficiary();
        beneficiary.setBeneficiaryCode("BNF-" + System.currentTimeMillis());
        beneficiary.setCitizenId(app.getCitizenId());
        beneficiary.setCitizenName(app.getCitizenName());
        beneficiary.setScheme(app.getScheme());
        beneficiary.setEligibilityStatus("VERIFIED");
        beneficiary.setVerifiedBy(reviewedBy);
        beneficiary.setVerifiedAt(LocalDateTime.now());
        beneficiary.setDocsStatus("COMPLETE");
        beneficiary.setRemarks("Auto-enrolled from application " + app.getApplicationCode());
        beneficiaryRepo.save(beneficiary);

        return mapToResponse(updated);
    }

    @Override
    public SchemeApplicationDtoResponse rejectApplication(Long id, String reviewedBy,
                                                           String rejectionReason) {
        SchemeApplication app = applicationRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        if (!app.getStatus().equals("PENDING"))
            throw new RuntimeException("Only PENDING applications can be rejected");

        app.setStatus("REJECTED");
        app.setReviewedBy(reviewedBy);
        app.setReviewedAt(LocalDateTime.now());
        app.setRejectionReason(rejectionReason);

        SchemeApplication updated = applicationRepo.save(app);
        auditLogService.log("REJECT_APPLICATION", "APPLICATION", updated.getId(),
        updated.getApplicationCode(), reviewedBy,
        "Scheme: " + updated.getScheme().getName() + " | Reason: " + rejectionReason);
        return mapToResponse(updated);
    }

    // ── NEW: Citizen withdraws a PENDING application ─────────────────────────
    @Override
    public SchemeApplicationDtoResponse withdrawApplication(Long id, Long citizenId) {
        SchemeApplication app = applicationRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        // Ownership check — citizen can only withdraw their own application
        if (!app.getCitizenId().equals(citizenId))
            throw new RuntimeException("You can only withdraw your own applications");

        // Can only withdraw PENDING applications — not already reviewed ones
        if (!app.getStatus().equals("PENDING"))
            throw new RuntimeException(
                "Only PENDING applications can be withdrawn. " +
                "This application is already " + app.getStatus());

        app.setStatus("WITHDRAWN");
        app.setRemarks("Withdrawn by citizen on " +
                LocalDateTime.now().toLocalDate());

        SchemeApplication withdrawn = applicationRepo.save(app);
auditLogService.log("WITHDRAW_APPLICATION", "APPLICATION", withdrawn.getId(),
        withdrawn.getApplicationCode(), "citizen-" + citizenId,
        "Scheme: " + withdrawn.getScheme().getName());
return mapToResponse(withdrawn);
    }

    // ── NEW: Citizen resubmits a REJECTED application (same scheme, fresh start) ──
    @Override
    public SchemeApplicationDtoResponse resubmitApplication(Long id, Long citizenId,
                                                             String remarks) {
        SchemeApplication app = applicationRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        // Ownership check
        if (!app.getCitizenId().equals(citizenId))
            throw new RuntimeException("You can only resubmit your own applications");

        // Can only resubmit REJECTED applications
        if (!app.getStatus().equals("REJECTED"))
            throw new RuntimeException(
                "Only REJECTED applications can be resubmitted. " +
                "This application is " + app.getStatus());

        // Reset to PENDING — clears rejection info so officer reviews fresh
        app.setStatus("PENDING");
        app.setRejectionReason(null);
        app.setReviewedBy(null);
        app.setReviewedAt(null);
        app.setRemarks(remarks != null && !remarks.isBlank()
                ? remarks
                : "Resubmitted by citizen on " + LocalDateTime.now().toLocalDate());

        return mapToResponse(applicationRepo.save(app));
    }

    private SchemeApplicationDtoResponse mapToResponse(SchemeApplication app) {
        return new SchemeApplicationDtoResponse(
                app.getId(), app.getApplicationCode(),
                app.getCitizenId(), app.getCitizenName(), app.getCitizenEmail(),
                app.getScheme().getId(), app.getScheme().getName(),
                app.getStatus(), app.getRejectionReason(),
                app.getReviewedBy(), app.getReviewedAt(),
                app.getDocuments(), app.getRemarks(),
                app.getCreatedAt(), app.getUpdatedAt()
        );
    }
}