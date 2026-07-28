import { useState, useEffect } from "react";
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, IconButton, Tooltip, Grid
} from "@mui/material";
import HowToRegIcon      from "@mui/icons-material/HowToReg";
import CheckCircleIcon   from "@mui/icons-material/CheckCircle";
import CancelIcon        from "@mui/icons-material/Cancel";
import FolderOpenIcon    from "@mui/icons-material/FolderOpen";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import PersonAddIcon     from "@mui/icons-material/PersonAdd";
import BadgeIcon         from "@mui/icons-material/Badge";
import PhoneAndroidIcon  from "@mui/icons-material/PhoneAndroid";
import HomeIcon          from "@mui/icons-material/Home";
import KeyIcon           from "@mui/icons-material/Key";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import CitizenForm from "../CitizenForm";
import { api } from "../../api";

interface PendingRegistration {
  id: number; fullName: string; email: string; phone: string;
  dob: string | null; gender: string | null; ward: number | null;
  aadhaar: string | null; address: string | null;
  status: string; createdAt: string;
}

interface Props {
  loading: boolean;
  onError: (msg: string) => void;
  onLoadingChange: (v: boolean) => void;
  onCitizenRegistered: (id: string) => void;
}

export default function RegisterCitizenPage({ loading, onError, onLoadingChange, onCitizenRegistered }: Props) {
  const [activeTab, setActiveTab]         = useState<"register" | "pending">("register");
  const [pending, setPending]             = useState<PendingRegistration[]>([]);
  const [success, setSuccess]             = useState("");
  const [rejectTarget, setRejectTarget]   = useState<PendingRegistration | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [docsTarget, setDocsTarget]       = useState<PendingRegistration | null>(null);
  const [docsList, setDocsList]           = useState<any[]>([]);
  const [docsLoading, setDocsLoading]     = useState(false);

  useEffect(() => { loadPending(); }, []);

  const loadPending = async () => {
    try {
      const res = await api.get("/api/citizens/pending");
      setPending(res.data);
    } catch { /* silent */ }
  };

  const approvePending = async (pr: PendingRegistration) => {
    if (!confirm(`Approve "${pr.fullName}"? Their login password will be: ${pr.phone}`)) return;
    onLoadingChange(true);
    try {
      await api.post(`/api/citizens/pending/${pr.id}/approve`);
      setSuccess(`"${pr.fullName}" approved. Login: ${pr.email} / ${pr.phone}`);
      loadPending();
    } catch (err: any) {
      onError(err?.response?.data?.error ?? "Approval failed");
    } finally { onLoadingChange(false); }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    onLoadingChange(true);
    try {
      await api.post(`/api/citizens/pending/${rejectTarget.id}/reject`, { remarks: rejectRemarks });
      setSuccess(`Registration for "${rejectTarget.fullName}" rejected.`);
      setRejectTarget(null);
      loadPending();
    } catch { onError("Rejection failed"); }
    finally { onLoadingChange(false); }
  };

  // blur() before opening dialog fixes the aria-hidden focus warning
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

  const pendingCount = pending.length;

  const INFO_ITEMS = [
    { icon: <BadgeIcon        sx={{ fontSize: 18, color: "#1A3A8F" }} />, text: "Aadhaar number (12 digits) — stored masked for privacy" },
    { icon: <PhoneAndroidIcon sx={{ fontSize: 18, color: "#1A3A8F" }} />, text: "Mobile number becomes the citizen's login password" },
    { icon: <HomeIcon         sx={{ fontSize: 18, color: "#1A3A8F" }} />, text: "Residential address with optional ward number" },
    { icon: <KeyIcon          sx={{ fontSize: 18, color: "#1A3A8F" }} />, text: "Email becomes the portal login username" },
  ];

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: 2.5, background: "linear-gradient(135deg, #0F2557, #1A3A8F)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
          <HowToRegIcon />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F2557", lineHeight: 1.1 }}>Citizen Registration</Typography>
          <Typography variant="caption" color="text.secondary">
            Register new citizens directly or review self-submitted applications
          </Typography>
        </Box>
      </Box>

      {success && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 1.5 }} onClose={() => setSuccess("")}>{success}</Alert>
      )}

      {/* Tabs */}
      <Box sx={{ display: "flex", mb: 2.5, border: "1px solid #CBD2E0", borderRadius: 1.5, overflow: "hidden", width: "fit-content" }}>
        {([
          { id: "register", label: "Register Directly" },
          { id: "pending",  label: `Pending Verification${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
        ] as const).map((t) => (
          <Box key={t.id} onClick={() => setActiveTab(t.id)}
            sx={{
              px: 3, py: 1, cursor: "pointer", fontSize: "0.82rem", fontWeight: 700,
              display: "flex", alignItems: "center", gap: 0.75,
              bgcolor: activeTab === t.id ? "#0F2557" : "#fff",
              color:   activeTab === t.id ? "#fff" : "#5A6072",
              transition: "all 0.15s",
            }}
          >
            {t.id === "pending" && pendingCount > 0 && activeTab !== "pending" && (
              <Box sx={{ bgcolor: "#E65100", color: "#fff", borderRadius: "10px", px: 0.75, fontSize: "0.68rem", fontWeight: 800, lineHeight: 1.6 }}>
                {pendingCount}
              </Box>
            )}
            {t.label}
          </Box>
        ))}
      </Box>

      {/* ── Register directly — two-column layout ── */}
      {activeTab === "register" && (
        <Grid container spacing={3} sx={{ alignItems: "flex-start" }}>
          {/* Form */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <CitizenForm
              loading={loading}
              onError={onError}
              onLoadingChange={onLoadingChange}
              onCitizenRegistered={onCitizenRegistered}
            />
          </Grid>

          {/* Info panel */}
          <Grid size={{ xs: 12, lg: 4 }}>
            {/* Requirements */}
            <Paper sx={{ border: "1px solid #E4E8F0", overflow: "hidden", mb: 2 }}>
              <Box sx={{ background: "linear-gradient(135deg, #0F2557, #1A3A8F)", px: 2.5, py: 1.2 }}>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.72rem" }}>
                  Registration Requirements
                </Typography>
              </Box>
              <Box sx={{ p: 2 }}>
                {INFO_ITEMS.map((item, i) => (
                  <Box key={i} sx={{ display: "flex", alignItems: "flex-start", gap: 1.2, mb: i < INFO_ITEMS.length - 1 ? 1.5 : 0 }}>
                    <Box sx={{ mt: 0.1, flexShrink: 0 }}>{item.icon}</Box>
                    <Typography variant="caption" sx={{ color: "#3D4A6B", lineHeight: 1.6 }}>{item.text}</Typography>
                  </Box>
                ))}
              </Box>
            </Paper>

            {/* After registration */}
            <Paper sx={{ border: "1px solid #E4E8F0", overflow: "hidden", mb: 2 }}>
              <Box sx={{ px: 2.5, py: 1.5, bgcolor: "#F0F4FF", borderBottom: "1px solid #E4E8F0" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#1A3A8F", textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.72rem" }}>
                  After Registration
                </Typography>
              </Box>
              <Box sx={{ p: 2 }}>
                {[
                  "A unique Citizen Code (CTZ-YYYY-NNNNNN) is auto-generated.",
                  "Citizen logs in with their email and mobile number as password.",
                  "They can file grievances and apply for certificates immediately.",
                ].map((text, i) => (
                  <Box key={i} sx={{ display: "flex", gap: 1, mb: i < 2 ? 1.2 : 0 }}>
                    <Typography variant="caption" sx={{ color: "#1A3A8F", fontWeight: 700, minWidth: 16 }}>{i + 1}.</Typography>
                    <Typography variant="caption" sx={{ color: "#3D4A6B", lineHeight: 1.5 }}>{text}</Typography>
                  </Box>
                ))}
              </Box>
            </Paper>

            {/* Pending reminder */}
            {pendingCount > 0 && (
              <Paper sx={{ border: "1px solid #FFE082", bgcolor: "#FFFDE7" }}>
                <Box sx={{ p: 2, display: "flex", alignItems: "flex-start", gap: 1.2 }}>
                  <AssignmentTurnedInIcon sx={{ color: "#E65100", fontSize: 20, mt: 0.1, flexShrink: 0 }} />
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "#E65100", display: "block" }}>
                      {pendingCount} self-registration{pendingCount > 1 ? "s" : ""} awaiting review
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#5A6072" }}>
                      Switch to the Pending Verification tab to approve or reject.
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            )}
          </Grid>
        </Grid>
      )}

      {/* ── Pending verification tab ── */}
      {activeTab === "pending" && (
        <Paper sx={{ border: "1px solid #E4E8F0", overflow: "hidden" }}>
          {pending.length === 0 ? (
            <Box sx={{ py: 8, textAlign: "center" }}>
              <HowToRegIcon sx={{ fontSize: 48, color: "#CBD2E0", mb: 1.5 }} />
              <Typography variant="body2" color="text.secondary">No pending self-registrations</Typography>
              <Typography variant="caption" color="text.secondary">
                Citizens who register via the public portal will appear here for review
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ px: 2.5, py: 1.5, bgcolor: "#FFF8E1", borderBottom: "1px solid #FFE082" }}>
                <Typography variant="caption" sx={{ color: "#E65100", fontWeight: 700 }}>
                  {pending.length} application(s) awaiting verification — review carefully before approving
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "#F8F9FC" }}>
                      {["Full Name","Email","Mobile","DOB","Gender","Aadhaar","Address","Submitted","Actions"].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 700, color: "#5A6072", fontSize: "0.75rem", whiteSpace: "nowrap" }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pending.map((pr) => (
                      <TableRow key={pr.id} hover>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{pr.fullName}</Typography></TableCell>
                        <TableCell><Typography variant="caption" color="text.secondary">{pr.email}</Typography></TableCell>
                        <TableCell><Typography variant="caption">{pr.phone}</Typography></TableCell>
                        <TableCell><Typography variant="caption">{pr.dob ?? "—"}</Typography></TableCell>
                        <TableCell><Typography variant="caption">{pr.gender ?? "—"}</Typography></TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                            {pr.aadhaar ? "••••••••" + pr.aadhaar.slice(-4) : "—"}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 140 }}>
                          <Typography variant="caption" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {pr.address ?? "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {pr.createdAt ? new Date(pr.createdAt).toLocaleDateString("en-IN") : "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", gap: 0.5 }}>
                            <Tooltip title="View documents">
                              {/* e passed to blur trigger before dialog opens */}
                              <IconButton size="small" onClick={(e) => openDocs(pr, e)}>
                                <FolderOpenIcon fontSize="small" sx={{ color: "#1A3A8F" }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Approve">
                              <IconButton size="small" color="success" onClick={() => approvePending(pr)}>
                                <CheckCircleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject">
                              <IconButton size="small" color="error" onClick={() => { setRejectTarget(pr); setRejectRemarks(""); }}>
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Paper>
      )}

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onClose={() => setRejectTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "#C62828" }}>Reject — {rejectTarget?.fullName}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <Alert severity="warning" sx={{ fontSize: "0.82rem" }}>Document the reason for rejection.</Alert>
            <TextField fullWidth label="Reason for Rejection" multiline rows={3}
              value={rejectRemarks} onChange={(e) => setRejectRemarks(e.target.value)}
              placeholder="e.g. Aadhaar mismatch, incomplete address..." />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRejectTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmReject}>Confirm Rejection</Button>
        </DialogActions>
      </Dialog>

      {/* Documents dialog — disableRestoreFocus prevents focus returning to aria-hidden button */}
      <Dialog open={!!docsTarget} onClose={() => setDocsTarget(null)} maxWidth="sm" fullWidth disableRestoreFocus>
        <DialogTitle sx={{ fontWeight: 700, color: "#0F2557" }}>Documents — {docsTarget?.fullName}</DialogTitle>
        <DialogContent>
          {docsLoading ? (
            <Box sx={{ py: 3, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">Loading...</Typography>
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
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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