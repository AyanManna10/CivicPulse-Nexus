package com.civicpulse.reportingservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.client.RestTemplate;
import org.apache.hc.client5.http.classic.HttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClientBuilder;
import org.apache.hc.core5.util.Timeout;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                .requestMatchers("/api/analytics/**").authenticated()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(new org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter() {{
                    setJwtGrantedAuthoritiesConverter(token -> {
                        var realmAccess = token.getClaimAsMap("realm_access");
                        if (realmAccess == null) return List.of();
                        @SuppressWarnings("unchecked")
                        var roles = (List<String>) realmAccess.get("roles");
                        if (roles == null) return List.of();
                        return roles.stream()
                            .map(r -> new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_" + r))
                            .map(a -> (org.springframework.security.core.GrantedAuthority) a)
                            .toList();
                    });
                }}))
            );
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public RestTemplate restTemplate() {
    HttpClient httpClient = HttpClientBuilder.create()
            .setDefaultRequestConfig(
                org.apache.hc.client5.http.config.RequestConfig.custom()
                    .setConnectionRequestTimeout(Timeout.ofSeconds(5))
                    .setResponseTimeout(Timeout.ofSeconds(30))
                    .build()
            )
            .build();
    
    HttpComponentsClientHttpRequestFactory factory = new HttpComponentsClientHttpRequestFactory(httpClient);
    return new RestTemplate(factory);
}
}
