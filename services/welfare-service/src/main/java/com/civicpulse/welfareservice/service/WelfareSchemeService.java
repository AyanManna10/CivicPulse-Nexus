package com.civicpulse.welfareservice.service;

import com.civicpulse.welfareservice.dto.WelfareSchemeDtoRequest;
import com.civicpulse.welfareservice.dto.WelfareSchemeDtoResponse;
import java.util.List;

public interface WelfareSchemeService {
    WelfareSchemeDtoResponse createScheme(WelfareSchemeDtoRequest request, String createdBy);
    WelfareSchemeDtoResponse getSchemeById(Long id);
    List<WelfareSchemeDtoResponse> getAllSchemes();
    List<WelfareSchemeDtoResponse> getSchemesByDepartment(String department);
    WelfareSchemeDtoResponse updateScheme(Long id, WelfareSchemeDtoRequest request);
    void deleteScheme(Long id);
}