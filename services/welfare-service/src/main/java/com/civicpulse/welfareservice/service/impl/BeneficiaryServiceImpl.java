package com.civicpulse.welfareservice.service.impl;

import com.civicpulse.welfareservice.entity.Beneficiary;
import com.civicpulse.welfareservice.entity.FundDistribution;
import com.civicpulse.welfareservice.entity.WelfareScheme;
import com.civicpulse.welfareservice.repository.BeneficiaryRepository;
import com.civicpulse.welfareservice.repository.FundDistributionRepository;
import com.civicpulse.welfareservice.repository.WelfareSchemeRepository;
import com.civicpulse.welfareservice.dto.BeneficiaryDtoRequest;
import com.civicpulse.welfareservice.dto.BeneficiaryDtoResponse;
import com.civicpulse.welfareservice.service.AuditLogService;
import com.civicpulse.welfareservice.service.BeneficiaryService;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.math.BigDecimal;

@Service
public class BeneficiaryServiceImpl implements BeneficiaryService {

    private final BeneficiaryRepository beneficiaryRepo;
    private final WelfareSchemeRepository schemeRepo;
    private final AuditLogService auditLogService;
    private final FundDistributionRepository distributionRepo;

    public BeneficiaryServiceImpl(BeneficiaryRepository beneficiaryRepo,
                               WelfareSchemeRepository schemeRepo,
                               FundDistributionRepository distributionRepo,
                               AuditLogService auditLogService) {
    this.beneficiaryRepo = beneficiaryRepo;
    this.schemeRepo = schemeRepo;
    this.distributionRepo = distributionRepo;
    this.auditLogService = auditLogService;
}

    @Override
    public BeneficiaryDtoResponse enrollBeneficiary(BeneficiaryDtoRequest request) {
        WelfareScheme scheme = schemeRepo.findById(request.getSchemeId())
                .orElseThrow(() -> new RuntimeException("Scheme not found"));

        if (beneficiaryRepo.findByCitizenIdAndSchemeId(
                request.getCitizenId(), request.getSchemeId()).isPresent())
            throw new RuntimeException("Citizen already enrolled in this scheme");

        Beneficiary beneficiary = new Beneficiary();
        beneficiary.setBeneficiaryCode("BNF-" + System.currentTimeMillis());
        beneficiary.setCitizenId(request.getCitizenId());
        beneficiary.setCitizenName(request.getCitizenName());
        beneficiary.setScheme(scheme);
        beneficiary.setEligibilityStatus(
                request.getEligibilityStatus() != null ? request.getEligibilityStatus() : "PENDING");
        beneficiary.setDocsStatus(
                request.getDocsStatus() != null ? request.getDocsStatus() : "PENDING");
        beneficiary.setRemarks(request.getRemarks());

        return mapToResponse(beneficiaryRepo.save(beneficiary));
    }

    @Override
    public BeneficiaryDtoResponse getBeneficiaryById(Long id) {
        Beneficiary b = beneficiaryRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Beneficiary not found"));
        return mapToResponse(b);
    }

