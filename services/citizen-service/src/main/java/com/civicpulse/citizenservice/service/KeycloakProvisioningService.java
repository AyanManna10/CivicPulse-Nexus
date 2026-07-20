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
public class KeycloakProvisioningService {

    private static final Logger log = LoggerFactory.getLogger(KeycloakProvisioningService.class);

    private final Keycloak keycloak;

    @Value("${keycloak.admin.target-realm}")
    private String targetRealm;

    @Value("${keycloak.admin.citizen-role}")
    private String citizenRole;

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
}
