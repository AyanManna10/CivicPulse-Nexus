package com.civicpulse.citizenservice.controller;

import com.civicpulse.citizenservice.dto.CitizenRequest;
import com.civicpulse.citizenservice.dto.CitizenResponse;
import com.civicpulse.citizenservice.service.CitizenService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/citizens")
@Tag(name = "Citizens", description = "Citizen registration and management")
public class CitizenController {

    private final CitizenService citizenService;

    public CitizenController(CitizenService citizenService) {
        this.citizenService = citizenService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register a new citizen (Officer / Admin)")
    public CitizenResponse createCitizen(@Valid @RequestBody CitizenRequest request) {
        return citizenService.createCitizen(request);
    }

    /**
     * Resolves the currently logged-in citizen's profile from their JWT email claim.
     * Citizens call this on login to get their DB id — no more manual ID entry.
     */
    @GetMapping("/me")
    @Operation(summary = "Get own citizen profile (Citizen only)")
    public CitizenResponse getMe(@AuthenticationPrincipal Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        return citizenService.getCitizenByEmail(email);
    }

    @GetMapping
    @Operation(summary = "List all citizens (Officer / Admin)")
    public List<CitizenResponse> getAllCitizens() {
        return citizenService.getAllCitizens();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get citizen by ID")
    public CitizenResponse getCitizen(@PathVariable Long id) {
        return citizenService.getCitizenById(id);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update citizen (Officer / Admin)")
    public CitizenResponse updateCitizen(@PathVariable Long id,
                                          @Valid @RequestBody CitizenRequest request) {
        return citizenService.updateCitizen(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete citizen (Admin only)")
    public void deleteCitizen(@PathVariable Long id) {
        citizenService.deleteCitizen(id);
    }

    @GetMapping("/search")
    @Operation(summary = "Search citizens by name")
    public List<CitizenResponse> search(@RequestParam(required = false) String name) {
        return citizenService.searchByName(name);
    }

    @GetMapping("/ward/{wardNo}")
    @Operation(summary = "Get citizens by ward number")
    public List<CitizenResponse> getByWard(@PathVariable Integer wardNo) {
        return citizenService.getByWard(wardNo);
    }

    @GetMapping("/status/active")
    @Operation(summary = "Get all active citizens")
    public List<CitizenResponse> getActiveCitizens() {
        return citizenService.getActiveCitizens();
    }
}
