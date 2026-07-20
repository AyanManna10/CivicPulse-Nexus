package com.civicpulse.grievanceservice.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class GrievanceNotFoundException extends RuntimeException {

    public GrievanceNotFoundException(Long id) {
        super("Grievance with ID " + id + " not found");
    }
}