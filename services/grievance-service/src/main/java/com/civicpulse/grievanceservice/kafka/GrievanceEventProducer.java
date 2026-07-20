package com.civicpulse.grievanceservice.kafka;

import com.civicpulse.grievanceservice.event.GrievanceAssignedEvent;
import com.civicpulse.grievanceservice.event.GrievanceCreatedEvent;
import com.civicpulse.grievanceservice.event.GrievanceResolvedEvent;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class GrievanceEventProducer {

    private static final String TOPIC = "grievance-events";

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public GrievanceEventProducer(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publishGrievanceCreated(GrievanceCreatedEvent event) {
        kafkaTemplate.send(TOPIC, event);
    }

    public void publishGrievanceAssigned(GrievanceAssignedEvent event) {
        kafkaTemplate.send(TOPIC, event);
    }

    public void publishGrievanceResolved(GrievanceResolvedEvent event) {
        kafkaTemplate.send(TOPIC, event);
    }
}