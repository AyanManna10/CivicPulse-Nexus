package com.civicpulse.grievanceservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "activity_log")
@Getter
@Setter
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // e.g. "GRIEVANCE_CREATED", "GRIEVANCE_ASSIGNED", "GRIEVANCE_RESOLVED"
    @Column(nullable = false)
    private String eventType;

    @Column(nullable = false)
    private Long grievanceId;

    // Human-readable line, e.g. "Grievance #5 assigned to Rajesh (Water dept)"
    @Column(nullable = false, length = 500)
    private String description;

    @Column(nullable = false)
    private LocalDateTime occurredAt;

    @PrePersist
    public void prePersist() {
        occurredAt = LocalDateTime.now();
    }
}