package com.civicpulse.welfareservice.repository;

import com.civicpulse.welfareservice.entity.WelfareScheme;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface WelfareSchemeRepository extends JpaRepository<WelfareScheme, Long> {
    Optional<WelfareScheme> findBySchemeCode(String schemeCode);
    List<WelfareScheme> findByDepartment(String department);
    List<WelfareScheme> findByStatus(String status);
    List<WelfareScheme> findBySchemeType(String schemeType);
}