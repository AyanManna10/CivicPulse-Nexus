package com.civicpulse.certificateservice.repository;

import com.civicpulse.certificateservice.entity.Certificate;
import com.civicpulse.certificateservice.entity.CertificateStatus;
import com.civicpulse.certificateservice.entity.CertificateType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;


public interface CertificateRepository extends JpaRepository<Certificate, Long> {

    List<Certificate> findByCitizenId(Long citizenId);

    List<Certificate> findByStatus(CertificateStatus status);

    List<Certificate> findByCertificateType(CertificateType type);

    Optional<Certificate> findByApplicationNumber(String applicationNumber);

    // Duplicate check: does this citizen already have an active (non-rejected) application
    // for the same certificate type?
    @Query("""
            SELECT COUNT(c) > 0 FROM Certificate c
            WHERE c.citizenId = :citizenId
            AND c.certificateType = :type
            AND c.status NOT IN ('REJECTED')
            """)
    boolean existsActiveApplicationForType(
            @Param("citizenId") Long citizenId,
            @Param("type") CertificateType type
    );
    long countByCertificateNumberIsNotNull();
    // Search/filter query for officers and admins
    @Query("""
            SELECT c FROM Certificate c
            WHERE (:citizenName IS NULL OR LOWER(c.citizenName) LIKE LOWER(CONCAT('%', :citizenName, '%')))
            AND (:status IS NULL OR c.status = :status)
            AND (:type IS NULL OR c.certificateType = :type)
            ORDER BY c.appliedAt DESC
            """)
    List<Certificate> search(
            @Param("citizenName") String citizenName,
            @Param("status") CertificateStatus status,
            @Param("type") CertificateType type
    );
}