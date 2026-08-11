package com.civicpulse.reportingservice.controller;

import com.civicpulse.reportingservice.service.AIReportService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/analytics/report")
public class AIReportController {

    private static final Logger log = LoggerFactory.getLogger(AIReportController.class);

    private final AIReportService aiReportService;

    public AIReportController(AIReportService aiReportService) {
        this.aiReportService = aiReportService;
    }

    // ── Helper: extract JWT token from Authorization header ────────────────────

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return "";
    }

    // ── GET /api/analytics/report/grievance ────────────────────────────────────

    @GetMapping("/grievance")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> grievanceReport(HttpServletRequest request) {
        log.info("AI Grievance Report requested");
        try {
            Map<String, Object> report = aiReportService.generateGrievanceReport(extractToken(request));
            return ResponseEntity.ok(report);
        } catch (RuntimeException e) {
            log.error("Grievance report failed: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage(), "reportType", "GRIEVANCE"));
        }
    }

    // ── GET /api/analytics/report/citizen ─────────────────────────────────────

    @GetMapping("/citizen")
    @PreAuthorize("hasRole('ADMIN')")

    public ResponseEntity<Map<String, Object>> citizenReport(HttpServletRequest request) {
        log.info("AI Citizen Report requested");
        try {
            Map<String, Object> report = aiReportService.generateCitizenReport(extractToken(request));
            return ResponseEntity.ok(report);
        } catch (RuntimeException e) {
            log.error("Citizen report failed: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage(), "reportType", "CITIZEN"));
        }
    }

    // ── GET /api/analytics/report/budget ──────────────────────────────────────

    @GetMapping("/budget")
    @PreAuthorize("hasRole('ADMIN')")

    public ResponseEntity<Map<String, Object>> budgetReport(HttpServletRequest request) {
        log.info("AI Budget Report requested");
        try {
            Map<String, Object> report = aiReportService.generateBudgetReport(extractToken(request));
            return ResponseEntity.ok(report);
        } catch (RuntimeException e) {
            log.error("Budget report failed: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage(), "reportType", "BUDGET"));
        }
    }

    // ── GET /api/analytics/report/certificate ─────────────────────────────────

    @GetMapping("/certificate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> certificateReport(HttpServletRequest request) {
        log.info("AI Certificate Report requested");
        try {
            Map<String, Object> report = aiReportService.generateCertificateReport(extractToken(request));
            return ResponseEntity.ok(report);
        } catch (RuntimeException e) {
            log.error("Certificate report failed: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage(), "reportType", "CERTIFICATE"));
        }
    }

    // ── GET /api/analytics/report/department ──────────────────────────────────

    @GetMapping("/department")
    @PreAuthorize("hasRole('ADMIN')")

    public ResponseEntity<Map<String, Object>> departmentReport(HttpServletRequest request) {
        log.info("AI Department Report requested");
        try {
            Map<String, Object> report = aiReportService.generateDepartmentReport(extractToken(request));
            return ResponseEntity.ok(report);
        } catch (RuntimeException e) {
            log.error("Department report failed: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage(), "reportType", "DEPARTMENT"));
        }
    }

    // ── GET /api/analytics/report/satisfaction ────────────────────────────────

    @GetMapping("/satisfaction")
    @PreAuthorize("hasRole('ADMIN')")

    public ResponseEntity<Map<String, Object>> satisfactionReport(HttpServletRequest request) {
        log.info("AI Satisfaction Report requested");
        try {
            Map<String, Object> report = aiReportService.generateSatisfactionReport(extractToken(request));
            return ResponseEntity.ok(report);
        } catch (RuntimeException e) {
            log.error("Satisfaction report failed: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage(), "reportType", "SATISFACTION"));
        }
    }
}