package com.civicpulse.certificateservice.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "certificate_documents")
public class CertificateDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long certificateId;

    @Column(nullable = false)
    private String docType;

    @Column(nullable = false)
    private String originalName;

    @Column(nullable = false)
    private String storedPath;

    private LocalDateTime uploadedAt;

    @PrePersist
    public void prePersist() { uploadedAt = LocalDateTime.now(); }
}