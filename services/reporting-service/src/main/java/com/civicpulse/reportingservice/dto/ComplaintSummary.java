package com.civicpulse.reportingservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Complaint summary data sent TO the AI for analysis.
 * Frontend sends only business metrics — never prompts or model names.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplaintSummary {
    private long   totalComplaints;
    private long   resolvedComplaints;
    private long   pendingComplaints;
    private long   openComplaints;
    private double resolutionRate;
    private double slaCompliancePercent;
    private long   overdueComplaints;
    private double avgResolutionDays;
    private String topDepartment;
    private String lowestPerformingDepartment;
}