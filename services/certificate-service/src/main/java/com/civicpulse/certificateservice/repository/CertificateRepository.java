package com.civicpulse.certificateservice.repository;

import com.civicpulse.certificateservice.entity.Certificate;
import com.civicpulse.certificateservice.entity.CertificateStatus;
import com.civicpulse.certificateservice.entity.CertificateType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CertificateRepository extends JpaRepository<Certificate, Long> {

    List<Certificate> findByCitizenId(Long citizenId);

    List<Certificate> findByStatus(CertificateStatus status);

    List<Certificate> findByCertificateType(CertificateType type);

    /** Returns all certificates routed to the given department. */
    List<Certificate> findByAssignedDepartment(String assignedDepartment);

    @Query("""
        SELECT c FROM Certificate c
        WHERE c.status NOT IN (
            com.civicpulse.certificateservice.entity.CertificateStatus.REJECTED,
            com.civicpulse.certificateservice.entity.CertificateStatus.CERTIFICATE_GENERATED,
            com.civicpulse.certificateservice.entity.CertificateStatus.DOWNLOADED
        )
        ORDER BY c.appliedAt DESC
    """)
    List<Certificate> findPendingApplications();

    @Query("""
        SELECT COUNT(c) > 0 FROM Certificate c
        WHERE c.citizenId = :citizenId
          AND c.certificateType = :type
          AND c.status NOT IN (
            com.civicpulse.certificateservice.entity.CertificateStatus.REJECTED
          )
    """)
    boolean existsActiveApplicationForType(@Param("citizenId") Long citizenId,
                                           @Param("type") CertificateType type);

    long countByCertificateNumberIsNotNull();
}