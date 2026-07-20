package com.civicpulse.citizenservice.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Payload published to Kafka when a citizen registers.
 * Kept as a plain data-carrying object — no entity references, no
 * JPA annotations — so consumers (grievance-service) don't need any
 * dependency on citizen-service's internal classes.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class CitizenRegisteredEvent {

    private Long citizenId;
    private String citizenCode;
    private String fullName;
    private String email;
    private Integer ward;
}