package com.civicpulse.welfareservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SchemeApplicationDtoResponse {
    private Long id;
    private String applicationCode;
    private Long citizenId;
    private String citizenName;
    private String citizenEmail;
    private Long schemeId;
    private String schemeName;
    private String status;
    private String rejectionReason;
    private String reviewedBy;
    private LocalDateTime reviewedAt;
    private String documents;
    private String remarks;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}