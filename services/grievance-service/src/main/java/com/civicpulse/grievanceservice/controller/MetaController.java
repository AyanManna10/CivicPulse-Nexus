package com.civicpulse.grievanceservice.controller;

import com.civicpulse.grievanceservice.dto.DepartmentInfo;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/meta")
public class MetaController {

    @GetMapping("/departments")
    public List<DepartmentInfo> getDepartments() {
        return List.of(
            new DepartmentInfo("Water", List.of("Rajesh Kumar", "Anita Singh")),
            new DepartmentInfo("Electricity", List.of("Suresh Patel", "Meena Rao")),
            new DepartmentInfo("Sanitation", List.of("Vikram Joshi", "Priya Nair")),
            new DepartmentInfo("Roads", List.of("Amit Sharma", "Deepa Iyer"))
        );
    }
}