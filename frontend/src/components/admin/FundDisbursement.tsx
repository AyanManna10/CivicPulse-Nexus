import { useState, useEffect } from "react";
import {
  Box, Typography, Paper, Button, Alert, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Grid, Tooltip, IconButton
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import DownloadIcon from "@mui/icons-material/Download";
import type { FundDistribution, WelfareScheme } from "../../types";
import { api } from "../../api";

interface Props {
  onError: (msg: string) => void;
  onLoadingChange: (v: boolean) => void;
}

const PAYMENT_MODES = ["BANK_TRANSFER", "CHEQUE", "CASH", "UPI", "NEFT", "RTGS"];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  PENDING: { bg: "#FFF3E0", color: "#E65100" },
  PAID:    { bg: "#E8F5E9", color: "#2E7D32" },
  FAILED:  { bg: "#FFEBEE", color: "#C62828" },
};

export default function FundDisbursement({ onError, onLoadingChange }: Props) {
  const [distributions, setDistributions] = useState<FundDistribution[]>([]);
  const [schemes, setSchemes]             = useState<WelfareScheme[]>([]);
  const [selectedScheme, setSelectedScheme] = useState<number | "">("");
  const [success, setSuccess]             = useState("");
  const [showCreate, setShowCreate]       = useState(false);
  const [disburseTarget, setDisburseTarget] = useState<FundDistribution | null>(null);
  const [txnRef, setTxnRef]               = useState("");

  const [form, setForm] = useState({
    beneficiaryId: "", schemeId: "", amount: "",
    paymentMode: "BANK_TRANSFER", transactionRef: "", remarks: "",
  });

  useEffect(() => { loadSchemes(); loadAllDistributions(); }, []);
  useEffect(() => { if (selectedScheme) loadDistributions(selectedScheme); }, [selectedScheme]);

  const loadSchemes = async () => {
    try {
      const res = await api.get("/api/welfare/schemes");
      setSchemes(res.data);
    } catch { onError("Failed to load schemes"); }
  };

  const loadAllDistributions = async () => {
    try {
      const sRes = await api.get("/api/welfare/schemes");
      const allSchemes: WelfareScheme[] = sRes.data;
      const results = await Promise.all(
        allSchemes.map((s: WelfareScheme) =>
          api.get(`/api/welfare/distributions/scheme/${s.id}`)
            .then(r => r.data)
            .catch(() => [])
        )
      );
      setDistributions(results.flat());
    } catch { onError("Failed to load distributions"); }
  };

  const loadDistributions = async (schemeId: number) => {
    try {
      const res = await api.get(`/api/welfare/distributions/scheme/${schemeId}`);
      setDistributions(res.data);
    } catch { onError("Failed to load distributions"); }
  };

  const createDistribution = async () => {
    onError(""); onLoadingChange(true);
    try {
      await api.post("/api/welfare/distributions", {
        beneficiaryId: Number(form.beneficiaryId),
        schemeId:      Number(form.schemeId),
        amount:        parseFloat(form.amount),
        paymentMode:   form.paymentMode,
        transactionRef: form.transactionRef || null,
        remarks:       form.remarks || null,
      });
      setSuccess("Fund distribution record created.");
      setShowCreate(false);
      setForm({ beneficiaryId: "", schemeId: "", amount: "", paymentMode: "BANK_TRANSFER", transactionRef: "", remarks: "" });
      if (selectedScheme) loadDistributions(selectedScheme);
    } catch (err: any) {
      onError(err?.response?.data?.message ?? "Failed to create distribution");
    } finally { onLoadingChange(false); }
  };

    const [disburseSubmitting, setDisburseSubmitting] = useState(false);

  const disburse = async () => {
    if (!disburseTarget || disburseSubmitting) return;
    if (!txnRef.trim()) {
      onError("Transaction reference is required to mark as disbursed");
      return;
    }
    const txnPattern = /^[A-Za-z0-9\-\/]{6,30}$/;
    if (!txnPattern.test(txnRef.trim())) {
      onError("Transaction ID must be 6-30 characters (letters, numbers, hyphens only)");
      return;
    }
    onError(""); onLoadingChange(true);
    try {
      await api.put(`/api/welfare/distributions/${disburseTarget.id}/disburse`, { transactionRef: txnRef });
      setSuccess(`Payment of ₹${disburseTarget.amount.toLocaleString("en-IN")} marked as disbursed.`);
      setDisburseTarget(null); setTxnRef("");
      if (selectedScheme) loadDistributions(selectedScheme);
    } catch { onError("Disbursement failed"); }
    finally { onLoadingChange(false); }
  };

  const markFailed = async (id: number) => {
    if (!confirm("Mark this distribution as failed?")) return;
    onError(""); onLoadingChange(true);
    try {
      await api.put(`/api/welfare/distributions/${id}/fail`);
      setSuccess("Distribution marked as failed.");
      if (selectedScheme) loadDistributions(selectedScheme);
    } catch { onError("Failed to update status"); }
    finally { onLoadingChange(false); }
  };

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  const exportToCsv = () => {
    if (distributions.length === 0) return;
    const rows = distributions.map(d => ({
      Code: d.distributionCode,
      Beneficiary: d.beneficiaryName,
      Scheme: d.schemeName,
      Amount: d.amount,
      Mode: d.paymentMode,
      Status: d.paymentStatus,
      TransactionRef: d.transactionRef ?? "",
      DisbursedBy: d.disbursedBy ?? "",
      PaidAt: d.paidAt ? new Date(d.paidAt).toLocaleDateString("en-IN") : "",
    }));
    const headers = Object.keys(rows[0]).join(",");
    const csv = [headers, ...rows.map(r => Object.values(r).map(v => `"${v}"`).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "distributions.csv";
    a.click();
  };

  const pendingCount = distributions.filter(d => d.paymentStatus === "PENDING").length;
  const paidCount    = distributions.filter(d => d.paymentStatus === "PAID").length;
  const totalPaid    = distributions.filter(d => d.paymentStatus === "PAID").reduce((s, d) => s + d.amount, 0);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2.5, background: "linear-gradient(135deg, #0F2557, #1A3A8F)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <AccountBalanceWalletIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F2557", lineHeight: 1.1 }}>Fund Disbursement</Typography>
            <Typography variant="caption" color="text.secondary">Track and disburse welfare payments to beneficiaries</Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" size="small" startIcon={<DownloadIcon />}
            onClick={exportToCsv} disabled={distributions.length === 0}>
            Export CSV
          </Button>
          <Button variant="contained" size="small" startIcon={<AddIcon />}
            onClick={() => setShowCreate(true)}>
            New Distribution
          </Button>
        </Box>
      </Box>

      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>{success}</Alert>}

      {/* Scheme selector + summary */}
      <Paper sx={{ p: 2, mb: 2.5, border: "1px solid #E4E8F0" }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
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
            <Button size="small" variant="outlined" color="inherit"
              onClick={() => { setSelectedScheme(""); loadAllDistributions(); }}
              sx={{ fontSize: "0.75rem", color: "#5A6072" }}>
              Clear Filter
            </Button>
          )}

          {selectedScheme && distributions.length > 0 && (
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              {[
                { label: "Pending", count: pendingCount, color: "#E65100", bg: "#FFF3E0" },
                { label: "Paid",    count: paidCount,    color: "#2E7D32", bg: "#E8F5E9" },
                { label: "Total Paid", count: fmt(totalPaid), color: "#1A3A8F", bg: "#E8EDFB" },
              ].map(({ label, count, color, bg }) => (
                <Box key={label} sx={{ px: 1.5, py: 0.5, borderRadius: 1.5, bgcolor: bg }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color }}>
                    {count} <span style={{ fontWeight: 400, color: "#5A6072" }}>{label}</span>
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Paper>

      {/* Distributions Table */}
      <Paper sx={{ border: "1px solid #E4E8F0", overflow: "hidden" }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#F8F9FC" }}>
                {["Code", "Beneficiary", "Scheme", "Amount", "Mode", "Status", "Transaction Ref", "Disbursed By", "Paid At", "Actions"].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, color: "#5A6072", fontSize: "0.75rem", whiteSpace: "nowrap" }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {distributions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} sx={{ textAlign: "center", py: 5, color: "#9AA3B5" }}>
                    No distributions for this scheme
                  </TableCell>
                </TableRow>
              ) : distributions.map(d => {
                const ss = STATUS_STYLE[d.paymentStatus] ?? { bg: "#F5F5F5", color: "#9AA3B5" };
                return (
                  <TableRow key={d.id} hover>
                    <TableCell><Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 700, color: "#5A6072" }}>{d.distributionCode}</Typography></TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{d.beneficiaryName}</Typography></TableCell>
                    <TableCell><Typography variant="caption">{d.schemeName}</Typography></TableCell>
                    <TableCell><Typography variant="caption" sx={{ fontWeight: 700, color: "#0F2557" }}>{fmt(d.amount)}</Typography></TableCell>
                    <TableCell><Typography variant="caption">{d.paymentMode.replace("_", " ")}</Typography></TableCell>
                    <TableCell>
                      <Chip size="small" label={d.paymentStatus}
                        sx={{ fontSize: "0.68rem", fontWeight: 700, bgcolor: ss.bg, color: ss.color }} />
                    </TableCell>
                    <TableCell><Typography variant="caption" sx={{ fontFamily: "monospace" }}>{d.transactionRef ?? "—"}</Typography></TableCell>
                    <TableCell><Typography variant="caption" color="text.secondary">{d.disbursedBy}</Typography></TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {d.paidAt ? new Date(d.paidAt).toLocaleDateString("en-IN") : "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        {d.paymentStatus === "PENDING" && (
                          <>
                            <Tooltip title="Mark as Disbursed">
                              <IconButton size="small" color="success"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.currentTarget.blur();
                                  setDisburseTarget(d);
                                  setTxnRef("");
                                }}>
                                <CheckCircleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Mark as Failed">
                              <IconButton size="small" color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.currentTarget.blur();
                                  markFailed(d.id);
                                }}>
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
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

      {/* Create Distribution Dialog */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)} maxWidth="sm" fullWidth disableRestoreFocus>
        <DialogTitle sx={{ fontWeight: 700, color: "#0F2557" }}>New Fund Distribution</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <Alert severity="info" sx={{ fontSize: "0.82rem" }}>
              Enter the beneficiary ID from the Beneficiary Management tab.
            </Alert>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Beneficiary ID" type="number"
                  value={form.beneficiaryId}
                  onChange={e => setForm(p => ({ ...p, beneficiaryId: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
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
                <TextField fullWidth label="Amount (₹)" type="number"
                  value={form.amount}
                  onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Payment Mode</InputLabel>
                  <Select label="Payment Mode" value={form.paymentMode}
                    onChange={e => setForm(p => ({ ...p, paymentMode: e.target.value }))}>
                    {PAYMENT_MODES.map(m => <MenuItem key={m} value={m}>{m.replace("_", " ")}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={12}>
                <TextField fullWidth label="Transaction Reference (optional)"
                  value={form.transactionRef}
                  onChange={e => setForm(p => ({ ...p, transactionRef: e.target.value }))} />
              </Grid>
              <Grid size={12}>
                <TextField fullWidth label="Remarks (optional)" multiline rows={2}
                  value={form.remarks}
                  onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button variant="contained" onClick={createDistribution} startIcon={<AddIcon />}>
            Create Distribution
          </Button>
        </DialogActions>
      </Dialog>

      {/* Disburse Confirmation Dialog */}
      <Dialog open={!!disburseTarget} onClose={() => setDisburseTarget(null)} maxWidth="xs" fullWidth disableRestoreFocus>
        <DialogTitle sx={{ fontWeight: 700, color: "#2E7D32" }}>Confirm Disbursement</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            {disburseTarget && (
              <Alert severity="success" sx={{ fontSize: "0.82rem" }}>
                Marking <strong>{fmt(disburseTarget.amount)}</strong> to <strong>{disburseTarget.beneficiaryName}</strong> as paid.
              </Alert>
            )}
            <TextField fullWidth label="Transaction Reference *" value={txnRef}
              onChange={e => setTxnRef(e.target.value)}
              error={txnRef.trim().length > 0 && txnRef.trim().length < 6}
              helperText={
                txnRef.trim().length > 0 && txnRef.trim().length < 6
                  ? "Minimum 6 characters required"
                  : "Enter bank/UPI/NEFT transaction ID (e.g. TXN123456789)"
              }
              placeholder="e.g. TXN123456789, UPI/123456/2026" />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDisburseTarget(null)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={async () => {
              setDisburseSubmitting(true);
              await disburse();
              setDisburseSubmitting(false);
            }}
            disabled={disburseSubmitting}
            startIcon={disburseSubmitting ? null : <CheckCircleIcon />}>
            {disburseSubmitting ? "Processing…" : "Confirm Disbursement"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}