package com.civicpulse.welfareservice.service;

import com.civicpulse.welfareservice.dto.BeneficiaryDtoRequest;
import com.civicpulse.welfareservice.dto.BeneficiaryDtoResponse;
import java.util.List;

public interface BeneficiaryService {
    BeneficiaryDtoResponse enrollBeneficiary(BeneficiaryDtoRequest request);
    BeneficiaryDtoResponse getBeneficiaryById(Long id);
    List<BeneficiaryDtoResponse> getBeneficiariesByScheme(Long schemeId);
    List<BeneficiaryDtoResponse> getBeneficiariesByCitizen(Long citizenId);
    BeneficiaryDtoResponse updateBeneficiary(Long id, BeneficiaryDtoRequest request);
    BeneficiaryDtoResponse verifyBeneficiary(Long id, String verifiedBy);
    BeneficiaryDtoResponse markDocsComplete(Long id, String reviewedBy); // NEW
    BeneficiaryDtoResponse markDocsMissing(Long id, String requestedDocType, String reviewedBy);                   // NEW
    void deactivateBeneficiary(Long id);
}
