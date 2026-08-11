package com.civicpulse.reportingservice.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class GroqService {

    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

    @Value("${groq.api.key}")
    private String apiKey;

    @Value("${groq.api.model:llama-3.3-70b-versatile}")
    private String modelName;

    private final RestTemplate restTemplate;

    public GroqService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @SuppressWarnings("unchecked")
    public String callGroq(String prompt) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> requestBody = Map.of(
            "model", modelName,
            "messages", List.of(
                Map.of("role", "user", "content", prompt)
            ),
            "temperature", 0.3
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            @SuppressWarnings({"rawtypes"})
            ResponseEntity<Map> response = restTemplate.exchange(
                GROQ_URL, HttpMethod.POST, entity, Map.class);

            Map<String, Object> body = response.getBody();
            List<Map<String, Object>> choices =
                (List<Map<String, Object>>) body.get("choices");
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            return (String) message.get("content");

        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("Groq HTTP error: status={}, body={}",
                      e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Groq API error: " + e.getStatusCode());
        } catch (Exception e) {
            log.error("Groq API call failed: {}", e.getMessage());
            throw new RuntimeException("Groq API call failed: " + e.getMessage(), e);
        }
    }
}