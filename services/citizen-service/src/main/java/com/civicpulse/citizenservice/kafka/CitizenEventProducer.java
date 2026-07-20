package com.civicpulse.citizenservice.kafka;

import com.civicpulse.citizenservice.event.CitizenRegisteredEvent;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class CitizenEventProducer {

    private static final String TOPIC = "citizen-events";

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public CitizenEventProducer(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publishCitizenRegistered(CitizenRegisteredEvent event) {
        // Citizen Service doesn't know or care who's listening — it just
        // drops the event on the topic. Grievance Service (or anything
        // else built later) can independently consume it.
        kafkaTemplate.send(TOPIC, event);
    }
}