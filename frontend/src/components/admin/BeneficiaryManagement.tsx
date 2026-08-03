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
import PaymentsIcon from "@mui/icons-material/Payments";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import DownloadIcon from "@mui/icons-material/Download";
import type { Beneficiary, WelfareScheme } from "../../types";
import { api } from "../../api";

interface Props {
  onError: (msg: string) => void;
  onLoadingChange: (v: boolean) => void;
  onGoToDisburse?: (beneficiaryId: number, schemeId: number) => void;
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

// ── NEW: payment status chip colours ─────────────────────────────────────────
const PAYMENT_COLOR: Record<string, { bg: string; color: string; label: string }> = {
  PENDING: { bg: "#FFF3E0", color: "#E65100", label: "Pending" },
  PAID:    { bg: "#E8F5E9", color: "#2E7D32", label: "Paid" },
  FAILED:  { bg: "#FFEBEE", color: "#C62828", label: "Failed" },
};

export default function BeneficiaryManagement({ onError, onLoadingChange, onGoToDisburse }: Props) {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [schemes, setSchemes]             = useState<WelfareScheme[]>([]);
  const [selectedScheme, setSelectedScheme] = useState<number | "">("");
  const [success, setSuccess]             = useState("");
  const [showEnroll, setShowEnroll]       = useState(false);

  const [showDisburse, setShowDisburse]   = useState(false);
  const [disburseTarget, setDisburseTarget] = useState<Beneficiary | null>(null);
  const [disburseForm, setDisburseForm]   = useState({
    amount: "", paymentMode: "BANK_TRANSFER", transactionRef: "",
  });
  const [disburseLoading, setDisburseLoading] = useState(false);
  const [docReviewBeneficiary, setDocReviewBeneficiary] = useState<Beneficiary | null>(null);
  const [docReviewDocs, setDocReviewDocs] = useState<any[]>([]);
  const [docReviewLoading, setDocReviewLoading] = useState(false);
  const [docsMissingDialogOpen, setDocsMissingDialogOpen] = useState(false);
  const [docsMissingTarget, setDocsMissingTarget] = useState<Beneficiary | null>(null);
  const [requestedDocType, setRequestedDocType] = useState("");

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

  const reload = () =>
    selectedScheme ? loadBeneficiaries(selectedScheme as number) : loadAllBeneficiaries();

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
      reload();
    } catch (err: any) {
      onError(err?.response?.data?.message ?? "Enrollment failed — citizen may already be enrolled");
    } finally { onLoadingChange(false); }
  };

  const verify = async (id: number) => {
    onError(""); onLoadingChange(true);
    try {
      await api.put(`/api/welfare/beneficiaries/${id}/verify`);
      setSuccess("Beneficiary verified. You can now create a fund distribution for them.");
      reload();
    } catch (err: any) {
      onError(err?.response?.data?.message ?? "Verification failed");
    } finally { onLoadingChange(false); }
  };

  const markDocsComplete = async (id: number) => {
    onError(""); onLoadingChange(true);
    try {
      await api.put(`/api/welfare/beneficiaries/${id}/docs/complete`);
      setSuccess("Documents marked as complete. You can now verify eligibility.");
      reload();
    } catch { onError("Failed to mark documents complete"); }
    finally { onLoadingChange(false); }
  };

  const markDocsMissing = async (id: number, reason: string) => {
    onError(""); onLoadingChange(true);
    try {
      await api.put(`/api/welfare/beneficiaries/${id}/docs/missing`, { requestedDocType: reason });
      setSuccess("Document request sent — citizen will be notified to re-upload.");
      reload();
    } catch { onError("Failed to request missing document"); }
    finally { onLoadingChange(false); }
  };
  const openDisburseDialog = (b: Beneficiary) => {
    setDisburseTarget(b);
    setDisburseForm({ amount: "", paymentMode: "BANK_TRANSFER", transactionRef: "" });
    setShowDisburse(true);
  };

