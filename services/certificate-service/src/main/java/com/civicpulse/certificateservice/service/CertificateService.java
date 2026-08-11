package com.civicpulse.certificateservice.service;

import com.civicpulse.certificateservice.dto.*;
import com.civicpulse.certificateservice.entity.CertificateStatus;
import com.civicpulse.certificateservice.entity.CertificateType;

import java.util.List;
import java.util.Map;

public interface CertificateService {
    CertificateResponse apply(CertificateRequest request, String appliedBy);
    CertificateResponse verify(Long id, VerificationRequest request, String officerUsername);
    CertificateResponse approve(Long id, String officerUsername);
    CertificateResponse reject(Long id, DecisionRequest request, String officerUsername);
    CertificateResponse generate(Long id, String officerUsername);
    byte[] downloadPdf(Long id);
    CertificateResponse getById(Long id);
    List<CertificateResponse> getAll();
    List<CertificateResponse> getByDepartment(String department);
    List<CertificateResponse> getByCitizen(Long citizenId);
    List<CertificateResponse> getPending();
    List<CertificateResponse> getByStatus(CertificateStatus status);
    List<CertificateResponse> getByType(CertificateType type);
    Map<String, Long> getStats();
}