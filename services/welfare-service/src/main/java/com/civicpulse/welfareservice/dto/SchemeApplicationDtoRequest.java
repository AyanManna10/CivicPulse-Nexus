package com.civicpulse.welfareservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SchemeApplicationDtoRequest {
    @NotNull
    private Long citizenId;

    private String citizenName;
    private String citizenEmail;

    @NotNull
    private Long schemeId;

    private String documents;
    private String remarks;
}