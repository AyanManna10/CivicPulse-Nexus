package com.civicpulse.certificateservice.dto;

import com.civicpulse.certificateservice.entity.CertificateStatus;
import com.civicpulse.certificateservice.entity.CertificateType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CertificateResponse {
    private Long id;
    private String applicationNumber;
    private Long citizenId;
    private String citizenName;
    private String citizenAddress;
    private String aadhaarNumber;
    private CertificateType certificateType;
    private CertificateStatus status;
    private String assignedDepartment;
    private String appliedBy;
    private String verifiedBy;
    private String decidedBy;
    private String rejectionReason;
    private String remarks;
    private String certificateNumber;
    private Integer downloadCount;
    private LocalDateTime appliedAt;
    private LocalDateTime verifiedAt;
    private LocalDateTime decidedAt;
    private LocalDateTime issuedAt;
}