const openDocReview = async (b: Beneficiary) => {
    setDocReviewBeneficiary(b);
    setDocReviewDocs([]);
    setDocReviewLoading(true);
    try {
      // Try by citizenId first, fall back to scheme-level search
      const appsRes = await api.get(`/api/welfare/applications/citizen/${b.citizenId}`)
        .catch(() => ({ data: [] }));
      let app = (appsRes.data as any[]).find((a: any) => a.schemeId === b.schemeId);

      // Fallback: search all applications for this scheme and match by name
      if (!app) {
        const schemeAppsRes = await api.get(`/api/welfare/applications/scheme/${b.schemeId}`)
          .catch(() => ({ data: [] }));
        app = (schemeAppsRes.data as any[]).find(
          (a: any) => a.citizenName?.toLowerCase() === b.citizenName?.toLowerCase()
        );
      }

      if (app) {
        const docsRes = await api.get(`/api/welfare/applications/${app.id}/documents`);
        setDocReviewDocs(docsRes.data);
      }
    } catch { setDocReviewDocs([]); }
    finally { setDocReviewLoading(false); }
  };

  const submitDistribution = async () => {
    if (!disburseTarget) return;
    if (!disburseForm.amount || isNaN(Number(disburseForm.amount))) {
      onError("Please enter a valid amount"); return;
    }
    setDisburseLoading(true); onError("");
    try {
      await api.post("/api/welfare/distributions", {
        beneficiaryId: disburseTarget.id,
        schemeId: disburseTarget.schemeId,
        amount: Number(disburseForm.amount),
        paymentMode: disburseForm.paymentMode,
        transactionRef: disburseForm.transactionRef || null,
      });
      setSuccess(`Distribution created for ${disburseTarget.citizenName}. Go to Fund Disbursement to mark it as paid.`);
      setShowDisburse(false);
      setDisburseTarget(null);
      reload(); // refresh so payment status chip appears immediately
      if (onGoToDisburse) onGoToDisburse(disburseTarget.id, disburseTarget.schemeId);
    } catch (err: any) {
      onError(err?.response?.data?.message ?? "Failed to create distribution");
    } finally { setDisburseLoading(false); onLoadingChange(false); }
  };

  // ── Payment status chip helper ────────────────────────────────────────────
  const PaymentChip = ({ b }: { b: Beneficiary }) => {
    if (!b.latestPaymentStatus) {
      return b.eligibilityStatus === "VERIFIED"
        ? <Chip size="small" label="No Distribution"
            sx={{ fontSize: "0.68rem", fontWeight: 700, bgcolor: "#F5F5F5", color: "#9AA3B5" }} />
        : null; // don't show payment column at all for unverified beneficiaries
    }
    const pc = PAYMENT_COLOR[b.latestPaymentStatus] ?? { bg: "#F5F5F5", color: "#9AA3B5", label: b.latestPaymentStatus };
    return (
      <Stack spacing={0.3}>
        <Chip size="small" label={pc.label}
          sx={{ fontSize: "0.68rem", fontWeight: 700, bgcolor: pc.bg, color: pc.color }} />
        {b.latestPaymentAmount != null && (
          <Typography variant="caption" sx={{ color: "#5A6072", fontSize: "0.65rem", textAlign: "center" }}>
            ₹{Number(b.latestPaymentAmount).toLocaleString("en-IN")}
          </Typography>
        )}
      </Stack>
    );
  };

  const exportToCsv = () => {
    if (beneficiaries.length === 0) return;
    const rows = beneficiaries.map(b => ({
      Code: b.beneficiaryCode,
      CitizenName: b.citizenName,
      CitizenId: b.citizenId,
      Enrolled: new Date(b.enrollmentDate).toLocaleDateString("en-IN"),
      Eligibility: b.eligibilityStatus,
      Docs: b.docsStatus,
      Payment: b.latestPaymentStatus ?? "",
      Amount: b.latestPaymentAmount ?? "",
      Status: b.status,
      VerifiedBy: b.verifiedBy ?? "",
    }));
    const headers = Object.keys(rows[0]).join(",");
    const csv = [headers, ...rows.map(r => Object.values(r).map(v => `"${v}"`).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "beneficiaries.csv";
    a.click();
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
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" size="small" startIcon={<DownloadIcon />}
            onClick={exportToCsv} disabled={beneficiaries.length === 0}>
            Export CSV
          </Button>
          <Button variant="contained" size="small" startIcon={<AddIcon />}
            onClick={() => setShowEnroll(true)}>
            Enroll Beneficiary
          </Button>
        </Box>
      </Box>

      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>{success}</Alert>}

      {/* Scheme selector */}
      <Paper sx={{ p: 2, mb: 2.5, border: "1px solid #E4E8F0" }}>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
          <FormControl size="small" sx={{ minWidth: 320 }}>
            <InputLabel>Filter by Scheme</InputLabel>
            <Select label="Filter by Scheme" value={selectedScheme}
              onChange={e => setSelectedScheme(e.target.value as number)}>
              {schemes.map(s => (
                <MenuItem key={s.id} value={s.id}>{s.name} — {s.department}</MenuItem>
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
                {["Code", "Citizen", "Scheme", "ID", "Enrolled", "Eligibility", "Docs", "Payment", "Status", "Verified By", "Actions"].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, color: "#5A6072", fontSize: "0.75rem", whiteSpace: "nowrap" }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {beneficiaries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} sx={{ textAlign: "center", py: 5, color: "#9AA3B5" }}>
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
                    <TableCell><Typography variant="caption" sx={{ fontWeight: 600, color: "#1A3A8F" }}>{b.schemeName}</Typography></TableCell>
                    <TableCell><Typography variant="caption">{new Date(b.enrollmentDate).toLocaleDateString("en-IN")}</Typography></TableCell>
                    <TableCell>
                      <Chip size="small" label={b.eligibilityStatus}
                        sx={{ fontSize: "0.68rem", fontWeight: 700, bgcolor: ec.bg, color: ec.color }} />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={b.docsStatus}
                        sx={{ fontSize: "0.68rem", fontWeight: 700, bgcolor: dc.bg, color: dc.color }} />
                    </TableCell>

                    {/* ── NEW: Payment Status column ── */}
                    <TableCell>
                      <PaymentChip b={b} />
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
                        {b.status === "ACTIVE" && b.docsStatus !== "COMPLETE" && (
                          <Tooltip title="Review Documents & Mark Complete">
                            <IconButton size="small" color="success" onClick={() => openDocReview(b)}>
                              <TaskAltIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {b.status === "ACTIVE" && b.docsStatus === "PENDING" && (
                          <Tooltip title="Request Missing Document">
                            <IconButton size="small" color="warning" onClick={() => {
                              setDocsMissingTarget(b);
                              setRequestedDocType("");
                              setDocsMissingDialogOpen(true);
                            }}>
                              <ReportProblemIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {b.status === "ACTIVE" && b.docsStatus === "COMPLETE" && b.eligibilityStatus === "PENDING" && (
                          <Tooltip title="Verify Eligibility (docs reviewed ✓)">
                            <IconButton size="small" color="success" onClick={() => verify(b.id)}>
                              <VerifiedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {b.status === "ACTIVE" && b.eligibilityStatus === "VERIFIED" && (
                          <Tooltip title="Create Fund Distribution">
                            <IconButton size="small" color="primary" onClick={() => openDisburseDialog(b)}>
                              <PaymentsIcon fontSize="small" />
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

      {/* Doc Review Dialog */}
      <Dialog open={!!docReviewBeneficiary} onClose={() => setDocReviewBeneficiary(null)} maxWidth="sm" fullWidth disableRestoreFocus>
        <DialogTitle sx={{ fontWeight: 700, color: "#0F2557" }}>
          Review Documents — {docReviewBeneficiary?.citizenName}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
            {docReviewLoading ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                Loading documents...
              </Typography>
            ) : docReviewDocs.length === 0 ? (
              <Alert severity="warning">No documents found for this application.</Alert>
            ) : (
              <>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#5A6072" }}>
                  {docReviewDocs.length} document(s) submitted
                </Typography>
                {Object.entries(
                  docReviewDocs.reduce((acc: Record<string, any[]>, doc) => {
                    const key = doc.docType || "Other";
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(doc);
                    return acc;
                  }, {})
                ).map(([docType, docs]) => (
                  <Box key={docType}>
                    <Typography variant="caption" sx={{
                      fontWeight: 700, color: "#1A3A8F", textTransform: "uppercase",
                      letterSpacing: 0.5, fontSize: "0.68rem", display: "block", mb: 0.5
                    }}>
                      {docType}
                    </Typography>
                    {docs.map((doc: any) => (
                      <Box key={doc.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, bgcolor: "#F8F9FC", borderRadius: 1.5, border: "1px solid #E4E8F0", mb: 0.75 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {doc.originalName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#9AA3B5", fontSize: "0.65rem" }}>
                            {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString("en-IN") : "—"}
                          </Typography>
                        </Box>
                        <Button size="small" variant="outlined" sx={{ fontSize: "0.72rem", whiteSpace: "nowrap" }}
                          onClick={async () => {
                            try {
                              const res = await api.get(`/api/welfare/documents/${doc.id}/view`, { responseType: "blob" });
                              const contentType = String(res.headers["content-type"] || "application/octet-stream");
                              const blob = new Blob([res.data], { type: contentType });
                              const url = window.URL.createObjectURL(blob);
                              window.open(url, "_blank");
                              setTimeout(() => window.URL.revokeObjectURL(url), 10000);
                            } catch { console.error("Failed to open document"); }
                          }}>
                          View
                        </Button>
                      </Box>
                    ))}
                  </Box>
                ))}
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDocReviewBeneficiary(null)}>Cancel</Button>
          <Button variant="contained" color="success" startIcon={<TaskAltIcon />}
            onClick={async () => {
              if (docReviewBeneficiary) {
                await markDocsComplete(docReviewBeneficiary.id);
                setDocReviewBeneficiary(null);
              }
            }}>
            Mark Documents Complete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Request Missing Document Dialog */}
      <Dialog open={docsMissingDialogOpen} onClose={() => setDocsMissingDialogOpen(false)} maxWidth="xs" fullWidth disableRestoreFocus>
        <DialogTitle sx={{ fontWeight: 700, color: "#E65100" }}>
          Request Missing Document
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <Alert severity="warning" sx={{ fontSize: "0.82rem" }}>
              Specify which document <strong>{docsMissingTarget?.citizenName}</strong> needs to upload. They will see this request in their My Benefits tab.
            </Alert>
            <TextField
              fullWidth label="Document Required *" size="small"
              value={requestedDocType}
              onChange={e => setRequestedDocType(e.target.value)}
              placeholder="e.g. Aadhaar Card, Income Certificate, Recent Photograph"
              helperText="The citizen will see exactly this text as the document they need to upload"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDocsMissingDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="warning"
            disabled={!requestedDocType.trim()}
            onClick={async () => {
              if (docsMissingTarget) {
                await markDocsMissing(docsMissingTarget.id, requestedDocType.trim());
                setDocsMissingDialogOpen(false);
                setDocsMissingTarget(null);
              }
            }}>
            Send Request
          </Button>
        </DialogActions>
      </Dialog>

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

      {/* Quick Distribution Dialog */}
      <Dialog open={showDisburse} onClose={() => setShowDisburse(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "#0F2557" }}>Create Fund Distribution</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            {disburseTarget && (
              <Alert severity="info" sx={{ fontSize: "0.82rem" }}>
                Creating distribution for <strong>{disburseTarget.citizenName}</strong>
                {" "}(Code: {disburseTarget.beneficiaryCode}). After saving, go to <strong>Fund Disbursement</strong> to mark it as paid.
              </Alert>
            )}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Amount (₹)" type="number"
                  value={disburseForm.amount}
                  onChange={e => setDisburseForm(p => ({ ...p, amount: e.target.value }))}
                  slotProps={{ htmlInput: { min: 1 } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Payment Mode</InputLabel>
                  <Select label="Payment Mode" value={disburseForm.paymentMode}
                    onChange={e => setDisburseForm(p => ({ ...p, paymentMode: e.target.value }))}>
                    {["BANK_TRANSFER", "CHEQUE", "CASH", "UPI", "NEFT", "RTGS"].map(m => (
                      <MenuItem key={m} value={m}>{m.replace("_", " ")}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={12}>
                <TextField fullWidth label="Transaction Reference (optional)"
                  value={disburseForm.transactionRef}
                  onChange={e => setDisburseForm(p => ({ ...p, transactionRef: e.target.value }))}
                  helperText="Leave blank — can be added when marking as paid"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowDisburse(false)}>Cancel</Button>
          <Button variant="contained" startIcon={<PaymentsIcon />}
            onClick={submitDistribution} disabled={disburseLoading}>
            {disburseLoading ? "Creating…" : "Create Distribution"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}