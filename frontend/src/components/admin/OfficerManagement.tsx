import { useState, useEffect } from "react";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
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
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import type { Officer } from "../../types";
import { api } from "../../api";
import DeleteIcon from "@mui/icons-material/Delete";

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

interface PendingRegistration {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  dob: string | null;
  gender: string | null;
  ward: number | null;
  aadhaar: string | null;
  address: string | null;
  status: string;
  createdAt: string;
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

  // Pending registrations
  const [pending, setPending]             = useState<PendingRegistration[]>([]);
  const [rejectTarget, setRejectTarget]   = useState<PendingRegistration | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [docsTarget, setDocsTarget]   = useState<PendingRegistration | null>(null);
  const [docsList, setDocsList]       = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  // Edit dialog
  const [editTarget, setEditTarget]       = useState<Officer | null>(null);
  const [editForm, setEditForm]           = useState<Partial<OfficerFormState>>({});

  useEffect(() => {
    const init = async () => {
      await importFromKeycloak();
      await loadOfficers();
      await loadPending();
    };
    init();
  }, []);

  const loadOfficers = async () => {
    try {
      const res = await api.get("/api/officers");
      setOfficers(res.data);
    } catch { onError("Failed to load officers"); }
  };

  const loadPending = async () => {
    try {
      const res = await api.get("/api/citizens/pending");
      setPending(res.data);
    } catch {
      // silent — officer may not have access
    }
  };

