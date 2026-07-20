package com.civicpulse.citizenservice.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI citizenServiceOpenAPI() {
        return new OpenAPI().info(new Info()
                .title("Citizen Service API")
                .description("CivicPulse Nexus — citizen registration, Aadhar masking, CRUD")
                .version("1.0"));
    }
}