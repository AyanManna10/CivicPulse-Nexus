package com.civicpulse.welfareservice.service.impl;

import com.civicpulse.welfareservice.entity.WelfareScheme;
import com.civicpulse.welfareservice.repository.WelfareSchemeRepository;
import com.civicpulse.welfareservice.dto.WelfareSchemeDtoRequest;
import com.civicpulse.welfareservice.dto.WelfareSchemeDtoResponse;
import com.civicpulse.welfareservice.service.WelfareSchemeService;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class WelfareSchemeServiceImpl implements WelfareSchemeService {
    private final WelfareSchemeRepository repository;

    public WelfareSchemeServiceImpl(WelfareSchemeRepository repository) {
        this.repository = repository;
    }

    @Override
    public WelfareSchemeDtoResponse createScheme(WelfareSchemeDtoRequest request, String createdBy) {
        WelfareScheme scheme = new WelfareScheme();
        scheme.setSchemeCode("WLF-" + System.currentTimeMillis());
        scheme.setName(request.getName());
        scheme.setDepartment(request.getDepartment());
        scheme.setSchemeType(request.getSchemeType());
        scheme.setDescription(request.getDescription());
        scheme.setEligibilityCriteria(request.getEligibilityCriteria());
        scheme.setBudgetAllocated(request.getBudgetAllocated());
        scheme.setStartDate(request.getStartDate());
        scheme.setEndDate(request.getEndDate());
        scheme.setCreatedBy(createdBy);

        WelfareScheme saved = repository.save(scheme);
        return mapToResponse(saved);
    }

    @Override
    public WelfareSchemeDtoResponse getSchemeById(Long id) {
        WelfareScheme scheme = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Scheme not found: " + id));
        return mapToResponse(scheme);
    }

    @Override
    public List<WelfareSchemeDtoResponse> getAllSchemes() {
        return repository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<WelfareSchemeDtoResponse> getSchemesByDepartment(String department) {
        return repository.findByDepartment(department).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public WelfareSchemeDtoResponse updateScheme(Long id, WelfareSchemeDtoRequest request) {
        WelfareScheme scheme = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Scheme not found: " + id));

        scheme.setName(request.getName());
        scheme.setDepartment(request.getDepartment());
        scheme.setSchemeType(request.getSchemeType());
        scheme.setDescription(request.getDescription());
        scheme.setEligibilityCriteria(request.getEligibilityCriteria());
        scheme.setBudgetAllocated(request.getBudgetAllocated());
        scheme.setStartDate(request.getStartDate());
        scheme.setEndDate(request.getEndDate());
        scheme.setStatus(request.getStatus());

        WelfareScheme updated = repository.save(scheme);
        return mapToResponse(updated);
    }

    @Override
    public void deleteScheme(Long id) {
        repository.deleteById(id);
    }

    private WelfareSchemeDtoResponse mapToResponse(WelfareScheme scheme) {
        return new WelfareSchemeDtoResponse(
                scheme.getId(), scheme.getSchemeCode(), scheme.getName(),
                scheme.getDepartment(), scheme.getSchemeType(),
                scheme.getDescription(), scheme.getEligibilityCriteria(),
                scheme.getBudgetAllocated(), scheme.getBudgetDisbursed(),
                scheme.getBeneficiaryCount(), scheme.getStartDate(),
                scheme.getEndDate(), scheme.getStatus(),
                scheme.getCreatedBy(), scheme.getCreatedAt(), scheme.getUpdatedAt()
        );
    }
}