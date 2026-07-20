package com.civicpulse.citizenservice.dto;

public class RegisterResponse {

    private Long citizenId;
    private String email;
    private String citizenCode;
    private String message;

    public RegisterResponse() {}

    public RegisterResponse(Long citizenId, String email, String citizenCode, String message) {
        this.citizenId = citizenId;
        this.email = email;
        this.citizenCode = citizenCode;
        this.message = message;
    }

    public Long getCitizenId() { return citizenId; }
    public void setCitizenId(Long citizenId) { this.citizenId = citizenId; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getCitizenCode() { return citizenCode; }
    public void setCitizenCode(String citizenCode) { this.citizenCode = citizenCode; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}