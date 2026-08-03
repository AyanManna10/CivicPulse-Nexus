package com.civicpulse.welfareservice.controller;

import com.civicpulse.welfareservice.dto.SchemeApplicationDtoRequest;
import com.civicpulse.welfareservice.dto.SchemeApplicationDtoResponse;
import com.civicpulse.welfareservice.service.SchemeApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/welfare/applications")
@Tag(name = "Scheme Applications", description = "Citizen scheme applications and officer verification")
public class SchemeApplicationController {

    private final SchemeApplicationService service;

    public SchemeApplicationController(SchemeApplicationService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Citizen submits application for a welfare scheme")
    public SchemeApplicationDtoResponse submitApplication(
            @Valid @RequestBody SchemeApplicationDtoRequest request) {
        return service.submitApplication(request);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get application by ID")
    public SchemeApplicationDtoResponse getApplicationById(@PathVariable Long id) {
        return service.getApplicationById(id);
    }

    @GetMapping("/citizen/{citizenId}")
    @Operation(summary = "Get all applications for a citizen")
    public List<SchemeApplicationDtoResponse> getApplicationsByCitizen(
            @PathVariable Long citizenId) {
        return service.getApplicationsByCitizen(citizenId);
    }

    @GetMapping("/scheme/{schemeId}")
    @Operation(summary = "Get all applications for a scheme (Admin / Officer)")
    public List<SchemeApplicationDtoResponse> getApplicationsByScheme(
            @PathVariable Long schemeId) {
        return service.getApplicationsByScheme(schemeId);
    }

    @GetMapping("/scheme/{schemeId}/pending")
    @Operation(summary = "Get pending applications for a scheme (Officer view)")
    public List<SchemeApplicationDtoResponse> getPendingApplicationsByScheme(
            @PathVariable Long schemeId) {
        return service.getPendingApplicationsByScheme(schemeId);
    }

    @PutMapping("/{id}/verify")
    @Operation(summary = "Officer approves application and auto-creates beneficiary")
    public ResponseEntity<?> verifyApplication(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {
        String reviewedBy = jwt.getClaimAsString("preferred_username");
        SchemeApplicationDtoResponse result = service.verifyApplication(id, reviewedBy);
        return ResponseEntity.ok(Map.of(
                "application", result,
                "message", "Application approved — beneficiary record created automatically"
        ));
    }

    @PutMapping("/{id}/reject")
    @Operation(summary = "Officer rejects application with reason")
    public ResponseEntity<?> rejectApplication(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal Jwt jwt) {
        String rejectionReason = body.getOrDefault("rejectionReason", "No reason provided");
        String reviewedBy = jwt.getClaimAsString("preferred_username");
        SchemeApplicationDtoResponse result = service.rejectApplication(id, reviewedBy, rejectionReason);
        return ResponseEntity.ok(Map.of(
                "application", result,
                "message", "Application rejected"
        ));
    }

    // ── NEW: Citizen withdraws a PENDING application ──────────────────────────
    @PutMapping("/{id}/withdraw")
    @Operation(summary = "Citizen withdraws their own PENDING application")
    public ResponseEntity<?> withdrawApplication(
            @PathVariable Long id,
            @RequestBody Map<String, Long> body,
            @AuthenticationPrincipal Jwt jwt) {
        Long citizenId = body.get("citizenId");
        if (citizenId == null)
            return ResponseEntity.badRequest().body(Map.of("error", "citizenId is required"));
        SchemeApplicationDtoResponse result = service.withdrawApplication(id, citizenId);
        return ResponseEntity.ok(Map.of(
                "application", result,
                "message", "Application withdrawn successfully"
        ));
    }

    // ── NEW: Citizen resubmits a REJECTED application ─────────────────────────
    @PutMapping("/{id}/resubmit")
    @Operation(summary = "Citizen resubmits a REJECTED application (resets to PENDING)")
    public ResponseEntity<?> resubmitApplication(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal Jwt jwt) {
        Long citizenId = body.get("citizenId") != null
                ? Long.valueOf(body.get("citizenId").toString()) : null;
        String remarks = body.get("remarks") != null
                ? body.get("remarks").toString() : null;
        if (citizenId == null)
            return ResponseEntity.badRequest().body(Map.of("error", "citizenId is required"));
        SchemeApplicationDtoResponse result = service.resubmitApplication(id, citizenId, remarks);
        return ResponseEntity.ok(Map.of(
                "application", result,
                "message", "Application resubmitted — officer will review again"
        ));
    }
}