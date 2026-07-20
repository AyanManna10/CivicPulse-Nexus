package com.civicpulse.grievanceservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AssignRequest {

    @NotBlank
    private String department;

    @NotBlank
    private String officer;
}