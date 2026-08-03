package com.civicpulse.citizenservice.service.impl;

import com.civicpulse.citizenservice.dto.OfficerRequest;
import com.civicpulse.citizenservice.dto.OfficerResponse;
import com.civicpulse.citizenservice.entity.Officer;
import com.civicpulse.citizenservice.repository.CitizenRepository;
import com.civicpulse.citizenservice.repository.OfficerRepository;
import com.civicpulse.citizenservice.service.KeycloakProvisioningService;
import com.civicpulse.citizenservice.service.OfficerService;
import jakarta.persistence.EntityNotFoundException;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.representations.idm.UserRepresentation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Year;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class OfficerServiceImpl implements OfficerService {

    private static final Logger log = LoggerFactory.getLogger(OfficerServiceImpl.class);

    private final OfficerRepository officerRepository;
    private final KeycloakProvisioningService keycloakProvisioningService;
    private final CitizenRepository citizenRepository;
    private final Keycloak keycloak;

    @Value("${keycloak.admin.target-realm}")
    private String targetRealm;

    private static final List<String> OFFICER_ROLES = List.of("OFFICER");
    private final AtomicLong seq = new AtomicLong(1);

    public OfficerServiceImpl(OfficerRepository officerRepository,
                               KeycloakProvisioningService keycloakProvisioningService,
                               CitizenRepository citizenRepository,
                               Keycloak keycloak) {
        this.officerRepository = officerRepository;
        this.keycloakProvisioningService = keycloakProvisioningService;
        this.citizenRepository = citizenRepository;
        this.keycloak = keycloak;
    }

    // ── Create ──────────────────────────────────────────────────────────────

    @Override
    public OfficerResponse createOfficer(OfficerRequest request) {
        // Cross-table duplicate email check
        if (officerRepository.existsByEmail(request.getEmail()))
            throw new RuntimeException("Email already registered as an officer");
        if (citizenRepository.existsByEmail(request.getEmail()))
            throw new RuntimeException("Email already registered as a citizen");

        Officer officer = new Officer();
        officer.setOfficerCode(generateOfficerCode());
        officer.setFullName(request.getFullName());
        officer.setEmail(request.getEmail());
        officer.setPhone(request.getPhone());
        officer.setDepartment(request.getDepartment());
        officer.setKeycloakRole(request.getKeycloakRole() != null
                ? request.getKeycloakRole() : "OFFICER");
        officer.setHeadOfficer(request.isHeadOfficer());
        // Derive Keycloak username from email prefix (matches Keycloak default behaviour)
        officer.setUsername(request.getEmail().split("@")[0].toLowerCase());

        Officer saved = officerRepository.save(officer);

        keycloakProvisioningService.provisionOfficerAccount(
                saved.getEmail(),
                request.getPassword(),
                saved.getFullName(),
                saved.getKeycloakRole()
        );

        return toResponse(saved);
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Override
    public List<OfficerResponse> getAllOfficers() {
        return officerRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Override
    public OfficerResponse getOfficerById(Long id) {
        return toResponse(findOrThrow(id));
    }

    @Override
    public List<OfficerResponse> getOfficersByDepartment(String department) {
        return officerRepository.findByDepartment(department)
                .stream().map(this::toResponse).toList();
    }

    @Override
    public List<OfficerResponse> getHeadOfficersByDepartment(String department) {
        return officerRepository.findByDepartmentAndHeadOfficerTrue(department)
                .stream().map(this::toResponse).toList();
    }

    @Override
    public OfficerResponse getOfficerByEmail(String email) {
        Officer officer = officerRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Officer not found with email: " + email));
        return toResponse(officer);
    }

    @Override
    public OfficerResponse getOfficerByUsername(String username) {
        // Try direct username match first
        return officerRepository.findByUsername(username)
                .map(this::toResponse)
                // Fallback: some officers were created before username field existed;
                // try matching email prefix (the part before @)
                .orElseGet(() -> officerRepository.findAll().stream()
                        .filter(o -> o.getEmail() != null &&
                                o.getEmail().split("@")[0].equalsIgnoreCase(username))
                        .findFirst()
                        .map(this::toResponse)
                        .orElseThrow(() -> new RuntimeException(
                                "Officer not found with username: " + username)));
    }

    // ── Update ──────────────────────────────────────────────────────────────

    @Override
    public OfficerResponse updateOfficer(Long id, OfficerRequest request) {
        Officer officer = findOrThrow(id);
        officer.setFullName(request.getFullName());
        officer.setPhone(request.getPhone());
        officer.setDepartment(request.getDepartment());
        officer.setHeadOfficer(request.isHeadOfficer());
        if (request.getKeycloakRole() != null)
            officer.setKeycloakRole(request.getKeycloakRole());
        return toResponse(officerRepository.save(officer));
    }

    // ── Activate / Deactivate ───────────────────────────────────────────────

    @Override
    public void deactivateOfficer(Long id) {
        Officer officer = findOrThrow(id);
        officer.setStatus("INACTIVE");
        officerRepository.save(officer);
        log.info("Officer {} deactivated", officer.getEmail());
    }

    @Override
    public void activateOfficer(Long id) {
        Officer officer = findOrThrow(id);
        officer.setStatus("ACTIVE");
        officerRepository.save(officer);
        log.info("Officer {} activated", officer.getEmail());
    }

    // ── Delete ──────────────────────────────────────────────────────────────

    @Override
    public void deleteOfficer(Long id) {
        officerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Officer not found: " + id));
        officerRepository.deleteById(id);
        log.info("Officer {} permanently deleted", id);
    }

    // ── Import from Keycloak ────────────────────────────────────────────────

    @Override
    public int importFromKeycloak() {
        int count = 0;
        for (String roleName : OFFICER_ROLES) {
            List<UserRepresentation> users;
            try {
                users = keycloak.realm(targetRealm)
                        .roles().get(roleName)
                        .getUserMembers(0, 500);
            } catch (Exception e) {
                log.warn("Could not fetch users for role {}: {}", roleName, e.getMessage());
                continue;
            }

            for (UserRepresentation u : users) {
                String email = u.getEmail();
                if (email == null || email.isBlank()) email = u.getUsername();

                if (officerRepository.existsByEmail(email)) {
                    log.debug("Officer {} already in DB — skipping import", email);
                    continue;
                }

                String fullName = buildFullName(u);
                Officer officer = new Officer();
                officer.setOfficerCode(generateOfficerCode());
                officer.setFullName(fullName.isBlank() ? u.getUsername() : fullName);
                officer.setEmail(email);
                officer.setPhone("0000000000");
                officer.setDepartment("Unassigned");
                officer.setKeycloakRole(roleName);
                officer.setHeadOfficer(false);
                officer.setStatus("ACTIVE");
                // Store Keycloak username so inter-service lookups work
                officer.setUsername(u.getUsername());

                officerRepository.save(officer);
                count++;
                log.info("Imported officer from Keycloak: {} (role: {})", email, roleName);
            }
        }
        log.info("Keycloak import complete — {} new officer(s) added", count);
        return count;
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private Officer findOrThrow(Long id) {
        return officerRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Officer not found: " + id));
    }

    private String generateOfficerCode() {
        long next = officerRepository.count() + seq.getAndIncrement();
        return String.format("OFC-%d-%06d", Year.now().getValue(), next);
    }

    private String buildFullName(UserRepresentation u) {
        String first = u.getFirstName() != null ? u.getFirstName() : "";
        String last  = u.getLastName()  != null ? u.getLastName()  : "";
        return (first + " " + last).trim();
    }

    private OfficerResponse toResponse(Officer o) {
        OfficerResponse r = new OfficerResponse();
        r.setId(o.getId());
        r.setOfficerCode(o.getOfficerCode());
        r.setFullName(o.getFullName());
        r.setEmail(o.getEmail());
        r.setPhone(o.getPhone());
        r.setDepartment(o.getDepartment());
        r.setKeycloakRole(o.getKeycloakRole());
        r.setHeadOfficer(o.isHeadOfficer());
        r.setStatus(o.getStatus());
        r.setCreatedAt(o.getCreatedAt());
        return r;
    }
}