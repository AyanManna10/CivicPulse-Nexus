package com.civicpulse.citizenservice.dto;

import jakarta.validation.constraints.*;

public class RegisterRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
        message = "Password must contain uppercase, lowercase, number, and special character"
    )
    private String password;

    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 80, message = "Name must be 2-80 characters")
    @Pattern(regexp = "^[a-zA-Z\\s.\\-']{2,80}$", message = "Name can only contain letters, spaces, dots, hyphens")
    private String fullName;

    @NotBlank(message = "Mobile number is required")
    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Enter valid 10-digit Indian mobile number (starts with 6-9)")
    private String phone;

    @Positive(message = "Ward number must be positive")
    private Integer ward;

    private String aadhaar;
    private String address;

    // Constructors
    public RegisterRequest() {}

    public RegisterRequest(String email, String password, String fullName, String phone, Integer ward) {
        this.email = email;
        this.password = password;
        this.fullName = fullName;
        this.phone = phone;
        this.ward = ward;
    }

    // Getters and Setters
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public Integer getWard() { return ward; }
    public void setWard(Integer ward) { this.ward = ward; }

    public String getAadhaar() { return aadhaar; }
    public void setAadhaar(String aadhaar) { this.aadhaar = aadhaar; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
}