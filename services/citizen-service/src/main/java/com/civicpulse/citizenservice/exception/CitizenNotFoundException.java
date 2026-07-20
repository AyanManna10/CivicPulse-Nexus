package com.civicpulse.citizenservice.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class CitizenNotFoundException extends RuntimeException {

    public CitizenNotFoundException(Long id) {
        super("Citizen with ID " + id + " not found");
    }

    public CitizenNotFoundException(String identifier) {
        super("Citizen not found: " + identifier);
    }
}