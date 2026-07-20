package com.civicpulse.certificateservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RejectionRequest {
    @NotBlank(message = "Rejection reason is required — citizen needs to know what to fix")
    private String reason;
}   