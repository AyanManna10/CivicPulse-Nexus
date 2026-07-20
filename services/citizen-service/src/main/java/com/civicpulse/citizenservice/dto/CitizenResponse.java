package com.civicpulse.citizenservice.dto;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class CitizenResponse {

    private Long id;
    private String citizenCode;
    private String fullName;
    private LocalDate dob;
    private String gender;
    private String phone;
    private String email;
    private String aadharMasked;
    private Integer ward;
    private String address;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}