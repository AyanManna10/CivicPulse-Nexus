package com.civicpulse.welfareservice.repository;

import com.civicpulse.welfareservice.entity.Budget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface BudgetRepository extends JpaRepository<Budget, Long> {
    Optional<Budget> findBySchemeIdAndFiscalYear(Long schemeId, String fiscalYear);
    List<Budget> findByDepartment(String department);
    List<Budget> findBySchemeId(Long schemeId);
    List<Budget> findByFiscalYear(String fiscalYear);
}