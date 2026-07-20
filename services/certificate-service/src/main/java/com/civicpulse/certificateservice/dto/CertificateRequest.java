package com.civicpulse.certificateservice.dto;

import com.civicpulse.certificateservice.entity.CertificateType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class CertificateRequest {

    @NotNull(message = "Citizen ID is required")
    private Long citizenId;

    @NotBlank(message = "Applicant name is required")
    private String citizenName;

    private String citizenAddress;

    @NotBlank(message = "Aadhaar number is required")
    @Pattern(regexp = "\\d{12}", message = "Aadhaar must be exactly 12 digits")
    private String aadhaarNumber;

    @NotNull(message = "Certificate type is required")
    private CertificateType certificateType;
}