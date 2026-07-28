package com.civicpulse.welfareservice.service.impl;

import com.civicpulse.welfareservice.entity.Beneficiary;
import com.civicpulse.welfareservice.entity.WelfareScheme;
import com.civicpulse.welfareservice.repository.BeneficiaryRepository;
import com.civicpulse.welfareservice.repository.WelfareSchemeRepository;
import com.civicpulse.welfareservice.dto.BeneficiaryDtoRequest;
import com.civicpulse.welfareservice.dto.BeneficiaryDtoResponse;
import com.civicpulse.welfareservice.service.BeneficiaryService;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class BeneficiaryServiceImpl implements BeneficiaryService {
    private final BeneficiaryRepository beneficiaryRepo;
    private final WelfareSchemeRepository schemeRepo;

    public BeneficiaryServiceImpl(BeneficiaryRepository beneficiaryRepo, 
                                  WelfareSchemeRepository schemeRepo) {
        this.beneficiaryRepo = beneficiaryRepo;
        this.schemeRepo = schemeRepo;
    }

    @Override
    public BeneficiaryDtoResponse enrollBeneficiary(BeneficiaryDtoRequest request) {
        WelfareScheme scheme = schemeRepo.findById(request.getSchemeId())
                .orElseThrow(() -> new RuntimeException("Scheme not found"));

        // Check duplicate enrollment
        if (beneficiaryRepo.findByCitizenIdAndSchemeId(request.getCitizenId(), request.getSchemeId()).isPresent())
            throw new RuntimeException("Citizen already enrolled in this scheme");

        Beneficiary beneficiary = new Beneficiary();
        beneficiary.setBeneficiaryCode("BNF-" + System.currentTimeMillis());
        beneficiary.setCitizenId(request.getCitizenId());
        beneficiary.setCitizenName(request.getCitizenName());
        beneficiary.setScheme(scheme);
        beneficiary.setEligibilityStatus(request.getEligibilityStatus() != null ? request.getEligibilityStatus() : "PENDING");
        beneficiary.setDocsStatus(request.getDocsStatus() != null ? request.getDocsStatus() : "PENDING");
        beneficiary.setRemarks(request.getRemarks());

        Beneficiary saved = beneficiaryRepo.save(beneficiary);
        return mapToResponse(saved);
    }

    @Override
    public BeneficiaryDtoResponse getBeneficiaryById(Long id) {
        Beneficiary beneficiary = beneficiaryRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Beneficiary not found"));
        return mapToResponse(beneficiary);
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
        Beneficiary beneficiary = beneficiaryRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Beneficiary not found"));

        beneficiary.setEligibilityStatus(request.getEligibilityStatus());
        beneficiary.setDocsStatus(request.getDocsStatus());
        beneficiary.setRemarks(request.getRemarks());

        Beneficiary updated = beneficiaryRepo.save(beneficiary);
        return mapToResponse(updated);
    }

    @Override
    public BeneficiaryDtoResponse verifyBeneficiary(Long id, String verifiedBy) {
        Beneficiary beneficiary = beneficiaryRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Beneficiary not found"));

        beneficiary.setEligibilityStatus("VERIFIED");
        beneficiary.setVerifiedBy(verifiedBy);
        beneficiary.setVerifiedAt(LocalDateTime.now());

        Beneficiary updated = beneficiaryRepo.save(beneficiary);
        return mapToResponse(updated);
    }

    @Override
    public void deactivateBeneficiary(Long id) {
        Beneficiary beneficiary = beneficiaryRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Beneficiary not found"));
        beneficiary.setStatus("INACTIVE");
        beneficiaryRepo.save(beneficiary);
    }

    private BeneficiaryDtoResponse mapToResponse(Beneficiary b) {
        return new BeneficiaryDtoResponse(
                b.getId(), b.getBeneficiaryCode(), b.getCitizenId(), b.getCitizenName(),
                b.getScheme().getId(), b.getScheme().getName(),
                b.getEnrollmentDate(), b.getEligibilityStatus(), b.getVerifiedBy(),
                b.getVerifiedAt(), b.getDocsStatus(), b.getStatus(),
                b.getRemarks(), b.getCreatedAt()
        );
    }
}