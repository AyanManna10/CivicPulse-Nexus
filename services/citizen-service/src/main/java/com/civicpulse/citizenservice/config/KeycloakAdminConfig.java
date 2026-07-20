package com.civicpulse.citizenservice.config;

import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.KeycloakBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class KeycloakAdminConfig {

    @Value("${keycloak.admin.server-url}")
    private String serverUrl;

    @Value("${keycloak.admin.master-realm}")
    private String masterRealm;

    @Value("${keycloak.admin.admin-username}")
    private String adminUsername;

    @Value("${keycloak.admin.admin-password}")
    private String adminPassword;

    /**
     * A single Keycloak admin client authenticated against the master realm.
     * Master realm has admin privileges over all other realms including civicpulse,
     * which is the standard pattern for programmatic user management.
     */
    @Bean
    public Keycloak keycloakAdminClient() {
        return KeycloakBuilder.builder()
                .serverUrl(serverUrl)
                .realm(masterRealm)
                .clientId("admin-cli")
                .username(adminUsername)
                .password(adminPassword)
                .build();
    }
}