package com.civicpulse.welfareservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "audit_logs", indexes = {
    @Index(name = "idx_audit_entity", columnList = "entityType, entityId"),
    @Index(name = "idx_audit_performed_by", columnList = "performedBy"),
    @Index(name = "idx_audit_performed_at", columnList = "performedAt")
})
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // What happened
    @Column(nullable = false)
    private String action;          // e.g. APPROVE_APPLICATION, REJECT_APPLICATION, VERIFY_BENEFICIARY

    // What was affected
    @Column(nullable = false)
    private String entityType;      // APPLICATION, BENEFICIARY, DISTRIBUTION, SCHEME

    @Column(nullable = false)
    private Long entityId;

    private String entityCode;      // human-readable: APP-123, BNF-456 etc.

    // Who did it
    @Column(nullable = false)
    private String performedBy;     // Keycloak preferred_username

    // Extra context (scheme name, citizen name, rejection reason, amount etc.)
    @Column(length = 1000)
    private String details;

    @Column(nullable = false, updatable = false)
    private LocalDateTime performedAt;

    @PrePersist
    public void onCreate() {
        this.performedAt = LocalDateTime.now();
    }
}