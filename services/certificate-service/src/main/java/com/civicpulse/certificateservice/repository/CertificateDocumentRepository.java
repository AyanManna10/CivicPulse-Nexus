package com.civicpulse.certificateservice.repository;

import com.civicpulse.certificateservice.entity.CertificateDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CertificateDocumentRepository extends JpaRepository<CertificateDocument, Long> {
    List<CertificateDocument> findByCertificateId(Long certificateId);
}