package com.civicpulse.citizenservice.repository;

import com.civicpulse.citizenservice.entity.Officer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OfficerRepository extends JpaRepository<Officer, Long> {

    Optional<Officer> findByEmail(String email);

    List<Officer> findByDepartment(String department);

    List<Officer> findByDepartmentAndHeadOfficerTrue(String department);

    List<Officer> findByStatus(String status);

    boolean existsByEmail(String email);
}
