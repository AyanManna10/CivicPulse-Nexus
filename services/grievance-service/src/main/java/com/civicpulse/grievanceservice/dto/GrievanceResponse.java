package com.civicpulse.grievanceservice.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class GrievanceResponse {

    private Long id;
    private Long citizenId;
    private String department;
    private String title;
    private String description;
    private String priority;
    private String status;
    private String assignedOfficer;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime dueDate;
    private LocalDateTime resolvedDate;
}