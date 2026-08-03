package com.civicpulse.welfareservice.repository;

import com.civicpulse.welfareservice.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    Page<AuditLog> findAllByOrderByPerformedAtDesc(Pageable pageable);

    List<AuditLog> findByEntityTypeAndEntityIdOrderByPerformedAtDesc(
            String entityType, Long entityId);

    Page<AuditLog> findByPerformedByOrderByPerformedAtDesc(
            String performedBy, Pageable pageable);

    Page<AuditLog> findByEntityTypeOrderByPerformedAtDesc(
            String entityType, Pageable pageable);
}