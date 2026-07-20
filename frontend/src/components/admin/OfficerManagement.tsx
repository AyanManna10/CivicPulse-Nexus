import { useState, useEffect } from "react";
import {
  Paper, Typography, Box, Button, TextField, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Alert, Divider, Select, MenuItem, InputLabel, FormControl,
  FormControlLabel, Switch, IconButton, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import GroupIcon from "@mui/icons-material/Group";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import PersonIcon from "@mui/icons-material/Person";
import StarIcon from "@mui/icons-material/Star";
import EditIcon from "@mui/icons-material/Edit";
import type { Officer } from "../../types";
import { api } from "../../api";

const DEPARTMENTS = [
  "Health Department",
  "Water Department",
  "Revenue Department",
  "Engineering Department",
  "Education Department",
  "Social Welfare Department",
  "Municipal Administration",
  "Unassigned",
];

interface OfficerFormState {
  fullName: string;
  email: string;
  phone: string;
  department: string;
  password: string;
  keycloakRole: string;
  headOfficer: boolean;
}

const EMPTY_FORM: OfficerFormState = {
  fullName: "", email: "", phone: "", department: "",
  password: "", keycloakRole: "OFFICER", headOfficer: false,
};

interface Props {
  onError: (msg: string) => void;
  onLoadingChange: (v: boolean) => void;
}

export default function OfficerManagement({ onError, onLoadingChange }: Props) {
  const [officers, setOfficers]           = useState<Officer[]>([]);
  const [showForm, setShowForm]           = useState(false);
  const [form, setForm]                   = useState<OfficerFormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors]     = useState<Record<string, string>>({});
  const [success, setSuccess]             = useState("");
  const [filterDept, setFilterDept]       = useState("");
  const [filterStatus, setFilterStatus]   = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [mainTab, setMainTab]             = useState<"OFFICERS" | "ADMINS">("OFFICERS");
  

  // Edit dialog
  const [editTarget, setEditTarget]       = useState<Officer | null>(null);
  const [editForm, setEditForm]           = useState<Partial<OfficerFormState>>({});

  useEffect(() => {
  const init = async () => {
    await importFromKeycloak();
    await loadOfficers();
  };
  init();
}, []);

  const loadOfficers = async () => {
    try {
      const res = await api.get("/api/officers");
      setOfficers(res.data);
    } catch { onError("Failed to load officers"); }
  };

  // ── Validation ─────────────────────────────────────────────────────────────

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim())                        errs.fullName    = "Name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email   = "Valid email required";
    if (!/^\d{10}$/.test(form.phone))                errs.phone       = "Phone must be 10 digits";
    if (!form.department || form.department === "Unassigned") errs.department = "Select a real department";
    if (form.password.length < 6)                    errs.password    = "Password must be at least 6 characters";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Create officer ─────────────────────────────────────────────────────────

  const submit = async () => {
    onError(""); setSuccess("");
    if (!validate()) return;
    onLoadingChange(true);
    try {
      await api.post("/api/officers", form);
      setSuccess(
        `Officer "${form.fullName}" created. ` +
        `They can log in at Keycloak with email: ${form.email} and the password you set.`
      );
      setForm(EMPTY_FORM); setShowForm(false); setFieldErrors({});
      loadOfficers();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.response?.data ?? "Failed to create officer";
      onError(typeof msg === "string" ? msg : "Officer creation failed — email may already exist");
    } finally { onLoadingChange(false); }
  };

  // ── Activate / Deactivate ──────────────────────────────────────────────────

  const deactivate = async (o: Officer) => {
    if (!confirm(`Deactivate "${o.fullName}"? They will lose portal access.`)) return;
    onLoadingChange(true);
    try {
      await api.put(`/api/officers/${o.id}/deactivate`);
      setSuccess(`"${o.fullName}" has been deactivated.`);
      loadOfficers();
    } catch { onError("Failed to deactivate officer"); }
    finally { onLoadingChange(false); }
  };

  const activate = async (o: Officer) => {
    if (!confirm(`Re-activate "${o.fullName}"?`)) return;
    onLoadingChange(true);
    try {
      await api.put(`/api/officers/${o.id}/activate`);
      setSuccess(`"${o.fullName}" has been re-activated.`);
      loadOfficers();
    } catch { onError("Failed to activate officer"); }
    finally { onLoadingChange(false); }
  };

  // ── Import from Keycloak ──────────────────────────────────────────────────

  const importFromKeycloak = async () => {
  try {
    await api.post("/api/officers/import-from-keycloak");
  } catch {
    // silent — if Keycloak is unavailable, DB officers still show
  }
};

  // ── Edit officer ───────────────────────────────────────────────────────────

  const openEdit = (o: Officer) => {
    setEditTarget(o);
    setEditForm({
      fullName:    o.fullName,
      phone:       o.phone,
      department:  o.department,
      keycloakRole: o.keycloakRole,
      headOfficer: o.headOfficer,
    });
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    onLoadingChange(true);
    try {
      await api.put(`/api/officers/${editTarget.id}`, {
        ...editForm,
        email:    editTarget.email,   // email cannot change
        password: "unchanged",        // not used in update
      });
      setSuccess(`"${editTarget.fullName}" updated successfully.`);
      setEditTarget(null);
      loadOfficers();
    } catch { onError("Update failed"); }
    finally { onLoadingChange(false); }
  };

  // ── Display filtering ──────────────────────────────────────────────────────

  const officerOnly   = officers.filter((o) => o.keycloakRole !== "ADMIN");
