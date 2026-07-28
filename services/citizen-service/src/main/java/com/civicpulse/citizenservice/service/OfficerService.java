package com.civicpulse.citizenservice.service;

import com.civicpulse.citizenservice.dto.OfficerRequest;
import com.civicpulse.citizenservice.dto.OfficerResponse;

import java.util.List;

public interface OfficerService {

    OfficerResponse createOfficer(OfficerRequest request);

    List<OfficerResponse> getAllOfficers();

    OfficerResponse getOfficerById(Long id);

    /** Find an officer by their email address. Used by GET /api/officers/me. */
    OfficerResponse getOfficerByEmail(String email);

    List<OfficerResponse> getOfficersByDepartment(String department);

    List<OfficerResponse> getHeadOfficersByDepartment(String department);

    OfficerResponse updateOfficer(Long id, OfficerRequest request);

    void deactivateOfficer(Long id);

    void activateOfficer(Long id);

    void deleteOfficer(Long id);

    int importFromKeycloak();
}