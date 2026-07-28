package com.civicpulse.welfareservice.service.impl;

import com.civicpulse.welfareservice.entity.SchemeApplication;
import com.civicpulse.welfareservice.entity.Beneficiary;
import com.civicpulse.welfareservice.entity.WelfareScheme;
import com.civicpulse.welfareservice.repository.SchemeApplicationRepository;
import com.civicpulse.welfareservice.repository.BeneficiaryRepository;
import com.civicpulse.welfareservice.repository.WelfareSchemeRepository;
import com.civicpulse.welfareservice.dto.SchemeApplicationDtoRequest;
import com.civicpulse.welfareservice.dto.SchemeApplicationDtoResponse;
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

    public SchemeApplicationServiceImpl(SchemeApplicationRepository applicationRepo,
                                        BeneficiaryRepository beneficiaryRepo,
                                        WelfareSchemeRepository schemeRepo) {
        this.applicationRepo = applicationRepo;
        this.beneficiaryRepo = beneficiaryRepo;
        this.schemeRepo = schemeRepo;
    }

    @Override
    public SchemeApplicationDtoResponse submitApplication(SchemeApplicationDtoRequest request) {
        WelfareScheme scheme = schemeRepo.findById(request.getSchemeId())
                .orElseThrow(() -> new RuntimeException("Scheme not found"));

        // Check if citizen already has a pending/approved application for this scheme
        var existing = applicationRepo.findBySchemeIdAndStatus(request.getSchemeId(), "PENDING")
                .stream().filter(a -> a.getCitizenId().equals(request.getCitizenId())).findFirst();
        if (existing.isPresent())
            throw new RuntimeException("You already have a pending application for this scheme");

        SchemeApplication app = new SchemeApplication();
        app.setApplicationCode("APP-" + System.currentTimeMillis());
        app.setCitizenId(request.getCitizenId());
        app.setCitizenName(request.getCitizenName());
        app.setCitizenEmail(request.getCitizenEmail());
        app.setScheme(scheme);
        app.setDocuments(request.getDocuments());
        app.setRemarks(request.getRemarks());

        SchemeApplication saved = applicationRepo.save(app);
        return mapToResponse(saved);
    }

    @Override
    public SchemeApplicationDtoResponse getApplicationById(Long id) {
        SchemeApplication app = applicationRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Application not found"));
        return mapToResponse(app);
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
            throw new RuntimeException("Only PENDING applications can be verified");

        app.setStatus("APPROVED");
        app.setReviewedBy(reviewedBy);
        app.setReviewedAt(LocalDateTime.now());

        SchemeApplication updated = applicationRepo.save(app);

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
    public SchemeApplicationDtoResponse rejectApplication(Long id, String reviewedBy, String rejectionReason) {
        SchemeApplication app = applicationRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        if (!app.getStatus().equals("PENDING"))
            throw new RuntimeException("Only PENDING applications can be rejected");

        app.setStatus("REJECTED");
        app.setReviewedBy(reviewedBy);
        app.setReviewedAt(LocalDateTime.now());
        app.setRejectionReason(rejectionReason);

        SchemeApplication updated = applicationRepo.save(app);
        return mapToResponse(updated);
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