const adminOnly     = officers.filter((o) => o.keycloakRole === "ADMIN");
const activeCount   = officerOnly.filter((o) => o.status === "ACTIVE").length;
const inactiveCount = officerOnly.filter((o) => o.status === "INACTIVE").length;
const deptCount     = new Set(officerOnly.map((o) => o.department)).size;

const displayed = mainTab === "ADMINS"
  ? adminOnly
  : officerOnly.filter((o) => {
      const deptOk   = !filterDept   || o.department === filterDept;
      const statusOk = filterStatus === "ALL" || o.status === filterStatus;
      return deptOk && statusOk;
    });

  const f = (field: keyof OfficerFormState, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* ── Header ── */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2.5, background: "linear-gradient(135deg, #0F2557, #1A3A8F)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <GroupIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F2557", lineHeight: 1.1 }}>
              Officer Management
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {activeCount} active · {inactiveCount} inactive · {deptCount} department(s)
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
         

          <Button
            variant="contained"
            size="small"
            startIcon={showForm ? undefined : <AddIcon />}
            onClick={() => { setShowForm(!showForm); setSuccess(""); setFieldErrors({}); setForm(EMPTY_FORM); }}
          >
            {showForm ? "Cancel" : "Add Officer"}
          </Button>
        </Box>
      </Box>

      {/* ── Success / error banner ── */}
      {success && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 1.5 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {/* ── Sync info box (shown when table is empty) ── */}
      {officers.length === 0 && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>
          <strong>Officers not showing?</strong> Click <strong>"Sync from Keycloak"</strong> above to
          pull all officers that were created directly in Keycloak into this table. This is a
          one-time operation — newly added officers will appear here automatically.
        </Alert>
      )}

      {/* ── Add Officer Form ── */}
      {showForm && (
        <Paper sx={{ mb: 3, overflow: "hidden", border: "1px solid #E4E8F0" }}>
          <Box sx={{ background: "linear-gradient(135deg, #0F2557, #1A3A8F)", px: 3, py: 1.5 }}>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.72rem" }}>
              New Officer Registration
            </Typography>
          </Box>
          <Box sx={{ p: 3 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Full Name" value={form.fullName}
                  onChange={(e) => f("fullName", e.target.value)}
                  error={!!fieldErrors.fullName} helperText={fieldErrors.fullName} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Email Address" type="email" value={form.email}
                  onChange={(e) => f("email", e.target.value)}
                  error={!!fieldErrors.email}
                  helperText={fieldErrors.email ?? "This becomes their Keycloak login username"} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Phone Number (10 digits)" value={form.phone}
                  onChange={(e) => f("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  error={!!fieldErrors.phone} helperText={fieldErrors.phone} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Login Password" type="password" value={form.password}
                  onChange={(e) => f("password", e.target.value)}
                  error={!!fieldErrors.password}
                  helperText={fieldErrors.password ?? "Officer uses this to log into the portal"} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth error={!!fieldErrors.department}>
                  <InputLabel>Department</InputLabel>
                  <Select label="Department" value={form.department}
                    onChange={(e) => f("department", e.target.value)}>
                    {DEPARTMENTS.filter((d) => d !== "Unassigned").map((d) => (
                      <MenuItem key={d} value={d}>{d}</MenuItem>
                    ))}
                  </Select>
                  {fieldErrors.department && (
                    <Typography variant="caption" color="error" sx={{ pl: 1.5, pt: 0.5 }}>
                      {fieldErrors.department}
                    </Typography>
                  )}
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Portal Role</InputLabel>
                  <Select label="Portal Role" value={form.keycloakRole}
                    onChange={(e) => f("keycloakRole", e.target.value)}>
                    <MenuItem value="OFFICER">OFFICER — can verify &amp; approve applications</MenuItem>
                    <MenuItem value="ADMIN">ADMIN — full access including officer management</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.headOfficer}
                      onChange={(e) => f("headOfficer", e.target.checked)}
                      color="warning"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Department Head Officer ⭐
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Head officers can assign grievances to other officers in their department
                      </Typography>
                    </Box>
                  }
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2.5 }} />

            <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5, fontSize: "0.82rem" }}>
              A Keycloak account will be created automatically. The officer can log into the portal
              using their <strong>email</strong> and the <strong>password</strong> you set above.
            </Alert>

            <Button variant="contained" size="large" onClick={submit} startIcon={<AddIcon />}>
              Create Officer Account
            </Button>
          </Box>
        </Paper>
      )}

      {/* ── Main tab: Officers / Admins ── */}
