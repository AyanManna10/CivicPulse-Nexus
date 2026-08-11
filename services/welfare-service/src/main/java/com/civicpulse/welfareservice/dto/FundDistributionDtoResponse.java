package com.civicpulse.welfareservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FundDistributionDtoResponse {
    private Long id;
    private String distributionCode;
    private Long beneficiaryId;
    private String beneficiaryName;
    private Long schemeId;
    private String schemeName;
    private BigDecimal amount;
    private String paymentMode;
    private String paymentStatus;
    private String transactionRef;
    private String remarks;
    private String disbursedBy;
    private LocalDateTime paidAt;
    private LocalDateTime createdAt;
}