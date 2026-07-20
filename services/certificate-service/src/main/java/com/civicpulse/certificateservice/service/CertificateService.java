package com.civicpulse.certificateservice.service;

import com.civicpulse.certificateservice.dto.*;
import com.civicpulse.certificateservice.entity.CertificateStatus;
import com.civicpulse.certificateservice.entity.CertificateType;

import java.util.List;
import java.util.Map;

public interface CertificateService {
    CertificateResponse apply(CertificateRequest request, String appliedBy);
    List<CertificateResponse> getAll();
    CertificateResponse getById(Long id);
    List<CertificateResponse> getByCitizen(Long citizenId);
    List<CertificateResponse> getByStatus(CertificateStatus status);
    List<CertificateResponse> search(String citizenName, CertificateStatus status, CertificateType type);
    CertificateResponse verify(Long id, VerificationRequest request, String officerUsername);
    CertificateResponse approve(Long id, String officerUsername);
    CertificateResponse reject(Long id, RejectionRequest request, String officerUsername);
    CertificateResponse generateCertificate(Long id);
    byte[] downloadPdf(Long id);
    Map<String, Long> getStats();
}