package com.civicpulse.welfareservice.service.impl;

import com.civicpulse.welfareservice.entity.AuditLog;
import com.civicpulse.welfareservice.repository.AuditLogRepository;
import com.civicpulse.welfareservice.service.AuditLogService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AuditLogServiceImpl implements AuditLogService {

    private static final Logger log = LoggerFactory.getLogger(AuditLogServiceImpl.class);
    private final AuditLogRepository auditLogRepo;

    public AuditLogServiceImpl(AuditLogRepository auditLogRepo) {
        this.auditLogRepo = auditLogRepo;
    }

    @Override
    public void log(String action, String entityType, Long entityId,
                    String entityCode, String performedBy, String details) {
        try {
            AuditLog entry = new AuditLog();
            entry.setAction(action);
            entry.setEntityType(entityType);
            entry.setEntityId(entityId);
            entry.setEntityCode(entityCode);
            entry.setPerformedBy(performedBy != null ? performedBy : "system");
            entry.setDetails(details);
            auditLogRepo.save(entry);
        } catch (Exception e) {
            // Never let audit logging crash the main operation
            log.warn("Audit log failed for action={} entityType={} entityId={}: {}",
                    action, entityType, entityId, e.getMessage());
        }
    }

    @Override
    public Page<AuditLog> getAllLogs(Pageable pageable) {
        return auditLogRepo.findAllByOrderByPerformedAtDesc(pageable);
    }

    @Override
    public List<AuditLog> getLogsByEntity(String entityType, Long entityId) {
        return auditLogRepo.findByEntityTypeAndEntityIdOrderByPerformedAtDesc(entityType, entityId);
    }

    @Override
    public Page<AuditLog> getLogsByPerformedBy(String performedBy, Pageable pageable) {
        return auditLogRepo.findByPerformedByOrderByPerformedAtDesc(performedBy, pageable);
    }

    @Override
    public Page<AuditLog> getLogsByEntityType(String entityType, Pageable pageable) {
        return auditLogRepo.findByEntityTypeOrderByPerformedAtDesc(entityType, pageable);
    }
}
