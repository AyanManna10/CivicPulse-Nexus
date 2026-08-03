package com.civicpulse.certificateservice.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private record ErrorResponse(String code, String message, String timestamp) {}

    private ResponseEntity<ErrorResponse> build(HttpStatus status, String code, String message) {
        log.warn("[{}] {} — {}", status.value(), code, message);
        return ResponseEntity.status(status)
                .body(new ErrorResponse(code, message, Instant.now().toString()));
    }

    // Validation errors from @Valid on request DTOs
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fe.getField(), fe.getDefaultMessage());
        }
        log.warn("[400] VALIDATION_FAILED — {}", fieldErrors);
        return ResponseEntity.badRequest().body(Map.of(
                "code", "VALIDATION_FAILED",
                "message", "One or more fields are invalid",
                "errors", fieldErrors,
                "timestamp", Instant.now().toString()
        ));
    }

    // Catch-all — never exposes stack traces to the client
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception ex) {
        log.error("[500] INTERNAL_ERROR — {}", ex.getMessage(), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
                "An unexpected error occurred. Please try again or contact support.");
    }
}