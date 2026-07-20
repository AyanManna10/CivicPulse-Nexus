package com.civicpulse.certificateservice.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CertificateGeneratedEvent {
    private Long applicationId;
    private String applicationNumber;
    private Long citizenId;
    private String citizenName;
    private String certificateType;
    private String status;
}