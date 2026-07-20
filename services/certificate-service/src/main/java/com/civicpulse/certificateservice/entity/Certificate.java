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

    // Human-readable reference number, e.g. APP-2026-000001
    @Column(unique = true)
    private String applicationNumber;

    @Column(nullable = false)
    private Long citizenId;

    @Column(nullable = false)
    private String citizenName;

    private String citizenAddress;

    // 12-digit Aadhaar number (stored as-provided; masking optional at display layer)
    private String aadhaarNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CertificateType certificateType;

    // Main workflow status
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CertificateStatus status = CertificateStatus.SUBMITTED;

    // Officer who applied / username from JWT preferred_username claim
    private String appliedBy;

    // Officer who verified documents
    private String verifiedBy;

    // Officer/Admin who approved or rejected
    private String decidedBy;

    // Rejection reason — required when status = REJECTED
    private String rejectionReason;

    // General remarks (optional, e.g. notes during approval)
    private String remarks;

    // Generated certificate number, e.g. BC-2026-0001 — only set on CERTIFICATE_GENERATED
    private String certificateNumber;

    // How many times the PDF has been downloaded
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