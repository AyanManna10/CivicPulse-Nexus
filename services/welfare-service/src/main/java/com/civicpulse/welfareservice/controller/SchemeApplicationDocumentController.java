package com.civicpulse.welfareservice.controller;

import com.civicpulse.welfareservice.entity.SchemeApplicationDocument;
import com.civicpulse.welfareservice.repository.SchemeApplicationDocumentRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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

    @Value("${app.upload.welfare-docs}")
    private String uploadBasePath;

    public SchemeApplicationDocumentController(SchemeApplicationDocumentRepository docRepo) {
        this.docRepo = docRepo;
    }

    @PostMapping("/applications/{id}/documents")
    @Operation(summary = "Upload a document for a scheme application")
    public ResponseEntity<Map<String, Object>> uploadDocument(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @RequestParam("docType") String docType) {

        if (file.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));

        String contentType = file.getContentType();
        if (contentType == null || (!contentType.equals("application/pdf") && !contentType.startsWith("image/")))
            return ResponseEntity.badRequest().body(Map.of("error", "Only PDF, JPG, and PNG files are allowed"));

        try {
            Path dir = Paths.get(uploadBasePath, String.valueOf(id));
            Files.createDirectories(dir);

            String ext = file.getOriginalFilename() != null && file.getOriginalFilename().contains(".")
                    ? file.getOriginalFilename().substring(file.getOriginalFilename().lastIndexOf("."))
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
            return ResponseEntity.internalServerError().body(Map.of("error", "File storage failed: " + e.getMessage()));
        }
    }

    @GetMapping("/applications/{id}/documents")
    @Operation(summary = "Get all documents for a scheme application")
    public List<SchemeApplicationDocument> getDocuments(@PathVariable Long id) {
        return docRepo.findByApplicationId(id);
    }

    @GetMapping("/documents/{docId}/view")
    @Operation(summary = "View a scheme application document")
    public ResponseEntity<Resource> viewDocument(@PathVariable Long docId) {
        SchemeApplicationDocument doc = docRepo.findById(docId)
                .orElseThrow(() -> new RuntimeException("Document not found"));
        try {
            Path path = Paths.get(doc.getStoredPath());
            Resource resource = new UrlResource(path.toUri());
            if (!resource.exists()) return ResponseEntity.notFound().build();

            String name = doc.getOriginalName().toLowerCase();
            String ct;
            if (name.endsWith(".pdf"))                               ct = "application/pdf";
            else if (name.endsWith(".png"))                          ct = "image/png";
            else if (name.endsWith(".jpg") || name.endsWith(".jpeg")) ct = "image/jpeg";
            else                                                     ct = "application/octet-stream";

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(ct))
                    .header("Content-Disposition", "inline; filename=\"" + doc.getOriginalName() + "\"")
                    .header("Cache-Control", "no-cache")
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}