  // ── Validation ─────────────────────────────────────────────────────────────

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim())                           errs.fullName   = "Name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email      = "Valid email required";
    if (!/^\d{10}$/.test(form.phone))                   errs.phone      = "Phone must be 10 digits";
    if (!form.department || form.department === "Unassigned") errs.department = "Select a real department";
    if (form.password.length < 6)                       errs.password   = "Password must be at least 6 characters";
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
        `They can log in with email: ${form.email} and the password you set.`
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

  //Deletion

  const deleteOfficer = async (o: Officer) => {
    if (!confirm(`Permanently delete "${o.fullName}"? This cannot be undone.\n\nTheir Keycloak account will remain but DB record will be removed.`)) return;
    onLoadingChange(true);
    try {
      await api.delete(`/api/officers/${o.id}`);
      setSuccess(`"${o.fullName}" permanently deleted.`);
      loadOfficers();
    } catch { onError("Failed to delete officer"); }
    finally { onLoadingChange(false); }
  };

  // ── Import from Keycloak ───────────────────────────────────────────────────

  const importFromKeycloak = async () => {
    try {
      await api.post("/api/officers/import-from-keycloak");
    } catch {
      // silent
    }
  };

  // ── Edit officer ───────────────────────────────────────────────────────────

  const openEdit = (o: Officer) => {
    setEditTarget(o);
    setEditForm({
      fullName:     o.fullName,
      phone:        o.phone,
      department:   o.department,
      keycloakRole: o.keycloakRole,
      headOfficer:  o.headOfficer,
    });
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    onLoadingChange(true);
    try {
      await api.put(`/api/officers/${editTarget.id}`, {
        ...editForm,
        email:    editTarget.email,
        password: "unchanged",
      });
      setSuccess(`"${editTarget.fullName}" updated successfully.`);
      setEditTarget(null);
      loadOfficers();
    } catch { onError("Update failed"); }
    finally { onLoadingChange(false); }
  };

  // ── Pending registration actions ───────────────────────────────────────────

  const approvePending = async (pr: PendingRegistration) => {
    if (!confirm(`Approve registration for "${pr.fullName}"?\n\nThis will create their citizen account. Their login password will be their mobile number: ${pr.phone}`)) return;
    onLoadingChange(true);
    try {
      await api.post(`/api/citizens/pending/${pr.id}/approve`);
      setSuccess(`"${pr.fullName}" approved. Citizen account created. Login: ${pr.email} / ${pr.phone}`);
      loadPending();
    } catch (err: any) {
      onError(err?.response?.data?.error ?? "Approval failed");
    } finally { onLoadingChange(false); }
  };

  const openReject = (pr: PendingRegistration) => {
    setRejectTarget(pr);
    setRejectRemarks("");
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    onLoadingChange(true);
    try {
      await api.post(`/api/citizens/pending/${rejectTarget.id}/reject`, { remarks: rejectRemarks });
      setSuccess(`Registration for "${rejectTarget.fullName}" has been rejected.`);
      setRejectTarget(null);
      loadPending();
    } catch { onError("Rejection failed"); }
    finally { onLoadingChange(false); }
  };

    const openDocs = async (pr: PendingRegistration, e: React.MouseEvent) => {
    (e.currentTarget as HTMLElement).blur();
    setDocsTarget(pr);
    setDocsList([]);
    setDocsLoading(true);
    try {
      const res = await api.get(`/api/citizens/pending/${pr.id}/documents`);
      setDocsList(res.data);
    } catch { setDocsList([]); }
    finally { setDocsLoading(false); }
  };

  // ── Display filtering ──────────────────────────────────────────────────────

  const officerOnly   = officers.filter((o) => o.keycloakRole !== "ADMIN");
  const adminOnly     = officers.filter((o) => o.keycloakRole === "ADMIN");
  const activeCount   = officerOnly.filter((o) => o.status === "ACTIVE").length;
  const inactiveCount = officerOnly.filter((o) => o.status === "INACTIVE").length;
  const deptCount     = new Set(officerOnly.map((o) => o.department)).size;
  const pendingCount  = pending.length;

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
          {mainTab === "OFFICERS" && (
            <Button
              variant="contained"
              size="small"
              startIcon={showForm ? undefined : <AddIcon />}
              onClick={() => { setShowForm(!showForm); setSuccess(""); setFieldErrors({}); setForm(EMPTY_FORM); }}
            >
              {showForm ? "Cancel" : "Add Officer"}
            </Button>
          )}
        </Box>
      </Box>

      {/* ── Success / error banner ── */}
      {success && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 1.5 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {/* ── Add Officer Form ── */}
      {showForm && mainTab === "OFFICERS" && (
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
                    <Switch checked={form.headOfficer}
                      onChange={(e) => f("headOfficer", e.target.checked)} color="warning" />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Department Head Officer ⭐</Typography>
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
              A Keycloak account will be created automatically. The officer can log in using their <strong>email</strong> and the <strong>password</strong> you set above.
            </Alert>
            <Button variant="contained" size="large" onClick={submit} startIcon={<AddIcon />}>
              Create Officer Account
            </Button>
          </Box>
        </Paper>
      )}

      {/* ── Main tabs: Officers / Admins / Pending ── */}
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
              position: "relative",
            }}
          >
             {t === "OFFICERS" ? `Officers (${officerOnly.length})` : `Admins (${adminOnly.length})`}
          </Box>
        ))}
      </Box>

      {/* ── Filter bar (officers only) ── */}
      {mainTab === "OFFICERS" && (
        <Box sx={{ mb: 2, display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
          <FormControl size="small" sx={{ minWidth: 210 }}>
            <InputLabel>Department</InputLabel>
            <Select label="Department" value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}>
              <MenuItem value="">All Departments</MenuItem>
              {DEPARTMENTS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </Select>
          </FormControl>
          <Box sx={{ display: "flex", border: "1px solid #CBD2E0", borderRadius: 1.5, overflow: "hidden" }}>
            {(["ALL", "ACTIVE", "INACTIVE"] as const).map((s) => (
              <Box key={s} onClick={() => setFilterStatus(s)}
                sx={{
                  px: 2, py: 0.75, cursor: "pointer", fontSize: "0.78rem", fontWeight: 600,
                  bgcolor: filterStatus === s ? "#0F2557" : "#fff",
                  color:   filterStatus === s ? "#fff" : "#5A6072",
                  transition: "all 0.15s",
                }}
              >
                {s === "ALL" ? `All (${officerOnly.length})`
                  : s === "ACTIVE" ? `Active (${activeCount})`
                  : `Inactive (${inactiveCount})`}
              </Box>
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary">{displayed.length} shown</Typography>
        </Box>
      )}

      
      {/* ── Officers / Admins Table ── */}
      
        <Paper sx={{ border: "1px solid #E4E8F0", overflow: "hidden" }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#F8F9FC" }}>
                  {["Code", "Name", "Email", "Department", "Role", "Status", "Actions"].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, color: "#5A6072", fontSize: "0.75rem" }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {displayed.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: "center", py: 5, color: "#9AA3B5" }}>
                      {officers.length === 0
                        ? "No officers in database"
                        : "No officers match the current filter"}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayed.map((o) => (
                    <TableRow key={o.id} hover sx={{ opacity: o.status === "INACTIVE" ? 0.55 : 1 }}>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 700, color: "#5A6072" }}>
                          {o.officerCode}
                        </Typography>
                      </TableCell>
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
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">{o.email}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption"
                          sx={{ fontWeight: 500, color: o.department === "Unassigned" ? "#E65100" : "inherit" }}>
                          {o.department}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={o.keycloakRole}
                          sx={{
                            fontSize: "0.68rem", fontWeight: 700,
                            bgcolor: o.keycloakRole === "ADMIN" ? "#FFEBEE" : "#E8EDFB",
                            color:   o.keycloakRole === "ADMIN" ? "#C62828" : "#1A3A8F",
                          }} />
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={o.status}
                          sx={{
                            fontSize: "0.68rem", fontWeight: 700,
                            bgcolor: o.status === "ACTIVE" ? "#E8F5E9" : "#F5F5F5",
                            color:   o.status === "ACTIVE" ? "#2E7D32" : "#9AA3B5",
                          }} />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => openEdit(o)}>
                              <EditIcon fontSize="small" sx={{ color: "#1A3A8F" }} />
                            </IconButton>
                          </Tooltip>
                          {o.status === "ACTIVE" ? (
                            <Tooltip title="Deactivate">
                              <IconButton size="small" color="error" onClick={() => deactivate(o)}>
                                <PersonOffIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Tooltip title="Re-activate">
                              <IconButton size="small" color="success" onClick={() => activate(o)}>
                                <PersonIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Permanently Delete">
                            <IconButton size="small" color="error"
                              onClick={() => deleteOfficer(o)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
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
            <TextField fullWidth label="Full Name"
              value={editForm.fullName ?? ""}
              onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))} />
            <TextField fullWidth label="Phone Number"
              value={editForm.phone ?? ""}
              onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} />
            <FormControl fullWidth>
              <InputLabel>Department</InputLabel>
              <Select label="Department" value={editForm.department ?? ""}
                onChange={(e) => setEditForm((p) => ({ ...p, department: e.target.value }))}>
                {DEPARTMENTS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Portal Role</InputLabel>
              <Select label="Portal Role" value={editForm.keycloakRole ?? "OFFICER"}
                onChange={(e) => setEditForm((p) => ({ ...p, keycloakRole: e.target.value }))}>
                <MenuItem value="OFFICER">OFFICER</MenuItem>
                <MenuItem value="ADMIN">ADMIN</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch checked={editForm.headOfficer ?? false} color="warning"
                  onChange={(e) => setEditForm((p) => ({ ...p, headOfficer: e.target.checked }))} />
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

      {/* ── Reject Dialog ── */}
      <Dialog open={!!rejectTarget} onClose={() => setRejectTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "#C62828" }}>
          Reject Registration — {rejectTarget?.fullName}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <Alert severity="warning" sx={{ fontSize: "0.82rem" }}>
              The applicant will not be notified automatically. Make sure the reason is documented.
            </Alert>
            <TextField
              fullWidth
              label="Reason for Rejection"
              multiline
              rows={3}
              value={rejectRemarks}
              onChange={(e) => setRejectRemarks(e.target.value)}
              placeholder="e.g. Aadhaar number mismatch, incomplete address, duplicate application..."
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRejectTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmReject}>
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Documents Dialog ── */}
      <Dialog open={!!docsTarget} onClose={() => setDocsTarget(null)} maxWidth="sm" fullWidth disableRestoreFocus>
        <DialogTitle sx={{ fontWeight: 700, color: "#0F2557" }}>
          Documents — {docsTarget?.fullName}
        </DialogTitle>
        <DialogContent>
          {docsLoading ? (
            <Box sx={{ py: 3, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">Loading documents...</Typography>
            </Box>
          ) : docsList.length === 0 ? (
            <Alert severity="warning" sx={{ mt: 1 }}>No documents uploaded for this application.</Alert>
          ) : (
            <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
              {docsList.map((doc: any) => (
                <Box key={doc.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, bgcolor: "#F8F9FC", borderRadius: 1.5, border: "1px solid #E4E8F0" }}>
                  <InsertDriveFileIcon sx={{ color: "#1A3A8F", fontSize: 22 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{doc.docType}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                      {doc.originalName}
                    </Typography>
                  </Box>
                  <Button size="small" variant="outlined"
                    onClick={() => window.open(`http://localhost:9000/api/citizens/documents/${doc.id}/view`, "_blank")}
                    sx={{ fontSize: "0.72rem", whiteSpace: "nowrap" }}>
                    View
                  </Button>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDocsTarget(null)}>Close</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}