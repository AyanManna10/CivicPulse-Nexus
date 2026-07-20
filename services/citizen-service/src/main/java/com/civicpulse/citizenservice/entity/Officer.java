package com.civicpulse.citizenservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "officers")
@Getter
@Setter
public class Officer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String officerCode;          // e.g. OFC-2026-000001

    @Column(nullable = false)
    private String fullName;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String phone;

    /** Department this officer belongs to — e.g. "Health Department" */
    @Column(nullable = false)
    private String department;

    /**
     * Role inside Keycloak realm.
     * Supported values: OFFICER, ADMIN
     * HEAD_OFFICER is a flag inside this service, not a separate Keycloak role —
     * they still get the OFFICER role in Keycloak; headOfficer=true just grants
     * assignment rights within their department.
     */
    @Column(nullable = false)
    private String keycloakRole = "OFFICER";

    /** If true, this officer can assign grievances within their own department */
    @Column(nullable = false)
    private boolean headOfficer = false;

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
