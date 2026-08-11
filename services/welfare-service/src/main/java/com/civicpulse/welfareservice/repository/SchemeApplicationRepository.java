package com.civicpulse.welfareservice.repository;

import com.civicpulse.welfareservice.entity.SchemeApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface SchemeApplicationRepository extends JpaRepository<SchemeApplication, Long> {
    Optional<SchemeApplication> findByApplicationCode(String applicationCode);
    List<SchemeApplication> findByCitizenId(Long citizenId);
    List<SchemeApplication> findBySchemeId(Long schemeId);
    List<SchemeApplication> findByStatus(String status);
    List<SchemeApplication> findBySchemeIdAndStatus(Long schemeId, String status);
}