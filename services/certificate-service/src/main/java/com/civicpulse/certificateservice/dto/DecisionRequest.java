package com.civicpulse.certificateservice.dto;

import lombok.Data;

@Data
public class DecisionRequest {
    private Boolean approve;
    private String rejectionReason;
    private String remarks;
}