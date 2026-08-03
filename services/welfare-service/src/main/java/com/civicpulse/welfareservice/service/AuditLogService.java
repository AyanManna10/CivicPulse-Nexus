package com.civicpulse.welfareservice.service;

// ── AuditLogService.java (interface) ─────────────────────────────────────────
// Place at: welfare-service/.../service/AuditLogService.java

import com.civicpulse.welfareservice.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.civicpulse.welfareservice.service.AuditLogService;
import java.util.List;

public interface AuditLogService {
    void log(String action, String entityType, Long entityId,
             String entityCode, String performedBy, String details);

    Page<AuditLog> getAllLogs(Pageable pageable);
    List<AuditLog> getLogsByEntity(String entityType, Long entityId);
    Page<AuditLog> getLogsByPerformedBy(String performedBy, Pageable pageable);
    Page<AuditLog> getLogsByEntityType(String entityType, Pageable pageable);
}