package com.civicpulse.grievanceservice.config;


import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.support.serializer.ErrorHandlingDeserializer;
import org.springframework.kafka.support.serializer.JsonDeserializer;

import java.util.HashMap;
import java.util.Map;

/**
 * Second, separate Kafka consumer setup — just for grievance-events.
 *
 * Why not reuse the default one? The default consumer factory
 * (built from application.yaml) is locked to a single fixed event
 * type, which is correct for citizen-events (cross-service, headers
 * off). But grievance-events carries THREE different event types on
 * one topic, produced by this same service. Since producer and
 * consumer are the same codebase here, type headers are safe and
 * actually necessary — they're what let one listener tell the three
 * event types apart.
 */
@Configuration
public class GrievanceKafkaConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Bean
    public ConsumerFactory<String, Object> grievanceEventConsumerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "grievance-service-activity-group");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, ErrorHandlingDeserializer.class);
        props.put(ErrorHandlingDeserializer.VALUE_DESERIALIZER_CLASS, JsonDeserializer.class.getName());
        props.put(JsonDeserializer.TRUSTED_PACKAGES, "com.civicpulse.grievanceservice.event");
        // Deliberately NOT disabling type headers here — this is the
        // one case where they're safe and needed.

        return new DefaultKafkaConsumerFactory<>(props);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, Object> grievanceKafkaListenerContainerFactory(
            ConsumerFactory<String, Object> grievanceEventConsumerFactory) {

        ConcurrentKafkaListenerContainerFactory<String, Object> factory =
                new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(grievanceEventConsumerFactory);
        return factory;
    }
}