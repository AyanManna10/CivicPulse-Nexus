package com.civicpulse.citizenservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()

                // ── Public endpoints — no token required ──────────────────
                .requestMatchers(HttpMethod.POST, "/api/auth/register").permitAll()
                .requestMatchers(HttpMethod.GET,  "/api/auth/check-email").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/validate-password").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/citizens/register").permitAll()
                .requestMatchers(HttpMethod.GET,  "/api/citizens/check-email").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/citizens/pending/*/documents").permitAll()
                .requestMatchers(HttpMethod.GET,  "/api/citizens/documents/*/view").permitAll()

                // ── Pending registrations — Officer/Admin only ────────────
                .requestMatchers(HttpMethod.GET,  "/api/citizens/pending").hasAnyRole("ADMIN", "OFFICER")
                .requestMatchers(HttpMethod.POST, "/api/citizens/pending/*/approve").hasAnyRole("ADMIN", "OFFICER")
                .requestMatchers(HttpMethod.POST, "/api/citizens/pending/*/reject").hasAnyRole("ADMIN", "OFFICER")
                .requestMatchers(HttpMethod.GET,  "/api/citizens/pending/*/documents").hasAnyRole("ADMIN", "OFFICER")

                // ── Citizen profile ───────────────────────────────────────
                .requestMatchers(HttpMethod.GET, "/api/citizens/me").hasAnyRole("CITIZEN", "ADMIN", "OFFICER")
                .requestMatchers(HttpMethod.GET, "/api/citizens/**").hasAnyRole("CITIZEN", "ADMIN", "OFFICER")
                .requestMatchers(HttpMethod.POST, "/api/citizens").hasAnyRole("ADMIN", "OFFICER")
                .requestMatchers(HttpMethod.PUT,  "/api/citizens/**").hasAnyRole("ADMIN", "OFFICER")
                .requestMatchers(HttpMethod.DELETE, "/api/citizens/**").hasRole("ADMIN")

                // ── Officer management ────────────────────────────────────
                .requestMatchers(HttpMethod.POST,   "/api/officers").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT,    "/api/officers/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/officers/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET,    "/api/officers/**").hasAnyRole("ADMIN", "OFFICER")

                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(keycloakJwtConverter()))
            );

        return http.build();
    }

    private JwtAuthenticationConverter keycloakJwtConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(this::extractRealmRoles);
        return converter;
    }

    @SuppressWarnings("unchecked")
    private Collection<GrantedAuthority> extractRealmRoles(Jwt jwt) {
        Map<String, Object> realmAccess = jwt.getClaim("realm_access");
        if (realmAccess == null || realmAccess.get("roles") == null) {
            return List.of();
        }
        List<String> roles = (List<String>) realmAccess.get("roles");
        return roles.stream()
            .map(role -> new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()))
            .collect(Collectors.toList());
    }
}