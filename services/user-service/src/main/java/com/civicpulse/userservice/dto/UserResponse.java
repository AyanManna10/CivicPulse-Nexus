package com.civicpulse.userservice.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class UserResponse {

    private Long id;
    private String fullName;
    private String email;
    private String phone;
    private String role;
    private String department;
    private Boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}