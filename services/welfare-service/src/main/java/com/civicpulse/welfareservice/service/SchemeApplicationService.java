package com.civicpulse.welfareservice.service;

import com.civicpulse.welfareservice.dto.SchemeApplicationDtoRequest;
import com.civicpulse.welfareservice.dto.SchemeApplicationDtoResponse;
import java.util.List;

public interface SchemeApplicationService {
    SchemeApplicationDtoResponse submitApplication(SchemeApplicationDtoRequest request);
    SchemeApplicationDtoResponse getApplicationById(Long id);
    List<SchemeApplicationDtoResponse> getApplicationsByCitizen(Long citizenId);
    List<SchemeApplicationDtoResponse> getApplicationsByScheme(Long schemeId);
    List<SchemeApplicationDtoResponse> getPendingApplicationsByScheme(Long schemeId);
    SchemeApplicationDtoResponse verifyApplication(Long id, String reviewedBy);
    SchemeApplicationDtoResponse rejectApplication(Long id, String reviewedBy, String rejectionReason);
}