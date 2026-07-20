package com.civicpulse.citizenservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CitizenRequest {

    @NotBlank
    private String fullName;

    private LocalDate dob;

    private String gender;

    @NotBlank
    @Pattern(regexp = "\\d{10}", message = "Phone must be 10 digits")
    private String phone;

    @Email
    private String email;

    // Raw Aadhar comes in from the client, gets masked before storage —
    // that transformation happens in the service layer, not the entity.
    @Pattern(regexp = "\\d{12}", message = "Aadhar must be 12 digits")
    private String aadhar;

    private Integer ward;

    private String address;
}