<Box sx={{ display: "flex", mb: 2, border: "1px solid #CBD2E0", borderRadius: 1.5, overflow: "hidden", width: "fit-content" }}>
  {(["OFFICERS", "ADMINS"] as const).map((t) => (
    <Box
      key={t}
      onClick={() => setMainTab(t)}
      sx={{
        px: 3, py: 1, cursor: "pointer", fontSize: "0.82rem", fontWeight: 700,
        bgcolor: mainTab === t ? "#0F2557" : "#fff",
        color:   mainTab === t ? "#fff"    : "#5A6072",
        transition: "all 0.15s",
      }}
    >
      {t === "OFFICERS"
        ? `Officers (${officerOnly.length})`
        : `Admins (${adminOnly.length})`}
    </Box>
  ))}
</Box>

{/* ── Filter bar (officers only) ── */}
<Box sx={{ mb: 2, display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap", visibility: mainTab === "ADMINS" ? "hidden" : "visible" }}>
        <FormControl size="small" sx={{ minWidth: 210 }}>
          <InputLabel>Department</InputLabel>
          <Select label="Department" value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}>
            <MenuItem value="">All Departments</MenuItem>
            {DEPARTMENTS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
          </Select>
        </FormControl>

        {/* Status filter tabs */}
        <Box sx={{ display: "flex", border: "1px solid #CBD2E0", borderRadius: 1.5, overflow: "hidden" }}>
          {(["ALL", "ACTIVE", "INACTIVE"] as const).map((s) => (
            <Box
              key={s}
              onClick={() => setFilterStatus(s)}
              sx={{
                px: 2, py: 0.75, cursor: "pointer", fontSize: "0.78rem", fontWeight: 600,
                bgcolor: filterStatus === s ? "#0F2557" : "#fff",
                color:   filterStatus === s ? "#fff" : "#5A6072",
                transition: "all 0.15s",
              }}
            >
              {s === "ALL" ? `All (${officers.length})`
                : s === "ACTIVE"   ? `Active (${activeCount})`
                : `Inactive (${inactiveCount})`}
            </Box>
          ))}
        </Box>

        <Typography variant="caption" color="text.secondary">
          {displayed.length} shown
        </Typography>
      </Box>

      {/* ── Officers Table ── */}
      <Paper sx={{ border: "1px solid #E4E8F0", overflow: "hidden" }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#F8F9FC" }}>
                {["Code", "Name", "Email", "Department", "Role", "Status", "Actions"].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, color: "#5A6072", fontSize: "0.75rem" }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {displayed.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: "center", py: 5, color: "#9AA3B5" }}>
                    {officers.length === 0
                      ? "No officers in database — click \"Sync from Keycloak\" to import existing officers"
                      : "No officers match the current filter"}
                  </TableCell>
                </TableRow>
              ) : (
                displayed.map((o) => (
                  <TableRow
                    key={o.id}
                    hover
                    sx={{ opacity: o.status === "INACTIVE" ? 0.55 : 1 }}
                  >
                    {/* Code */}
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 700, color: "#5A6072" }}>
                        {o.officerCode}
                      </Typography>
                    </TableCell>

                    {/* Name + head badge */}
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{o.fullName}</Typography>
                        {o.headOfficer && (
                          <Tooltip title="Department Head">
                            <StarIcon sx={{ fontSize: 14, color: "#F9A825" }} />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>

                    {/* Email */}
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">{o.email}</Typography>
                    </TableCell>

                    {/* Department */}
                    <TableCell>
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 500, color: o.department === "Unassigned" ? "#E65100" : "inherit" }}
                      >
                        {o.department}
                        {o.department === "Unassigned" && (
                          <Tooltip title="Click Edit to assign a department">
                            <span style={{ marginLeft: 4, fontSize: "0.65rem" }}>⚠</span>
                          </Tooltip>
                        )}
                      </Typography>
                    </TableCell>

                    {/* Role chip */}
                    <TableCell>
                      <Chip
                        size="small"
                        label={o.keycloakRole}
                        sx={{
                          fontSize: "0.68rem", fontWeight: 700,
                          bgcolor: o.keycloakRole === "ADMIN" ? "#FFEBEE" : "#E8EDFB",
                          color:   o.keycloakRole === "ADMIN" ? "#C62828" : "#1A3A8F",
                        }}
                      />
                    </TableCell>

                    {/* Status chip */}
                    <TableCell>
                      <Chip
                        size="small"
                        label={o.status}
                        sx={{
                          fontSize: "0.68rem", fontWeight: 700,
                          bgcolor: o.status === "ACTIVE" ? "#E8F5E9" : "#F5F5F5",
                          color:   o.status === "ACTIVE" ? "#2E7D32" : "#9AA3B5",
                        }}
                      />
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        {/* Edit */}
                        <Tooltip title="Edit department / role / head status">
                          <IconButton size="small" onClick={() => openEdit(o)}>
                            <EditIcon fontSize="small" sx={{ color: "#1A3A8F" }} />
                          </IconButton>
                        </Tooltip>

                        {/* Activate / Deactivate toggle */}
                        {o.status === "ACTIVE" ? (
                          <Tooltip title="Deactivate officer">
                            <IconButton size="small" color="error" onClick={() => deactivate(o)}>
                              <PersonOffIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Re-activate officer">
                            <IconButton size="small" color="success" onClick={() => activate(o)}>
                              <PersonIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "#0F2557" }}>
          Edit Officer — {editTarget?.fullName}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <Alert severity="info" sx={{ fontSize: "0.8rem" }}>
              Email cannot be changed. To change the login email, deactivate this officer and create a new one.
            </Alert>
            <TextField
              fullWidth label="Full Name"
              value={editForm.fullName ?? ""}
              onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))}
            />
            <TextField
              fullWidth label="Phone Number"
              value={editForm.phone ?? ""}
              onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
            />
            <FormControl fullWidth>
              <InputLabel>Department</InputLabel>
              <Select
                label="Department"
                value={editForm.department ?? ""}
                onChange={(e) => setEditForm((p) => ({ ...p, department: e.target.value }))}
              >
                {DEPARTMENTS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Portal Role</InputLabel>
              <Select
                label="Portal Role"
                value={editForm.keycloakRole ?? "OFFICER"}
                onChange={(e) => setEditForm((p) => ({ ...p, keycloakRole: e.target.value }))}
              >
                <MenuItem value="OFFICER">OFFICER</MenuItem>
                <MenuItem value="ADMIN">ADMIN</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={editForm.headOfficer ?? false}
                  onChange={(e) => setEditForm((p) => ({ ...p, headOfficer: e.target.checked }))}
                  color="warning"
                />
              }
              label="Department Head Officer ⭐"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditTarget(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveEdit}>Save Changes</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
