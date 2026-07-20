package com.civicpulse.certificateservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class VerificationRequest {
    @NotNull(message = "verified field is required")
    private Boolean verified;

    private String remarks;
}