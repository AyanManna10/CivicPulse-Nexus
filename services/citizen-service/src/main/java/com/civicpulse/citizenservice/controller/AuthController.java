package com.civicpulse.citizenservice.controller;

import com.civicpulse.citizenservice.dto.RegisterRequest;
import com.civicpulse.citizenservice.dto.RegisterResponse;
import com.civicpulse.citizenservice.entity.Citizen;
import com.civicpulse.citizenservice.repository.CitizenRepository;
import com.civicpulse.citizenservice.service.UserRegistrationService;
import com.civicpulse.citizenservice.util.CitizenUtil;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final UserRegistrationService userRegistrationService;
    private final CitizenRepository citizenRepository;
    private final CitizenUtil citizenUtil;

    public AuthController(UserRegistrationService userRegistrationService,
                          CitizenRepository citizenRepository,
                          CitizenUtil citizenUtil) {
        this.userRegistrationService = userRegistrationService;
        this.citizenRepository = citizenRepository;
        this.citizenUtil = citizenUtil;
    }

    /**
     * Public endpoint — self-registration for new citizens.
     * Creates Keycloak account + citizen DB record in one call.
     * No JWT required.
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        try {
            // Check email uniqueness in DB first (fast path before calling Keycloak)
            if (citizenRepository.findByEmail(request.getEmail()).isPresent()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Email already registered. Please use a different email.");
                error.put("code", "EMAIL_EXISTS");
                return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
            }

            // Provision Keycloak account (throws IllegalArgumentException if email already exists there)
            userRegistrationService.registerCitizen(
                request.getEmail(),
                request.getPassword(),
                request.getFullName()
            );

            // Create citizen record in DB
            Citizen citizen = new Citizen();
            citizen.setCitizenCode(citizenUtil.generateCitizenCode());
            citizen.setFullName(request.getFullName());
            citizen.setEmail(request.getEmail());
            citizen.setPhone(request.getPhone());
            citizen.setWard(request.getWard());
            if (request.getAadhaar() != null && !request.getAadhaar().isBlank()) {
                citizen.setAadharMasked(citizenUtil.maskAadhar(request.getAadhaar()));
            }
            citizen.setAddress(request.getAddress());
            citizen.setStatus("ACTIVE");

            Citizen saved = citizenRepository.save(citizen);

            RegisterResponse response = new RegisterResponse(
                saved.getId(),
                saved.getEmail(),
                saved.getCitizenCode(),
                "Registration successful. You can now log in with your email and password."
            );

            log.info("New citizen self-registered: {} (ID: {})", request.getEmail(), saved.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            error.put("code", "EMAIL_EXISTS");
            return ResponseEntity.status(HttpStatus.CONFLICT).body(error);

        } catch (Exception e) {
            log.error("Registration failed for {}: {}", request.getEmail(), e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Registration failed: " + e.getMessage());
            error.put("code", "REGISTRATION_ERROR");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Public endpoint — real-time email availability check.
     * Called by the registration form to give instant feedback.
     */
    @GetMapping("/check-email")
    public ResponseEntity<Map<String, Object>> checkEmail(@RequestParam String email) {
        boolean exists = citizenRepository.findByEmail(email).isPresent();
        Map<String, Object> response = new HashMap<>();
        response.put("email", email);
        response.put("available", !exists);
        return ResponseEntity.ok(response);
    }

    /**
     * Public endpoint — real-time password strength check.
     * Validates the 4 criteria and returns a score (0–4) + feedback text.
     */
    @PostMapping("/validate-password")
    public ResponseEntity<Map<String, Object>> validatePassword(@RequestBody Map<String, String> body) {
        String password = body.get("password");
        Map<String, Object> response = new HashMap<>();

        if (password == null || password.length() < 8) {
            response.put("valid", false);
            response.put("score", 0);
            response.put("feedback", "Password must be at least 8 characters.");
            return ResponseEntity.ok(response);
        }

        int score = 0;
        StringBuilder feedback = new StringBuilder();

        if (password.matches(".*[a-z].*")) { score++; } else { feedback.append("Add lowercase letters. "); }
        if (password.matches(".*[A-Z].*")) { score++; } else { feedback.append("Add uppercase letters. "); }
        if (password.matches(".*\\d.*"))   { score++; } else { feedback.append("Add numbers. "); }
        if (password.matches(".*[@$!%*?&].*")) { score++; } else { feedback.append("Add special characters (@$!%*?&). "); }

        response.put("valid", score == 4);
        response.put("score", score);
        response.put("feedback", feedback.toString().trim());
        return ResponseEntity.ok(response);
    }
}