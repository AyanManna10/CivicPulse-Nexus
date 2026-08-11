package com.civicpulse.welfareservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FundDistributionDtoRequest {
    @NotNull
    private Long beneficiaryId;

    @NotNull
    private Long schemeId;

    @NotNull
    private BigDecimal amount;

    private String paymentMode;
    private String transactionRef;
    private String remarks;
}