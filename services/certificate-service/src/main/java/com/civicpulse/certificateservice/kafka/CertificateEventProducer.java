package com.civicpulse.certificateservice.kafka;

import com.civicpulse.certificateservice.event.*;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class CertificateEventProducer {

    private static final String TOPIC = "certificate-events";

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public CertificateEventProducer(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publishSubmitted(ApplicationSubmittedEvent event) {
        kafkaTemplate.send(TOPIC, event);
    }

    public void publishVerified(DocumentVerifiedEvent event) {
        kafkaTemplate.send(TOPIC, event);
    }

    public void publishApproved(CertificateApprovedEvent event) {
        kafkaTemplate.send(TOPIC, event);
    }

    public void publishGenerated(CertificateGeneratedEvent event) {
        kafkaTemplate.send(TOPIC, event);
    }
}