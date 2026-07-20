package com.civicpulse.grievanceservice.service.impl;

import com.civicpulse.grievanceservice.dto.*;
import com.civicpulse.grievanceservice.event.GrievanceAssignedEvent;
import com.civicpulse.grievanceservice.event.GrievanceCreatedEvent;
import com.civicpulse.grievanceservice.event.GrievanceResolvedEvent;
import com.civicpulse.grievanceservice.kafka.GrievanceEventProducer;
import com.civicpulse.grievanceservice.entity.Grievance;
import com.civicpulse.grievanceservice.exception.GrievanceNotFoundException;
import com.civicpulse.grievanceservice.repository.GrievanceRepository;
import com.civicpulse.grievanceservice.service.GrievanceService;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class GrievanceServiceImpl implements GrievanceService {

    private final GrievanceRepository grievanceRepository;
    private final GrievanceEventProducer grievanceEventProducer;

    public GrievanceServiceImpl(GrievanceRepository grievanceRepository,
                                 GrievanceEventProducer grievanceEventProducer) {
        this.grievanceRepository = grievanceRepository;
        this.grievanceEventProducer = grievanceEventProducer;
    }

    @Override
    public GrievanceResponse createGrievance(GrievanceRequest request) {

        Grievance grievance = new Grievance();

        grievance.setCitizenId(request.getCitizenId());
        grievance.setDepartment(request.getDepartment());
        grievance.setTitle(request.getTitle());
        grievance.setDescription(request.getDescription());

        // Only override the entity's default "MEDIUM" if the client actually sent one
        if (request.getPriority() != null && !request.getPriority().isBlank()) {
            grievance.setPriority(request.getPriority());
        }

        Grievance saved = grievanceRepository.save(grievance);

        grievanceEventProducer.publishGrievanceCreated(
                new GrievanceCreatedEvent(saved.getId(), saved.getCitizenId(),
                        saved.getDepartment(), saved.getStatus())
        );

        return mapToResponse(saved);
    }

    @Override
    public List<GrievanceResponse> getAllGrievances() {
        return grievanceRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public GrievanceResponse getGrievanceById(Long id) {
        Grievance grievance = grievanceRepository.findById(id)
                .orElseThrow(() -> new GrievanceNotFoundException(id));
        return mapToResponse(grievance);
    }

    @Override
    public GrievanceResponse updateGrievance(Long id, GrievanceRequest request) {

        Grievance grievance = grievanceRepository.findById(id)
                .orElseThrow(() -> new GrievanceNotFoundException(id));

        grievance.setDepartment(request.getDepartment());
        grievance.setTitle(request.getTitle());
        grievance.setDescription(request.getDescription());

        if (request.getPriority() != null && !request.getPriority().isBlank()) {
            grievance.setPriority(request.getPriority());
        }

        Grievance updated = grievanceRepository.save(grievance);

        return mapToResponse(updated);
    }

    @Override
    public void deleteGrievance(Long id) {
        if (!grievanceRepository.existsById(id)) {
            throw new GrievanceNotFoundException(id);
        }
        grievanceRepository.deleteById(id);
    }

@Override
public GrievanceResponse assignGrievance(Long id, AssignRequest request) {
    Grievance grievance = grievanceRepository.findById(id)
            .orElseThrow(() -> new GrievanceNotFoundException(id));
    
    grievance.setDepartment(request.getDepartment());
    grievance.setAssignedOfficer(request.getOfficer());
    
    // Auto-change status to IN_PROGRESS when assigned
    if ("OPEN".equals(grievance.getStatus())) {
        grievance.setStatus("IN_PROGRESS");
    }
    
    Grievance updated = grievanceRepository.save(grievance);
    return mapToResponse(updated);
}

    @Override
    public GrievanceResponse changeStatus(Long id, StatusUpdateRequest request) {

        Grievance grievance = grievanceRepository.findById(id)
                .orElseThrow(() -> new GrievanceNotFoundException(id));

        grievance.setStatus(request.getStatus());

        // RESOLVED and CLOSED both stamp a resolved date; anything else clears it,
        // covering the case where an officer reopens a resolved complaint.
        if ("RESOLVED".equalsIgnoreCase(request.getStatus())
                || "CLOSED".equalsIgnoreCase(request.getStatus())) {
            grievance.setResolvedDate(LocalDateTime.now());
        } else {
            grievance.setResolvedDate(null);
        }

        Grievance updated = grievanceRepository.save(grievance);

        if ("RESOLVED".equalsIgnoreCase(updated.getStatus())
                || "CLOSED".equalsIgnoreCase(updated.getStatus())) {
            grievanceEventProducer.publishGrievanceResolved(
                    new GrievanceResolvedEvent(updated.getId(), updated.getCitizenId(), updated.getStatus())
            );
        }

        return mapToResponse(updated);
    }

    @Override
    public GrievanceResponse escalateGrievance(Long id) {

        Grievance grievance = grievanceRepository.findById(id)
                .orElseThrow(() -> new GrievanceNotFoundException(id));

        grievance.setStatus("ESCALATED");

        Grievance updated = grievanceRepository.save(grievance);

        return mapToResponse(updated);
    }

    @Override
    public List<GrievanceResponse> getByCitizen(Long citizenId) {
        return grievanceRepository.findByCitizenId(citizenId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public List<GrievanceResponse> getByDepartment(String department) {
        return grievanceRepository.findByDepartment(department)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public List<GrievanceResponse> getByStatus(String status) {
        return grievanceRepository.findByStatus(status)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public List<GrievanceResponse> getOverdueGrievances() {
        List<String> openStatuses = List.of("OPEN", "ASSIGNED", "IN_PROGRESS");
        return grievanceRepository.findByStatusInAndDueDateBefore(openStatuses, LocalDateTime.now())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public Map<String, Object> getDashboardStats() {

        List<Grievance> all = grievanceRepository.findAll();

        long open = all.stream().filter(g -> "OPEN".equalsIgnoreCase(g.getStatus())).count();
        long resolved = all.stream().filter(g -> "RESOLVED".equalsIgnoreCase(g.getStatus())).count();
        long pending = all.stream().filter(g -> "IN_PROGRESS".equalsIgnoreCase(g.getStatus())).count();
        long escalated = all.stream().filter(g -> "ESCALATED".equalsIgnoreCase(g.getStatus())).count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("total", all.size());
        stats.put("open", open);
        stats.put("resolved", resolved);
        stats.put("pending", pending);
        stats.put("escalated", escalated);

        return stats;
    }

    private GrievanceResponse mapToResponse(Grievance grievance) {
        GrievanceResponse response = new GrievanceResponse();

        response.setId(grievance.getId());
        response.setCitizenId(grievance.getCitizenId());
        response.setDepartment(grievance.getDepartment());
        response.setTitle(grievance.getTitle());
        response.setDescription(grievance.getDescription());
        response.setPriority(grievance.getPriority());
        response.setStatus(grievance.getStatus());
        response.setAssignedOfficer(grievance.getAssignedOfficer());
        response.setCreatedAt(grievance.getCreatedAt());
        response.setUpdatedAt(grievance.getUpdatedAt());
        response.setDueDate(grievance.getDueDate());
        response.setResolvedDate(grievance.getResolvedDate());

        return response;
    }
}