package com.civicpulse.grievanceservice.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Mirror of citizen-service's event class. Deliberately duplicated
 * rather than shared as a common library — keeps grievance-service
 * fully independent, so citizen-service can change its internals
 * without forcing a rebuild here, as long as this event's shape
 * stays the same on the wire.
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