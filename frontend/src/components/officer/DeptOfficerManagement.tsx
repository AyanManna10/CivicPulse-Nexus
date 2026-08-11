/**
 * DeptOfficerManagement.tsx
 *
 * Shown to officers with headOfficer=true.
 * They can see, edit (name/phone), activate/deactivate, and toggle head status
 * of officers in THEIR department only.
 * They cannot create new officers (admin-only) or move officers between departments.
 */
import { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Paper, Chip, Stack, Button, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, Tooltip, Switch, FormControlLabel,
} from "@mui/material";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import EditIcon from "@mui/icons-material/Edit";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import PersonIcon from "@mui/icons-material/Person";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { api } from "../../api";

interface Officer {
  id: number;
  officerCode: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  headOfficer: boolean;
  status: string;
  keycloakRole: string;
}

interface Props {
  department: string;          // Current officer's own department
  currentOfficerEmail: string; // Prevent self-deactivation
}

export default function DeptOfficerManagement({ department, currentOfficerEmail }: Props) {
  const [officers, setOfficers]   = useState<Officer[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");

  // Edit modal state
  const [editTarget, setEditTarget] = useState<Officer | null>(null);
  const [editName, setEditName]     = useState("");
  const [editPhone, setEditPhone]   = useState("");
  const [editHead, setEditHead]     = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // ── Load officers for this department ────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/api/officers/department/${encodeURIComponent(department)}`);
      setOfficers(res.data);
    } catch {
      setError("Failed to load department officers — check backend is running");
    } finally {
      setLoading(false);
    }
  }, [department]);

  useEffect(() => { load(); }, [load]);

  // ── Edit officer ──────────────────────────────────────────────────────────────

  function openEdit(officer: Officer) {
    setEditTarget(officer);
    setEditName(officer.fullName);
    setEditPhone(officer.phone);
    setEditHead(officer.headOfficer);
    setSuccess("");
    setError("");
  }

  async function saveEdit() {
    if (!editTarget) return;
    if (!editName.trim()) { setError("Name is required"); return; }
    if (!/^\d{10}$/.test(editPhone.trim())) { setError("Phone must be 10 digits"); return; }
    setEditSaving(true);
    setError("");
    try {
      await api.put(`/api/officers/${editTarget.id}`, {
        fullName:     editName.trim(),
        phone:        editPhone.trim(),
        email:        editTarget.email,
        department:   editTarget.department, // dept head cannot change dept
        keycloakRole: editTarget.keycloakRole,
        headOfficer:  editHead,
      });
      setSuccess(`${editName} updated successfully`);
      setEditTarget(null);
      load();
    } catch {
      setError("Failed to save changes");
    } finally {
      setEditSaving(false);
    }
  }

  // ── Toggle active / inactive ─────────────────────────────────────────────────

  async function toggleStatus(officer: Officer) {
    if (officer.email === currentOfficerEmail) {
      setError("You cannot deactivate your own account");
      return;
    }
    setError("");
    try {
      const endpoint = officer.status === "ACTIVE" ? "deactivate" : "activate";
      await api.put(`/api/officers/${officer.id}/${endpoint}`);
      setSuccess(`${officer.fullName} ${officer.status === "ACTIVE" ? "deactivated" : "activated"}`);
      load();
    } catch {
      setError("Failed to update officer status");
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const active   = officers.filter(o => o.status === "ACTIVE");
  const inactive = officers.filter(o => o.status !== "ACTIVE");

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: 2.5,
          background: "linear-gradient(135deg, #0F2557, #1A3A8F)",
          display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
          <SupervisorAccountIcon />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F2557", lineHeight: 1.1 }}>
            My Department Officers
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {department} · {active.length} active · {inactive.length} inactive
          </Typography>
        </Box>
      </Box>

      {error   && <Alert severity="error"   sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>{success}</Alert>}

      {loading ? (
        <Typography color="text.secondary">Loading officers…</Typography>
      ) : officers.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center", border: "1px solid #E4E8F0" }}>
          <Typography color="text.secondary">
            No officers found for {department}.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {officers.map(o => {
            const isSelf = o.email === currentOfficerEmail;
            const isActive = o.status === "ACTIVE";
            return (
              <Paper key={o.id} sx={{
                p: 2.5, border: "1px solid #E4E8F0",
                borderLeft: `4px solid ${isActive ? "#2E7D32" : "#9AA3B5"}`,
                opacity: isActive ? 1 : 0.65,
              }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  {/* Avatar placeholder */}
                  <Box sx={{
                    width: 40, height: 40, borderRadius: "50%",
                    bgcolor: isActive ? "#0F2557" : "#9AA3B5",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontWeight: 700, fontSize: "1rem", flexShrink: 0,
                  }}>
                    {o.fullName.charAt(0).toUpperCase()}
                  </Box>

                  {/* Info */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                      <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
                        {o.fullName}
                      </Typography>
                      {o.headOfficer && (
                        <Tooltip title="Department Head">
                          <StarIcon sx={{ color: "#F57F17", fontSize: 16 }} />
                        </Tooltip>
                      )}
                      {isSelf && (
                        <Chip label="You" size="small" sx={{ height: 18, fontSize: "0.65rem" }} />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {o.email} · {o.phone} · {o.officerCode}
                    </Typography>
                  </Box>

                  {/* Status chip */}
                  <Chip
                    size="small"
                    label={isActive ? "Active" : "Inactive"}
                    color={isActive ? "success" : "default"}
                    variant={isActive ? "filled" : "outlined"}
                    sx={{ flexShrink: 0 }}
                  />

                  {/* Actions */}
                  <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                    <Button size="small" variant="outlined" startIcon={<EditIcon fontSize="small" />}
                      onClick={() => openEdit(o)}>
                      Edit
                    </Button>
                    <Tooltip title={isSelf ? "You cannot deactivate yourself" : (isActive ? "Deactivate" : "Reactivate")}>
                      <span>
                        <Button
                          size="small"
                          variant="outlined"
                          color={isActive ? "error" : "success"}
                          startIcon={isActive ? <PersonOffIcon fontSize="small" /> : <PersonIcon fontSize="small" />}
                          disabled={isSelf}
                          onClick={() => toggleStatus(o)}
                        >
                          {isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </span>
                    </Tooltip>
                  </Stack>
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}

      {/* Note for dept head */}
      <Box sx={{ mt: 3, p: 2, bgcolor: "#F0F4FF", borderRadius: 2, border: "1px solid #C5CAE9" }}>
        <Typography variant="caption" color="text.secondary">
          <strong>Note:</strong> As department head you can edit officer details, toggle active status,
          and update the head officer flag for members of <strong>{department}</strong>.
          To create new officers or move officers between departments, contact the system administrator.
        </Typography>
      </Box>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Edit Officer — {editTarget?.fullName}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Full Name" size="small" fullWidth
              value={editName} onChange={e => setEditName(e.target.value)}
            />
            <TextField
              label="Phone (10 digits)" size="small" fullWidth
              value={editPhone} onChange={e => setEditPhone(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 10 } }}
            />
            <TextField
              label="Email" size="small" fullWidth disabled
              value={editTarget?.email ?? ""}
              helperText="Email cannot be changed here. Contact admin."
            />
            <TextField
              label="Department" size="small" fullWidth disabled
              value={editTarget?.department ?? ""}
              helperText="Department can only be changed by admin."
            />
            <FormControlLabel
              control={
                <Switch
                  checked={editHead}
                  onChange={e => setEditHead(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  {editHead
                    ? <StarIcon sx={{ color: "#F57F17", fontSize: 16 }} />
                    : <StarBorderIcon sx={{ fontSize: 16 }} />}
                  <Typography variant="body2">Department Head</Typography>
                </Box>
              }
            />
            {error && <Alert severity="error" sx={{ py: 0.5 }}>{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditTarget(null)} disabled={editSaving}>Cancel</Button>
          <Button variant="contained" onClick={saveEdit} disabled={editSaving}>
            {editSaving ? "Saving…" : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}