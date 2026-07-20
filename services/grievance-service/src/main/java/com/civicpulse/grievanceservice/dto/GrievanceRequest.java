package com.civicpulse.grievanceservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class GrievanceRequest {

    @NotNull
    private Long citizenId;

    private String department;

    @NotBlank
    private String title;

    private String description;

    // Optional — defaults to "MEDIUM" in the entity if not sent
    private String priority;
}