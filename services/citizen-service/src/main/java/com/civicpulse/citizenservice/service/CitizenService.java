package com.civicpulse.citizenservice.service;

import com.civicpulse.citizenservice.dto.CitizenRequest;
import com.civicpulse.citizenservice.dto.CitizenResponse;

import java.util.List;

public interface CitizenService {

    CitizenResponse createCitizen(CitizenRequest request);

    List<CitizenResponse> getAllCitizens();

    CitizenResponse getCitizenById(Long id);

    CitizenResponse updateCitizen(Long id, CitizenRequest request);

    void deleteCitizen(Long id);

    List<CitizenResponse> searchByName(String name);

    CitizenResponse searchByPhone(String phone);

    List<CitizenResponse> getByWard(Integer ward);

    List<CitizenResponse> getActiveCitizens();

    /** Looks up the citizen whose registered email matches the JWT subject email */
    CitizenResponse getCitizenByEmail(String email);
}
