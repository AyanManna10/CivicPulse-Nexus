package com.civicpulse.grievanceservice.kafka;

import com.civicpulse.grievanceservice.event.CitizenRegisteredEvent;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class CitizenEventConsumer {

    /**
     * For Milestone 1 this just logs the event to prove the pipeline
     * works end-to-end. Later, this is where you'd cache citizen
     * details locally, trigger a welcome notification, etc. — anything
     * grievance-service wants to react to without calling citizen-service
     * directly over REST.
     */
    @KafkaListener(topics = "citizen-events", groupId = "grievance-service-group")
    public void consumeCitizenRegistered(CitizenRegisteredEvent event) {
        System.out.println("Received CitizenRegisteredEvent: " + event);
    }
}