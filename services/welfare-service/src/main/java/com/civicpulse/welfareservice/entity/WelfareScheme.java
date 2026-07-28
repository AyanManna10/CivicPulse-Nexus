package com.civicpulse.welfareservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "welfare_schemes")
public class WelfareScheme {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
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

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.status = "ACTIVE";
        this.budgetAllocated = BigDecimal.ZERO;
        this.budgetDisbursed = BigDecimal.ZERO;
        this.beneficiaryCount = 0;
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}