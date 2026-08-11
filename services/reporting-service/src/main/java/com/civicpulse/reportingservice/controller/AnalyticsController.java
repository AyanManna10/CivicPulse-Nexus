package com.civicpulse.reportingservice.controller;

import com.civicpulse.reportingservice.dto.AIResponse;
import com.civicpulse.reportingservice.dto.AnalyticsSummaryDto;
import com.civicpulse.reportingservice.dto.ComplaintSummary;
import com.civicpulse.reportingservice.service.AIAnalysisService;
import com.civicpulse.reportingservice.service.AnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@Tag(name = "Analytics", description = "Governance analytics and reporting endpoints")
public class AnalyticsController {

    private final AnalyticsService   analyticsService;
    private final AIAnalysisService  aiAnalysisService;

    public AnalyticsController(AnalyticsService analyticsService,
                               AIAnalysisService aiAnalysisService) {
        this.analyticsService  = analyticsService;
        this.aiAnalysisService = aiAnalysisService;
    }

    // ── Full executive summary ─────────────────────────────────────────────────
    @GetMapping("/summary")
    @Operation(summary = "Full governance analytics summary (Admin only)")
    public ResponseEntity<AnalyticsSummaryDto> getSummary(
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(analyticsService.buildSummary(jwt.getTokenValue()));
    }

    // ── Individual sections (kept for API gateway compatibility) ───────────────
    @GetMapping("/grievances")
    @Operation(summary = "Grievance analytics")
    public ResponseEntity<AnalyticsSummaryDto> getGrievanceAnalytics(
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(analyticsService.buildSummary(jwt.getTokenValue()));
    }

    @GetMapping("/welfare")
    @Operation(summary = "Welfare budget and scheme analytics")
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


    @PostMapping("/analyze-complaints")
    @Operation(summary = "AI-powered complaint dashboard analysis (Admin only)")
    public ResponseEntity<?> analyzeComplaints(
            @RequestBody ComplaintSummary summary,
            @AuthenticationPrincipal Jwt jwt) {
        try {
            AIResponse analysis = aiAnalysisService.analyzeComplaints(summary);
            return ResponseEntity.ok(analysis);
        } catch (RuntimeException e) {
            return ResponseEntity.status(503).body(
                    Map.of("error", e.getMessage())
            );
        } catch (Exception e) {
            return ResponseEntity.status(500).body(
                    Map.of("error", "Unexpected error during AI analysis")
            );
        }
    }
}