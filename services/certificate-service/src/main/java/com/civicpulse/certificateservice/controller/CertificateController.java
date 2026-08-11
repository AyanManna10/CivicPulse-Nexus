package com.civicpulse.certificateservice.controller;

import com.civicpulse.certificateservice.entity.CertificateDocument;
import com.civicpulse.certificateservice.repository.CertificateDocumentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;

import java.util.Map;
import java.util.List;

import com.civicpulse.certificateservice.dto.*;
import com.civicpulse.certificateservice.entity.CertificateStatus;
import com.civicpulse.certificateservice.entity.CertificateType;
import com.civicpulse.certificateservice.service.CertificateService;

import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/certificates")
public class CertificateController {

    private final CertificateService service;
    private final CertificateDocumentRepository certDocRepo;

    @Value("${app.upload.certificate-docs}")
    private String uploadBasePath;

    public CertificateController(CertificateService service,
                                  CertificateDocumentRepository certDocRepo) {
        this.service = service;
        this.certDocRepo = certDocRepo;
    }

    // ── Document upload ───────────────────────────────────────────────────────

    @PostMapping("/{id}/documents")
    @Operation(summary = "Upload supporting document for a certificate application")
    public ResponseEntity<Map<String, Object>> uploadCertDoc(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @RequestParam("docType") String docType) {

        if (file.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));

        String ct = file.getContentType();
        if (ct == null || (!ct.equals("application/pdf") && !ct.startsWith("image/")))
            return ResponseEntity.badRequest().body(Map.of("error", "Only PDF, JPG, PNG allowed"));

        try {
            Path dir = Paths.get(uploadBasePath, String.valueOf(id));
            Files.createDirectories(dir);
            String orig = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
            String ext  = orig.contains(".") ? orig.substring(orig.lastIndexOf(".")) : ".bin";
            String storedName = docType + "_" + System.currentTimeMillis() + ext;
            Path dest = dir.resolve(storedName);
            Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);

