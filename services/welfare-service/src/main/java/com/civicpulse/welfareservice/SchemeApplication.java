package com.civicpulse.welfareservice.entity;

import com.civicpulse.welfareservice.entity.WelfareScheme;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "scheme_applications")
public class SchemeApplication {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String applicationCode;

    private Long citizenId;
    private String citizenName;
    private String citizenEmail;

    @ManyToOne
    @JoinColumn(name = "scheme_id")
    private WelfareScheme scheme;

    private String status;
    private String rejectionReason;
    private String reviewedBy;
    private LocalDateTime reviewedAt;
    private String documents;
    private String remarks;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.status = "PENDING";
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}