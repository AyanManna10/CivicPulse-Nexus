package com.civicpulse.certificateservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DecisionRequest {

    @NotNull
    private Boolean approve;

    private String remarks;
}