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
public class WelfareSchemeDtoResponse {
    private Long id;
    private String schemeCode;
    private String name;
    private String department;
    private String schemeType;
    private String description;
    private String eligibilityCriteria;
    private BigDecimal budgetAllocated;
    private BigDecimal budgetDisbursed;
    private Integer beneficiaryCount;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}