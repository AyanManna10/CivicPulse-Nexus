package com.civicpulse.grievanceservice.service;

import com.civicpulse.grievanceservice.dto.*;

import java.util.List;
import java.util.Map;

public interface GrievanceService {

    GrievanceResponse createGrievance(GrievanceRequest request);

    List<GrievanceResponse> getAllGrievances();

    GrievanceResponse getGrievanceById(Long id);

    GrievanceResponse updateGrievance(Long id, GrievanceRequest request);

    void deleteGrievance(Long id);

    GrievanceResponse assignGrievance(Long id, AssignRequest request);

    GrievanceResponse changeStatus(Long id, StatusUpdateRequest request);

    GrievanceResponse escalateGrievance(Long id);

    List<GrievanceResponse> getByCitizen(Long citizenId);

    List<GrievanceResponse> getByDepartment(String department);

    List<GrievanceResponse> getByStatus(String status);

    List<GrievanceResponse> getOverdueGrievances();

    Map<String, Object> getDashboardStats();
}