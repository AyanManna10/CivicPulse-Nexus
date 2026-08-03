
package com.civicpulse.welfareservice.controller;

import com.civicpulse.welfareservice.entity.SchemeApplication;
import com.civicpulse.welfareservice.entity.SchemeApplicationDocument;
import com.civicpulse.welfareservice.repository.SchemeApplicationDocumentRepository;
import com.civicpulse.welfareservice.repository.SchemeApplicationRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/welfare")
@Tag(name = "Scheme Application Documents", description = "Document upload and retrieval")
public class SchemeApplicationDocumentController {

    private final SchemeApplicationDocumentRepository docRepo;
    private final SchemeApplicationRepository applicationRepo;

    @Value("${welfare.upload.path}")
    private String uploadBasePath;

    public SchemeApplicationDocumentController(
            SchemeApplicationDocumentRepository docRepo,
            SchemeApplicationRepository applicationRepo) {
        this.docRepo = docRepo;
        this.applicationRepo = applicationRepo;
    }

    @PostMapping("/applications/{id}/documents")
    @Operation(summary = "Upload a document for a scheme application")
    public ResponseEntity<Map<String, Object>> uploadDocument(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @RequestParam("docType") String docType,
            @AuthenticationPrincipal Jwt jwt) {

        if (file.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));

        String contentType = file.getContentType();
        if (contentType == null ||
                (!contentType.equals("application/pdf") && !contentType.startsWith("image/")))
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Only PDF, JPG, and PNG files are allowed"));

        // ── Ownership check ───────────────────────────────────────────────────
        // Officers and admins can upload on behalf of citizens; citizens can only
        // upload to their own applications.
        @SuppressWarnings("unchecked")
        Map<String, Object> realmAccess =
                (Map<String, Object>) jwt.getClaim("realm_access");
        @SuppressWarnings("unchecked")
        List<String> roles = realmAccess != null
                ? (List<String>) realmAccess.get("roles")
                : List.of();
        boolean isPrivileged = roles.contains("ADMIN") || roles.contains("OFFICER");

        if (!isPrivileged) {
            SchemeApplication app = applicationRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Application not found"));
            // Resolve citizenId from JWT subject claim stored at login
            String jwtEmail = jwt.getClaimAsString("email");
            // Compare by citizenEmail stored on application
            if (app.getCitizenEmail() == null ||
                    !app.getCitizenEmail().equalsIgnoreCase(jwtEmail)) {
                return ResponseEntity.status(403)
                        .body(Map.of("error", "You can only upload documents for your own applications"));
            }
        }

        try {
            Path dir = Paths.get(uploadBasePath, String.valueOf(id));
            Files.createDirectories(dir);

            String ext = file.getOriginalFilename() != null
                    && file.getOriginalFilename().contains(".")
                    ? file.getOriginalFilename()
                            .substring(file.getOriginalFilename().lastIndexOf("."))
                    : ".bin";
            String storedName = docType + "_" + System.currentTimeMillis() + ext;
            Path dest = dir.resolve(storedName);
            Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);

            SchemeApplicationDocument doc = new SchemeApplicationDocument();
            doc.setApplicationId(id);
            doc.setDocType(docType);
            doc.setOriginalName(file.getOriginalFilename());
            doc.setStoredPath(dest.toString());
            SchemeApplicationDocument saved = docRepo.save(doc);

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

    @GetMapping("/applications/{id}/documents")
    @Operation(summary = "Get all documents for a scheme application")
    public ResponseEntity<?> getDocuments(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {

        // ── Ownership check ───────────────────────────────────────────────────
        @SuppressWarnings("unchecked")
        Map<String, Object> realmAccess =
                (Map<String, Object>) jwt.getClaim("realm_access");
        @SuppressWarnings("unchecked")
        List<String> roles = realmAccess != null
                ? (List<String>) realmAccess.get("roles")
                : List.of();
        boolean isPrivileged = roles.contains("ADMIN") || roles.contains("OFFICER");

        if (!isPrivileged) {
            SchemeApplication app = applicationRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Application not found"));
            String jwtEmail = jwt.getClaimAsString("email");
            if (app.getCitizenEmail() == null ||
                    !app.getCitizenEmail().equalsIgnoreCase(jwtEmail)) {
                return ResponseEntity.status(403)
                        .body(Map.of("error", "You can only view documents for your own applications"));
            }
        }

        return ResponseEntity.ok(docRepo.findByApplicationId(id));
    }

    @GetMapping("/documents/{docId}/view")
    @Operation(summary = "View a scheme application document")
    public ResponseEntity<Resource> viewDocument(
            @PathVariable Long docId,
            @AuthenticationPrincipal Jwt jwt) {

        SchemeApplicationDocument doc = docRepo.findById(docId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        // ── Ownership check ───────────────────────────────────────────────────
        @SuppressWarnings("unchecked")
        Map<String, Object> realmAccess =
                (Map<String, Object>) jwt.getClaim("realm_access");
        @SuppressWarnings("unchecked")
        List<String> roles = realmAccess != null
                ? (List<String>) realmAccess.get("roles")
                : List.of();
        boolean isPrivileged = roles.contains("ADMIN") || roles.contains("OFFICER");

        if (!isPrivileged) {
            // Look up the application this document belongs to
            SchemeApplication app = applicationRepo.findById(doc.getApplicationId())
                    .orElseThrow(() -> new RuntimeException("Application not found"));
            String jwtEmail = jwt.getClaimAsString("email");
            if (app.getCitizenEmail() == null ||
                    !app.getCitizenEmail().equalsIgnoreCase(jwtEmail)) {
                return ResponseEntity.status(403).build();
            }
        }

        try {
            Path path = Paths.get(doc.getStoredPath());
            Resource resource = new UrlResource(path.toUri());
            if (!resource.exists()) return ResponseEntity.notFound().build();

            String name = doc.getOriginalName().toLowerCase();
            String ct;
            if (name.endsWith(".pdf"))                                ct = "application/pdf";
            else if (name.endsWith(".png"))                           ct = "image/png";
            else if (name.endsWith(".jpg") || name.endsWith(".jpeg")) ct = "image/jpeg";
            else                                                      ct = "application/octet-stream";

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(ct))
                    .header("Content-Disposition",
                            "inline; filename=\"" + doc.getOriginalName() + "\"")
                    .header("Cache-Control", "no-cache")
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
