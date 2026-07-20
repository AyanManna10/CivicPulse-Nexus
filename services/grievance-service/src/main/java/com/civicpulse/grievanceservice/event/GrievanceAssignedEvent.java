package com.civicpulse.grievanceservice.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class GrievanceAssignedEvent {

    private Long grievanceId;
    private String department;
    private String officer;
}