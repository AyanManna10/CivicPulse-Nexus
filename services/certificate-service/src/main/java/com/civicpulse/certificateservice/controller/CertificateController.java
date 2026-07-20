package com.civicpulse.certificateservice.controller;

import com.civicpulse.certificateservice.dto.*;
import com.civicpulse.certificateservice.entity.CertificateStatus;
import com.civicpulse.certificateservice.entity.CertificateType;
import com.civicpulse.certificateservice.service.CertificateService;

import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/certificates")
public class CertificateController {

    private final CertificateService service;

    public CertificateController(CertificateService service) {
        this.service = service;
    }

    // ── CITIZEN ENDPOINTS ─────────────────────────────────────────────────────

    /** Citizen submits an application themselves */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CertificateResponse apply(@Valid @RequestBody CertificateRequest request,
                                      @AuthenticationPrincipal Jwt jwt) {
        String username = jwt != null ? jwt.getClaimAsString("preferred_username") : "unknown";
        return service.apply(request, username);
    }

    /** Citizen views their own applications (scoped by citizenId) */
    @GetMapping("/citizen/{citizenId}")
    public List<CertificateResponse> getByCitizen(@PathVariable Long citizenId) {
        return service.getByCitizen(citizenId);
    }

    /** Single application detail */
    @GetMapping("/{id}")
    public CertificateResponse getById(@PathVariable Long id) {
        return service.getById(id);
    }

    /** Download certificate PDF — available once CERTIFICATE_GENERATED or DOWNLOADED */
    @GetMapping("/{id}/download")
    public ResponseEntity<byte[]> download(@PathVariable Long id) {
        byte[] pdf = service.downloadPdf(id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=certificate-" + id + ".pdf")
                .body(pdf);
    }

    // ── OFFICER ENDPOINTS ────────────────────────────────────────────────────

    /** All applications — officer/admin view */
    @GetMapping
    public List<CertificateResponse> getAll() {
        return service.getAll();
    }

    /** Pending verification queue */
    @GetMapping("/pending")
    public List<CertificateResponse> getPending() {
        return service.getByStatus(CertificateStatus.SUBMITTED);
    }

    /** Search with filters (citizenName, status, type — all optional) */
    @GetMapping("/search")
@Operation(summary = "Search certificates by name, status, type")
public List<CertificateResponse> search(
        @RequestParam(required = false) String citizenName,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String type) {
    
    CertificateStatus statusEnum = null;
    CertificateType typeEnum = null;
    
    if (status != null && !status.isBlank()) {
        try {
            statusEnum = CertificateStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            return List.of();
        }
    }
    
    if (type != null && !type.isBlank()) {
        try {
            typeEnum = CertificateType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            return List.of();
        }
    }
    
    return service.search(citizenName, statusEnum, typeEnum);
}

    /** Officer marks documents as verified (or sends back for re-submission) */
    @PutMapping("/{id}/verify")
    public CertificateResponse verify(@PathVariable Long id,
                                       @Valid @RequestBody VerificationRequest request,
                                       @AuthenticationPrincipal Jwt jwt) {
        String officer = jwt != null ? jwt.getClaimAsString("preferred_username") : "unknown";
        return service.verify(id, request, officer);
    }

    /** Officer approves a verified application */
    @PutMapping("/{id}/approve")
    public CertificateResponse approve(@PathVariable Long id,
                                        @AuthenticationPrincipal Jwt jwt) {
        String officer = jwt != null ? jwt.getClaimAsString("preferred_username") : "unknown";
        return service.approve(id, officer);
    }

    /** Officer rejects with a mandatory reason */
    @PutMapping("/{id}/reject")
    public CertificateResponse reject(@PathVariable Long id,
                                       @Valid @RequestBody RejectionRequest request,
                                       @AuthenticationPrincipal Jwt jwt) {
        String officer = jwt != null ? jwt.getClaimAsString("preferred_username") : "unknown";
        return service.reject(id, request, officer);
    }

    // ── ADMIN ENDPOINTS ───────────────────────────────────────────────────────

    /** Admin triggers certificate generation after approval */
    @PutMapping("/{id}/generate")
    public CertificateResponse generate(@PathVariable Long id) {
        return service.generateCertificate(id);
    }

    /** Stats for admin dashboard */
    @GetMapping("/stats")
    public Map<String, Long> getStats() {
        return service.getStats();
    }

    /** Filter by status */
    @GetMapping("/status/{status}")
    public List<CertificateResponse> getByStatus(@PathVariable CertificateStatus status) {
        return service.getByStatus(status);
    }

    /** Filter by type */
    @GetMapping("/type/{type}")
    public List<CertificateResponse> getByType(@PathVariable CertificateType type) {
        return service.search(null, null, type);
    }
}