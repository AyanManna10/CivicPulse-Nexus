package com.civicpulse.welfareservice.controller;

import com.civicpulse.welfareservice.entity.AuditLog;
import com.civicpulse.welfareservice.service.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/welfare/audit-logs")
@Tag(name = "Audit Logs", description = "Read-only audit trail for admin review")
public class AuditLogController {

    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    // GET /api/welfare/audit-logs?page=0&size=50
    @GetMapping
    @Operation(summary = "Get all audit logs paginated (Admin only)")
    public ResponseEntity<Page<AuditLog>> getAllLogs(
            @PageableDefault(size = 50, page = 0) Pageable pageable) {
        return ResponseEntity.ok(auditLogService.getAllLogs(pageable));
    }

    // GET /api/welfare/audit-logs/entity/APPLICATION/5
    @GetMapping("/entity/{entityType}/{entityId}")
    @Operation(summary = "Get audit logs for a specific entity (Admin only)")
    public ResponseEntity<List<AuditLog>> getByEntity(
            @PathVariable String entityType,
            @PathVariable Long entityId) {
        return ResponseEntity.ok(auditLogService.getLogsByEntity(entityType, entityId));
    }

    // GET /api/welfare/audit-logs/officer/lois?page=0&size=20
    @GetMapping("/officer/{username}")
    @Operation(summary = "Get audit logs by officer username (Admin only)")
    public ResponseEntity<Page<AuditLog>> getByOfficer(
            @PathVariable String username,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(auditLogService.getLogsByPerformedBy(username, pageable));
    }

    // GET /api/welfare/audit-logs/type/APPLICATION?page=0&size=20
    @GetMapping("/type/{entityType}")
    @Operation(summary = "Get audit logs by entity type (Admin only)")
    public ResponseEntity<Page<AuditLog>> getByEntityType(
            @PathVariable String entityType,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(auditLogService.getLogsByEntityType(entityType, pageable));
    }
}
