package com.civicpulse.citizenservice.repository;

import com.civicpulse.citizenservice.entity.Citizen;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CitizenRepository extends JpaRepository<Citizen, Long> {

    Optional<Citizen> findByCitizenCode(String citizenCode);

    List<Citizen> findByWard(Integer ward);

    List<Citizen> findByStatus(String status);

    List<Citizen> findByFullNameContainingIgnoreCase(String name);

    Optional<Citizen> findByPhone(String phone);
    boolean existsByEmail(String email);
    Optional<Citizen> findByEmail(String email);

}