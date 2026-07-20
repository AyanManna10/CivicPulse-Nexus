package com.civicpulse.citizenservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class OfficerRequest {

    @NotBlank(message = "Full name is required")
    private String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Enter a valid email address")
    private String email;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "\\d{10}", message = "Phone must be exactly 10 digits")
    private String phone;

    @NotBlank(message = "Department is required")
    private String department;

    /** Password for the officer's Keycloak account */
    @NotBlank(message = "Password is required")
    private String password;

    /** OFFICER or ADMIN */
    private String keycloakRole = "OFFICER";

    /** Set true to make this officer the head of their department */
    private boolean headOfficer = false;
}
