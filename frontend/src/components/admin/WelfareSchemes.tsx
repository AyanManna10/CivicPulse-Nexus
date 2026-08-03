import { useState, useEffect } from "react";
import {
  Box, Typography, Paper, Grid, Button, TextField, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, Divider, LinearProgress
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism";
import GroupsIcon from "@mui/icons-material/Groups";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import type { WelfareScheme, WelfareStats } from "../../types";
import { api } from "../../api";

const DEPARTMENTS = [
  "Health Department", "Water Department", "Revenue Department",
  "Engineering Department", "Municipal Administration",
];

const SCHEME_TYPES = [
  "HOUSING", "HEALTH", "AGRICULTURE", "PENSION", "INFRASTRUCTURE",
  "EDUCATION", "SUBSIDY", "LABOUR", "DISABILITY", "EMPLOYMENT",
];

const TYPE_COLOR: Record<string, string> = {
  HOUSING: "#1565C0", HEALTH: "#C62828", AGRICULTURE: "#2E7D32",
  PENSION: "#6A1B9A", INFRASTRUCTURE: "#E65100", EDUCATION: "#0277BD",
  SUBSIDY: "#AD1457", LABOUR: "#4E342E", DISABILITY: "#00695C",
  EMPLOYMENT: "#F57F17",
};

interface Props {
  onError: (msg: string) => void;
  onLoadingChange: (v: boolean) => void;
}

const EMPTY_FORM = {
  name: "", department: "", schemeType: "", description: "",
  eligibilityCriteria: "", budgetAllocated: "", startDate: "", endDate: "", status: "ACTIVE",
};

export default function WelfareSchemes({ onError, onLoadingChange }: Props) {
  const [schemes, setSchemes]   = useState<WelfareScheme[]>([]);
  const [stats, setStats]       = useState<WelfareStats | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<WelfareScheme | null>(null);
  const [success, setSuccess]   = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [sRes, stRes] = await Promise.all([
        api.get("/api/welfare/schemes"),
        api.get("/api/welfare/schemes/stats"),
      ]);
      setSchemes(sRes.data);
      setStats(stRes.data);
    } catch { onError("Failed to load welfare schemes"); }
  };

  const submit = async () => {
    onError(""); onLoadingChange(true);
    try {
      const payload = { ...form, budgetAllocated: parseFloat(form.budgetAllocated) || 0 };
      if (editTarget) {
        await api.put(`/api/welfare/schemes/${editTarget.id}`, payload);
        setSuccess(`Scheme "${form.name}" updated.`);
        setEditTarget(null);
      } else {
        await api.post("/api/welfare/schemes", payload);
        setSuccess(`Scheme "${form.name}" created.`);
      }
      setForm(EMPTY_FORM); setShowForm(false); load();
    } catch { onError("Failed to save scheme"); }
    finally { onLoadingChange(false); }
  };
  const filteredSchemes = schemes.filter(s =>
  !searchTerm ||
  s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  s.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
  s.schemeType.toLowerCase().includes(searchTerm.toLowerCase())
);
  const openEdit = (s: WelfareScheme) => {
    setEditTarget(s);
    setForm({
      name: s.name, department: s.department, schemeType: s.schemeType,
      description: s.description ?? "", eligibilityCriteria: s.eligibilityCriteria ?? "",
      budgetAllocated: String(s.budgetAllocated), startDate: s.startDate ?? "",
      endDate: s.endDate ?? "", status: s.status,
    });
    setShowForm(true);
  };

  const f = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }));

  const fmt = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2.5, background: "linear-gradient(135deg, #0F2557, #1A3A8F)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <VolunteerActivismIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F2557", lineHeight: 1.1 }}>Welfare Schemes</Typography>
            <Typography variant="caption" color="text.secondary">Manage government welfare programs and budgets</Typography>
          </Box>
        </Box>
        <Button variant="contained" size="small" startIcon={<AddIcon />}
          onClick={() => { setShowForm(!showForm); setEditTarget(null); setForm(EMPTY_FORM); }}>
          {showForm && !editTarget ? "Cancel" : "New Scheme"}
        </Button>
      </Box>

      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>{success}</Alert>}

      {/* Budget Alert Banner */}
      {schemes.filter(s => s.budgetAllocated > 0 && (s.budgetDisbursed / s.budgetAllocated) >= 0.8).length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {schemes.filter(s => s.budgetAllocated > 0 && (s.budgetDisbursed / s.budgetAllocated) >= 0.8).length} scheme(s) have used 80%+ of their budget:{" "}
          {schemes.filter(s => s.budgetAllocated > 0 && (s.budgetDisbursed / s.budgetAllocated) >= 0.8).map(s => s.name).join(", ")}
        </Alert>
      )}

      {/* KPI Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          {[
            { label: "Total Schemes", value: stats.totalSchemes, sub: `${stats.activeSchemes} active`, icon: <VolunteerActivismIcon />, color: "#1A3A8F", bg: "#E8EDFB" },
            { label: "Total Beneficiaries", value: stats.totalBeneficiaries.toLocaleString("en-IN"), sub: "enrolled citizens", icon: <GroupsIcon />, color: "#2E7D32", bg: "#E8F5E9" },
            { label: "Budget Disbursed", value: fmt(stats.totalDisbursed), sub: `of ${fmt(stats.totalAllocated)}`, icon: <AccountBalanceIcon />, color: "#E65100", bg: "#FFF3E0" },
            { label: "Utilization", value: `${stats.utilizationPct}%`, sub: "budget utilized", icon: <TrendingUpIcon />, color: "#6A1B9A", bg: "#F3E5F5" },
          ].map(({ label, value, sub, icon, color, bg }) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={label}>
              <Paper sx={{ p: 2, border: "1px solid #E4E8F0", bgcolor: bg }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <Box sx={{ color, fontSize: 20 }}>{icon}</Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#5A6072", textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.68rem" }}>{label}</Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color, lineHeight: 1.1 }}>{value}</Typography>
                <Typography variant="caption" color="text.secondary">{sub}</Typography>
                {label === "Utilization" && (
                  <LinearProgress variant="determinate" value={Math.min(stats.utilizationPct, 100)}
                    sx={{ mt: 1, borderRadius: 2, bgcolor: "#E0E0E0", "& .MuiLinearProgress-bar": { bgcolor: stats.utilizationPct > 80 ? "#C62828" : "#6A1B9A" } }} />
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create / Edit Form */}
      {showForm && (
        <Paper sx={{ mb: 3, overflow: "hidden", border: "1px solid #E4E8F0" }}>
          <Box sx={{ background: "linear-gradient(135deg, #0F2557, #1A3A8F)", px: 3, py: 1.5 }}>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.72rem" }}>
              {editTarget ? `Edit — ${editTarget.name}` : "New Welfare Scheme"}
            </Typography>
          </Box>
          <Box sx={{ p: 3 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Scheme Name" value={form.name} onChange={e => f("name", e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Department</InputLabel>
                  <Select label="Department" value={form.department} onChange={e => f("department", e.target.value)}>
                    {DEPARTMENTS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Scheme Type</InputLabel>
                  <Select label="Scheme Type" value={form.schemeType} onChange={e => f("schemeType", e.target.value)}>
                    {SCHEME_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Budget Allocated (₹)" type="number"
                  value={form.budgetAllocated} onChange={e => f("budgetAllocated", e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Start Date" type="date"
                  value={form.startDate} onChange={e => f("startDate", e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="End Date" type="date"
                  value={form.endDate} onChange={e => f("endDate", e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
              <Grid size={12}>
                <TextField fullWidth label="Description" multiline rows={2}
                  value={form.description} onChange={e => f("description", e.target.value)} />
              </Grid>
              <Grid size={12}>
                <TextField fullWidth label="Eligibility Criteria" multiline rows={2}
                  value={form.eligibilityCriteria} onChange={e => f("eligibilityCriteria", e.target.value)}
                  helperText="e.g. Annual income < 3LPA, no owned property" />
              </Grid>
              {editTarget && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select label="Status" value={form.status} onChange={e => f("status", e.target.value)}>
                      <MenuItem value="ACTIVE">Active</MenuItem>
                      <MenuItem value="INACTIVE">Inactive</MenuItem>
                      <MenuItem value="COMPLETED">Completed</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>
            <Divider sx={{ my: 2.5 }} />
            <Button variant="contained" onClick={submit} startIcon={editTarget ? <EditIcon /> : <AddIcon />}>
              {editTarget ? "Save Changes" : "Create Scheme"}
            </Button>
          </Box>
        </Paper>
      )}
  {/* Search bar */}
      <Box sx={{ mb: 2, display: "flex", gap: 1.5, alignItems: "center" }}>
        <TextField
          size="small"
          placeholder="Search by name, department, or type..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          sx={{ flex: 1, maxWidth: 400 }}
          slotProps={{ input: { startAdornment: <SearchIcon sx={{ color: "#9AA3B5", mr: 1, fontSize: 18 }} /> } }}
        />
        <Button variant="outlined" size="small"
          onClick={() => setSearchTerm("")}
          disabled={!searchTerm}>
          Clear
        </Button>
      </Box>
      {/* Schemes Table */}
      <Paper sx={{ border: "1px solid #E4E8F0", overflow: "hidden" }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#F8F9FC" }}>
                {["Code", "Name", "Department", "Type", "Budget", "Disbursed", "Utilization", "Beneficiaries", "Status", "Actions"].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, color: "#5A6072", fontSize: "0.75rem", whiteSpace: "nowrap" }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {schemes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} sx={{ textAlign: "center", py: 5, color: "#9AA3B5" }}>No schemes found</TableCell>
                </TableRow>
              ) : filteredSchemes.map(s => {
                const util = s.budgetAllocated > 0 ? Math.round((s.budgetDisbursed / s.budgetAllocated) * 100) : 0;
                return (
                  <TableRow key={s.id} hover>
                    <TableCell><Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 700, color: "#5A6072" }}>{s.schemeCode}</Typography></TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{s.name}</Typography></TableCell>
                    <TableCell><Typography variant="caption">{s.department}</Typography></TableCell>
                    <TableCell>
                      <Chip size="small" label={s.schemeType}
                        sx={{ fontSize: "0.68rem", fontWeight: 700, bgcolor: `${TYPE_COLOR[s.schemeType]}18`, color: TYPE_COLOR[s.schemeType] ?? "#1A3A8F" }} />
                    </TableCell>
                    <TableCell><Typography variant="caption">{fmt(s.budgetAllocated)}</Typography></TableCell>
                    <TableCell><Typography variant="caption">{fmt(s.budgetDisbursed)}</Typography></TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <LinearProgress variant="determinate" value={Math.min(util, 100)}
                          sx={{ flex: 1, borderRadius: 2, bgcolor: "#E0E0E0", "& .MuiLinearProgress-bar": { bgcolor: util > 80 ? "#C62828" : "#2E7D32" } }} />
                        <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 32 }}>{util}%</Typography>
                      </Box>
                    </TableCell>
                    <TableCell><Typography variant="caption" sx={{ fontWeight: 600 }}>{s.beneficiaryCount}</Typography></TableCell>
                    <TableCell>
                      <Chip size="small" label={s.status}
                        sx={{ fontSize: "0.68rem", fontWeight: 700,
                          bgcolor: s.status === "ACTIVE" ? "#E8F5E9" : "#F5F5F5",
                          color: s.status === "ACTIVE" ? "#2E7D32" : "#9AA3B5" }} />
                    </TableCell>
                    <TableCell>
                      <Button size="small" startIcon={<EditIcon />} onClick={() => openEdit(s)}
                        sx={{ fontSize: "0.72rem" }}>Edit</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}