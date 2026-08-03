package com.civicpulse.welfareservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
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

    // ── NEW: latest distribution info ────────────────────────────────────────
    // null = no distribution created yet
    // "PENDING" = distribution created, not yet disbursed
    // "PAID" = disbursed successfully
    // "FAILED" = disbursement failed
    private String latestPaymentStatus;
    private BigDecimal latestPaymentAmount;
}
