package com.civicpulse.reportingservice.scheduled;

import com.civicpulse.reportingservice.service.AnalyticsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class AnalyticsScheduler {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsScheduler.class);
    @SuppressWarnings("unused")
    private final AnalyticsService analyticsService;

    public AnalyticsScheduler(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    // Runs every night at 2:00 AM — pre-warms cached analytics
    // Token not available in scheduled context, so this just logs a reminder
    // Real caching would use Redis — for now, endpoints compute on demand
    @Scheduled(cron = "0 0 2 * * *")
    public void nightlyAnalyticsJob() {
        log.info("[AnalyticsScheduler] Nightly analytics job triggered at 2:00 AM");
        log.info("[AnalyticsScheduler] Analytics endpoints will compute fresh on next admin request");
        // Future: store pre-computed summary in analytics_snapshots table
        // for historical trend comparison
    }
}
