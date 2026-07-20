package com.civicpulse.grievanceservice.kafka;

import com.civicpulse.grievanceservice.entity.ActivityLog;
import com.civicpulse.grievanceservice.event.GrievanceAssignedEvent;
import com.civicpulse.grievanceservice.event.GrievanceCreatedEvent;
import com.civicpulse.grievanceservice.event.GrievanceResolvedEvent;
import com.civicpulse.grievanceservice.repository.ActivityLogRepository;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class GrievanceEventConsumer {

    private final ActivityLogRepository activityLogRepository;

    public GrievanceEventConsumer(ActivityLogRepository activityLogRepository) {
        this.activityLogRepository = activityLogRepository;
    }

    /**
     * One listener, one topic, three possible payload types. We take
     * the raw ConsumerRecord and pull out .value() ourselves —
     * Spring's auto-unwrapping for a plain Object parameter turned
     * out to hand us the whole record instead of the payload, so
     * this is the explicit, reliable version.
     */
    @KafkaListener(
            topics = "grievance-events",
            groupId = "grievance-service-activity-group",
            containerFactory = "grievanceKafkaListenerContainerFactory"
    )
    public void consumeGrievanceEvent(ConsumerRecord<String, Object> record) {
        Object event = record.value();

        ActivityLog log = new ActivityLog();

        if (event instanceof GrievanceCreatedEvent created) {
            log.setEventType("GRIEVANCE_CREATED");
            log.setGrievanceId(created.getGrievanceId());
            log.setDescription("Grievance #" + created.getGrievanceId()
                    + " created for department " + created.getDepartment()
                    + " (status: " + created.getStatus() + ")");

        } else if (event instanceof GrievanceAssignedEvent assigned) {
            log.setEventType("GRIEVANCE_ASSIGNED");
            log.setGrievanceId(assigned.getGrievanceId());
            log.setDescription("Grievance #" + assigned.getGrievanceId()
                    + " assigned to " + assigned.getOfficer()
                    + " (" + assigned.getDepartment() + ")");

        } else if (event instanceof GrievanceResolvedEvent resolved) {
            log.setEventType("GRIEVANCE_RESOLVED");
            log.setGrievanceId(resolved.getGrievanceId());
            log.setDescription("Grievance #" + resolved.getGrievanceId()
                    + " marked " + resolved.getStatus());

        } else {
            // Shouldn't happen given trusted packages, but don't
            // silently swallow an unknown type either.
            log.setEventType("UNKNOWN");
            log.setGrievanceId(0L);
            log.setDescription("Unrecognized event: " + event);
        }

        activityLogRepository.save(log);
        System.out.println("Activity logged: " + log.getDescription());
    }
}