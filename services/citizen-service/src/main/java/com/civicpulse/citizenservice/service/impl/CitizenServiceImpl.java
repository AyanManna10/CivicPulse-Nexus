package com.civicpulse.citizenservice.service.impl;

import com.civicpulse.citizenservice.util.CitizenUtil;
import org.springframework.stereotype.Service;
import com.civicpulse.citizenservice.event.CitizenRegisteredEvent;
import com.civicpulse.citizenservice.kafka.CitizenEventProducer;
import com.civicpulse.citizenservice.dto.CitizenRequest;
import com.civicpulse.citizenservice.dto.CitizenResponse;
import com.civicpulse.citizenservice.entity.Citizen;
import com.civicpulse.citizenservice.exception.CitizenNotFoundException;
import com.civicpulse.citizenservice.repository.CitizenRepository;
import com.civicpulse.citizenservice.service.CitizenService;
import com.civicpulse.citizenservice.service.KeycloakProvisioningService;

import java.util.List;

@Service
public class CitizenServiceImpl implements CitizenService {

    private final CitizenRepository citizenRepository;
    private final CitizenUtil citizenUtil;
    private final CitizenEventProducer citizenEventProducer;
    private final KeycloakProvisioningService keycloakProvisioningService;

    public CitizenServiceImpl(CitizenRepository citizenRepository,
                               CitizenUtil citizenUtil,
                               CitizenEventProducer citizenEventProducer,
                               KeycloakProvisioningService keycloakProvisioningService) {
        this.citizenRepository = citizenRepository;
        this.citizenUtil = citizenUtil;
        this.citizenEventProducer = citizenEventProducer;
        this.keycloakProvisioningService = keycloakProvisioningService;
    }

    @Override
    public CitizenResponse createCitizen(CitizenRequest request) {
        Citizen citizen = new Citizen();
        citizen.setCitizenCode(citizenUtil.generateCitizenCode());
        citizen.setFullName(request.getFullName());
        citizen.setDob(request.getDob());
        citizen.setGender(request.getGender());
        citizen.setPhone(request.getPhone());
        citizen.setEmail(request.getEmail());
        citizen.setAadharMasked(citizenUtil.maskAadhar(request.getAadhar()));
        citizen.setWard(request.getWard());
        citizen.setAddress(request.getAddress());

        Citizen saved = citizenRepository.save(citizen);

        citizenEventProducer.publishCitizenRegistered(
                new CitizenRegisteredEvent(
                        saved.getId(),
                        saved.getCitizenCode(),
                        saved.getFullName(),
                        saved.getEmail(),
                        saved.getWard()
                )
        );

        // Auto-provision Keycloak account.
        // Username = email, password = phone number, temporary = false.
        // Citizen can log in immediately after registration.
        if (saved.getEmail() != null && !saved.getEmail().isBlank()) {
            keycloakProvisioningService.provisionCitizenAccount(
                    saved.getEmail(),
                    saved.getPhone(),
                    saved.getFullName()
            );
        }

        return mapToResponse(saved);
    }

    @Override
    public List<CitizenResponse> getAllCitizens() {
        return citizenRepository.findAll().stream().map(this::mapToResponse).toList();
    }

    @Override
    public CitizenResponse getCitizenById(Long id) {
        return mapToResponse(citizenRepository.findById(id)
                .orElseThrow(() -> new CitizenNotFoundException(id)));
    }

    @Override
    public CitizenResponse getCitizenByEmail(String email) {
        return mapToResponse(citizenRepository.findByEmail(email)
                .orElseThrow(() -> new CitizenNotFoundException("No citizen registered with email: " + email)));
    }

    @Override
    public CitizenResponse updateCitizen(Long id, CitizenRequest request) {
        Citizen citizen = citizenRepository.findById(id)
                .orElseThrow(() -> new CitizenNotFoundException(id));

        citizen.setFullName(request.getFullName());
        citizen.setDob(request.getDob());
        citizen.setGender(request.getGender());
        citizen.setPhone(request.getPhone());
        citizen.setEmail(request.getEmail());

        if (request.getAadhar() != null) {
            citizen.setAadharMasked(citizenUtil.maskAadhar(request.getAadhar()));
        }
        citizen.setWard(request.getWard());
        citizen.setAddress(request.getAddress());

        return mapToResponse(citizenRepository.save(citizen));
    }

    @Override
    public void deleteCitizen(Long id) {
        if (!citizenRepository.existsById(id)) throw new CitizenNotFoundException(id);
        citizenRepository.deleteById(id);
    }

    @Override
    public List<CitizenResponse> searchByName(String name) {
        return citizenRepository.findByFullNameContainingIgnoreCase(name)
                .stream().map(this::mapToResponse).toList();
    }

    @Override
    public CitizenResponse searchByPhone(String phone) {
        return mapToResponse(citizenRepository.findByPhone(phone)
                .orElseThrow(() -> new CitizenNotFoundException(phone)));
    }

    @Override
    public List<CitizenResponse> getByWard(Integer ward) {
        return citizenRepository.findByWard(ward).stream().map(this::mapToResponse).toList();
    }

    @Override
    public List<CitizenResponse> getActiveCitizens() {
        return citizenRepository.findByStatus("ACTIVE").stream().map(this::mapToResponse).toList();
    }

    private CitizenResponse mapToResponse(Citizen citizen) {
        CitizenResponse response = new CitizenResponse();
        response.setId(citizen.getId());
        response.setCitizenCode(citizen.getCitizenCode());
        response.setFullName(citizen.getFullName());
        response.setDob(citizen.getDob());
        response.setGender(citizen.getGender());
        response.setPhone(citizen.getPhone());
        response.setEmail(citizen.getEmail());
        response.setAadharMasked(citizen.getAadharMasked());
        response.setWard(citizen.getWard());
        response.setAddress(citizen.getAddress());
        response.setStatus(citizen.getStatus());
        response.setCreatedAt(citizen.getCreatedAt());
        response.setUpdatedAt(citizen.getUpdatedAt());
        return response;
    }
}
