import { useState } from "react";
import {
  Grid, Paper, Typography, Chip, Stack, Box,
  Select, MenuItem, InputLabel, FormControl, Button, Alert
} from "@mui/material";
import EditNoteIcon from "@mui/icons-material/EditNote";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import type { Grievance, DepartmentInfo } from "../types";
import { api } from "../api";

type UserRole = "ADMIN" | "HEAD_OFFICER" | "OFFICER";

interface Props {
  grievances: Grievance[];
  departments: DepartmentInfo[];
  canManage: boolean;
  userRole: UserRole;
  officerDept?: string;   // required when userRole is HEAD_OFFICER or OFFICER
  onError: (msg: string) => void;
  onLoadingChange: (v: boolean) => void;
  onChanged: () => void;
}

const STATUS_COLOR: Record<string, "default" | "warning" | "success" | "error" | "info"> = {
  OPEN:        "info",
  IN_PROGRESS: "warning",
  RESOLVED:    "success",
  ESCALATED:   "error",
  CLOSED:      "default",
};

const PRIORITY_COLOR: Record<string, "default" | "warning" | "error" | "success"> = {
  HIGH:   "error",
  MEDIUM: "warning",
  LOW:    "success",
};

const FILTERS = [
  { value: "ALL",         label: "All",        color: "#0F2557" },
  { value: "OPEN",        label: "Open",        color: "#1565C0" },
  { value: "IN_PROGRESS", label: "Assigned",    color: "#E65100" },
  { value: "ESCALATED",   label: "Escalated",   color: "#C62828" },
  { value: "RESOLVED",    label: "Resolved",    color: "#2E7D32" },
  { value: "OVERDUE",     label: "SLA Breach",  color: "#D32F2F" },
];

function daysSince(dateStr: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000));
}

function daysUntilDue(dueStr: string): number {
  return Math.ceil((new Date(dueStr).getTime() - Date.now()) / 86_400_000);
}

