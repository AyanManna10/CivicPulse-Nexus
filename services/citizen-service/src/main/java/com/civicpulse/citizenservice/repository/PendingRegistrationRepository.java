package com.civicpulse.citizenservice.repository;

import com.civicpulse.citizenservice.entity.PendingRegistration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PendingRegistrationRepository extends JpaRepository<PendingRegistration, Long> {
    Optional<PendingRegistration> findByEmail(String email);

    boolean existsByEmail(String email);
    List<PendingRegistration> findByStatus(String status);
}