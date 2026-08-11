package com.civicpulse.reportingservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsSummaryDto {

    // ── Top KPI Cards ──────────────────────────────────────────────────────────
    private double citizenSatisfactionScore;    // e.g. 4.7
    private double serviceSlaPercent;           // e.g. 94.0
    private double totalRevenueDisbursed;       // e.g. 12400000.0 (₹)
    private double budgetUtilizationPercent;    // e.g. 87.0
    private long   totalRequests;               // grievances + certificates + welfare apps
    private double complaintChangePercent;      // negative = decrease e.g. -23.0

    // ── Grievance Analytics ────────────────────────────────────────────────────
    private long   totalGrievances;
    private long   resolvedGrievances;
    private long   overdueGrievances;
    private long   openGrievances;
    private double avgResolutionDays;           // mean time to resolve
    private List<MonthlyCount> grievancesByMonth;

    // ── Certificate Analytics ──────────────────────────────────────────────────
    private long   totalCertificates;
    private long   approvedCertificates;
    private long   rejectedCertificates;
    private long   pendingCertificates;
    private double avgProcessingDays;
    private List<MonthlyCount> certificatesByMonth;

    // ── Welfare Analytics ──────────────────────────────────────────────────────
    private long   totalWelfareApplications;
    private long   approvedWelfareApplications;
    private long   totalBeneficiaries;
    private double totalAmountDisbursed;
    private double totalBudgetAllocated;
    private List<SchemeUtilization> schemeUtilizations;

    // ── Citizen Analytics ──────────────────────────────────────────────────────
    private long   totalCitizens;
    private long   activeCitizens;
    private long   newCitizensThisMonth;

    // ── Department Performance ─────────────────────────────────────────────────
    private List<DepartmentPerformance> departmentPerformances;

    // ── Nested DTOs ────────────────────────────────────────────────────────────

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MonthlyCount {
        private String month;   // e.g. "Jan 2026"
        private long count;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SchemeUtilization {
        private String schemeName;
        private String department;
        private double budgetAllocated;
        private double budgetDisbursed;
        private double utilizationPercent;
        private long   beneficiaryCount;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DepartmentPerformance {
        private String department;
        private long   totalGrievances;
        private long   resolvedGrievances;
        private double resolutionRate;          // percent
        private double avgResolutionDays;
        private long   slaBreaches;
        private long   certificatesProcessed;
        private long   welfareApplicationsProcessed;
        private String performanceRating;       // EXCELLENT / GOOD / NEEDS_IMPROVEMENT
    }
}
