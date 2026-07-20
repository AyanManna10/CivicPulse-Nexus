package com.civicpulse.grievanceservice.repository;

import com.civicpulse.grievanceservice.entity.Grievance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface GrievanceRepository extends JpaRepository<Grievance, Long> {

    List<Grievance> findByCitizenId(Long citizenId);

    List<Grievance> findByDepartment(String department);

    List<Grievance> findByStatus(String status);

    // Used for the SLA-check endpoint: any grievance still open/in-progress
    // whose due date has already passed.
    List<Grievance> findByStatusInAndDueDateBefore(List<String> statuses, LocalDateTime now);
}