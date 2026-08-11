package com.civicpulse.reportingservice.service;

import com.civicpulse.reportingservice.dto.AnalyticsSummaryDto;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.springframework.cache.annotation.Cacheable;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class AIReportService {

    private static final Logger log = LoggerFactory.getLogger(AIReportService.class);
    private static final int REPORT_DAILY_LIMIT = 20;

    private final GroqService groqService;
    private final AnalyticsService analyticsService;
    private final ObjectMapper objectMapper;

    // Separate daily counter for reports (limit 20/day)
    private final AtomicInteger reportDailyCount = new AtomicInteger(0);
    private volatile long reportCounterResetTime = todayMidnight();

    public AIReportService(GroqService groqService,
                           AnalyticsService analyticsService,
                           ObjectMapper objectMapper) {
        this.groqService      = groqService;
        this.analyticsService = analyticsService;
        this.objectMapper     = objectMapper;
    }

    // ── Daily counter ──────────────────────────────────────────────────────────

    private long todayMidnight() {
        return java.time.LocalDate.now()
                .atStartOfDay(java.time.ZoneId.systemDefault())
                .toEpochSecond() * 1000L;
    }

    private void checkDailyLimit() {
        long now = System.currentTimeMillis();
        if (now >= reportCounterResetTime + 86_400_000L) {
            reportDailyCount.set(0);
            reportCounterResetTime = todayMidnight();
            log.info("AI report daily counter reset");
        }
        if (reportDailyCount.get() >= REPORT_DAILY_LIMIT) {
            throw new RuntimeException(
                "Daily AI report limit of " + REPORT_DAILY_LIMIT + " reached. Resets at midnight.");
        }
        reportDailyCount.incrementAndGet();
    }

    // ── Public report methods ──────────────────────────────────────────────────

    @Cacheable(value = "ai-reports", key = "'grievance'")
    public Map<String, Object> generateGrievanceReport(String authToken) {
        checkDailyLimit();
        AnalyticsSummaryDto summary = analyticsService.buildSummary(authToken);

        String deptBreakdown = buildDeptBreakdown(summary);
        String monthlyTrend  = buildMonthlyTrend(summary.getGrievancesByMonth());

        String prompt = """
            You are a government analytics AI. Analyze this grievance data and return ONLY valid JSON.
            
            GRIEVANCE DATA:
            - Total Grievances: %d
            - Resolved: %d (%.1f%% resolution rate)
            - Open: %d
            - Overdue (SLA breached): %d
            - Average Resolution Days: %.1f
            - SLA Compliance: %.1f%%
            - Department Breakdown: %s
            - Monthly Trend (last 6 months): %s
            
            Return ONLY this JSON structure (no markdown, no explanation):
            {
              "reportType": "GRIEVANCE",
              "generatedAt": %d,
              "headline": "<one sentence executive summary>",
              "performance": "<Excellent|Good|Needs Improvement>",
              "keyMetrics": [
                {"label": "Total Grievances", "value": "%d", "trend": "<UP|DOWN|STABLE>", "insight": "<short note>"},
                {"label": "Resolution Rate", "value": "%.1f%%", "trend": "<UP|DOWN|STABLE>", "insight": "<short note>"},
                {"label": "Overdue", "value": "%d", "trend": "<UP|DOWN|STABLE>", "insight": "<short note>"},
                {"label": "Avg Resolution Days", "value": "%.1f", "trend": "<UP|DOWN|STABLE>", "insight": "<short note>"}
              ],
              "chartData": [%s],
              "analysis": "<3-4 sentence detailed AI analysis>",
              "predictions": ["<prediction 1>", "<prediction 2>"],
              "recommendations": ["<rec 1>", "<rec 2>", "<rec 3>"],
              "riskLevel": "<LOW|MEDIUM|HIGH>",
              "riskNote": "<1-2 sentence risk note>"
            }
            """.formatted(
                summary.getTotalGrievances(),
                summary.getResolvedGrievances(),
                safePercent(summary.getResolvedGrievances(), summary.getTotalGrievances()),
                summary.getOpenGrievances(),
                summary.getOverdueGrievances(),
                summary.getAvgResolutionDays(),
                summary.getServiceSlaPercent(),
                deptBreakdown,
                monthlyTrend,
                Instant.now().toEpochMilli(),
                summary.getTotalGrievances(),
                safePercent(summary.getResolvedGrievances(), summary.getTotalGrievances()),
                summary.getOverdueGrievances(),
                summary.getAvgResolutionDays(),
                buildDeptChartJson(summary)
        );

        return callAndParse(prompt, "GRIEVANCE");
    }

    @Cacheable(value = "ai-reports", key = "'citizen'")
    public Map<String, Object> generateCitizenReport(String authToken) {
        checkDailyLimit();
        AnalyticsSummaryDto summary = analyticsService.buildSummary(authToken);

        double welfareApprovalRate = safePercent(
                summary.getApprovedWelfareApplications(), summary.getTotalWelfareApplications());

        String prompt = """
            You are a government analytics AI. Analyze this citizen data and return ONLY valid JSON.
            
            CITIZEN DATA:
            - Total Registered Citizens: %d
            - Active Citizens: %d (%.1f%% active rate)
            - New Citizens This Month: %d
            - Welfare Beneficiaries: %d
            - Total Welfare Applications: %d
            - Welfare Approval Rate: %.1f%%
            - Total Grievances Filed: %d
            - Citizen Satisfaction Score: %.1f/5
            
            Return ONLY this JSON structure (no markdown, no explanation):
            {
              "reportType": "CITIZEN",
              "generatedAt": %d,
              "headline": "<one sentence executive summary>",
              "performance": "<Excellent|Good|Needs Improvement>",
              "keyMetrics": [
                {"label": "Total Citizens", "value": "%d", "trend": "<UP|DOWN|STABLE>", "insight": "<short note>"},
                {"label": "Active Citizens", "value": "%d", "trend": "<UP|DOWN|STABLE>", "insight": "<short note>"},
                {"label": "New This Month", "value": "%d", "trend": "<UP|DOWN|STABLE>", "insight": "<short note>"},
                {"label": "Welfare Beneficiaries", "value": "%d", "trend": "<UP|DOWN|STABLE>", "insight": "<short note>"}
              ],
              "chartData": [
                {"label": "Active", "value": %d, "secondary": 0},
                {"label": "Inactive", "value": %d, "secondary": 0},
                {"label": "Beneficiaries", "value": %d, "secondary": 0}
              ],
              "analysis": "<3-4 sentence detailed AI analysis>",
              "predictions": ["<prediction 1>", "<prediction 2>"],
              "recommendations": ["<rec 1>", "<rec 2>", "<rec 3>"],
              "riskLevel": "<LOW|MEDIUM|HIGH>",
              "riskNote": "<1-2 sentence risk note>"
            }
            """.formatted(
                summary.getTotalCitizens(),
                summary.getActiveCitizens(),
                safePercent(summary.getActiveCitizens(), summary.getTotalCitizens()),
                summary.getNewCitizensThisMonth(),
                summary.getTotalBeneficiaries(),
                summary.getTotalWelfareApplications(),
                welfareApprovalRate,
                summary.getTotalGrievances(),
                summary.getCitizenSatisfactionScore(),
                Instant.now().toEpochMilli(),
                summary.getTotalCitizens(),
                summary.getActiveCitizens(),
                summary.getNewCitizensThisMonth(),
                summary.getTotalBeneficiaries(),
                summary.getActiveCitizens(),
                summary.getTotalCitizens() - summary.getActiveCitizens(),
                summary.getTotalBeneficiaries()
        );

        return callAndParse(prompt, "CITIZEN");
    }

    @Cacheable(value = "ai-reports", key = "'budget'")
    public Map<String, Object> generateBudgetReport(String authToken) {
        checkDailyLimit();
        AnalyticsSummaryDto summary = analyticsService.buildSummary(authToken);

        String schemeBreakdown = buildSchemeBreakdown(summary);

        String prompt = """
            You are a government analytics AI. Analyze this budget/welfare data and return ONLY valid JSON.
            
            BUDGET DATA:
            - Total Budget Allocated: ₹%.0f
            - Total Amount Disbursed: ₹%.0f
            - Budget Utilization: %.1f%%
            - Budget Remaining: ₹%.0f
            - Total Welfare Applications: %d
            - Approved Applications: %d (%.1f%% approval rate)
            - Total Beneficiaries: %d
            - Scheme Breakdown: %s
            
            Return ONLY this JSON structure (no markdown, no explanation):
            {
              "reportType": "BUDGET",
              "generatedAt": %d,
              "headline": "<one sentence executive summary>",
              "performance": "<Excellent|Good|Needs Improvement>",
              "keyMetrics": [
                {"label": "Total Allocated", "value": "₹%.0f", "trend": "<UP|DOWN|STABLE>", "insight": "<short note>"},
                {"label": "Disbursed", "value": "₹%.0f", "trend": "<UP|DOWN|STABLE>", "insight": "<short note>"},
                {"label": "Utilization", "value": "%.1f%%", "trend": "<UP|DOWN|STABLE>", "insight": "<short note>"},
                {"label": "Beneficiaries", "value": "%d", "trend": "<UP|DOWN|STABLE>", "insight": "<short note>"}
              ],
              "chartData": [%s],
              "analysis": "<3-4 sentence detailed AI analysis>",
              "predictions": ["<prediction 1>", "<prediction 2>"],
              "recommendations": ["<rec 1>", "<rec 2>", "<rec 3>"],
              "riskLevel": "<LOW|MEDIUM|HIGH>",
              "riskNote": "<1-2 sentence risk note>"
            }
            """.formatted(
                summary.getTotalBudgetAllocated(),
                summary.getTotalAmountDisbursed(),
                summary.getBudgetUtilizationPercent(),
                summary.getTotalBudgetAllocated() - summary.getTotalAmountDisbursed(),
                summary.getTotalWelfareApplications(),
                summary.getApprovedWelfareApplications(),
                safePercent(summary.getApprovedWelfareApplications(), summary.getTotalWelfareApplications()),
                summary.getTotalBeneficiaries(),
                schemeBreakdown,
                Instant.now().toEpochMilli(),
                summary.getTotalBudgetAllocated(),
                summary.getTotalAmountDisbursed(),
                summary.getBudgetUtilizationPercent(),
                summary.getTotalBeneficiaries(),
                buildSchemeChartJson(summary)
        );

        return callAndParse(prompt, "BUDGET");
    }

    @Cacheable(value = "ai-reports", key = "'certificate'")
    public Map<String, Object> generateCertificateReport(String authToken) {
        checkDailyLimit();
        AnalyticsSummaryDto summary = analyticsService.buildSummary(authToken);

        String monthlyTrend = buildMonthlyTrend(summary.getCertificatesByMonth());

        String prompt = """
            You are a government analytics AI. Analyze this certificate data and return ONLY valid JSON.
            
            CERTIFICATE DATA:
            - Total Applications: %d
            - Approved / Issued: %d (%.1f%% approval rate)
            - Rejected: %d (%.1f%% rejection rate)
            - Pending: %d
            - Average Processing Days: %.1f
            - Monthly Issuance Trend: %s
            
            Return ONLY this JSON structure (no markdown, no explanation):
            {
              "reportType": "CERTIFICATE",
              "generatedAt": %d,
              "headline": "<one sentence executive summary>",
              "performance": "<Excellent|Good|Needs Improvement>",
              "keyMetrics": [
                {"label": "Total Applications", "value": "%d", "trend": "<UP|DOWN|STABLE>", "insight": "<short note>"},
                {"label": "Approval Rate", "value": "%.1f%%", "trend": "<UP|DOWN|STABLE>", "insight": "<short note>"},
                {"label": "Pending", "value": "%d", "trend": "<UP|DOWN|STABLE>", "insight": "<short note>"},
                {"label": "Avg Processing Days", "value": "%.1f", "trend": "<UP|DOWN|STABLE>", "insight": "<short note>"}
              ],
              "chartData": [
                {"label": "Approved", "value": %d, "secondary": 0},
                {"label": "Pending", "value": %d, "secondary": 0},
                {"label": "Rejected", "value": %d, "secondary": 0}
              ],
              "analysis": "<3-4 sentence detailed AI analysis>",
              "predictions": ["<prediction 1>", "<prediction 2>"],
              "recommendations": ["<rec 1>", "<rec 2>", "<rec 3>"],
              "riskLevel": "<LOW|MEDIUM|HIGH>",
              "riskNote": "<1-2 sentence risk note>"
            }
            """.formatted(
                summary.getTotalCertificates(),
                summary.getApprovedCertificates(),
                safePercent(summary.getApprovedCertificates(), summary.getTotalCertificates()),
                summary.getRejectedCertificates(),
                safePercent(summary.getRejectedCertificates(), summary.getTotalCertificates()),
                summary.getPendingCertificates(),
                summary.getAvgProcessingDays(),
                monthlyTrend,
                Instant.now().toEpochMilli(),
                summary.getTotalCertificates(),
                safePercent(summary.getApprovedCertificates(), summary.getTotalCertificates()),
                summary.getPendingCertificates(),
                summary.getAvgProcessingDays(),
                summary.getApprovedCertificates(),
                summary.getPendingCertificates(),
                summary.getRejectedCertificates()
        );

        return callAndParse(prompt, "CERTIFICATE");
    }

    @Cacheable(value = "ai-reports", key = "'department'")
    public Map<String, Object> generateDepartmentReport(String authToken) {
        checkDailyLimit();
        AnalyticsSummaryDto summary = analyticsService.buildSummary(authToken);

        String deptDetails = buildFullDeptDetails(summary);

        String prompt = """
            You are a government analytics AI. Analyze this department performance data and return ONLY valid JSON.
            
            DEPARTMENT PERFORMANCE DATA:
            %s
            
            Overall SLA Compliance: %.1f%%
            Total Grievances System-wide: %d
            
            Return ONLY this JSON structure (no markdown, no explanation):
            {
              "reportType": "DEPARTMENT",
              "generatedAt": %d,
              "headline": "<one sentence executive summary>",
              "performance": "<Excellent|Good|Needs Improvement>",
              "keyMetrics": [
                {"label": "Best Department", "value": "<dept name>", "trend": "STABLE", "insight": "<short note>"},
                {"label": "Needs Attention", "value": "<dept name>", "trend": "DOWN", "insight": "<short note>"},
                {"label": "SLA Compliance", "value": "%.1f%%", "trend": "<UP|DOWN|STABLE>", "insight": "<short note>"},
                {"label": "Avg Resolution Days", "value": "%.1f", "trend": "<UP|DOWN|STABLE>", "insight": "<short note>"}
              ],
              "chartData": [%s],
              "analysis": "<3-4 sentence detailed AI analysis>",
              "predictions": ["<prediction 1>", "<prediction 2>"],
              "recommendations": ["<rec 1>", "<rec 2>", "<rec 3>"],
              "riskLevel": "<LOW|MEDIUM|HIGH>",
              "riskNote": "<1-2 sentence risk note>"
            }
            """.formatted(
                deptDetails,
                summary.getServiceSlaPercent(),
                summary.getTotalGrievances(),
                Instant.now().toEpochMilli(),
                summary.getServiceSlaPercent(),
                summary.getAvgResolutionDays(),
                buildDeptChartJson(summary)
        );

        return callAndParse(prompt, "DEPARTMENT");
    }

    @Cacheable(value = "ai-reports", key = "'satisfaction'")
    public Map<String, Object> generateSatisfactionReport(String authToken) {
        checkDailyLimit();
        AnalyticsSummaryDto summary = analyticsService.buildSummary(authToken);

        double certApprovalRate   = safePercent(summary.getApprovedCertificates(), summary.getTotalCertificates());
        double welfareApprovalRate = safePercent(summary.getApprovedWelfareApplications(), summary.getTotalWelfareApplications());

        String prompt = """
            You are a government analytics AI. Analyze this citizen satisfaction data and return ONLY valid JSON.
            
            SATISFACTION DATA:
            - Citizen Satisfaction Score: %.1f / 5.0
            - Service SLA Compliance: %.1f%%
            - Grievance Resolution Rate: %.1f%%
            - Overdue Grievances: %d
            - Certificate Approval Rate: %.1f%%
            - Welfare Approval Rate: %.1f%%
            - Complaint Change vs Last Month: %.1f%% (%s)
            - Average Resolution Days: %.1f
            - Total Citizens Served: %d
            
            Return ONLY this JSON structure (no markdown, no explanation):
            {
              "reportType": "SATISFACTION",
              "generatedAt": %d,
              "headline": "<one sentence executive summary>",
              "performance": "<Excellent|Good|Needs Improvement>",
              "keyMetrics": [
                {"label": "Satisfaction Score", "value": "%.1f/5", "trend": "<UP|DOWN|STABLE>", "insight": "<short note>"},
                {"label": "SLA Compliance", "value": "%.1f%%", "trend": "<UP|DOWN|STABLE>", "insight": "<short note>"},
                {"label": "Cert Approval Rate", "value": "%.1f%%", "trend": "<UP|DOWN|STABLE>", "insight": "<short note>"},
                {"label": "Complaint Trend", "value": "%.1f%%", "trend": "<UP|DOWN|STABLE>", "insight": "<short note>"}
              ],
              "chartData": [
                {"label": "Satisfaction", "value": %d, "secondary": 100},
                {"label": "SLA", "value": %d, "secondary": 100},
                {"label": "Cert Approval", "value": %d, "secondary": 100},
                {"label": "Welfare Approval", "value": %d, "secondary": 100}
              ],
              "analysis": "<3-4 sentence detailed AI analysis>",
              "predictions": ["<prediction 1>", "<prediction 2>"],
              "recommendations": ["<rec 1>", "<rec 2>", "<rec 3>"],
              "riskLevel": "<LOW|MEDIUM|HIGH>",
              "riskNote": "<1-2 sentence risk note>"
            }
            """.formatted(
                summary.getCitizenSatisfactionScore(),
                summary.getServiceSlaPercent(),
                safePercent(summary.getResolvedGrievances(), summary.getTotalGrievances()),
                summary.getOverdueGrievances(),
                certApprovalRate,
                welfareApprovalRate,
                Math.abs(summary.getComplaintChangePercent()),
                summary.getComplaintChangePercent() < 0 ? "decrease - good" : "increase - concerning",
                summary.getAvgResolutionDays(),
                summary.getTotalCitizens(),
                Instant.now().toEpochMilli(),
                summary.getCitizenSatisfactionScore(),
                summary.getServiceSlaPercent(),
                certApprovalRate,
                summary.getComplaintChangePercent(),
                (int)(summary.getCitizenSatisfactionScore() * 20),
                (int) summary.getServiceSlaPercent(),
                (int) certApprovalRate,
                (int) welfareApprovalRate
        );

        return callAndParse(prompt, "SATISFACTION");
    }

    // ── Groq call + JSON parse ─────────────────────────────────────────────────

    private Map<String, Object> callAndParse(String prompt, String reportType) {
        try {
            String raw = groqService.callGroq(prompt);
            String cleaned = extractJson(raw);
            Map<String, Object> result = objectMapper.readValue(
                    cleaned, new TypeReference<Map<String, Object>>() {});
            result.putIfAbsent("reportType", reportType);
            result.putIfAbsent("generatedAt", Instant.now().toEpochMilli());
            return result;
        } catch (Exception e) {
            log.error("AI report generation failed for {}: {}", reportType, e.getMessage());
            throw new RuntimeException("AI report generation failed for " + reportType
                    + ": " + e.getMessage(), e);
        }
    }

    private String extractJson(String raw) {
        if (raw == null) throw new RuntimeException("Groq returned null response");
        // Strip markdown code fences if present
        String stripped = raw.strip();
        if (stripped.startsWith("```")) {
            int start = stripped.indexOf('{');
            int end   = stripped.lastIndexOf('}');
            if (start >= 0 && end > start) return stripped.substring(start, end + 1);
        }
        int start = stripped.indexOf('{');
        int end   = stripped.lastIndexOf('}');
        if (start >= 0 && end > start) return stripped.substring(start, end + 1);
        return stripped;
    }

    // ── Helper builders ────────────────────────────────────────────────────────

    private double safePercent(long part, long total) {
        return total == 0 ? 0.0 : Math.round((part * 100.0 / total) * 10) / 10.0;
    }

    private String buildDeptBreakdown(AnalyticsSummaryDto summary) {
        if (summary.getDepartmentPerformances() == null) return "No department data";
        StringBuilder sb = new StringBuilder();
        summary.getDepartmentPerformances().forEach(d ->
            sb.append(d.getDepartment())
              .append(": ").append(d.getTotalGrievances()).append(" total, ")
              .append(d.getResolvedGrievances()).append(" resolved, ")
              .append(String.format("%.0f%%", d.getResolutionRate())).append(" rate, ")
              .append(d.getSlaBreaches()).append(" SLA breaches; ")
        );
        return sb.toString();
    }

    private String buildDeptChartJson(AnalyticsSummaryDto summary) {
        if (summary.getDepartmentPerformances() == null) return "";
        StringBuilder sb = new StringBuilder();
        summary.getDepartmentPerformances().forEach(d -> {
            if (sb.length() > 0) sb.append(",");
            sb.append(String.format(
                "{\"label\":\"%s\",\"value\":%d,\"secondary\":%d}",
                d.getDepartment().replace(" Department", ""),
                d.getTotalGrievances(),
                d.getSlaBreaches()
            ));
        });
        return sb.toString();
    }

    private String buildFullDeptDetails(AnalyticsSummaryDto summary) {
        if (summary.getDepartmentPerformances() == null) return "No department data";
        StringBuilder sb = new StringBuilder();
        summary.getDepartmentPerformances().forEach(d ->
            sb.append(String.format(
                "- %s: %d grievances, %d resolved, %.1f%% rate, %.1f avg days, %d SLA breaches, rating: %s, certs: %d, welfare: %d%n",
                d.getDepartment(), d.getTotalGrievances(), d.getResolvedGrievances(),
                d.getResolutionRate(), d.getAvgResolutionDays(), d.getSlaBreaches(),
                d.getPerformanceRating(), d.getCertificatesProcessed(), d.getWelfareApplicationsProcessed()
            ))
        );
        return sb.toString();
    }

    private String buildSchemeBreakdown(AnalyticsSummaryDto summary) {
        if (summary.getSchemeUtilizations() == null) return "No scheme data";
        StringBuilder sb = new StringBuilder();
        summary.getSchemeUtilizations().forEach(s ->
            sb.append(s.getSchemeName())
              .append(": allocated ₹").append(String.format("%.0f", s.getBudgetAllocated()))
              .append(", disbursed ₹").append(String.format("%.0f", s.getBudgetDisbursed()))
              .append(String.format(" (%.1f%% utilized)", s.getUtilizationPercent()))
              .append(", ").append(s.getBeneficiaryCount()).append(" beneficiaries; ")
        );
        return sb.toString();
    }

    private String buildSchemeChartJson(AnalyticsSummaryDto summary) {
        if (summary.getSchemeUtilizations() == null) return "";
        StringBuilder sb = new StringBuilder();
        summary.getSchemeUtilizations().forEach(s -> {
            if (sb.length() > 0) sb.append(",");
            sb.append(String.format(
                "{\"label\":\"%s\",\"value\":%.0f,\"secondary\":%.0f}",
                s.getSchemeName(), s.getBudgetDisbursed(), s.getBudgetAllocated()
            ));
        });
        return sb.toString();
    }

    private String buildMonthlyTrend(List<AnalyticsSummaryDto.MonthlyCount> months) {
        if (months == null || months.isEmpty()) return "No trend data";
        StringBuilder sb = new StringBuilder();
        months.forEach(m -> sb.append(m.getMonth()).append(": ").append(m.getCount()).append("; "));
        return sb.toString();
    }
}