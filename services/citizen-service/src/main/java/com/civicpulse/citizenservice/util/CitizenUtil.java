package com.civicpulse.citizenservice.util;

import com.civicpulse.citizenservice.entity.Citizen;
import com.civicpulse.citizenservice.repository.CitizenRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.util.Objects;
import java.time.Year;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class CitizenUtil {

    private final CitizenRepository citizenRepository;
    private final AtomicLong sequence = new AtomicLong(1);

    public CitizenUtil(CitizenRepository citizenRepository) {
        this.citizenRepository = citizenRepository;
    }

    // Runs once at startup, after Spring finishes wiring dependencies.
    // Seeds the counter from however many citizens already exist,
    // so a restart doesn't reset numbering back to 1 and collide
    // with codes already saved in the database.
    @PostConstruct
public void initSequence() {
    long maxUsed = citizenRepository.findAll().stream()
        .map(Citizen::getCitizenCode)
        .filter(Objects::nonNull)
        .mapToLong(code -> {
            try { return Long.parseLong(code.substring(code.length() - 6)); }
            catch (Exception e) { return 0L; }
        })
        .max().orElse(0L);
    sequence.set(maxUsed + 1);
}

    public String generateCitizenCode() {
        int year = Year.now().getValue();
        long next = sequence.getAndIncrement();
        return String.format("CTZ-%d-%06d", year, next);
    }

    public String maskAadhar(String rawAadhar) {
        if (rawAadhar == null || rawAadhar.length() != 12) {
            return null;
        }
        String lastFour = rawAadhar.substring(8);
        return "XXXX-XXXX-" + lastFour;
    }
}