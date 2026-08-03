package com.civicpulse.grievanceservice.kafka;

import com.civicpulse.grievanceservice.event.GrievanceAssignedEvent;
import com.civicpulse.grievanceservice.event.GrievanceCreatedEvent;
import com.civicpulse.grievanceservice.event.GrievanceResolvedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class GrievanceEventProducer {

    private static final Logger log = LoggerFactory.getLogger(GrievanceEventProducer.class);
    private static final String TOPIC = "grievance-events";

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public GrievanceEventProducer(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publishGrievanceCreated(GrievanceCreatedEvent event) {
        try {
            kafkaTemplate.send(TOPIC, event);
        } catch (Exception e) {
            log.warn("Kafka publish failed for GrievanceCreatedEvent: {}", e.getMessage());
        }
    }

    public void publishGrievanceAssigned(GrievanceAssignedEvent event) {
        try {
            kafkaTemplate.send(TOPIC, event);
        } catch (Exception e) {
            log.warn("Kafka publish failed for GrievanceAssignedEvent: {}", e.getMessage());
        }
    }

    public void publishGrievanceResolved(GrievanceResolvedEvent event) {
        try {
            kafkaTemplate.send(TOPIC, event);
        } catch (Exception e) {
            log.warn("Kafka publish failed for GrievanceResolvedEvent: {}", e.getMessage());
        }
    }
}