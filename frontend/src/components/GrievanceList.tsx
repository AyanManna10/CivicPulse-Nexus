import { useState } from "react";
import {
  Grid, Paper, Typography, Chip, Stack, Box,
  Select, MenuItem, InputLabel, FormControl, Button
} from "@mui/material";
import type { Grievance, DepartmentInfo } from "../types";
import { api } from "../api";

interface Props {
  grievances: Grievance[];
  departments: DepartmentInfo[];
  canManage: boolean;
  onError: (msg: string) => void;
  onLoadingChange: (v: boolean) => void;
  onChanged: () => void;
}

const STATUS_COLOR: Record<string, "default" | "warning" | "success" | "error" | "info"> = {
  OPEN: "info",
  IN_PROGRESS: "warning",
  RESOLVED: "success",
  ESCALATED: "error",
};

const PRIORITY_COLOR: Record<string, "default" | "warning" | "error" | "success"> = {
  HIGH: "error",
  MEDIUM: "warning",
  LOW: "success",
};

function daysSince(dateStr: string): number {
  const created = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - created) / (1000 * 60 * 60 * 24)));
}

function daysUntilDue(dueStr: string): number {
  const due = new Date(dueStr).getTime();
  const now = Date.now();
  return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
}

export default function GrievanceList({
  grievances, departments, canManage, onError, onLoadingChange, onChanged
}: Props) {
  const [assignDraft, setAssignDraft] = useState<Record<number, { dept?: string; officer?: string }>>({});
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const setDraftDept = (id: number, dept: string) => {
    setAssignDraft((prev) => ({ ...prev, [id]: { dept, officer: undefined } }));
  };
  const setDraftOfficer = (id: number, officer: string) => {
    setAssignDraft((prev) => ({ ...prev, [id]: { ...prev[id], officer } }));
  };

  const assignGrievance = async (id: number) => {
    const draft = assignDraft[id];
    if (!draft?.dept || !draft?.officer) {
      onError("Pick both a department and an officer before assigning");
      return;
    }
    onError("");
    onLoadingChange(true);
    try {
      await api.put(`/api/grievances/${id}/assign`, { department: draft.dept, officer: draft.officer });
      onChanged();
    } catch {
      onError("Assign failed");
    } finally {
      onLoadingChange(false);
    }
  };

  const changeStatus = async (id: number, status: string) => {
    onError("");
    onLoadingChange(true);
    try {
      await api.put(`/api/grievances/${id}/status`, { status });
      onChanged();
    } catch {
      onError("Status update failed");
    } finally {
      onLoadingChange(false);
    }
  };

  const escalate = async (id: number) => {
    onError("");
    onLoadingChange(true);
    try {
      await api.put(`/api/grievances/${id}/escalate`, {});
      onChanged();
    } catch {
      onError("Escalate failed");
    } finally {
      onLoadingChange(false);
    }
  };

  // Sort newest first
const sorted = [...grievances].sort(
  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
);

// Apply status filter
const filtered = statusFilter === "ALL"
  ? sorted
  : statusFilter === "OVERDUE"
  ? sorted.filter((g) => {
      const remaining = daysUntilDue(g.dueDate);
      return g.status !== "RESOLVED" && remaining < 0;
    })
  : sorted.filter((g) => g.status === statusFilter);

if (grievances.length === 0) {
  return (
    <Paper sx={{ p: 4, textAlign: "center" }}>
      <Typography color="text.secondary">No grievances filed yet.</Typography>
    </Paper>
  );
}

  const FILTERS = [
  { value: "ALL",         label: "All",       color: "#0F2557" },
  { value: "OPEN",        label: "Open",       color: "#1565C0" },
  { value: "IN_PROGRESS", label: "Assigned",   color: "#E65100" },
  { value: "ESCALATED",   label: "Escalated",  color: "#C62828" },
  { value: "RESOLVED",    label: "Resolved",   color: "#2E7D32" },
  { value: "OVERDUE",     label: "SLA Breach", color: "#D32F2F" },
];

return (
  <>
    {/* Filter bar */}
    <Box sx={{ display: "flex", gap: 1, mb: 2.5, flexWrap: "wrap", alignItems: "center" }}>
      <Typography variant="caption" sx={{ color: "#5A6072", fontWeight: 700, mr: 0.5 }}>
        Filter:
      </Typography>
      {FILTERS.map((f) => {
        const count = f.value === "ALL"
  ? grievances.length
  : f.value === "OVERDUE"
  ? grievances.filter((g) => {
      const remaining = daysUntilDue(g.dueDate);
      return g.status !== "RESOLVED" && remaining < 0;
    }).length
  : grievances.filter((g) => g.status === f.value).length;
        const active = statusFilter === f.value;
        return (
          <Box
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            sx={{
              px: 1.5, py: 0.5, borderRadius: 5, cursor: "pointer",
              fontSize: "0.78rem", fontWeight: 600,
              border: `1.5px solid ${active ? f.color : "#CBD2E0"}`,
              bgcolor: active ? f.color : "#fff",
              color:   active ? "#fff"    : "#5A6072",
              transition: "all 0.15s",
              "&:hover": { borderColor: f.color, color: active ? "#fff" : f.color },
            }}
          >
            {f.label} ({count})
          </Box>
        );
      })}
      <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
        Showing {filtered.length} of {grievances.length}
      </Typography>
    </Box>

    {filtered.length === 0 ? (
      <Paper sx={{ p: 4, textAlign: "center", border: "1px solid #E4E8F0" }}>
        <Typography color="text.secondary">No grievances match this filter.</Typography>
      </Paper>
    ) : (
    <Grid container spacing={2}>
      {filtered.map((g) => {
        const draft = assignDraft[g.id] || {};
        const officersForDept = departments.find((d) => d.name === draft.dept)?.officers ?? [];
        const elapsed = daysSince(g.createdAt);
        const remaining = daysUntilDue(g.dueDate);
        const isResolved = g.status === "RESOLVED";
        const isOverdue = !isResolved && remaining < 0;

        return (
          <Grid size={{ xs: 12, md: 6 }} key={g.id}>
            <Paper sx={{ p: 2.5, height: "100%", display: "flex", flexDirection: "column" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>#{g.id} — {g.title}</Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: "wrap" }}>
                <Chip size="small" label={g.status} color={STATUS_COLOR[g.status] ?? "default"} />
                <Chip size="small" label={g.priority} color={PRIORITY_COLOR[g.priority] ?? "default"} variant="outlined" />
                <Chip
                  size="small"
                  label={`${elapsed} day${elapsed === 1 ? "" : "s"} since filed`}
                  variant="outlined"
                />
                {!isResolved && (
                  <Chip
                    size="small"
                    label={isOverdue ? `Overdue by ${Math.abs(remaining)} day${Math.abs(remaining) === 1 ? "" : "s"}` : `${remaining} day${remaining === 1 ? "" : "s"} left (SLA)`}
                    color={isOverdue ? "error" : "default"}
                    variant={isOverdue ? "filled" : "outlined"}
                  />
                )}
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, flexGrow: 1 }}>
                {g.description}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
                Dept: {g.department || "unassigned"} · Officer: {g.assignedOfficer || "none"} · Due: {new Date(g.dueDate).toLocaleDateString()}
              </Typography>

              {canManage ? (
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1}>
                    <FormControl size="small" sx={{ minWidth: 120, flex: 1 }}>
                      <InputLabel>Department</InputLabel>
                      <Select
                        label="Department"
                        value={draft.dept ?? ""}
                        onChange={(e) => setDraftDept(g.id, e.target.value)}
                      >
                        {departments.map((d) => (
                          <MenuItem key={d.name} value={d.name}>{d.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 130, flex: 1 }} disabled={!draft.dept}>
                      <InputLabel>Officer</InputLabel>
                      <Select
                        label="Officer"
                        value={draft.officer ?? ""}
                        onChange={(e) => setDraftOfficer(g.id, e.target.value)}
                      >
                        {officersForDept.map((o) => (
                          <MenuItem key={o} value={o}>{o}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="contained" fullWidth onClick={() => assignGrievance(g.id)}>
                      Assign
                    </Button>
                    <Button size="small" variant="outlined" color="success" fullWidth onClick={() => changeStatus(g.id, "RESOLVED")}>
                      Resolve
                    </Button>
                    <Button size="small" variant="outlined" color="error" fullWidth onClick={() => escalate(g.id)}>
                      Escalate
                    </Button>
                  </Stack>
                </Stack>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Only officers and admins can manage this grievance.
                </Typography>
              )}
            </Paper>
          </Grid>
        );
      })}
    </Grid>
    )}
  </>
  );
}