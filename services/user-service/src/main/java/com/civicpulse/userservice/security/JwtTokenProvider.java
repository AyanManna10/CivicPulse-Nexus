package com.civicpulse.userservice.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

/**
 * Responsible only for creating and reading JWTs.
 *
 * Kept separate from the filter and the security config so that
 * if we swap this out for Keycloak later (as planned for the
 * production version of CivicPulse Nexus), only this class and
 * the filter that consumes it need to change — the rest of the
 * security setup (SecurityConfig, controllers) stays untouched.
 */
@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private final long expirationMs;

    public JwtTokenProvider(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms}") long expirationMs) {

        // HS256 needs a key derived from raw bytes, not the plain string,
        // so we let jjwt build a proper SecretKey once at startup
        // instead of re-deriving it on every request.
        this.key = Keys.hmacShaKeyFor(secret.getBytes());
        this.expirationMs = expirationMs;
    }

    /**
     * Builds a signed token carrying the user's email (as subject)
     * and role (as a custom claim). Role is included directly in the
     * token so the filter can authorize requests without hitting the
     * database on every call — a key reason JWTs scale better than
     * session-based auth across microservices.
     */
    public String generateToken(String email, String role) {

        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(email)
                .claim("role", role)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key)
                .compact();
    }

    public String getEmailFromToken(String token) {
        return parseClaims(token).getSubject();
    }

    public String getRoleFromToken(String token) {
        return parseClaims(token).get("role", String.class);
    }

    /**
     * Returns true only if the token's signature is valid and it
     * hasn't expired. Any parsing exception (malformed, expired,
     * wrong signature) means the token is untrusted, so we catch
     * broadly here and let the filter decide what to do with "false"
     * rather than leaking exception details up the call stack.
     */
    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}