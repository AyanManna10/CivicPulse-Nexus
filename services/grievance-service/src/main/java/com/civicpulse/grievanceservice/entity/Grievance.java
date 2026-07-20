package com.civicpulse.grievanceservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "grievances")
@Getter
@Setter
public class Grievance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long citizenId;

    private String department;

    @Column(nullable = false)
    private String title;

    @Column(length = 2000)
    private String description;

    // Kept as String (not enum) to match the pattern already used for
    // `status` and `role` in user-service — consistent style, and
    // avoids Postgres enum-migration headaches for a college project.
    @Column(nullable = false)
    private String priority = "MEDIUM";

    @Column(nullable = false)
    private String status = "OPEN";

    private String assignedOfficer;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private LocalDateTime dueDate;

    private LocalDateTime resolvedDate;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        // SLA rule from your project doc: due date set by priority at creation time.
        dueDate = calculateDueDate();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    private LocalDateTime calculateDueDate() {
        return switch (priority) {
            case "HIGH" -> createdAt.plusDays(1);
            case "LOW" -> createdAt.plusDays(7);
            default -> createdAt.plusDays(3); // MEDIUM
        };
    }
}