import { useState } from "react";
import {
  Paper, Typography, TextField, Button, Box, Grid, Alert, Divider,
  Chip
} from "@mui/material";
import AddCommentIcon from "@mui/icons-material/AddComment";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { api } from "../api";
import type { Grievance } from "../types";

interface Props {
  citizenId: string;
  loading: boolean;
  onCitizenIdChange: (v: string) => void;
  onError: (msg: string) => void;
  onLoadingChange: (v: boolean) => void;
  onGrievanceCreated: () => void;
  existingGrievances?: Grievance[];
}

const PRIORITY_CONFIG = {
  HIGH:   { label: "High",   color: "#C62828", bg: "#FFEBEE", sla: "1 day"  },
  MEDIUM: { label: "Medium", color: "#E65100", bg: "#FFF3E0", sla: "3 days" },
  LOW:    { label: "Low",    color: "#2E7D32", bg: "#E8F5E9", sla: "7 days" },
};

// Departments list — adjust to match your actual department values
const DEPARTMENTS = [
  "Engineering Department",
  "Health Department",
  "Revenue Department",
  "Water Department",
  "Municipal Administration",
];

export default function GrievanceForm({
  citizenId, loading, onCitizenIdChange, onError, onLoadingChange,
  onGrievanceCreated, existingGrievances = []
}: Props) {
  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority]       = useState("MEDIUM");
  const [department, setDepartment]   = useState("");

  // Fix 3 — department-based duplicate warning state
  const [dupWarning, setDupWarning]   = useState(false);
  // Title-based duplicate warning (existing behaviour)
  const [titleDupWarning, setTitleDupWarning] = useState("");

  const isCitizenView = !!citizenId && /^\d+$/.test(citizenId);

  // Existing title-based duplicate check (kept from original)
  const checkDuplicate = (newTitle: string) => {
    setTitle(newTitle);
    setTitleDupWarning("");
    if (!newTitle.trim() || existingGrievances.length === 0) return;
    const normalized = newTitle.trim().toLowerCase();
    const dup = existingGrievances.find(g =>
      g.title.trim().toLowerCase() === normalized &&
      g.status !== "RESOLVED"
    );
    if (dup) {
      setTitleDupWarning(
        `You already have an active grievance with this title (Status: ${dup.status}). Please check My Grievances before submitting again.`
      );
    }
  };

  // Fix 3 — main submit function with department-based duplicate check
  const submit = async () => {
    onError("");

    if (!title.trim() || !description.trim()) {
      onError("Title and description are required");
      return;
    }
    if (!citizenId || !/^\d+$/.test(citizenId)) {
      onError("Citizen ID is required");
      return;
    }
    if (titleDupWarning) {
      onError("Please resolve the duplicate grievance issue before submitting");
      return;
    }

    // Final title-based duplicate guard
    const normalized = title.trim().toLowerCase();
    const titleDup = existingGrievances.find(g =>
      g.title.trim().toLowerCase() === normalized && g.status !== "RESOLVED"
    );
    if (titleDup) {
      onError(`An active grievance with this title already exists (${titleDup.status}). You cannot file the same grievance twice.`);
      return;
    }

    // Fix 3 — department-based duplicate check (first pass: fetch & warn)
    if (!dupWarning) {
      try {
        const existing = await api.get(`/api/grievances/citizen/${citizenId}`);
        const openInSameDept = existing.data.filter((g: any) =>
          g.department === department &&
          ["SUBMITTED", "ASSIGNED", "IN_PROGRESS"].includes(g.status)
        );
        if (openInSameDept.length > 0) {
          setDupWarning(true);
          return; // Stop — show warning UI, let user decide
        }
      } catch { /* silent — don't block submission on check failure */ }
    }

    // Proceed with actual submission
    setDupWarning(false);
    onLoadingChange(true);
    try {
      await api.post("/api/grievances", {
        citizenId: Number(citizenId),
        title: title.trim(),
        description: description.trim(),
        priority,
        department,
      });
      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
      setDepartment("General");
      setTitleDupWarning("");
      setDupWarning(false);
      onGrievanceCreated();
    } catch {
      onError("Failed to submit grievance. Please try again.");
    } finally {
      onLoadingChange(false);
    }
  };

  const pc = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: 2.5,
          background: "linear-gradient(135deg, #0F2557, #1A3A8F)",
          display: "flex", alignItems: "center", justifyContent: "center", color: "#fff"
        }}>
          <AddCommentIcon />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F2557", lineHeight: 1.1 }}>
            {isCitizenView ? "File a Grievance" : "File Grievance on Behalf of Citizen"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {isCitizenView
              ? "Submit a formal complaint. Our officers will respond within the SLA period."
              : "Submit your complaint. Our officers will respond within the SLA period."}
          </Typography>
        </Box>
      </Box>

      <Paper sx={{ overflow: "hidden", border: "1px solid #E4E8F0" }}>
        <Box sx={{ background: "linear-gradient(135deg, #0F2557, #1A3A8F)", px: 3, py: 1.5 }}>
          <Typography variant="caption" sx={{
            color: "rgba(255,255,255,0.8)", fontWeight: 600, letterSpacing: 0.5,
            textTransform: "uppercase", fontSize: "0.72rem"
          }}>
            Grievance Details
          </Typography>
        </Box>

        <Box sx={{ p: 3 }}>
          <Grid container spacing={2}>
            {/* Citizen ID — officers/admin only */}
            {!isCitizenView && (
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Citizen ID"
                  value={citizenId}
                  onChange={(e) => onCitizenIdChange(e.target.value)}
                  helperText="Enter the registered citizen's portal ID"
                />
              </Grid>
            )}

            {/* Title with title-based dup check */}
            <Grid size={12}>
              <TextField
                fullWidth
                label="Grievance Title"
                value={title}
                onChange={(e) => checkDuplicate(e.target.value)}
                error={!!titleDupWarning}
                helperText={titleDupWarning ? undefined : "Summarise the issue in one line (e.g. 'Broken streetlight near Ward 5 market')"}
                slotProps={{ htmlInput: { maxLength: 120 } }}
              />
              {titleDupWarning && (
                <Alert
                  severity="warning"
                  icon={<WarningAmberIcon fontSize="small" />}
                  sx={{ mt: 0.75, fontSize: "0.8rem", borderRadius: 1.5 }}
                >
                  {titleDupWarning}
                </Alert>
              )}
            </Grid>

            {/* Description */}
            <Grid size={12}>
              <TextField
                fullWidth
                label="Full Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                rows={4}
                helperText="Include location, date of occurrence, and how it affects you"
                slotProps={{ htmlInput: { maxLength: 1000 } }}
              />
            </Grid>

            {/* Department selector */}
            <Grid size={12}>
              <TextField
                select
                fullWidth
                label="Department"
                value={department}
                onChange={(e) => { setDepartment(e.target.value); setDupWarning(false); }}
                helperText="Select the department this grievance relates to"
                slotProps={{ select: { native: false } }}
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}
                    style={{ padding: "8px 16px", display: "block", cursor: "pointer" }}>
                    {dept}
                  </option>
                ))}
              </TextField>
            </Grid>

            {/* Priority selector */}
            <Grid size={12}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#5A6072", display: "block", mb: 1 }}>
                Priority Level
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                {(["LOW", "MEDIUM", "HIGH"] as const).map((p) => {
                  const cfg = PRIORITY_CONFIG[p];
                  return (
                    <Box
                      key={p}
                      onClick={() => setPriority(p)}
                      sx={{
                        flex: 1, py: 1.5, textAlign: "center", borderRadius: 2,
                        border: `2px solid ${priority === p ? cfg.color : "#E4E8F0"}`,
                        bgcolor: priority === p ? cfg.bg : "#F8F9FC",
                        cursor: "pointer", transition: "all 0.15s",
                        "&:hover": { borderColor: cfg.color },
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 700, color: priority === p ? cfg.color : "#5A6072", display: "block" }}>
                        {cfg.label}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "#9AA3B5" }}>
                        SLA: {cfg.sla}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2.5 }} />

          {/* SLA info chip */}
          <Box sx={{
            mb: 2, p: 1.5, bgcolor: pc.bg, borderRadius: 1.5,
            border: `1px solid ${pc.color}30`, display: "flex", alignItems: "center", gap: 1
          }}>
            <Chip size="small" label={pc.label} sx={{ bgcolor: pc.color, color: "#fff", fontWeight: 700, fontSize: "0.7rem" }} />
            <Typography variant="caption" sx={{ color: pc.color, fontWeight: 600 }}>
              Priority — officers will respond within <strong>{pc.sla}</strong>
            </Typography>
          </Box>

          {/* Fix 3 — Department duplicate warning with "Submit Anyway" action */}
          {dupWarning && (
            <Alert
              severity="warning"
              sx={{ mt: 2, mb: 2 }}
              action={
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <Button size="small" color="inherit" onClick={() => setDupWarning(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="warning"
                    onClick={() => submit()}
                  >
                    Submit Anyway
                  </Button>
                </Box>
              }
            >
              You already have an open grievance in <strong>{department}</strong>. Are you sure you want to file another?
            </Alert>
          )}

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={submit}
            disabled={loading || !!titleDupWarning}
            startIcon={<AddCommentIcon />}
            sx={{ py: 1.3 }}
          >
            {loading ? "Submitting..." : "Submit Grievance"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}