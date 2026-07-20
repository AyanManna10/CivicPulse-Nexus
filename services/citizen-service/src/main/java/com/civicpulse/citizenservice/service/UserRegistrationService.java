package com.civicpulse.citizenservice.service;

import jakarta.ws.rs.core.Response;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.admin.client.resource.UsersResource;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.keycloak.representations.idm.RoleRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserRegistrationService {

    private static final Logger log = LoggerFactory.getLogger(UserRegistrationService.class);

    private final Keycloak keycloak;

    @Value("${keycloak.admin.target-realm}")
    private String targetRealm;

    @Value("${keycloak.admin.citizen-role}")
    private String citizenRole;

    public UserRegistrationService(Keycloak keycloak) {
        this.keycloak = keycloak;
    }

    /**
     * Register a new citizen user in Keycloak.
     * Validates email uniqueness, creates user account with provided credentials,
     * and assigns CITIZEN role.
     *
     * @param email unique email (username)
     * @param password user-provided password (not temporary)
     * @param fullName citizen's full name
     * @throws IllegalArgumentException if email already exists
     * @throws RuntimeException if Keycloak creation fails
     */
    public void registerCitizen(String email, String password, String fullName) {
        try {
            RealmResource realmResource = keycloak.realm(targetRealm);
            UsersResource usersResource = realmResource.users();

            // Check for existing email
            List<UserRepresentation> existing = usersResource.searchByEmail(email, true);
            if (!existing.isEmpty()) {
                throw new IllegalArgumentException("Email already registered. Please use a different email.");
            }

            // Create user
            UserRepresentation user = new UserRepresentation();
            user.setUsername(email);
            user.setEmail(email);
            user.setFirstName(extractFirstName(fullName));
            user.setLastName(extractLastName(fullName));
            user.setEnabled(true);
            user.setEmailVerified(false); // Citizen must verify email

            // Set permanent password (NOT temporary)
            CredentialRepresentation credential = new CredentialRepresentation();
            credential.setType(CredentialRepresentation.PASSWORD);
            credential.setValue(password);
            credential.setTemporary(false); // User's own password, not temporary
            user.setCredentials(List.of(credential));

            Response response = usersResource.create(user);
            int status = response.getStatus();
            response.close();

            if (status != 201) {
                log.error("Failed to create Keycloak user for {}: HTTP {}", email, status);
                throw new RuntimeException("User registration failed. Please try again.");
            }

            // Retrieve created user and assign CITIZEN role
            String userId = usersResource.searchByEmail(email, true).get(0).getId();
            RoleRepresentation role = realmResource.roles().get(citizenRole).toRepresentation();
            realmResource.users().get(userId).roles().realmLevel().add(List.of(role));

            log.info("Citizen self-registered and Keycloak account created for: {} (email: {})", fullName, email);

        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("User registration error for {}: {}", email, e.getMessage(), e);
            throw new RuntimeException("Registration failed: " + e.getMessage());
        }
    }

    private String extractFirstName(String fullName) {
        if (fullName == null || fullName.isBlank()) return "";
        String[] parts = fullName.trim().split("\\s+");
        return parts[0];
    }

    private String extractLastName(String fullName) {
        if (fullName == null || fullName.isBlank()) return "";
        String[] parts = fullName.trim().split("\\s+");
        return parts.length > 1 ? parts[parts.length - 1] : "";
    }
}