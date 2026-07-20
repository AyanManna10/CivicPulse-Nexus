package com.civicpulse.citizenservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "citizens")
@Getter
@Setter
public class Citizen {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Human-readable code like CTZ-2026-000123, separate from the
    // numeric primary key — this is what gets shown to citizens and
    // officers, while `id` stays internal to the database.
    @Column(unique = true, nullable = false)
    private String citizenCode;

    @Column(nullable = false)
    private String fullName;

    private LocalDate dob;

    private String gender;

    @Column(nullable = false)
    private String phone;

    @Column(unique = true)
    private String email;

    // Stored masked (e.g. XXXX-XXXX-1234) per project requirement —
    // masking happens in the service layer before saving, never store
    // the raw number even temporarily in memory longer than needed.
    private String aadharMasked;

    private Integer ward;

    private String address;

    @Column(nullable = false)
    private String status = "ACTIVE";

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}