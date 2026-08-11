package com.civicpulse.welfareservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "beneficiaries")
public class Beneficiary {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String beneficiaryCode;

    private Long citizenId;
    private String citizenName;

    @ManyToOne
    @JoinColumn(name = "scheme_id")
    private WelfareScheme scheme;

    private LocalDate enrollmentDate;
    private String eligibilityStatus;
    private String verifiedBy;
    private LocalDateTime verifiedAt;
    private String docsStatus;
    private String status;
    private String remarks;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.enrollmentDate = LocalDate.now();
        this.eligibilityStatus = "PENDING";
        this.docsStatus = "PENDING";
        this.status = "ACTIVE";
    }
}