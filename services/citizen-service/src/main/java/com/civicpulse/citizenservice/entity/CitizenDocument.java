package com.civicpulse.citizenservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "citizen_documents")
@Getter @Setter
public class CitizenDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long pendingId;

    @Column(nullable = false)
    private String docType;   // AADHAAR, PAN, PHOTO, OTHER

    @Column(nullable = false)
    private String originalName;

    @Column(nullable = false)
    private String storedPath;

    private LocalDateTime uploadedAt;

    @PrePersist
    public void prePersist() { uploadedAt = LocalDateTime.now(); }
}