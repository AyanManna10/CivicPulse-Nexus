import { useState, useEffect } from "react";
import {
  Box, Typography, Paper, Button, Alert, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Grid, Tooltip, IconButton
} from "@mui/material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import DescriptionIcon from "@mui/icons-material/Description";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import type { SchemeApplication, WelfareScheme } from "../../types";
import { api } from "../../api";

interface Props {
  officerDept: string | undefined;
  onError: (msg: string) => void;
  onLoadingChange: (v: boolean) => void;
}

export default function WelfareApplicationReview({ officerDept, onError, onLoadingChange }: Props) {
  const [applications, setApplications] = useState<SchemeApplication[]>([]);
  const [schemes, setSchemes]           = useState<WelfareScheme[]>([]);
  const [selectedScheme, setSelectedScheme] = useState<number | "">("");
  const [success, setSuccess]           = useState("");
  const [rejectTarget, setRejectTarget] = useState<SchemeApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [docsDialog, setDocsDialog] = useState<{ appId: number; docs: any[] } | null>(null);

  useEffect(() => { loadSchemes(); }, []);
  useEffect(() => { if (selectedScheme) loadApplications(selectedScheme as number); }, [selectedScheme]);

  const loadSchemes = async () => {
    try {
      const res = await api.get("/api/welfare/schemes");
      // Filter to schemes for this officer's department
      const deptSchemes = res.data.filter((s: WelfareScheme) => s.department === officerDept);
      setSchemes(deptSchemes);
      if (deptSchemes.length > 0) setSelectedScheme(deptSchemes[0].id);
    } catch { onError("Failed to load schemes"); }
  };

  const loadApplications = async (schemeId: number) => {
    try {
      const res = await api.get(`/api/welfare/applications/scheme/${schemeId}/pending`);
      setApplications(res.data);
    } catch { onError("Failed to load applications"); }
  };

  const viewDocs = async (appId: number) => {
    try {
      const res = await api.get(`/api/welfare/applications/${appId}/documents`);
      setDocsDialog({ appId, docs: res.data });
    } catch { onError("Failed to load documents"); }
  };

  const downloadDoc = async (docId: number, originalName: string) => {
    try {
      const res = await api.get(
        `/api/welfare/documents/${docId}/view`,
        { responseType: "blob" }
      );
      
      const contentType = String(res.headers["content-type"] || "application/octet-stream");
      const blob = new Blob([res.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      // For PDFs open inline, for others download
      if (contentType === "application/pdf") {
        window.open(url, "_blank");
      } else {
        link.download = originalName;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch { onError("Failed to open document"); }
  };

  const approve = async (id: number, name: string) => {
    if (!confirm(`Approve application for "${name}"?\n\nThey will be enrolled as a beneficiary automatically.`)) return;
    onError(""); onLoadingChange(true);
    try {
      await api.put(`/api/welfare/applications/${id}/verify`);
      setSuccess(`Application approved. "${name}" is now a beneficiary.`);
      if (selectedScheme) loadApplications(selectedScheme as number);
    } catch { onError("Approval failed"); }
    finally { onLoadingChange(false); }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    onError(""); onLoadingChange(true);
    try {
      await api.put(`/api/welfare/applications/${rejectTarget.id}/reject`, {
        rejectionReason
      });
      setSuccess(`Application from "${rejectTarget.citizenName}" rejected.`);
      setRejectTarget(null);
      setRejectionReason("");
      if (selectedScheme) loadApplications(selectedScheme as number);
    } catch { onError("Rejection failed"); }
    finally { onLoadingChange(false); }
  };

  const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
    PENDING:  { bg: "#FFF3E0", color: "#E65100" },
    APPROVED: { bg: "#E8F5E9", color: "#2E7D32" },
    REJECTED: { bg: "#FFEBEE", color: "#C62828" },
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: 2.5, background: "linear-gradient(135deg, #0F2557, #1A3A8F)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
          <AssignmentIcon />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F2557", lineHeight: 1.1 }}>Welfare Applications</Typography>
          <Typography variant="caption" color="text.secondary">Review and verify citizen scheme applications</Typography>
        </Box>
      </Box>

      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>{success}</Alert>}

      {!officerDept ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Your department information is not loaded. Please refresh the page.
        </Alert>
      ) : schemes.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          No welfare schemes are assigned to your department ({officerDept}).
        </Alert>
      ) : (
        <>
          {/* Scheme selector */}
          <Paper sx={{ p: 2, mb: 2.5, border: "1px solid #E4E8F0" }}>
            <FormControl size="small" sx={{ minWidth: 320 }}>
              <InputLabel>Select Scheme</InputLabel>
              <Select label="Select Scheme" value={selectedScheme}
                onChange={e => setSelectedScheme(e.target.value as number)}>
                {schemes.map(s => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedScheme && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                {applications.length} pending application(s)
              </Typography>
            )}
          </Paper>

          {/* Applications Table */}
          <Paper sx={{ border: "1px solid #E4E8F0", overflow: "hidden" }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#F8F9FC" }}>
                    {["Code", "Citizen Name", "Email", "Documents", "Remarks", "Submitted", "Status", "Actions"].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, color: "#5A6072", fontSize: "0.75rem", whiteSpace: "nowrap" }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {applications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ textAlign: "center", py: 5, color: "#9AA3B5" }}>
                        No pending applications for this scheme
                      </TableCell>
                    </TableRow>
                  ) : applications.map(a => {
                    const ss = STATUS_STYLE[a.status] ?? { bg: "#F5F5F5", color: "#9AA3B5" };
                    return (
                      <TableRow key={a.id} hover>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 700, color: "#5A6072" }}>
                            {a.applicationCode}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {a.citizenName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">{a.citizenEmail}</Typography>
                        </TableCell>
                        <TableCell>
                          <Button size="small" variant="text"
                            onClick={() => viewDocs(a.id)}
                            sx={{ fontSize: "0.72rem", color: "#1A3A8F", fontWeight: 600 }}>
                            View Docs
                          </Button>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 140 }}>
                          <Typography variant="caption" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {a.remarks || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(a.createdAt).toLocaleDateString("en-IN")}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={a.status}
                            sx={{ fontSize: "0.68rem", fontWeight: 700, bgcolor: ss.bg, color: ss.color }} />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            {a.status === "PENDING" && (
                              <>
                                <Tooltip title="Approve & Enroll">
                                  <IconButton size="small" color="success"
                                    onClick={() => approve(a.id, a.citizenName)}>
                                    <CheckCircleIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Reject">
                                  <IconButton size="small" color="error"
                                    onClick={() => { setRejectTarget(a); setRejectionReason(""); }}>
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
        </>
      )}

      {/* Reject Dialog */}
      <Dialog open={!!rejectTarget} onClose={() => setRejectTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "#C62828" }}>
          Reject Application — {rejectTarget?.citizenName}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <Alert severity="warning" sx={{ fontSize: "0.82rem" }}>
              Document the reason for rejection. The citizen will be notified.
            </Alert>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#5A6072", mb: 0.75, display: "block" }}>
                Rejection Reason *
              </Typography>
              <TextField fullWidth multiline rows={3} size="small"
                value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                placeholder="e.g. Documents incomplete, Income exceeds limit, Address mismatch, Missing eligibility proof..." />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRejectTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmReject}>
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>

      {/* Documents Dialog */}
      <Dialog open={!!docsDialog} onClose={() => setDocsDialog(null)} maxWidth="sm" fullWidth disableRestoreFocus>
        <DialogTitle sx={{ fontWeight: 700, color: "#0F2557" }}>
          Application Documents
        </DialogTitle>
        <DialogContent>
          {!docsDialog || docsDialog.docs.length === 0 ? (
            <Alert severity="info" sx={{ mt: 1 }}>No documents uploaded for this application.</Alert>
          ) : (
            <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
              {docsDialog.docs.map(doc => (
                <Box key={doc.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, bgcolor: "#F8F9FC", borderRadius: 1.5, border: "1px solid #E4E8F0" }}>
                  <DescriptionIcon sx={{ color: "#1A3A8F", fontSize: 22 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#0F2557" }}>
                      {doc.docType}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {doc.originalName}
                    </Typography>
                  </Box>
                  <Button size="small" variant="outlined"
                    onClick={() => downloadDoc(doc.id, doc.originalName)}
                    sx={{ fontSize: "0.72rem", whiteSpace: "nowrap" }}>
                    View
                  </Button>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDocsDialog(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}