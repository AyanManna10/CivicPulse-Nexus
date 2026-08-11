package com.civicpulse.welfareservice.controller;

import com.civicpulse.welfareservice.dto.FundDistributionDtoRequest;
import com.civicpulse.welfareservice.dto.FundDistributionDtoResponse;
import com.civicpulse.welfareservice.entity.Beneficiary;
import com.civicpulse.welfareservice.entity.FundDistribution;
import com.civicpulse.welfareservice.entity.WelfareScheme;
import com.civicpulse.welfareservice.repository.BeneficiaryRepository;
import com.civicpulse.welfareservice.repository.FundDistributionRepository;
import com.civicpulse.welfareservice.repository.WelfareSchemeRepository;
import com.civicpulse.welfareservice.service.AuditLogService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/welfare/distributions")
@Tag(name = "Fund Distributions", description = "Fund disbursement management")
public class FundDistributionController {

    private final FundDistributionRepository distributionRepo;
    private final BeneficiaryRepository beneficiaryRepo;
    private final WelfareSchemeRepository schemeRepo;
    private final RestTemplate restTemplate;
    private final AuditLogService auditLogService;

    public FundDistributionController(
            FundDistributionRepository distributionRepo,
            BeneficiaryRepository beneficiaryRepo,
            WelfareSchemeRepository schemeRepo,
            RestTemplate restTemplate,
            AuditLogService auditLogService) {          // ← added
        this.distributionRepo = distributionRepo;
        this.beneficiaryRepo  = beneficiaryRepo;
        this.schemeRepo       = schemeRepo;
        this.restTemplate     = restTemplate;
        this.auditLogService  = auditLogService;        // ← added
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a fund distribution record (Admin or Revenue dept. officer)")
    public ResponseEntity<?> createDistribution(
            @RequestBody FundDistributionDtoRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String username = jwt.getClaimAsString("preferred_username");

        @SuppressWarnings("unchecked")
        Map<String, Object> realmAccess = (Map<String, Object>) jwt.getClaim("realm_access");
        @SuppressWarnings("unchecked")
        List<String> roles = realmAccess != null
                ? (List<String>) realmAccess.get("roles")
                : List.of();
        boolean isAdmin = roles.contains("ADMIN");

        Beneficiary beneficiary = beneficiaryRepo.findById(request.getBeneficiaryId())
                .orElseThrow(() -> new RuntimeException("Beneficiary not found"));
        WelfareScheme scheme = schemeRepo.findById(request.getSchemeId())
                .orElseThrow(() -> new RuntimeException("Scheme not found"));

        if (!isAdmin) {
            try {
                String url = "http://localhost:8082/api/officers/by-username/" + username;
                @SuppressWarnings("unchecked")
                Map<String, Object> officerProfile = restTemplate.getForObject(url, Map.class);

                if (officerProfile == null)
                    throw new RuntimeException("Officer profile not found");

                String officerDept = (String) officerProfile.get("department");
                if (officerDept == null)
                    throw new RuntimeException("Officer department not found");

                if (!"Revenue Department".equals(officerDept))
                    throw new RuntimeException(
                        "Only Revenue Department officers can create fund distributions");

                if (!scheme.getDepartment().equals(officerDept))
                    throw new RuntimeException(
                        "You can only create distributions for your department's schemes. " +
                        "Scheme belongs to: " + scheme.getDepartment());

            } catch (org.springframework.web.client.HttpClientErrorException e) {
                throw new RuntimeException("Failed to verify officer permissions: " + e.getMessage());
            }
        }

        FundDistribution dist = new FundDistribution();
        dist.setDistributionCode("DST-" + System.currentTimeMillis());
        dist.setBeneficiary(beneficiary);
        dist.setScheme(scheme);
        dist.setAmount(request.getAmount());
        dist.setPaymentMode(request.getPaymentMode() != null ? request.getPaymentMode() : "BANK_TRANSFER");
        dist.setTransactionRef(request.getTransactionRef());
        dist.setRemarks(request.getRemarks());
        dist.setDisbursedBy(username);

        FundDistribution saved = distributionRepo.save(dist);
        return ResponseEntity.status(HttpStatus.CREATED).body(mapToResponse(saved));
    }

    @GetMapping("/beneficiary/{beneficiaryId}")
    @Operation(summary = "Get distributions for a beneficiary")
    public List<FundDistributionDtoResponse> getByBeneficiary(@PathVariable Long beneficiaryId) {
        return distributionRepo.findByBeneficiaryId(beneficiaryId).stream()
                .map(this::mapToResponse).collect(Collectors.toList());
    }

    @GetMapping("/scheme/{schemeId}")
    @Operation(summary = "Get distributions for a scheme")
    public List<FundDistributionDtoResponse> getByScheme(@PathVariable Long schemeId) {
        return distributionRepo.findBySchemeId(schemeId).stream()
                .map(this::mapToResponse).collect(Collectors.toList());
    }

    @PutMapping("/{id}/disburse")
    @Operation(summary = "Mark a distribution as disbursed")
    public ResponseEntity<?> disburse(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal Jwt jwt) {

        FundDistribution dist = distributionRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Distribution not found"));

        dist.setPaymentStatus("PAID");
        dist.setPaidAt(LocalDateTime.now());
        dist.setTransactionRef(body.getOrDefault("transactionRef", dist.getTransactionRef()));

        WelfareScheme scheme = dist.getScheme();
        scheme.setBudgetDisbursed(scheme.getBudgetDisbursed().add(dist.getAmount()));
        schemeRepo.save(scheme);

        FundDistribution saved = distributionRepo.save(dist);

        // ── Audit log ────────────────────────────────────────────────────────
        auditLogService.log("DISBURSE_FUNDS", "DISTRIBUTION", saved.getId(),
                saved.getDistributionCode(),
                jwt.getClaimAsString("preferred_username"),
                "Amount: ₹" + saved.getAmount()
                + " | Beneficiary: " + saved.getBeneficiary().getCitizenName()
                + " | Mode: " + saved.getPaymentMode());

        return ResponseEntity.ok(mapToResponse(saved));
    }

    @PutMapping("/{id}/fail")
    @Operation(summary = "Mark a distribution as failed")
    public ResponseEntity<?> markFailed(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {

        FundDistribution dist = distributionRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Distribution not found"));

        dist.setPaymentStatus("FAILED");
        FundDistribution saved = distributionRepo.save(dist);

        // ── Audit log ────────────────────────────────────────────────────────
        auditLogService.log("DISBURSE_FAILED", "DISTRIBUTION", saved.getId(),
                saved.getDistributionCode(),
                jwt.getClaimAsString("preferred_username"),
                "Amount: ₹" + saved.getAmount()
                + " | Beneficiary: " + saved.getBeneficiary().getCitizenName());

        return ResponseEntity.ok(mapToResponse(saved));
    }

    private FundDistributionDtoResponse mapToResponse(FundDistribution d) {
        return new FundDistributionDtoResponse(
                d.getId(), d.getDistributionCode(),
                d.getBeneficiary().getId(), d.getBeneficiary().getCitizenName(),
                d.getScheme().getId(), d.getScheme().getName(),
                d.getAmount(), d.getPaymentMode(), d.getPaymentStatus(),
                d.getTransactionRef(), d.getRemarks(),
                d.getDisbursedBy(), d.getPaidAt(), d.getCreatedAt()
        );
    }
}