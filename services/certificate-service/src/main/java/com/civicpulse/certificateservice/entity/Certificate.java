package com.civicpulse.certificateservice.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "certificates")
public class Certificate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String applicationNumber;

    @Column(nullable = false)
    private Long citizenId;

    @Column(nullable = false)
    private String citizenName;

    private String citizenAddress;

    private String aadhaarNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CertificateType certificateType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CertificateStatus status = CertificateStatus.SUBMITTED;

    /**
     * Department automatically assigned at submission time based on certificate type.
     * Officers belonging to this department can see and process this application.
     * Mapping:
     *   BIRTH / DEATH           → Health Department
     *   INCOME / RESIDENCE      → Revenue Department
     *   MARRIAGE                → Civil Registration Department
     *   TRADE_LICENSE / SHOP_LICENSE → Commerce Department
     *   BUILDING_PERMIT         → Engineering Department
     *   WATER_CONNECTION        → Water Supply Department
     */
    @Column(name = "assigned_department")
    private String assignedDepartment;

    private String appliedBy;
    private String verifiedBy;
    private String decidedBy;
    private String rejectionReason;
    private String remarks;

    @Column(unique = true)
    private String certificateNumber;

    @Column(nullable = false)
    private Integer downloadCount = 0;

    @Column(nullable = false)
    private LocalDateTime appliedAt;

    private LocalDateTime verifiedAt;
    private LocalDateTime decidedAt;
    private LocalDateTime issuedAt;

    @PrePersist
    public void onCreate() {
        this.appliedAt = LocalDateTime.now();
    }
}