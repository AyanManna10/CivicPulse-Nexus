package com.civicpulse.citizenservice.controller;

import com.civicpulse.citizenservice.entity.CitizenDocument;
import com.civicpulse.citizenservice.repository.CitizenDocumentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import com.civicpulse.citizenservice.repository.OfficerRepository;
import com.civicpulse.citizenservice.dto.CitizenRequest;
import com.civicpulse.citizenservice.dto.CitizenResponse;
import com.civicpulse.citizenservice.entity.Citizen;
import com.civicpulse.citizenservice.entity.PendingRegistration;
import com.civicpulse.citizenservice.repository.CitizenRepository;
import com.civicpulse.citizenservice.repository.PendingRegistrationRepository;
import com.civicpulse.citizenservice.service.CitizenService;
import com.civicpulse.citizenservice.service.KeycloakProvisioningService;
import com.civicpulse.citizenservice.util.CitizenUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/citizens")
@Tag(name = "Citizens", description = "Citizen registration and management")
public class CitizenController {

    private final CitizenService citizenService;
    private final CitizenRepository citizenRepository;
    private final PendingRegistrationRepository pendingRepo;
    private final OfficerRepository officerRepository;
    private final CitizenUtil citizenUtil;
    private final KeycloakProvisioningService keycloakProvisioningService;
    private final CitizenDocumentRepository citizenDocRepo;

    @Value("${app.upload.citizen-docs}")
    private String uploadBasePath;

    public CitizenController(CitizenService citizenService,
                              CitizenRepository citizenRepository,
                              PendingRegistrationRepository pendingRepo,
                              OfficerRepository officerRepository,
                              CitizenUtil citizenUtil,
                              KeycloakProvisioningService keycloakProvisioningService,
                              CitizenDocumentRepository citizenDocRepo) {
        this.citizenService = citizenService;
        this.citizenRepository = citizenRepository;
        this.pendingRepo = pendingRepo;
        this.officerRepository = officerRepository;
        this.citizenUtil = citizenUtil;
        this.keycloakProvisioningService = keycloakProvisioningService;
        this.citizenDocRepo = citizenDocRepo;
    }


    // ── Document upload for pending registration ──────────────────────────────

@PostMapping("/pending/{id}/documents")
@Operation(summary = "Upload supporting document for a pending registration")
public ResponseEntity<Map<String, Object>> uploadDocument(
        @PathVariable Long id,
        @RequestParam("file") MultipartFile file,
        @RequestParam("docType") String docType) {

    if (file.isEmpty())
        return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));

    // Validate file type — only PDF, JPG, PNG
    String contentType = file.getContentType();
    if (contentType == null || (!contentType.equals("application/pdf")
            && !contentType.startsWith("image/"))) {
        return ResponseEntity.badRequest()
                .body(Map.of("error", "Only PDF, JPG, and PNG files are allowed"));
    }

    try {
        Path dir = Paths.get(uploadBasePath, String.valueOf(id));
        Files.createDirectories(dir);

        String ext = file.getOriginalFilename() != null && file.getOriginalFilename().contains(".")
                ? file.getOriginalFilename().substring(file.getOriginalFilename().lastIndexOf("."))
                : ".bin";
        String storedName = docType + "_" + System.currentTimeMillis() + ext;
        Path dest = dir.resolve(storedName);
        Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);

        CitizenDocument doc = new CitizenDocument();
        doc.setPendingId(id);
        doc.setDocType(docType);
        doc.setOriginalName(file.getOriginalFilename());
        doc.setStoredPath(dest.toString());
        CitizenDocument saved = citizenDocRepo.save(doc);

        return ResponseEntity.ok(Map.of(
                "id", saved.getId(),
                "docType", docType,
                "originalName", file.getOriginalFilename(),
                "message", "Document uploaded successfully"
        ));
    } catch (IOException e) {
        return ResponseEntity.internalServerError()
                .body(Map.of("error", "File storage failed: " + e.getMessage()));
    }
}

// ── List documents for a pending registration ─────────────────────────────

@GetMapping("/pending/{id}/documents")
@Operation(summary = "Get all uploaded documents for a pending registration")
public List<CitizenDocument> getDocuments(@PathVariable Long id) {
    return citizenDocRepo.findByPendingId(id);
}

// ── Download/view a specific document ─────────────────────────────────────

