package com.civicpulse.grievanceservice.repository;

import com.civicpulse.grievanceservice.entity.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
}