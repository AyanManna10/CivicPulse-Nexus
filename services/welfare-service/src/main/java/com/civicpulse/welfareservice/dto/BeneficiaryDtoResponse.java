package com.civicpulse.welfareservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BeneficiaryDtoResponse {
    private Long id;
    private String beneficiaryCode;
    private Long citizenId;
    private String citizenName;
    private Long schemeId;
    private String schemeName;
    private LocalDate enrollmentDate;
    private String eligibilityStatus;
    private String verifiedBy;
    private LocalDateTime verifiedAt;
    private String docsStatus;
    private String status;
    private String remarks;
    private LocalDateTime createdAt;
}