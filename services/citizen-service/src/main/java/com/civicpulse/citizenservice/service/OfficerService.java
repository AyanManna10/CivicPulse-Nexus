package com.civicpulse.citizenservice.service;

import com.civicpulse.citizenservice.dto.OfficerRequest;
import com.civicpulse.citizenservice.dto.OfficerResponse;

import java.util.List;

public interface OfficerService {

    OfficerResponse createOfficer(OfficerRequest request);

    List<OfficerResponse> getAllOfficers();

    OfficerResponse getOfficerById(Long id);

    List<OfficerResponse> getOfficersByDepartment(String department);

    List<OfficerResponse> getHeadOfficersByDepartment(String department);

    OfficerResponse updateOfficer(Long id, OfficerRequest request);

    /** Sets status = INACTIVE */
    void deactivateOfficer(Long id);

    /** Sets status = ACTIVE */
    void activateOfficer(Long id);

    /**
     * Reads every user with the OFFICER (or ADMIN) realm role from Keycloak
     * and upserts them into the officers table.
     * This fixes "old officers not showing" — they exist in Keycloak but
     * were never inserted into the officers DB table.
     * Returns the number of officers imported/updated.
     */
    int importFromKeycloak();
}
