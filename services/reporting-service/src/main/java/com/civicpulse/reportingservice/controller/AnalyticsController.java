package com.civicpulse.reportingservice.controller;

import com.civicpulse.reportingservice.dto.AnalyticsSummaryDto;
import com.civicpulse.reportingservice.service.AnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/analytics")
@Tag(name = "Analytics", description = "Governance analytics and reporting endpoints")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    // ── Full executive summary ─────────────────────────────────────────────────
    @GetMapping("/summary")
    @Operation(summary = "Full governance analytics summary (Admin only)")
    public ResponseEntity<AnalyticsSummaryDto> getSummary(
            @AuthenticationPrincipal Jwt jwt) {
        String token = jwt.getTokenValue();
        return ResponseEntity.ok(analyticsService.buildSummary(token));
    }

    // ── Individual sections (for lazy loading on frontend) ─────────────────────
    @GetMapping("/grievances")
    @Operation(summary = "Grievance analytics only")
    public ResponseEntity<AnalyticsSummaryDto> getGrievanceAnalytics(
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(analyticsService.buildSummary(jwt.getTokenValue()));
    }

    @GetMapping("/welfare")
    @Operation(summary = "Welfare budget and scheme analytics only")
    public ResponseEntity<AnalyticsSummaryDto> getWelfareAnalytics(
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(analyticsService.buildSummary(jwt.getTokenValue()));
    }

    @GetMapping("/departments")
    @Operation(summary = "Department performance analytics")
    public ResponseEntity<AnalyticsSummaryDto> getDepartmentAnalytics(
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(analyticsService.buildSummary(jwt.getTokenValue()));
    }

    @GetMapping("/certificates")
    @Operation(summary = "Certificate processing analytics")
    public ResponseEntity<AnalyticsSummaryDto> getCertificateAnalytics(
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(analyticsService.buildSummary(jwt.getTokenValue()));
    }
}
