package com.civicpulse.welfareservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WelfareSchemeDtoRequest {
    @NotBlank
    private String name;

    @NotBlank
    private String department;

    @NotBlank
    private String schemeType;

    private String description;
    private String eligibilityCriteria;

    @NotNull
    private BigDecimal budgetAllocated;

    private LocalDate startDate;
    private LocalDate endDate;

    private String status;
}