            CertificateDocument doc = new CertificateDocument();
            doc.setCertificateId(id);
            doc.setDocType(docType);
            doc.setOriginalName(orig);
            doc.setStoredPath(dest.toString());
            CertificateDocument saved = certDocRepo.save(doc);
            return ResponseEntity.ok(Map.of(
                    "docId", saved.getId(),
                    "originalName", orig,
                    "storedAs", storedName,
                    "docType", docType
            ));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Upload failed: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}/documents")
    @Operation(summary = "List uploaded documents for a certificate application")
    public List<CertificateDocument> listDocs(@PathVariable Long id) {
        return certDocRepo.findByCertificateId(id);
    }

    @GetMapping("/documents/{docId}/view")
    @Operation(summary = "Download / view a specific document")
    public ResponseEntity<Resource> viewDoc(@PathVariable Long docId) throws IOException {
        CertificateDocument doc = certDocRepo.findById(docId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Document not found: " + docId));
        Path path = Paths.get(doc.getStoredPath());
        Resource resource = new UrlResource(path.toUri());
        if (!resource.exists() || !resource.isReadable())
            return ResponseEntity.notFound().build();

        String contentType = Files.probeContentType(path);
        if (contentType == null) contentType = "application/octet-stream";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + doc.getOriginalName() + "\"")
                .contentType(MediaType.parseMediaType(contentType))
                .body(resource);
    }

    // ── Submit / Apply ────────────────────────────────────────────────────────

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Submit a new certificate / permit application")
    public CertificateResponse apply(@Valid @RequestBody CertificateRequest request,
                                      @AuthenticationPrincipal Jwt jwt) {
        String appliedBy = jwt != null ? jwt.getClaim("preferred_username") : "unknown";
        return service.apply(request, appliedBy);
    }

    // ── Query ─────────────────────────────────────────────────────────────────

    @GetMapping("/citizen/{citizenId}")
    @Operation(summary = "Get applications by citizen ID")
    public List<CertificateResponse> getByCitizen(@PathVariable Long citizenId) {
        return service.getByCitizen(citizenId);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a certificate / permit application by ID")
    public CertificateResponse getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @GetMapping("/{id}/download")
    @Operation(summary = "Download generated certificate PDF")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable Long id) {
        byte[] pdf = service.downloadPdf(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"certificate-" + id + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    /**
     * Primary list endpoint.
     *
     * - Admin: call with no params → returns all applications.
     * - Officer: call with ?department=Health+Department → returns only their
     *   department's applications.  The frontend resolves the officer's dept
     *   after login via GET /api/officers/me and appends it here.
     */
    @GetMapping
    @Operation(summary = "List all certificate/permit applications (Admin: all; Officer: filter by ?department=)")
    public List<CertificateResponse> getAll(
            @RequestParam(value = "department", required = false) String department) {
        if (department != null && !department.isBlank()) {
            return service.getByDepartment(department);
        }
        return service.getAll();
    }

    @GetMapping("/pending")
    @Operation(summary = "Get pending (unresolved) applications")
    public List<CertificateResponse> getPending() {
        return service.getPending();
    }

    @GetMapping("/search")
    @Operation(summary = "Search applications by citizen name, status, type, or department")
    public List<CertificateResponse> search(
            @RequestParam(required = false) String citizenName,
            @RequestParam(required = false) String appNumber,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String department) {
        return service.getAll().stream()
                .filter(c -> {
                    // Name filter
                    if (citizenName != null && !c.getCitizenName().toLowerCase()
                            .contains(citizenName.toLowerCase())) return false;
                    // App number filter
                    if (appNumber != null && (c.getApplicationNumber() == null ||
                            !c.getApplicationNumber().equalsIgnoreCase(appNumber))) return false;
                    // Status filter
                    if (status != null && !status.isEmpty() && !c.getStatus().name().equals(status)) return false;
                    // Type filter
                    if (type != null && !type.isEmpty() && !c.getCertificateType().name().equals(type)) return false;
                    // Department filter (for officers)
                    if (department != null && !department.isEmpty() &&
                            (c.getAssignedDepartment() == null || !c.getAssignedDepartment().equals(department)))
                        return false;
                    return true;
                })
                .toList();
    }

    // ── Workflow actions ──────────────────────────────────────────────────────

    @PutMapping("/{id}/verify")
    @Operation(summary = "Mark application as verified / under-verification")
    public CertificateResponse verify(@PathVariable Long id,
                                       @RequestBody VerificationRequest request,
                                       @AuthenticationPrincipal Jwt jwt) {
        String username = jwt != null ? jwt.getClaim("preferred_username") : "unknown";
        return service.verify(id, request, username);
    }

    @PutMapping("/{id}/approve")
    @Operation(summary = "Approve a verified application")
    public CertificateResponse approve(@PathVariable Long id,
                                        @AuthenticationPrincipal Jwt jwt) {
        String username = jwt != null ? jwt.getClaim("preferred_username") : "unknown";
        return service.approve(id, username);
    }

    @PutMapping("/{id}/reject")
    @Operation(summary = "Reject an application at any pre-issued stage")
    public CertificateResponse reject(@PathVariable Long id,
                                       @RequestBody DecisionRequest request,
                                       @AuthenticationPrincipal Jwt jwt) {
        String username = jwt != null ? jwt.getClaim("preferred_username") : "unknown";
        return service.reject(id, request, username);
    }

    @PutMapping("/{id}/generate")
    @Operation(summary = "Generate the certificate PDF (after approval)")
    public CertificateResponse generate(@PathVariable Long id,
                                         @AuthenticationPrincipal Jwt jwt) {
        String username = jwt != null ? jwt.getClaim("preferred_username") : "unknown";
        return service.generate(id, username);
    }

    // ── Stats ─────────────────────────────────────────────────────────────────

    @GetMapping("/stats")
    @Operation(summary = "Get certificate pipeline statistics")
    public Map<String, Long> getStats() {
        return service.getStats();
    }

    @GetMapping("/status/{status}")
    @Operation(summary = "Get applications by status")
    public List<CertificateResponse> getByStatus(@PathVariable CertificateStatus status) {
        return service.getByStatus(status);
    }

    @GetMapping("/type/{type}")
    @Operation(summary = "Get applications by certificate type")
    public List<CertificateResponse> getByType(@PathVariable CertificateType type) {
        return service.getByType(type);
    }
}