@GetMapping("/documents/{docId}/view")
@Operation(summary = "View a citizen document (Officer/Admin)")
public ResponseEntity<Resource> viewDocument(@PathVariable Long docId) {
    CitizenDocument doc = citizenDocRepo.findById(docId)
            .orElseThrow(() -> new RuntimeException("Document not found"));
    try {
        Path path = Paths.get(doc.getStoredPath());
        Resource resource = new UrlResource(path.toUri());
        if (!resource.exists())
            return ResponseEntity.notFound().build();

        String name = doc.getOriginalName().toLowerCase();
        String ct;
        if (name.endsWith(".pdf"))                          ct = "application/pdf";
        else if (name.endsWith(".png"))                     ct = "image/png";
        else if (name.endsWith(".jpg") || name.endsWith(".jpeg")) ct = "image/jpeg";
        else                                                ct = "application/octet-stream";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(ct))
                .header("Content-Disposition", "inline; filename=\"" + doc.getOriginalName() + "\"")
                .header("Access-Control-Allow-Origin", "*")
                .header("Cache-Control", "no-cache")
                .body(resource);
    } catch (Exception e) {
        return ResponseEntity.internalServerError().build();
    }
}


    // ── Officer/Admin: register citizen directly ──────────────────────────────

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register a new citizen (Officer / Admin)")
    public CitizenResponse createCitizen(@Valid @RequestBody CitizenRequest request) {
        return citizenService.createCitizen(request);
    }

    

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

    // ── Public: email uniqueness check ────────────────────────────────────────

    @GetMapping("/check-email")
    @Operation(summary = "Check if email is already registered (public)")
    public ResponseEntity<Map<String, Boolean>> checkEmail(@RequestParam String email) {
        boolean takenInCitizens = citizenRepository.existsByEmail(email);
        boolean takenInPending = pendingRepo.findByEmail(email)
                .map(p -> !p.getStatus().equals("REJECTED"))
                .orElse(false);
        boolean takenInOfficers = officerRepository.existsByEmail(email);
        boolean available = !takenInCitizens && !takenInPending && !takenInOfficers;
        return ResponseEntity.ok(Map.of("available", available));
    }

    // ── Public: self-registration (goes to pending) ───────────────────────────

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Citizen self-registration — creates a PENDING record for officer review")
    public ResponseEntity<Map<String, String>> selfRegister(@RequestBody Map<String, Object> body) {
        String email = (String) body.get("email");
        if (email == null || email.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));

        boolean citizenExists = citizenRepository.existsByEmail(email);
        boolean activePending = pendingRepo.findByEmail(email)
                .map(p -> p.getStatus().equals("PENDING") || p.getStatus().equals("APPROVED"))
                .orElse(false);
        if (citizenExists || activePending)
            return ResponseEntity.badRequest().body(Map.of("error", "This email is already registered or has a pending application"));

        PendingRegistration pr = new PendingRegistration();
        pr.setFullName((String) body.get("fullName"));
        pr.setPhone((String) body.get("phone"));
        pr.setEmail(email);
        pr.setGender((String) body.get("gender"));
        pr.setAddress((String) body.get("address"));
        pr.setAadhar((String) body.get("aadhaar"));
        if (body.get("ward") != null)
            pr.setWard(Integer.parseInt(body.get("ward").toString()));
        if (body.get("dob") != null && !body.get("dob").toString().isBlank())
            pr.setDob(LocalDate.parse(body.get("dob").toString()));

        PendingRegistration saved = pendingRepo.save(pr);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of(
                    "id", String.valueOf(saved.getId()),
                    "message", "Registration submitted. Your account will be activated after officer verification."
                ));
    }

    // ── Officer/Admin: view and act on pending registrations ──────────────────

    @GetMapping("/pending")
    @Operation(summary = "Get all pending self-registrations (Officer / Admin)")
    public List<PendingRegistration> getPendingRegistrations() {
        return pendingRepo.findByStatus("PENDING");
    }

    @PostMapping("/pending/{id}/approve")
    @Operation(summary = "Approve a pending registration — creates citizen + Keycloak account")
    public ResponseEntity<Map<String, String>> approvePending(@PathVariable Long id) {
        PendingRegistration pr = pendingRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Pending registration not found: " + id));

        if (!"PENDING".equals(pr.getStatus()))
            return ResponseEntity.badRequest().body(Map.of("error", "Already processed"));

        // Create citizen record
        Citizen citizen = new Citizen();
        citizen.setCitizenCode(citizenUtil.generateCitizenCode());
        citizen.setFullName(pr.getFullName());
        citizen.setDob(pr.getDob());
        citizen.setGender(pr.getGender());
        citizen.setPhone(pr.getPhone());
        citizen.setEmail(pr.getEmail());
        citizen.setWard(pr.getWard());
        citizen.setAddress(pr.getAddress());
        if (pr.getAadhar() != null && !pr.getAadhar().isBlank()) {
            citizen.setAadharMasked(citizenUtil.maskAadhar(pr.getAadhar()));
        }
        citizen.setStatus("ACTIVE");
        citizenRepository.save(citizen);

        // Provision Keycloak — password = phone number
        try {
            keycloakProvisioningService.provisionCitizenAccount(
                    pr.getEmail(), pr.getPhone(), pr.getFullName());
        } catch (Exception e) {
            // Non-fatal — citizen DB record is created, Keycloak can be done manually
        }

        pr.setStatus("APPROVED");
        pendingRepo.save(pr);

        return ResponseEntity.ok(Map.of("message", "Citizen approved and account created. Login credentials sent via phone."));
    }

    @PostMapping("/pending/{id}/reject")
    @Operation(summary = "Reject a pending registration")
    public ResponseEntity<Map<String, String>> rejectPending(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        PendingRegistration pr = pendingRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Pending registration not found: " + id));

        if (!"PENDING".equals(pr.getStatus()))
            return ResponseEntity.badRequest().body(Map.of("error", "Already processed"));

        pr.setStatus("REJECTED");
        if (body != null && body.get("remarks") != null)
            pr.setRemarks(body.get("remarks"));
        pendingRepo.save(pr);

        return ResponseEntity.ok(Map.of("message", "Registration rejected"));
    }
}