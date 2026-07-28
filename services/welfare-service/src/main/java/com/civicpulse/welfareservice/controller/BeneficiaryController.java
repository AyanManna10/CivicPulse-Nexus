package com.civicpulse.welfareservice.controller;

import com.civicpulse.welfareservice.dto.BeneficiaryDtoRequest;
import com.civicpulse.welfareservice.dto.BeneficiaryDtoResponse;
import com.civicpulse.welfareservice.service.BeneficiaryService;
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
@RequestMapping("/api/welfare/beneficiaries")
@Tag(name = "Beneficiaries", description = "Welfare beneficiary management")
public class BeneficiaryController {

    private final BeneficiaryService service;

    public BeneficiaryController(BeneficiaryService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Enroll a citizen as a beneficiary")
    public BeneficiaryDtoResponse enrollBeneficiary(
            @Valid @RequestBody BeneficiaryDtoRequest request) {
        return service.enrollBeneficiary(request);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get beneficiary by ID")
    public BeneficiaryDtoResponse getBeneficiaryById(@PathVariable Long id) {
        return service.getBeneficiaryById(id);
    }

    @GetMapping("/scheme/{schemeId}")
    @Operation(summary = "Get all beneficiaries for a scheme")
    public List<BeneficiaryDtoResponse> getByScheme(@PathVariable Long schemeId) {
        return service.getBeneficiariesByScheme(schemeId);
    }

    @GetMapping("/citizen/{citizenId}")
    @Operation(summary = "Get all schemes a citizen is enrolled in")
    public List<BeneficiaryDtoResponse> getByCitizen(@PathVariable Long citizenId) {
        return service.getBeneficiariesByCitizen(citizenId);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update beneficiary details")
    public BeneficiaryDtoResponse updateBeneficiary(
            @PathVariable Long id,
            @Valid @RequestBody BeneficiaryDtoRequest request) {
        return service.updateBeneficiary(id, request);
    }

    @PutMapping("/{id}/verify")
    @Operation(summary = "Verify a beneficiary's eligibility")
    public BeneficiaryDtoResponse verifyBeneficiary(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {
        String verifiedBy = jwt.getClaimAsString("preferred_username");
        return service.verifyBeneficiary(id, verifiedBy);
    }

    @PutMapping("/{id}/deactivate")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Deactivate a beneficiary")
    public void deactivateBeneficiary(@PathVariable Long id) {
        service.deactivateBeneficiary(id);
    }
}