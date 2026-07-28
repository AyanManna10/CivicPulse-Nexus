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
@Table(name = "fund_distributions")
public class FundDistribution {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String distributionCode;

    @ManyToOne
    @JoinColumn(name = "beneficiary_id")
    private Beneficiary beneficiary;

    @ManyToOne
    @JoinColumn(name = "scheme_id")
    private WelfareScheme scheme;

    private BigDecimal amount;
    private String paymentMode;
    private String paymentStatus;
    private String transactionRef;
    private String remarks;
    private String disbursedBy;
    private LocalDateTime paidAt;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.paymentStatus = "PENDING";
        this.paymentMode = "BANK_TRANSFER";
    }
}