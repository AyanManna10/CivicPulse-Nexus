package com.civicpulse.welfareservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "budgets")
public class Budget {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String department;

    @ManyToOne
    @JoinColumn(name = "scheme_id")
    private WelfareScheme scheme;

    private String fiscalYear;
    private BigDecimal allocated;
    private BigDecimal spent;
    private BigDecimal alertThresholdPct;

    private String createdBy;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.allocated = BigDecimal.ZERO;
        this.spent = BigDecimal.ZERO;
        this.alertThresholdPct = new BigDecimal("80");
    }
}