    @Override
    public List<BeneficiaryDtoResponse> getBeneficiariesByScheme(Long schemeId) {
        return beneficiaryRepo.findBySchemeId(schemeId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<BeneficiaryDtoResponse> getBeneficiariesByCitizen(Long citizenId) {
        return beneficiaryRepo.findByCitizenId(citizenId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public BeneficiaryDtoResponse updateBeneficiary(Long id, BeneficiaryDtoRequest request) {
        Beneficiary b = beneficiaryRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Beneficiary not found"));
        b.setEligibilityStatus(request.getEligibilityStatus());
        b.setDocsStatus(request.getDocsStatus());
        b.setRemarks(request.getRemarks());
        return mapToResponse(beneficiaryRepo.save(b));
    }

    // ── Verify eligibility only (docs must already be COMPLETE) ──────────────
    @Override
    public BeneficiaryDtoResponse verifyBeneficiary(Long id, String verifiedBy) {
        Beneficiary b = beneficiaryRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Beneficiary not found"));

        // Guard: don't allow eligibility verification if docs are not complete
        if (!"COMPLETE".equals(b.getDocsStatus())) {
            throw new RuntimeException(
                "Documents must be marked COMPLETE before verifying eligibility. " +
                "Please mark documents complete first.");
        }

        b.setEligibilityStatus("VERIFIED");
        b.setVerifiedBy(verifiedBy);
        b.setVerifiedAt(LocalDateTime.now());

        Beneficiary verified = beneficiaryRepo.save(b);
        auditLogService.log("VERIFY_BENEFICIARY", "BENEFICIARY", verified.getId(),
        verified.getBeneficiaryCode(), verifiedBy,
        "Citizen: " + verified.getCitizenName() + " | Scheme: " + verified.getScheme().getName());
        return mapToResponse(verified);
    }

    // ── NEW: Mark documents as complete (separate action from eligibility) ───
    @Override
    public BeneficiaryDtoResponse markDocsComplete(Long id, String reviewedBy) {
        Beneficiary b = beneficiaryRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Beneficiary not found"));

        b.setDocsStatus("COMPLETE");
        // Store who reviewed the docs in verifiedBy field
        // (reusing the field — alternatively add a separate docsReviewedBy field)
        b.setVerifiedBy(reviewedBy);

        Beneficiary saved = beneficiaryRepo.save(b);
        auditLogService.log("MARK_DOCS_COMPLETE", "BENEFICIARY", saved.getId(),
        saved.getBeneficiaryCode(), reviewedBy,
        "Citizen: " + saved.getCitizenName());
        return mapToResponse(saved);
    }

    // ── Mark documents as missing — stores which doc is needed in remarks ─────
    @Override
    public BeneficiaryDtoResponse markDocsMissing(Long id, String requestedDocType, String reviewedBy) {
        Beneficiary b = beneficiaryRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Beneficiary not found"));
        b.setDocsStatus("MISSING");
        if (requestedDocType != null && !requestedDocType.isBlank()) {
            b.setRemarks("Please upload: " + requestedDocType);
        } else {
            b.setRemarks("Additional documents required. Please contact your department office.");
        }
        auditLogService.log("MARK_DOCS_MISSING", "BENEFICIARY", b.getId(),
                b.getBeneficiaryCode(), reviewedBy,
                "Citizen: " + b.getCitizenName() + " | Required: " + (requestedDocType != null ? requestedDocType : "Not specified"));
        return mapToResponse(beneficiaryRepo.save(b));
    }

    @Override
    public void deactivateBeneficiary(Long id) {
        Beneficiary b = beneficiaryRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Beneficiary not found"));
        b.setStatus("INACTIVE");
        beneficiaryRepo.save(b);
    }

    // ── Map entity → DTO, including latest payment status ────────────────────
    private BeneficiaryDtoResponse mapToResponse(Beneficiary b) {
        // Get the most recent distribution for this beneficiary
        List<FundDistribution> distributions =
                distributionRepo.findByBeneficiaryId(b.getId());

        String latestPaymentStatus = null;
        BigDecimal latestPaymentAmount = null;

        if (!distributions.isEmpty()) {
            // Get the most recently created distribution
            FundDistribution latest = distributions.stream()
                    .max(Comparator.comparing(FundDistribution::getCreatedAt))
                    .orElse(null);
            if (latest != null) {
                latestPaymentStatus = latest.getPaymentStatus();
                latestPaymentAmount = latest.getAmount();
            }
        }

        return new BeneficiaryDtoResponse(
                b.getId(),
                b.getBeneficiaryCode(),
                b.getCitizenId(),
                b.getCitizenName(),
                b.getScheme().getId(),
                b.getScheme().getName(),
                b.getEnrollmentDate(),
                b.getEligibilityStatus(),
                b.getVerifiedBy(),
                b.getVerifiedAt(),
                b.getDocsStatus(),
                b.getStatus(),
                b.getRemarks(),
                b.getCreatedAt(),
                latestPaymentStatus,
                latestPaymentAmount
        );
    }
}
