package com.civicpulse.welfareservice.repository;

import com.civicpulse.welfareservice.entity.FundDistribution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface FundDistributionRepository extends JpaRepository<FundDistribution, Long> {
    Optional<FundDistribution> findByDistributionCode(String distributionCode);
    List<FundDistribution> findByBeneficiaryId(Long beneficiaryId);
    List<FundDistribution> findBySchemeId(Long schemeId);
    List<FundDistribution> findByPaymentStatus(String paymentStatus);
}