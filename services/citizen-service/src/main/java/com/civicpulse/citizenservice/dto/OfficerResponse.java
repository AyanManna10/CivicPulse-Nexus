package com.civicpulse.citizenservice.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class OfficerResponse {
    private Long id;
    private String officerCode;
    private String fullName;
    private String email;
    private String phone;
    private String department;
    private String keycloakRole;
    private boolean headOfficer;
    private String status;
    private LocalDateTime createdAt;
}
