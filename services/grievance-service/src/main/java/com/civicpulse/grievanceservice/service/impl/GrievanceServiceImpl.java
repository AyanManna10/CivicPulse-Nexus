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
        if (request.getPriority() != null && !request.getPriority().isBlank()) {
            grievance.setPriority(request.getPriority());
        }

        Grievance saved = grievanceRepository.save(grievance);

        grievanceEventProducer.publishGrievanceCreated(
                new GrievanceCreatedEvent(saved.getId(), saved.getCitizenId(),
                        saved.getDepartment(), saved.getStatus()));

        return mapToResponse(saved);
    }

    @Override
    public List<GrievanceResponse> getAllGrievances() {
        return grievanceRepository.findAll().stream().map(this::mapToResponse).toList();
    }

    @Override
    public GrievanceResponse getGrievanceById(Long id) {
        return mapToResponse(findOrThrow(id));
    }

    @Override
    public GrievanceResponse updateGrievance(Long id, GrievanceRequest request) {
        Grievance grievance = findOrThrow(id);
        grievance.setDepartment(request.getDepartment());
        grievance.setTitle(request.getTitle());
        grievance.setDescription(request.getDescription());
        if (request.getPriority() != null && !request.getPriority().isBlank()) {
            grievance.setPriority(request.getPriority());
        }
        return mapToResponse(grievanceRepository.save(grievance));
    }

    @Override
    public void deleteGrievance(Long id) {
        if (!grievanceRepository.existsById(id)) throw new GrievanceNotFoundException(id);
        grievanceRepository.deleteById(id);
    }

    /**
     * Assign (or RE-ASSIGN) a grievance to a department and officer.
     *
     * Key changes from original:
     * 1. Reassignment is always allowed — no status guard blocks it.
     * 2. A RESOLVED grievance is automatically REOPENED (set back to IN_PROGRESS)
     *    when reassigned, creating a fresh audit trail.
     * 3. OPEN grievances are promoted to IN_PROGRESS as before.
     * 4. Already-IN_PROGRESS / ESCALATED grievances keep their status;
     *    only the dept and officer are updated.
     */
    @Override
    public GrievanceResponse assignGrievance(Long id, AssignRequest request) {
        Grievance grievance = findOrThrow(id);

        grievance.setDepartment(request.getDepartment());
        grievance.setAssignedOfficer(request.getOfficer());

        switch (grievance.getStatus()) {
            case "OPEN":
            case "RESOLVED":   // reopen a resolved grievance when reassigned
            case "CLOSED":     // reopen a closed grievance when reassigned
                grievance.setStatus("IN_PROGRESS");
                grievance.setResolvedDate(null); // clear resolution date on reopen
                break;
            // ESCALATED, IN_PROGRESS → keep current status; only dept/officer change
            default:
                break;
        }

        Grievance updated = grievanceRepository.save(grievance);

        grievanceEventProducer.publishGrievanceAssigned(
                new GrievanceAssignedEvent(updated.getId(), updated.getCitizenId(),
                        updated.getDepartment(), updated.getAssignedOfficer()));

        return mapToResponse(updated);
    }

    @Override
    public GrievanceResponse changeStatus(Long id, StatusUpdateRequest request) {
        Grievance grievance = findOrThrow(id);
        grievance.setStatus(request.getStatus());

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
                    new GrievanceResolvedEvent(updated.getId(), updated.getCitizenId(),
                            updated.getStatus()));
        }

        return mapToResponse(updated);
    }

    @Override
    public GrievanceResponse escalateGrievance(Long id) {
        Grievance grievance = findOrThrow(id);
        grievance.setStatus("ESCALATED");
        return mapToResponse(grievanceRepository.save(grievance));
    }

    @Override
    public List<GrievanceResponse> getByCitizen(Long citizenId) {
        return grievanceRepository.findByCitizenId(citizenId)
                .stream().map(this::mapToResponse).toList();
    }

    @Override
    public List<GrievanceResponse> getByDepartment(String department) {
        return grievanceRepository.findByDepartment(department)
                .stream().map(this::mapToResponse).toList();
    }

    @Override
    public List<GrievanceResponse> getByStatus(String status) {
        return grievanceRepository.findByStatus(status)
                .stream().map(this::mapToResponse).toList();
    }

    @Override
    public List<GrievanceResponse> getOverdueGrievances() {
        List<String> openStatuses = List.of("OPEN", "ASSIGNED", "IN_PROGRESS");
        return grievanceRepository.findByStatusInAndDueDateBefore(openStatuses, LocalDateTime.now())
                .stream().map(this::mapToResponse).toList();
    }

    @Override
    public Map<String, Object> getDashboardStats() {
        List<Grievance> all = grievanceRepository.findAll();
        long open      = all.stream().filter(g -> "OPEN".equalsIgnoreCase(g.getStatus())).count();
        long resolved  = all.stream().filter(g -> "RESOLVED".equalsIgnoreCase(g.getStatus())).count();
        long pending   = all.stream().filter(g -> "IN_PROGRESS".equalsIgnoreCase(g.getStatus())).count();
        long escalated = all.stream().filter(g -> "ESCALATED".equalsIgnoreCase(g.getStatus())).count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("total",     all.size());
        stats.put("open",      open);
        stats.put("resolved",  resolved);
        stats.put("pending",   pending);
        stats.put("escalated", escalated);
        return stats;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private Grievance findOrThrow(Long id) {
        return grievanceRepository.findById(id)
                .orElseThrow(() -> new GrievanceNotFoundException(id));
    }

    private GrievanceResponse mapToResponse(Grievance g) {
        GrievanceResponse r = new GrievanceResponse();
        r.setId(g.getId());
        r.setCitizenId(g.getCitizenId());
        r.setDepartment(g.getDepartment());
        r.setTitle(g.getTitle());
        r.setDescription(g.getDescription());
        r.setPriority(g.getPriority());
        r.setStatus(g.getStatus());
        r.setAssignedOfficer(g.getAssignedOfficer());
        r.setCreatedAt(g.getCreatedAt());
        r.setUpdatedAt(g.getUpdatedAt());
        r.setDueDate(g.getDueDate());
        r.setResolvedDate(g.getResolvedDate());
        return r;
    }
}