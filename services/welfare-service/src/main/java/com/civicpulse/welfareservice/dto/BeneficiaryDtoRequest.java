package com.civicpulse.welfareservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BeneficiaryDtoRequest {
    @NotNull
    private Long citizenId;

    private String citizenName;

    @NotNull
    private Long schemeId;

    private String eligibilityStatus;
    private String docsStatus;
    private String remarks;
}