package com.civicpulse.certificateservice.config;

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
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()

                        // Citizens: apply + view their own + download
                        .requestMatchers(HttpMethod.POST, "/api/certificates").hasAnyRole("ADMIN", "OFFICER", "CITIZEN")
                        .requestMatchers(HttpMethod.GET, "/api/certificates/citizen/**").hasAnyRole("ADMIN", "OFFICER", "CITIZEN")
                        .requestMatchers(HttpMethod.GET, "/api/certificates/*/download").hasAnyRole("ADMIN", "OFFICER", "CITIZEN")
                        .requestMatchers(HttpMethod.GET, "/api/certificates/*").hasAnyRole("ADMIN", "OFFICER", "CITIZEN")

                        // Officers: verify, approve, reject
                        .requestMatchers(HttpMethod.PUT, "/api/certificates/*/verify").hasAnyRole("ADMIN", "OFFICER")
                        .requestMatchers(HttpMethod.PUT, "/api/certificates/*/approve").hasAnyRole("ADMIN", "OFFICER")
                        .requestMatchers(HttpMethod.PUT, "/api/certificates/*/reject").hasAnyRole("ADMIN", "OFFICER")

                        // Admin: generate, stats, all views
                        .requestMatchers(HttpMethod.PUT, "/api/certificates/*/generate").hasAnyRole("ADMIN", "OFFICER")
                        .requestMatchers(HttpMethod.GET, "/api/certificates/stats").hasAnyRole("ADMIN", "OFFICER")
                        .requestMatchers(HttpMethod.GET, "/api/certificates").hasAnyRole("ADMIN", "OFFICER")
                        .requestMatchers(HttpMethod.GET, "/api/certificates/search").hasAnyRole("ADMIN", "OFFICER")
                        .requestMatchers(HttpMethod.GET, "/api/certificates/pending").hasAnyRole("ADMIN", "OFFICER")
                        .requestMatchers(HttpMethod.GET, "/api/certificates/status/**").hasAnyRole("ADMIN", "OFFICER")
                        .requestMatchers(HttpMethod.GET, "/api/certificates/type/**").hasAnyRole("ADMIN", "OFFICER")

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
        if (realmAccess == null || realmAccess.get("roles") == null) return List.of();
        List<String> roles = (List<String>) realmAccess.get("roles");
        return roles.stream()
                .map(r -> new SimpleGrantedAuthority("ROLE_" + r.toUpperCase()))
                .collect(Collectors.toList());
    }
}