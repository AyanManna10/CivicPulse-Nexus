package com.civicpulse.citizenservice.service;

import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
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
public class KeycloakProvisioningService {

    /**
 * Verifies the user's current password by attempting a token request
 * against Keycloak's token endpoint. Returns true if credentials are valid.
 */
public boolean verifyCurrentPassword(String username, String currentPassword) {
    try {
        RestTemplate restTemplate = new RestTemplate();
        String tokenUrl = "http://localhost:8080/realms/" + targetRealm + "/protocol/openid-connect/token";

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("grant_type", "password");
        params.add("client_id", "civicpulse-client");
        params.add("client_secret", clientSecret);
        params.add("username", username);
        params.add("password", currentPassword);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(tokenUrl, request, String.class);
        return response.getStatusCode() == HttpStatus.OK;
    } catch (Exception e) {
        log.warn("Password verification failed for {}: {}", username, e.getMessage());
        return false;
    }
}

    private static final Logger log = LoggerFactory.getLogger(KeycloakProvisioningService.class);

    private final Keycloak keycloak;

    @Value("${keycloak.admin.target-realm}")
    private String targetRealm;

    @Value("${keycloak.admin.citizen-role}")
    private String citizenRole;

    @Value("${keycloak.admin.client-secret}")
    private String clientSecret;

    public KeycloakProvisioningService(Keycloak keycloak) {
        this.keycloak = keycloak;
    }

    /**
     * Creates a Keycloak account for a newly registered citizen.
     * Username  = email address
     * Password  = phone number  (non-temporary — citizen can log in immediately
     *             without Keycloak forcing a password-reset flow)
     * Role      = CITIZEN (realm-level)
     */
    public void provisionCitizenAccount(String email, String phone, String fullName) {
        try {
            RealmResource realmResource = keycloak.realm(targetRealm);
            UsersResource usersResource = realmResource.users();

            List<UserRepresentation> existing = usersResource.searchByEmail(email, true);
            if (!existing.isEmpty()) {
                log.warn("Keycloak account already exists for email: {} — skipping creation", email);
                return;
            }

            UserRepresentation user = new UserRepresentation();
            user.setUsername(email);
            user.setEmail(email);
            user.setFirstName(extractFirstName(fullName));
            user.setLastName(extractLastName(fullName));
            user.setEnabled(true);
            user.setEmailVerified(true);

            // temporary=false → citizen can log in immediately with their phone number
            // as the password.  No Keycloak "required actions" dance needed.
            CredentialRepresentation credential = new CredentialRepresentation();
            credential.setType(CredentialRepresentation.PASSWORD);
            credential.setValue(phone);
            credential.setTemporary(false);
            user.setCredentials(List.of(credential));

            Response response = usersResource.create(user);
            int status = response.getStatus();
            response.close();

            if (status != 201) {
                log.error("Failed to create Keycloak user for {}: HTTP {}", email, status);
                return;
            }

            String userId = usersResource.searchByEmail(email, true).get(0).getId();

            RoleRepresentation role = realmResource.roles().get(citizenRole).toRepresentation();
            realmResource.users().get(userId).roles().realmLevel().add(List.of(role));

            log.info("Keycloak account provisioned for citizen: {} (username: {}, password: phone number)", fullName, email);

        } catch (Exception e) {
            log.error("Keycloak provisioning failed for {}: {}", email, e.getMessage(), e);
        }
    }

    /**
     * Creates a Keycloak account for a new officer/admin.
     * The role is passed in so this method works for OFFICER, ADMIN, DEPT_HEAD, etc.
     */
    public void provisionOfficerAccount(String email, String password, String fullName, String roleName) {
        try {
            RealmResource realmResource = keycloak.realm(targetRealm);
            UsersResource usersResource = realmResource.users();

            List<UserRepresentation> existing = usersResource.searchByEmail(email, true);
            if (!existing.isEmpty()) {
                log.warn("Keycloak account already exists for email: {} — skipping creation", email);
                return;
            }

            UserRepresentation user = new UserRepresentation();
            user.setUsername(email);
            user.setEmail(email);
            user.setFirstName(extractFirstName(fullName));
            user.setLastName(extractLastName(fullName));
            user.setEnabled(true);
            user.setEmailVerified(true);

            CredentialRepresentation credential = new CredentialRepresentation();
            credential.setType(CredentialRepresentation.PASSWORD);
            credential.setValue(password);
            credential.setTemporary(false);
            user.setCredentials(List.of(credential));

            Response response = usersResource.create(user);
            int status = response.getStatus();
            response.close();

            if (status != 201) {
                log.error("Failed to create Keycloak officer account for {}: HTTP {}", email, status);
                return;
            }

            String userId = usersResource.searchByEmail(email, true).get(0).getId();

            RoleRepresentation role = realmResource.roles().get(roleName).toRepresentation();
            realmResource.users().get(userId).roles().realmLevel().add(List.of(role));

            log.info("Keycloak officer account provisioned: {} (username: {}, role: {})", fullName, email, roleName);

        } catch (Exception e) {
            log.error("Keycloak officer provisioning failed for {}: {}", email, e.getMessage(), e);
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
    /**
 * Changes the Keycloak password for the user with the given email.
 * Used by the profile tab change-password feature.
 */
public void changeUserPassword(String email, String newPassword) {
    RealmResource realmResource = keycloak.realm(targetRealm);
    UsersResource usersResource = realmResource.users();

    List<UserRepresentation> users = usersResource.searchByEmail(email, true);
    if (users.isEmpty()) {
        throw new RuntimeException("Keycloak user not found for email: " + email);
    }

    String userId = users.get(0).getId();

    CredentialRepresentation credential = new CredentialRepresentation();
    credential.setType(CredentialRepresentation.PASSWORD);
    credential.setValue(newPassword);
    credential.setTemporary(false);

    usersResource.get(userId).resetPassword(credential);
    log.info("Password changed in Keycloak for user: {}", email);
}
}
