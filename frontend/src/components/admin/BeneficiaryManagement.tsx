import { useState, useEffect } from "react";
import {
  Box, Typography, Paper, Button, Alert, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Grid, Tooltip, IconButton
} from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import AddIcon from "@mui/icons-material/Add";
import VerifiedIcon from "@mui/icons-material/Verified";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import type { Beneficiary, WelfareScheme } from "../../types";
import { api } from "../../api";

interface Props {
  onError: (msg: string) => void;
  onLoadingChange: (v: boolean) => void;
}

const ELIGIBILITY_COLOR: Record<string, { bg: string; color: string }> = {
  PENDING:  { bg: "#FFF3E0", color: "#E65100" },
  VERIFIED: { bg: "#E8F5E9", color: "#2E7D32" },
  REJECTED: { bg: "#FFEBEE", color: "#C62828" },
};

const DOCS_COLOR: Record<string, { bg: string; color: string }> = {
  PENDING:  { bg: "#FFF3E0", color: "#E65100" },
  COMPLETE: { bg: "#E8F5E9", color: "#2E7D32" },
  MISSING:  { bg: "#FFEBEE", color: "#C62828" },
};

export default function BeneficiaryManagement({ onError, onLoadingChange }: Props) {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [schemes, setSchemes]             = useState<WelfareScheme[]>([]);
  const [selectedScheme, setSelectedScheme] = useState<number | "">("");
  const [success, setSuccess]             = useState("");
  const [showEnroll, setShowEnroll]       = useState(false);
  const [form, setForm] = useState({
    citizenId: "", citizenName: "", schemeId: "",
    eligibilityStatus: "PENDING", docsStatus: "PENDING", remarks: "",
  });

useEffect(() => { loadSchemes(); loadAllBeneficiaries(); }, []);
  useEffect(() => { if (selectedScheme) loadBeneficiaries(selectedScheme); }, [selectedScheme]);

  const loadSchemes = async () => {
    try {
      const res = await api.get("/api/welfare/schemes");
      setSchemes(res.data);
    } catch { onError("Failed to load schemes"); }
  };

  const loadAllBeneficiaries = async () => {
    try {
      // Load beneficiaries for all schemes and merge
      const sRes = await api.get("/api/welfare/schemes");
      const allSchemes: WelfareScheme[] = sRes.data;
      const results = await Promise.all(
        allSchemes.map((s: WelfareScheme) =>
          api.get(`/api/welfare/beneficiaries/scheme/${s.id}`)
            .then(r => r.data)
            .catch(() => [])
        )
      );
      setBeneficiaries(results.flat());
    } catch { onError("Failed to load beneficiaries"); }
  };

  const loadBeneficiaries = async (schemeId: number) => {
    try {
      const res = await api.get(`/api/welfare/beneficiaries/scheme/${schemeId}`);
      setBeneficiaries(res.data);
    } catch { onError("Failed to load beneficiaries"); }
  };

  const enroll = async () => {
    onError(""); onLoadingChange(true);
    try {
      await api.post("/api/welfare/beneficiaries", {
        citizenId: Number(form.citizenId),
        citizenName: form.citizenName,
        schemeId: Number(form.schemeId),
        eligibilityStatus: form.eligibilityStatus,
        docsStatus: form.docsStatus,
        remarks: form.remarks,
      });
      setSuccess(`"${form.citizenName}" enrolled successfully.`);
      setShowEnroll(false);
      setForm({ citizenId: "", citizenName: "", schemeId: "", eligibilityStatus: "PENDING", docsStatus: "PENDING", remarks: "" });
      if (selectedScheme) loadBeneficiaries(selectedScheme);
    } catch (err: any) {
      onError(err?.response?.data?.message ?? "Enrollment failed — citizen may already be enrolled");
    } finally { onLoadingChange(false); }
  };

  const verify = async (id: number) => {
    onError(""); onLoadingChange(true);
    try {
      await api.put(`/api/welfare/beneficiaries/${id}/verify`);
      setSuccess("Beneficiary verified successfully.");
      if (selectedScheme) loadBeneficiaries(selectedScheme);
    } catch { onError("Verification failed"); }
    finally { onLoadingChange(false); }
  };

  const deactivate = async (id: number, name: string) => {
    if (!confirm(`Deactivate beneficiary "${name}"?`)) return;
    onError(""); onLoadingChange(true);
    try {
      await api.put(`/api/welfare/beneficiaries/${id}/deactivate`);
      setSuccess(`"${name}" deactivated.`);
      if (selectedScheme) loadBeneficiaries(selectedScheme);
    } catch { onError("Deactivation failed"); }
    finally { onLoadingChange(false); }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2.5, background: "linear-gradient(135deg, #0F2557, #1A3A8F)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <GroupsIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F2557", lineHeight: 1.1 }}>Beneficiary Management</Typography>
            <Typography variant="caption" color="text.secondary">Enroll and verify citizens for welfare schemes</Typography>
          </Box>
        </Box>
        <Button variant="contained" size="small" startIcon={<AddIcon />}
          onClick={() => setShowEnroll(true)}>
          Enroll Beneficiary
        </Button>
      </Box>

      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>{success}</Alert>}

      {/* Scheme selector */}
      <Paper sx={{ p: 2, mb: 2.5, border: "1px solid #E4E8F0" }}>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
          <FormControl size="small" sx={{ minWidth: 320 }}>
            <InputLabel>Filter by Scheme</InputLabel>
            <Select label="Filter by Scheme" value={selectedScheme}
              onChange={e => { setSelectedScheme(e.target.value as number); }}>
              {schemes.map(s => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name} — {s.department}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {selectedScheme && (
            <>
              <Typography variant="caption" color="text.secondary">
                {beneficiaries.length} beneficiaries
              </Typography>
              <Button size="small" variant="outlined" color="inherit"
                onClick={() => { setSelectedScheme(""); loadAllBeneficiaries(); }}
                sx={{ fontSize: "0.75rem", color: "#5A6072" }}>
                Clear Filter
              </Button>
            </>
          )}
        </Box>
      </Paper>

      {/* Beneficiaries Table */}
      <Paper sx={{ border: "1px solid #E4E8F0", overflow: "hidden" }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#F8F9FC" }}>
                {["Code", "Citizen", "Citizen ID", "Enrolled", "Eligibility", "Docs", "Status", "Verified By", "Actions"].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, color: "#5A6072", fontSize: "0.75rem", whiteSpace: "nowrap" }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {beneficiaries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ textAlign: "center", py: 5, color: "#9AA3B5" }}>
                    No beneficiaries enrolled for this scheme
                  </TableCell>
                </TableRow>
              ) : beneficiaries.map(b => {
                const ec = ELIGIBILITY_COLOR[b.eligibilityStatus] ?? { bg: "#F5F5F5", color: "#9AA3B5" };
                const dc = DOCS_COLOR[b.docsStatus] ?? { bg: "#F5F5F5", color: "#9AA3B5" };
                return (
                  <TableRow key={b.id} hover sx={{ opacity: b.status === "INACTIVE" ? 0.55 : 1 }}>
                    <TableCell><Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 700, color: "#5A6072" }}>{b.beneficiaryCode}</Typography></TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{b.citizenName}</Typography></TableCell>
                    <TableCell><Typography variant="caption" color="text.secondary">{b.citizenId}</Typography></TableCell>
                    <TableCell><Typography variant="caption">{new Date(b.enrollmentDate).toLocaleDateString("en-IN")}</Typography></TableCell>
                    <TableCell>
                      <Chip size="small" label={b.eligibilityStatus}
                        sx={{ fontSize: "0.68rem", fontWeight: 700, bgcolor: ec.bg, color: ec.color }} />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={b.docsStatus}
                        sx={{ fontSize: "0.68rem", fontWeight: 700, bgcolor: dc.bg, color: dc.color }} />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={b.status}
                        sx={{ fontSize: "0.68rem", fontWeight: 700,
                          bgcolor: b.status === "ACTIVE" ? "#E8F5E9" : "#F5F5F5",
                          color: b.status === "ACTIVE" ? "#2E7D32" : "#9AA3B5" }} />
                    </TableCell>
                    <TableCell><Typography variant="caption" color="text.secondary">{b.verifiedBy ?? "—"}</Typography></TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        {b.eligibilityStatus === "PENDING" && (
                          <Tooltip title="Verify Eligibility">
                            <IconButton size="small" color="success" onClick={() => verify(b.id)}>
                              <VerifiedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {b.status === "ACTIVE" && (
                          <Tooltip title="Deactivate">
                            <IconButton size="small" color="error" onClick={() => deactivate(b.id, b.citizenName)}>
                              <PersonOffIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Enroll Dialog */}
      <Dialog open={showEnroll} onClose={() => setShowEnroll(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "#0F2557" }}>Enroll New Beneficiary</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <Alert severity="info" sx={{ fontSize: "0.82rem" }}>
              Enter the citizen's portal ID and name exactly as registered.
            </Alert>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Citizen ID" type="number"
                  value={form.citizenId} onChange={e => setForm(p => ({ ...p, citizenId: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Citizen Name"
                  value={form.citizenName} onChange={e => setForm(p => ({ ...p, citizenName: e.target.value }))} />
              </Grid>
              <Grid size={12}>
                <FormControl fullWidth>
                  <InputLabel>Scheme</InputLabel>
                  <Select label="Scheme" value={form.schemeId}
                    onChange={e => setForm(p => ({ ...p, schemeId: String(e.target.value) }))}>
                    {schemes.filter(s => s.status === "ACTIVE").map(s => (
                      <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Eligibility Status</InputLabel>
                  <Select label="Eligibility Status" value={form.eligibilityStatus}
                    onChange={e => setForm(p => ({ ...p, eligibilityStatus: e.target.value }))}>
                    <MenuItem value="PENDING">Pending</MenuItem>
                    <MenuItem value="VERIFIED">Verified</MenuItem>
                    <MenuItem value="REJECTED">Rejected</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Docs Status</InputLabel>
                  <Select label="Docs Status" value={form.docsStatus}
                    onChange={e => setForm(p => ({ ...p, docsStatus: e.target.value }))}>
                    <MenuItem value="PENDING">Pending</MenuItem>
                    <MenuItem value="COMPLETE">Complete</MenuItem>
                    <MenuItem value="MISSING">Missing</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={12}>
                <TextField fullWidth label="Remarks" multiline rows={2}
                  value={form.remarks} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowEnroll(false)}>Cancel</Button>
          <Button variant="contained" onClick={enroll} startIcon={<AddIcon />}>Enroll</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}