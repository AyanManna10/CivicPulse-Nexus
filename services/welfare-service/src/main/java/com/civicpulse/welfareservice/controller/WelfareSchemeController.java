package com.civicpulse.welfareservice.controller;

import com.civicpulse.welfareservice.dto.WelfareSchemeDtoRequest;
import com.civicpulse.welfareservice.dto.WelfareSchemeDtoResponse;
import com.civicpulse.welfareservice.repository.BeneficiaryRepository;
import com.civicpulse.welfareservice.service.WelfareSchemeService;
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
@RequestMapping("/api/welfare/schemes")
@Tag(name = "Welfare Schemes", description = "Welfare scheme management")
public class WelfareSchemeController {

    private final WelfareSchemeService service;
    private final BeneficiaryRepository beneficiaryRepo;

    public WelfareSchemeController(WelfareSchemeService service,
                                    BeneficiaryRepository beneficiaryRepo) {
        this.service = service;
        this.beneficiaryRepo = beneficiaryRepo;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new welfare scheme (Admin only)")
    public WelfareSchemeDtoResponse createScheme(
            @Valid @RequestBody WelfareSchemeDtoRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        String createdBy = jwt.getClaimAsString("preferred_username");
        return service.createScheme(request, createdBy);
    }

    @GetMapping
    @Operation(summary = "Get all welfare schemes")
    public List<WelfareSchemeDtoResponse> getAllSchemes() {
        return service.getAllSchemes();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get welfare scheme by ID")
    public WelfareSchemeDtoResponse getSchemeById(@PathVariable Long id) {
        return service.getSchemeById(id);
    }

    @GetMapping("/department/{department}")
    @Operation(summary = "Get schemes by department")
    public List<WelfareSchemeDtoResponse> getSchemesByDepartment(
            @PathVariable String department) {
        return service.getSchemesByDepartment(department);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update welfare scheme (Admin only)")
    public WelfareSchemeDtoResponse updateScheme(
            @PathVariable Long id,
            @Valid @RequestBody WelfareSchemeDtoRequest request) {
        return service.updateScheme(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete welfare scheme (Admin only)")
    public void deleteScheme(@PathVariable Long id) {
        service.deleteScheme(id);
    }

    @GetMapping("/stats")
    @Operation(summary = "Get welfare dashboard stats")
    public ResponseEntity<?> getStats() {
        List<WelfareSchemeDtoResponse> all = service.getAllSchemes();
        long totalSchemes      = all.size();
        long activeSchemes     = all.stream().filter(s -> "ACTIVE".equals(s.getStatus())).count();
        long totalBeneficiaries = beneficiaryRepo.count();
        double totalDisbursed  = all.stream().mapToDouble(s -> s.getBudgetDisbursed() != null ? s.getBudgetDisbursed().doubleValue() : 0).sum();
        double totalAllocated  = all.stream().mapToDouble(s -> s.getBudgetAllocated() != null ? s.getBudgetAllocated().doubleValue() : 0).sum();
        double utilization     = totalAllocated > 0 ? (totalDisbursed / totalAllocated) * 100 : 0;

        return ResponseEntity.ok(Map.of(
                "totalSchemes",       totalSchemes,
                "activeSchemes",      activeSchemes,
                "totalBeneficiaries", totalBeneficiaries,
                "totalDisbursed",     totalDisbursed,
                "totalAllocated",     totalAllocated,
                "utilizationPct",     Math.round(utilization)
        ));
    }
}