package com.civicpulse.welfareservice.repository;

import com.civicpulse.welfareservice.entity.SchemeApplicationDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SchemeApplicationDocumentRepository extends JpaRepository<SchemeApplicationDocument, Long> {
    List<SchemeApplicationDocument> findByApplicationId(Long applicationId);
}