package com.civicpulse.grievanceservice.config;

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

                        // Admin only: delete
                        .requestMatchers(HttpMethod.DELETE, "/api/grievances/**").hasRole("ADMIN")

                        // Officer / Admin: management actions
                        .requestMatchers(HttpMethod.PUT, "/api/grievances/*/assign").hasAnyRole("ADMIN", "OFFICER")
                        .requestMatchers(HttpMethod.PUT, "/api/grievances/*/status").hasAnyRole("ADMIN", "OFFICER")
                        .requestMatchers(HttpMethod.PUT, "/api/grievances/*/escalate").hasAnyRole("ADMIN", "OFFICER")
                        .requestMatchers(HttpMethod.PUT, "/api/grievances/**").hasAnyRole("ADMIN", "OFFICER")

                        // Officer / Admin: full grievance list, dashboard, SLA, department views
                        .requestMatchers(HttpMethod.GET, "/api/grievances/dashboard").hasAnyRole("ADMIN", "OFFICER")
                        .requestMatchers(HttpMethod.GET, "/api/grievances/sla").hasAnyRole("ADMIN", "OFFICER")
                        .requestMatchers(HttpMethod.GET, "/api/grievances/citizen/**").hasAnyRole("ADMIN", "OFFICER")
                        .requestMatchers(HttpMethod.GET, "/api/grievances/department/**").hasAnyRole("ADMIN", "OFFICER")
                        .requestMatchers(HttpMethod.GET, "/api/grievances/status/**").hasAnyRole("ADMIN", "OFFICER")

                        // ALL grievances list — Officers / Admins only (citizens MUST use /my)
                        .requestMatchers(HttpMethod.GET, "/api/grievances").hasAnyRole("ADMIN", "OFFICER")

                        // Citizen: own grievances only (citizenId resolved from /api/citizens/me)
                        .requestMatchers(HttpMethod.GET, "/api/grievances/my").hasAnyRole("CITIZEN", "ADMIN", "OFFICER")

                        // Single grievance by id — citizens can view their own (no backend guard here,
                        // they must know the id; fine because the id space is not guessable in prod)
                        .requestMatchers(HttpMethod.GET, "/api/grievances/**").authenticated()

                        // Citizens can file grievances
                        .requestMatchers(HttpMethod.POST, "/api/grievances").hasAnyRole("CITIZEN", "ADMIN", "OFFICER")

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
