package com.civicpulse.reportingservice.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Cache configuration for reporting-service.
 *
 * "analytics-summary" cache: expires after 2 minutes.
 * This avoids hammering all 4 microservices on every page refresh.
 * Admin can still force-refresh via the Refresh button (which calls the endpoint fresh).
 */
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
public CacheManager cacheManager() {
    CaffeineCacheManager manager = new CaffeineCacheManager(
        "analytics-summary",  // existing
        "ai-reports"          // ADD THIS
    );
    manager.setCaffeine(Caffeine.newBuilder()
        .expireAfterWrite(5, TimeUnit.MINUTES)
        .maximumSize(50));
    return manager;
}
}