package com.civicpulse.reportingservice.service;
import com.civicpulse.reportingservice.dto.AnalyticsSummaryDto;
import com.civicpulse.reportingservice.dto.AnalyticsSummaryDto.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsService.class);

    private final RestTemplate restTemplate;

    @Value("${services.citizen-url}")     private String citizenUrl;
    @Value("${services.grievance-url}")   private String grievanceUrl;
    @Value("${services.certificate-url}") private String certificateUrl;
    @Value("${services.welfare-url}")     private String welfareUrl;

    public AnalyticsService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public AnalyticsSummaryDto buildSummary(String authToken) {
        log.info("Building analytics summary");

        // Fetch base data
        List<Map<String, Object>> grievances   = fetchList(grievanceUrl   + "/api/grievances", authToken);
        List<Map<String, Object>> certificates = fetchList(certificateUrl + "/api/certificates", authToken);
        List<Map<String, Object>> schemes      = fetchList(welfareUrl     + "/api/welfare/schemes", authToken);
        List<Map<String, Object>> citizens     = fetchList(citizenUrl     + "/api/citizens", authToken);

        // Fetch per-scheme data (no bare list endpoints exist)
        List<Map<String, Object>> welfareApps = schemes.stream()
                .flatMap(s -> {
                    Object id = s.get("id");
                    if (id == null) return java.util.stream.Stream.of();
                    return fetchList(welfareUrl + "/api/welfare/applications/scheme/" + id, authToken).stream();
                }).collect(Collectors.toList());

        List<Map<String, Object>> beneficiaries = schemes.stream()
                .flatMap(s -> {
                    Object id = s.get("id");
                    if (id == null) return java.util.stream.Stream.of();
                    return fetchList(welfareUrl + "/api/welfare/beneficiaries/scheme/" + id, authToken).stream();
                }).collect(Collectors.toList());

        List<Map<String, Object>> distributions = schemes.stream()
                .flatMap(s -> {
                    Object id = s.get("id");
                    if (id == null) return java.util.stream.Stream.of();
                    return fetchList(welfareUrl + "/api/welfare/distributions/scheme/" + id, authToken).stream();
                }).collect(Collectors.toList());

        // ── Grievance metrics ─────────────────────────────────────────────────
        long totalGrievances    = grievances.size();
        long resolvedGrievances = grievances.stream()
                .filter(g -> "RESOLVED".equals(g.get("status")) || "CLOSED".equals(g.get("status"))).count();
        long overdueGrievances  = grievances.stream()
                .filter(g -> "OVERDUE".equals(g.get("status"))).count();
        long openGrievances     = totalGrievances - resolvedGrievances;

        double slaPercent = totalGrievances > 0 ? (resolvedGrievances * 100.0 / totalGrievances) : 0.0;

        double avgResolutionDays = grievances.stream()
                .filter(g -> g.get("resolvedDate") != null && g.get("createdAt") != null)
                .mapToLong(g -> {
                    try {
                        LocalDate created  = LocalDate.parse(g.get("createdAt").toString().substring(0, 10));
                        LocalDate resolved = LocalDate.parse(g.get("resolvedDate").toString().substring(0, 10));
                        return Math.max(0, resolved.toEpochDay() - created.toEpochDay());
                    } catch (Exception e) { return 0L; }
                }).average().orElse(0.0);

        List<MonthlyCount> grievancesByMonth = buildMonthlyCount(grievances, "createdAt", 6);
        long thisMonth   = countThisMonth(grievances, "createdAt");
        long lastMonth   = countLastMonth(grievances, "createdAt");
        double complaintChange = lastMonth > 0 ? ((thisMonth - lastMonth) * 100.0 / lastMonth) : 0.0;

        // ── Certificate metrics ───────────────────────────────────────────────
        long totalCerts    = certificates.size();
        long approvedCerts = certificates.stream()
                .filter(c -> "APPROVED".equals(c.get("status"))
                          || "CERTIFICATE_GENERATED".equals(c.get("status"))
                          || "DOWNLOADED".equals(c.get("status"))).count();
        long rejectedCerts = certificates.stream().filter(c -> "REJECTED".equals(c.get("status"))).count();
        long pendingCerts  = totalCerts - approvedCerts - rejectedCerts;

        double avgProcessingDays = certificates.stream()
                .filter(c -> c.get("decidedAt") != null && c.get("appliedAt") != null)
                .mapToLong(c -> {
                    try {
                        LocalDate applied = LocalDate.parse(c.get("appliedAt").toString().substring(0, 10));
                        LocalDate decided = LocalDate.parse(c.get("decidedAt").toString().substring(0, 10));
                        return Math.max(0, decided.toEpochDay() - applied.toEpochDay());
                    } catch (Exception e) { return 0L; }
                }).average().orElse(0.0);

        List<MonthlyCount> certsByMonth = buildMonthlyCount(certificates, "appliedAt", 6);

        // ── Welfare metrics ───────────────────────────────────────────────────
        long totalWelfareApps    = welfareApps.size();
        long approvedWelfareApps = welfareApps.stream()
                .filter(a -> "APPROVED".equals(a.get("status"))).count();
        long totalBeneficiaries  = beneficiaries.size();

        double totalDisbursed = distributions.stream()
                .filter(d -> "PAID".equals(d.get("paymentStatus")))
                .mapToDouble(d -> safeDouble(d.get("amount"))).sum();

        double totalAllocated = schemes.stream()
                .mapToDouble(s -> safeDouble(s.get("budgetAllocated"))).sum();

        double budgetUtilization = totalAllocated > 0 ? (totalDisbursed * 100.0 / totalAllocated) : 0.0;

        List<SchemeUtilization> schemeUtils = schemes.stream().map(s -> {
            double allocated = safeDouble(s.get("budgetAllocated"));
            double disbursed = safeDouble(s.get("budgetDisbursed"));
            double util = allocated > 0 ? (disbursed * 100.0 / allocated) : 0.0;
            return SchemeUtilization.builder()
                    .schemeName(safeStr(s.get("name")))
                    .department(safeStr(s.get("department")))
                    .budgetAllocated(allocated)
                    .budgetDisbursed(disbursed)
                    .utilizationPercent(Math.round(util * 10.0) / 10.0)
                    .beneficiaryCount(safeLong(s.get("beneficiaryCount")))
                    .build();
        }).collect(Collectors.toList());

        // ── Citizen metrics ───────────────────────────────────────────────────
        long totalCitizens        = citizens.size();
        long activeCitizens       = citizens.stream().filter(c -> "ACTIVE".equals(c.get("status"))).count();
        long newCitizensThisMonth = countThisMonth(citizens, "createdAt");

        // ── Total requests ────────────────────────────────────────────────────
        long totalRequests = totalGrievances + totalCerts + totalWelfareApps;

        // ── Citizen satisfaction score ────────────────────────────────────────
        double certApprovalRate    = totalCerts > 0 ? (approvedCerts * 100.0 / totalCerts) : 0.0;
        double welfareApprovalRate = totalWelfareApps > 0 ? (approvedWelfareApps * 100.0 / totalWelfareApps) : 0.0;
        double satScore = ((slaPercent * 0.4) + (certApprovalRate * 0.3) + (welfareApprovalRate * 0.3)) / 20.0;
        satScore = Math.min(5.0, Math.round(satScore * 10.0) / 10.0);

        // ── Department performance ────────────────────────────────────────────
        List<DepartmentPerformance> deptPerformances =
                buildDeptPerformance(grievances, certificates, welfareApps);

        return AnalyticsSummaryDto.builder()
                .citizenSatisfactionScore(satScore)
                .serviceSlaPercent(Math.round(slaPercent * 10.0) / 10.0)
                .totalRevenueDisbursed(totalDisbursed)
                .budgetUtilizationPercent(Math.round(budgetUtilization * 10.0) / 10.0)
                .totalRequests(totalRequests)
                .complaintChangePercent(Math.round(complaintChange * 10.0) / 10.0)
                .totalGrievances(totalGrievances)
                .resolvedGrievances(resolvedGrievances)
                .overdueGrievances(overdueGrievances)
                .openGrievances(openGrievances)
                .avgResolutionDays(Math.round(avgResolutionDays * 10.0) / 10.0)
                .grievancesByMonth(grievancesByMonth)
                .totalCertificates(totalCerts)
                .approvedCertificates(approvedCerts)
                .rejectedCertificates(rejectedCerts)
                .pendingCertificates(pendingCerts)
                .avgProcessingDays(Math.round(avgProcessingDays * 10.0) / 10.0)
                .certificatesByMonth(certsByMonth)
                .totalWelfareApplications(totalWelfareApps)
                .approvedWelfareApplications(approvedWelfareApps)
                .totalBeneficiaries(totalBeneficiaries)
                .totalAmountDisbursed(totalDisbursed)
                .totalBudgetAllocated(totalAllocated)
                .schemeUtilizations(schemeUtils)
                .totalCitizens(totalCitizens)
                .activeCitizens(activeCitizens)
                .newCitizensThisMonth(newCitizensThisMonth)
                .departmentPerformances(deptPerformances)
                .build();
    }

    private List<DepartmentPerformance> buildDeptPerformance(
            List<Map<String, Object>> grievances,
            List<Map<String, Object>> certificates,
            List<Map<String, Object>> welfareApps) {

        List<String> departments = List.of(
                "Engineering Department", "Health Department",
                "Revenue Department", "Water Department", "Municipal Administration");

        return departments.stream().map(dept -> {
            List<Map<String, Object>> deptGrievances = grievances.stream()
                    .filter(g -> dept.equals(g.get("department"))).collect(Collectors.toList());
            long total    = deptGrievances.size();
            long resolved = deptGrievances.stream()
                    .filter(g -> "RESOLVED".equals(g.get("status")) || "CLOSED".equals(g.get("status"))).count();
            long breaches = deptGrievances.stream()
                    .filter(g -> "OVERDUE".equals(g.get("status"))).count();
            double resRate = total > 0 ? (resolved * 100.0 / total) : 0.0;
            double avgDays = deptGrievances.stream()
                    .filter(g -> g.get("resolvedDate") != null && g.get("createdAt") != null)
                    .mapToLong(g -> {
                        try {
                            LocalDate c = LocalDate.parse(g.get("createdAt").toString().substring(0, 10));
                            LocalDate r = LocalDate.parse(g.get("resolvedDate").toString().substring(0, 10));
                            return Math.max(0, r.toEpochDay() - c.toEpochDay());
                        } catch (Exception e) { return 0L; }
                    }).average().orElse(0.0);

            long certsProcessed   = certificates.stream()
                    .filter(c -> dept.equals(c.get("assignedDepartment"))).count();
            long welfareProcessed = welfareApps.stream()
                    .filter(a -> dept.equals(a.get("department"))).count();
            String rating = resRate >= 90 ? "EXCELLENT" : resRate >= 70 ? "GOOD" : "NEEDS_IMPROVEMENT";

            return DepartmentPerformance.builder()
                    .department(dept)
                    .totalGrievances(total)
                    .resolvedGrievances(resolved)
                    .resolutionRate(Math.round(resRate * 10.0) / 10.0)
                    .avgResolutionDays(Math.round(avgDays * 10.0) / 10.0)
                    .slaBreaches(breaches)
                    .certificatesProcessed(certsProcessed)
                    .welfareApplicationsProcessed(welfareProcessed)
                    .performanceRating(rating)
                    .build();
        }).collect(Collectors.toList());
    }

    private List<Map<String, Object>> fetchList(String url, String token) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + token);
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            var response = restTemplate.exchange(
                    url, HttpMethod.GET, entity,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {});
            return response.getBody() != null ? response.getBody() : List.of();
        } catch (Exception e) {
            log.warn("Failed to fetch from {}: {}", url, e.getMessage());
            return List.of();
        }
    }

    private List<MonthlyCount> buildMonthlyCount(
            List<Map<String, Object>> items, String dateField, int months) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMM yyyy");
        LocalDate now = LocalDate.now();
        List<MonthlyCount> result = new ArrayList<>();
        for (int i = months - 1; i >= 0; i--) {
            LocalDate month = now.minusMonths(i).withDayOfMonth(1);
            String label = month.format(fmt);
            String prefix = month.toString().substring(0, 7);
            long count = items.stream().filter(item -> {
                try { return item.get(dateField).toString().startsWith(prefix); }
                catch (Exception e) { return false; }
            }).count();
            result.add(new MonthlyCount(label, count));
        }
        return result;
    }

    private long countThisMonth(List<Map<String, Object>> items, String dateField) {
        String prefix = LocalDate.now().toString().substring(0, 7);
        return items.stream().filter(item -> {
            try { return item.get(dateField).toString().startsWith(prefix); }
            catch (Exception e) { return false; }
        }).count();
    }

    private long countLastMonth(List<Map<String, Object>> items, String dateField) {
        String prefix = LocalDate.now().minusMonths(1).toString().substring(0, 7);
        return items.stream().filter(item -> {
            try { return item.get(dateField).toString().startsWith(prefix); }
            catch (Exception e) { return false; }
        }).count();
    }

    private double safeDouble(Object o) {
        try { return o != null ? Double.parseDouble(o.toString()) : 0.0; }
        catch (Exception e) { return 0.0; }
    }

    private long safeLong(Object o) {
        try { return o != null ? Long.parseLong(o.toString()) : 0L; }
        catch (Exception e) { return 0L; }
    }

    private String safeStr(Object o) {
        return o != null ? o.toString() : "";
    }
}