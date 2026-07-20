package com.civicpulse.citizenservice.controller;

import com.civicpulse.citizenservice.dto.OfficerRequest;
import com.civicpulse.citizenservice.dto.OfficerResponse;
import com.civicpulse.citizenservice.service.OfficerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/officers")
@Tag(name = "Officer Management", description = "Admin operations for managing department officers")
public class OfficerController {

    private final OfficerService officerService;

    public OfficerController(OfficerService officerService) {
        this.officerService = officerService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create officer (Admin only)")
    public OfficerResponse createOfficer(@Valid @RequestBody OfficerRequest request) {
        return officerService.createOfficer(request);
    }

    @GetMapping
    @Operation(summary = "Get all officers")
    public List<OfficerResponse> getAllOfficers() {
        return officerService.getAllOfficers();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get officer by ID")
    public OfficerResponse getOfficer(@PathVariable Long id) {
        return officerService.getOfficerById(id);
    }

    @GetMapping("/department/{department}")
    @Operation(summary = "Get officers by department")
    public List<OfficerResponse> getByDepartment(@PathVariable String department) {
        return officerService.getOfficersByDepartment(department);
    }

    @GetMapping("/department/{department}/heads")
    @Operation(summary = "Get head officers of a department")
    public List<OfficerResponse> getHeads(@PathVariable String department) {
        return officerService.getHeadOfficersByDepartment(department);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update officer details (Admin only)")
    public OfficerResponse updateOfficer(@PathVariable Long id,
                                          @Valid @RequestBody OfficerRequest request) {
        return officerService.updateOfficer(id, request);
    }

    /** Sets status = INACTIVE */
    @PutMapping("/{id}/deactivate")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Deactivate officer (Admin only)")
    public void deactivateOfficer(@PathVariable Long id) {
        officerService.deactivateOfficer(id);
    }

    /** Sets status = ACTIVE */
    @PutMapping("/{id}/activate")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Activate officer (Admin only)")
    public void activateOfficer(@PathVariable Long id) {
        officerService.activateOfficer(id);
    }

    /**
     * Pulls all OFFICER/ADMIN users from Keycloak and inserts any that are
     * missing from the officers table.  Existing DB rows are never overwritten.
     * Returns how many new records were created.
     */
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

    /** Kept for backwards compatibility — same as /deactivate */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Deactivate officer via DELETE (Admin only)")
    public void deactivateOfficerDelete(@PathVariable Long id) {
        officerService.deactivateOfficer(id);
    }
}
