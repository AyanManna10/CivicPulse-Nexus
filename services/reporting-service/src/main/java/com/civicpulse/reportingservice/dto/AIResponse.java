package com.civicpulse.reportingservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AIResponse {
    private String       summary;          // 2-3 sentence overall assessment
    private String       performance;      // "Excellent" | "Good" | "Needs Improvement"
    private List<String> recommendations;  // 3 specific actionable items
    private String       riskAssessment;   // Risks if trends continue
    private long         timestamp;        // Epoch ms when analysis was generated
}