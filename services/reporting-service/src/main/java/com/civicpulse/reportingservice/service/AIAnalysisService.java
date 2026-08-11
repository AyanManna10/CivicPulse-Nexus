package com.civicpulse.reportingservice.service;

import com.civicpulse.reportingservice.dto.AIResponse;
import com.civicpulse.reportingservice.dto.ComplaintSummary;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.concurrent.atomic.AtomicInteger;

@Slf4j
@Service
@RequiredArgsConstructor
public class AIAnalysisService {

    private final GroqService groqService;
    private final ObjectMapper objectMapper;

    @Value("${ai.daily-limit:10}")
    private int dailyLimit;

    private final AtomicInteger dailyCount = new AtomicInteger(0);
    private volatile LocalDate countDate = LocalDate.now();

    public AIResponse analyzeComplaints(ComplaintSummary summary) {
        checkAndResetDailyCount();

        int current = dailyCount.incrementAndGet();
        if (current > dailyLimit) {
            dailyCount.decrementAndGet();
            log.warn("AI daily limit reached: {}/{}", current - 1, dailyLimit);
            throw new RuntimeException(
                "Daily AI analysis limit of " + dailyLimit + " reached. Resets at midnight.");
        }

        log.info("AI analysis {}/{}: total={}, resolved={}, overdue={}",
                current, dailyLimit,
                summary.getTotalComplaints(),
                summary.getResolvedComplaints(),
                summary.getOverdueComplaints());

        String prompt = buildPrompt(summary);
        String rawResponse = groqService.callGroq(prompt);

        try {
            String cleanJson = rawResponse
                    .replaceAll("(?s)```json\\s*", "")
                    .replaceAll("(?s)```\\s*", "")
                    .trim();

            AIResponse analysis = objectMapper.readValue(cleanJson, AIResponse.class);
            analysis.setTimestamp(System.currentTimeMillis());

            log.info("AI analysis complete: performance={}", analysis.getPerformance());
            return analysis;

        } catch (Exception e) {
            dailyCount.decrementAndGet(); // refund on parse failure
            log.error("Failed to parse Groq response: {}", e.getMessage());
            log.debug("Raw Groq response was: {}", rawResponse);
            throw new RuntimeException("Failed to parse AI response. Please try again.");
        }
    }

    public int getRemainingQuota() {
        checkAndResetDailyCount();
        return Math.max(0, dailyLimit - dailyCount.get());
    }

    private synchronized void checkAndResetDailyCount() {
        LocalDate today = LocalDate.now();
        if (!today.equals(countDate)) {
            log.info("New day detected — resetting AI daily counter");
            countDate = today;
            dailyCount.set(0);
        }
    }

    private String buildPrompt(ComplaintSummary d) {
        return """
            You are a senior municipal governance analyst reviewing a civic complaint dashboard.
            Analyze the metrics and provide concise, actionable insights for department heads.

            Return ONLY valid JSON (no markdown, no preamble, no trailing text) in exactly this format:
            {
              "summary": "2-3 sentence overall assessment of complaint handling performance",
              "performance": "Excellent",
              "recommendations": [
                "Specific recommendation 1",
                "Specific recommendation 2",
                "Specific recommendation 3"
              ],
              "riskAssessment": "1-2 sentence assessment of risks if current trends continue"
            }

            Valid values for "performance": Excellent, Good, Needs Improvement

            COMPLAINT DASHBOARD METRICS:
            - Total Complaints Filed:   %d
            - Resolved:                 %d  (%.1f%% resolution rate)
            - Pending:                  %d
            - Open (unassigned):        %d
            - Overdue (SLA Breached):   %d
            - SLA Compliance:           %.1f%%
            - Average Resolution Time:  %.1f days
            - Top Performing Dept:      %s
            - Lowest Performing Dept:   %s

            Base your performance rating on SLA compliance:
            - Excellent: SLA >= 90%%
            - Good: 70-89%%
            - Needs Improvement: SLA < 70%%

            Provide 3 specific, data-driven recommendations. Reference actual numbers where possible.
            """.formatted(
                d.getTotalComplaints(),
                d.getResolvedComplaints(),
                d.getResolutionRate(),
                d.getPendingComplaints(),
                d.getOpenComplaints(),
                d.getOverdueComplaints(),
                d.getSlaCompliancePercent(),
                d.getAvgResolutionDays(),
                d.getTopDepartment()              != null ? d.getTopDepartment()              : "N/A",
                d.getLowestPerformingDepartment() != null ? d.getLowestPerformingDepartment() : "N/A"
        );
    }
}