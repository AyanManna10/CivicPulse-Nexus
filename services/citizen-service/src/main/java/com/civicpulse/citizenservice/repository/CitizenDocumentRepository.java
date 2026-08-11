package com.civicpulse.citizenservice.repository;

import com.civicpulse.citizenservice.entity.CitizenDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CitizenDocumentRepository extends JpaRepository<CitizenDocument, Long> {
    List<CitizenDocument> findByPendingId(Long pendingId);
}