package com.civicpulse.citizenservice.controller;

import com.civicpulse.citizenservice.dto.OfficerRequest;
import com.civicpulse.citizenservice.dto.OfficerResponse;
import com.civicpulse.citizenservice.service.OfficerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/officers")
@Tag(name = "Officer Management", description = "Admin and department-head operations for managing officers")
public class OfficerController {

    private final OfficerService officerService;

    public OfficerController(OfficerService officerService) {
        this.officerService = officerService;
    }

    // ── Profile of the calling officer ────────────────────────────────────────

    /**
     * Returns the officer record for the currently authenticated user.
     *
     * Used by the frontend immediately after login to:
     *   1. Determine which department the officer belongs to.
     *   2. Determine if they are a department head (headOfficer=true).
     *
     * Resolution order: JWT `email` → JWT `preferred_username`.
     * If the officer is not in the DB (e.g. purely Keycloak-managed), returns 404.
     */
    @GetMapping("/me")
    @Operation(summary = "Get the authenticated officer's own profile")
    public OfficerResponse getMe(@AuthenticationPrincipal Jwt jwt) {
        String email = jwt.getClaim("email");
        if (email != null && !email.isBlank()) {
            return officerService.getOfficerByEmail(email);
        }
        // Fallback: some tokens use preferred_username instead of email
        String username = jwt.getClaim("preferred_username");
        if (username != null && !username.isBlank()) {
            return officerService.getOfficerByEmail(username);
        }
        throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                "Officer profile not found for the current token");
    }

    // ── Admin / Department-head read operations ───────────────────────────────

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create officer (Admin only)")
    public OfficerResponse createOfficer(@Valid @RequestBody OfficerRequest request) {
        return officerService.createOfficer(request);
    }

    @GetMapping
    @Operation(summary = "Get all officers (Admin only)")
    public List<OfficerResponse> getAllOfficers() {
        return officerService.getAllOfficers();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get officer by ID")
    public OfficerResponse getOfficer(@PathVariable Long id) {
        return officerService.getOfficerById(id);
    }

    @GetMapping("/department/{department}")
    @Operation(summary = "Get officers by department (Admin or department head)")
    public List<OfficerResponse> getByDepartment(@PathVariable String department) {
        return officerService.getOfficersByDepartment(department);
    }

    @GetMapping("/department/{department}/heads")
    @Operation(summary = "Get head officers of a department")
    public List<OfficerResponse> getHeads(@PathVariable String department) {
        return officerService.getHeadOfficersByDepartment(department);
    }

    // ── Update operations (Admin full; dept-head limited) ─────────────────────

    @PutMapping("/{id}")
    @Operation(summary = "Update officer details")
    public OfficerResponse updateOfficer(@PathVariable Long id,
                                          @Valid @RequestBody OfficerRequest request) {
        return officerService.updateOfficer(id, request);
    }

    @PutMapping("/{id}/deactivate")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Deactivate officer")
    public void deactivateOfficer(@PathVariable Long id) {
        officerService.deactivateOfficer(id);
    }

    @PutMapping("/{id}/activate")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Activate officer")
    public void activateOfficer(@PathVariable Long id) {
        officerService.activateOfficer(id);
    }

    @PostMapping("/import-from-keycloak")
    @Operation(summary = "Import existing Keycloak officers into DB (Admin only)")
    public Map<String, Object> importFromKeycloak() {
        int imported = officerService.importFromKeycloak();
        return Map.of(
                "imported", imported,
                "message", imported > 0
                        ? imported + " officer(s) imported from Keycloak successfully."
                        : "No new officers to import — all Keycloak officers are already in the database."
        );
    }

@DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete an officer (Admin only)")
    public void deleteOfficer(@PathVariable Long id) {
        officerService.deleteOfficer(id);
    }
}