export default function GrievanceList({
  grievances, departments, canManage, userRole, officerDept,
  onError, onLoadingChange, onChanged
}: Props) {
  const [assignDraft, setAssignDraft] =
    useState<Record<number, { dept?: string; officer?: string }>>({});
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // ── Draft helpers ────────────────────────────────────────────────────────────

  function ensureDraft(g: Grievance) {
    if (!assignDraft[g.id]) {
      setAssignDraft(prev => ({
        ...prev,
        [g.id]: { dept: g.department ?? "", officer: g.assignedOfficer ?? "" }
      }));
    }
  }

  function setDraftDept(id: number, dept: string) {
    setAssignDraft(prev => ({ ...prev, [id]: { dept, officer: "" } }));
  }

  function setDraftOfficer(id: number, officer: string) {
    setAssignDraft(prev => ({ ...prev, [id]: { ...prev[id], officer } }));
  }

  // ── API actions ──────────────────────────────────────────────────────────────

  async function assignGrievance(id: number, forceDept?: string) {
    const draft = assignDraft[id];
    // For HEAD_OFFICER, dept comes from forceDept (their locked dept)
    const dept    = forceDept ?? draft?.dept;
    const officer = draft?.officer;
    if (!dept || !officer) {
      onError("Pick an officer before assigning");
      return;
    }
    onError("");
    onLoadingChange(true);
    try {
      await api.put(`/api/grievances/${id}/assign`, { department: dept, officer });
      onChanged();
    } catch {
      onError("Assign failed — check backend is running");
    } finally {
      onLoadingChange(false);
    }
  }

  async function changeStatus(id: number, status: string) {
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
  }

  async function escalate(id: number) {
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
  }

  // ── Filter & sort ────────────────────────────────────────────────────────────

  const sorted = [...grievances].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const filtered =
    statusFilter === "ALL"
      ? sorted
      : statusFilter === "OVERDUE"
      ? sorted.filter(g => g.status !== "RESOLVED" && daysUntilDue(g.dueDate) < 0)
      : sorted.filter(g => g.status === statusFilter);

  if (grievances.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: "center", border: "1px solid #E4E8F0" }}>
        <Typography color="text.secondary">No grievances filed yet.</Typography>
      </Paper>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Filter bar */}
      <Box sx={{ display: "flex", gap: 1, mb: 2.5, flexWrap: "wrap", alignItems: "center" }}>
        <Typography variant="caption" sx={{ color: "#5A6072", fontWeight: 700, mr: 0.5 }}>
          Filter:
        </Typography>
        {FILTERS.map(f => {
          const count =
            f.value === "ALL"     ? grievances.length :
            f.value === "OVERDUE" ? grievances.filter(g => g.status !== "RESOLVED" && daysUntilDue(g.dueDate) < 0).length :
                                    grievances.filter(g => g.status === f.value).length;
          const active = statusFilter === f.value;
          return (
            <Box key={f.value} onClick={() => setStatusFilter(f.value)}
              sx={{
                px: 1.5, py: 0.5, borderRadius: 5, cursor: "pointer",
                fontSize: "0.78rem", fontWeight: 600, transition: "all 0.15s",
                border: `1.5px solid ${active ? f.color : "#CBD2E0"}`,
                bgcolor: active ? f.color : "#fff",
                color:   active ? "#fff"  : "#5A6072",
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
          {filtered.map(g => {
            const draft = assignDraft[g.id] ?? {
              dept:    g.department ?? "",
              officer: g.assignedOfficer ?? "",
            };

            // ADMIN sees all dept officers; HEAD_OFFICER sees only their dept's officers
            const officersForDept =
              userRole === "HEAD_OFFICER"
                ? departments.find(d => d.name === officerDept)?.officers ?? []
                : departments.find(d => d.name === draft.dept)?.officers ?? [];

            const elapsed    = daysSince(g.createdAt);
            const remaining  = daysUntilDue(g.dueDate);
            const isResolved = g.status === "RESOLVED" || g.status === "CLOSED";
            const isOverdue  = !isResolved && remaining < 0;
            const isAssigned = !!g.assignedOfficer || !!g.department;

            return (
              <Grid size={{ xs: 12, md: 6 }} key={g.id}>
                <Paper sx={{
                  p: 2.5, height: "100%", display: "flex", flexDirection: "column",
                  border: isOverdue ? "1px solid #FFCDD2" : "1px solid #E4E8F0",
                  borderTop: isOverdue ? "3px solid #C62828" :
                    isResolved ? "3px solid #2E7D32" : "3px solid #E4E8F0",
                }}>
                  {/* Title row */}
                  <Box sx={{ display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
                      #{g.id} — {g.title}
                    </Typography>
                  </Box>

                  {/* Status chips */}
                  <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: "wrap", gap: "4px" }}>
                    <Chip size="small" label={g.status.replace("_", " ")}
                      color={STATUS_COLOR[g.status] ?? "default"} />
                    <Chip size="small" label={g.priority}
                      color={PRIORITY_COLOR[g.priority] ?? "default"} variant="outlined" />
                    <Chip size="small" label={`${elapsed}d ago`} variant="outlined" />
                    {!isResolved && (
                      <Chip size="small"
                        label={isOverdue
                          ? `Overdue ${Math.abs(remaining)}d`
                          : `${remaining}d left (SLA)`}
                        color={isOverdue ? "error" : "default"}
                        variant={isOverdue ? "filled" : "outlined"}
                      />
                    )}
                  </Stack>

                  {/* Description */}
                  <Typography variant="body2" color="text.secondary"
                    sx={{ mb: 1.5, flexGrow: 1 }}>
                    {g.description}
                  </Typography>

                  {/* Current assignment info */}
                  <Box sx={{ mb: 1.5, p: 1, bgcolor: "#F8F9FC", borderRadius: 1.5,
                    border: "1px solid #E4E8F0" }}>
                    <Typography variant="caption" sx={{ color: "#5A6072" }}>
                      <strong>Dept:</strong> {g.department || "— not assigned —"}&ensp;·&ensp;
                      <strong>Officer:</strong> {g.assignedOfficer || "— none —"}&ensp;·&ensp;
                      <strong>Due:</strong> {new Date(g.dueDate).toLocaleDateString("en-IN")}
                    </Typography>
                  </Box>

                  {/* RESOLVED / CLOSED re-assign notice — only for roles that can assign */}
                  {isResolved && canManage && userRole !== "OFFICER" && (
                    <Alert severity="info" sx={{ mb: 1.5, py: 0.5, fontSize: "0.75rem" }}
                      icon={<SwapHorizIcon fontSize="small" />}>
                      Reassigning will reopen this grievance (status → In Progress).
                    </Alert>
                  )}

                  {/* ── Management controls (role-branched) ── */}
                  {canManage ? (
                    <Stack spacing={1}>

                      {/* ADMIN — full dept + officer selectors */}
                      {userRole === "ADMIN" && (
                        <Stack direction="row" spacing={1}>
                          <FormControl size="small" sx={{ minWidth: 120, flex: 1 }}>
                            <InputLabel>Department</InputLabel>
                            <Select
                              label="Department"
                              value={draft.dept ?? ""}
                              onChange={e => { ensureDraft(g); setDraftDept(g.id, e.target.value); }}
                            >
                              {draft.dept && !departments.find(d => d.name === draft.dept) && (
                                <MenuItem value={draft.dept} disabled
                                  sx={{ fontStyle: "italic", color: "text.disabled", fontSize: "0.82rem" }}>
                                  {draft.dept} — no active officers
                                </MenuItem>
                              )}
                              {departments.map(d => (
                                <MenuItem key={d.name} value={d.name}>{d.name}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <FormControl size="small" sx={{ minWidth: 130, flex: 1 }}
                            disabled={!draft.dept}>
                            <InputLabel>Officer</InputLabel>
                            <Select
                              label="Officer"
                              value={draft.officer ?? ""}
                              onChange={e => setDraftOfficer(g.id, e.target.value)}
                            >
                              {draft.officer && !officersForDept.includes(draft.officer) && (
                                <MenuItem value={draft.officer} disabled
                                  sx={{ fontStyle: "italic", color: "text.disabled", fontSize: "0.82rem" }}>
                                  {draft.officer} — inactive / transferred
                                </MenuItem>
                              )}
                              {officersForDept.map(o => (
                                <MenuItem key={o} value={o}>{o}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Stack>
                      )}

                      {/* HEAD_OFFICER — officer selector only, dept is locked */}
                      {userRole === "HEAD_OFFICER" && (
                        <FormControl size="small" fullWidth>
                          <InputLabel>Officer</InputLabel>
                          <Select
                            label="Officer"
                            value={draft.officer ?? ""}
                            onChange={e => { ensureDraft(g); setDraftOfficer(g.id, e.target.value); }}
                          >
                            {draft.officer && !officersForDept.includes(draft.officer) && (
                              <MenuItem value={draft.officer} disabled
                                sx={{ fontStyle: "italic", color: "text.disabled", fontSize: "0.82rem" }}>
                                {draft.officer} — inactive / transferred
                              </MenuItem>
                            )}
                            {officersForDept.map(o => (
                              <MenuItem key={o} value={o}>{o}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}

                      {/* OFFICER — no selectors at all, status buttons only */}

                      {/* Action buttons */}
                      <Stack direction="row" spacing={1}>
                        {/* Assign / Reassign — ADMIN and HEAD_OFFICER only */}
                        {(userRole === "ADMIN" || userRole === "HEAD_OFFICER") && (
                          <Button
                            size="small" variant="contained" fullWidth
                            startIcon={isAssigned ? <EditNoteIcon fontSize="small" /> : undefined}
                            onClick={() =>
                              userRole === "HEAD_OFFICER"
                                ? assignGrievance(g.id, officerDept)
                                : assignGrievance(g.id)
                            }
                            sx={{ bgcolor: isAssigned ? "#303F9F" : undefined }}
                          >
                            {isAssigned ? "Reassign" : "Assign"}
                          </Button>
                        )}

                        {!isResolved && (
                          <Button size="small" variant="outlined" color="success" fullWidth
                            onClick={() => changeStatus(g.id, "RESOLVED")}>
                            Resolve
                          </Button>
                        )}
                        {isResolved && (
                          <Button size="small" variant="outlined" color="warning" fullWidth
                            onClick={() => changeStatus(g.id, "IN_PROGRESS")}>
                            Reopen
                          </Button>
                        )}
                        {!isResolved && (
                          <Button size="small" variant="outlined" color="error" fullWidth
                            onClick={() => escalate(g.id)}>
                            Escalate
                          </Button>
                        )}
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