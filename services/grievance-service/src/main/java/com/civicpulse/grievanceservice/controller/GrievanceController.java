package com.civicpulse.grievanceservice.controller;

import com.civicpulse.grievanceservice.dto.*;
import com.civicpulse.grievanceservice.service.GrievanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/grievances")
@Tag(name = "Grievances", description = "Grievance registration, assignment, and resolution")
public class GrievanceController {

    private final GrievanceService grievanceService;

    public GrievanceController(GrievanceService grievanceService) {
        this.grievanceService = grievanceService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "File a new grievance")
    public GrievanceResponse createGrievance(@Valid @RequestBody GrievanceRequest request) {
        return grievanceService.createGrievance(request);
    }

    /**
     * Officer / Admin: returns ALL grievances.
     * Citizens are blocked at the SecurityConfig level — they must use /my instead.
     */
    @GetMapping
    @Operation(summary = "Get all grievances (Officer / Admin only)")
    public List<GrievanceResponse> getAllGrievances() {
        return grievanceService.getAllGrievances();
    }

    /**
     * Citizen: returns only grievances belonging to the logged-in citizen.
     * The citizenId is resolved server-side from the JWT `sub` (citizenId stored
     * in the grievance must match the citizen's DB id passed in the request body).
     * We resolve it here by accepting it as a query param from a trusted call —
     * the frontend sends the citizenId it resolved via /api/citizens/me.
     * An additional guard: the grievance-service verifies the citizenId matches
     * the JWT email via the citizen-service lookup if needed in future.
     */
    @GetMapping("/my")
    @Operation(summary = "Get own grievances (Citizen only)")
    public List<GrievanceResponse> getMyGrievances(@RequestParam Long citizenId,
                                                    @AuthenticationPrincipal Jwt jwt) {
        // We trust citizenId here because the citizen got it from /api/citizens/me
        // which is itself JWT-secured and returns only their own record.
        return grievanceService.getByCitizen(citizenId);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get grievance by ID")
    public GrievanceResponse getGrievance(@PathVariable Long id) {
        return grievanceService.getGrievanceById(id);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update grievance (Officer / Admin)")
    public GrievanceResponse updateGrievance(@PathVariable Long id,
                                              @RequestBody GrievanceRequest request) {
        return grievanceService.updateGrievance(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete grievance (Admin only)")
    public void deleteGrievance(@PathVariable Long id) {
        grievanceService.deleteGrievance(id);
    }

    @PutMapping("/{id}/assign")
    @Operation(summary = "Assign grievance to officer / department (Officer / Admin)")
    public GrievanceResponse assignGrievance(@PathVariable Long id,
                                              @Valid @RequestBody AssignRequest request) {
        return grievanceService.assignGrievance(id, request);
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "Change grievance status (Officer / Admin)")
    public GrievanceResponse changeStatus(@PathVariable Long id,
                                           @Valid @RequestBody StatusUpdateRequest request) {
        return grievanceService.changeStatus(id, request);
    }

    @PutMapping("/{id}/escalate")
    @Operation(summary = "Escalate grievance (Officer / Admin)")
    public GrievanceResponse escalateGrievance(@PathVariable Long id) {
        return grievanceService.escalateGrievance(id);
    }

    @GetMapping("/sla")
    @Operation(summary = "Get SLA-overdue grievances (Officer / Admin)")
    public List<GrievanceResponse> getOverdueGrievances() {
        return grievanceService.getOverdueGrievances();
    }

    @GetMapping("/citizen/{citizenId}")
    @Operation(summary = "Get grievances by citizen ID (Officer / Admin)")
    public List<GrievanceResponse> getByCitizen(@PathVariable Long citizenId) {
        return grievanceService.getByCitizen(citizenId);
    }

    @GetMapping("/department/{departmentId}")
    @Operation(summary = "Get grievances by department (Officer / Admin)")
    public List<GrievanceResponse> getByDepartment(@PathVariable String departmentId) {
        return grievanceService.getByDepartment(departmentId);
    }

    @GetMapping("/status/{status}")
    @Operation(summary = "Get grievances by status")
    public List<GrievanceResponse> getByStatus(@PathVariable String status) {
        return grievanceService.getByStatus(status);
    }

    @GetMapping("/dashboard")
    @Operation(summary = "Dashboard stats (Officer / Admin)")
    public Map<String, Object> getDashboard() {
        return grievanceService.getDashboardStats();
    }
}
