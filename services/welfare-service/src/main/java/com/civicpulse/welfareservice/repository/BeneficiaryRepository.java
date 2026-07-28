package com.civicpulse.welfareservice.repository;

import com.civicpulse.welfareservice.entity.Beneficiary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface BeneficiaryRepository extends JpaRepository<Beneficiary, Long> {
    Optional<Beneficiary> findByBeneficiaryCode(String beneficiaryCode);
    List<Beneficiary> findByCitizenId(Long citizenId);
    List<Beneficiary> findBySchemeId(Long schemeId);
    List<Beneficiary> findByStatus(String status);
    Optional<Beneficiary> findByCitizenIdAndSchemeId(Long citizenId, Long schemeId);
}