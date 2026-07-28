import { useState, useEffect } from "react";
import {
  Box, Typography, Paper, Grid, Button, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Chip, Stack, Tooltip, IconButton
} from "@mui/material";
import AppsIcon from "@mui/icons-material/Apps";
import SendIcon from "@mui/icons-material/Send";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import DescriptionIcon from "@mui/icons-material/Description";
import type { WelfareScheme, SchemeApplication } from "../../types";
import { api } from "../../api";

interface Props {
  citizenId: number | null;
  citizenName: string;
  citizenEmail: string;
  onError: (msg: string) => void;
  onLoadingChange: (v: boolean) => void;
}

export default function CitizenApplyScheme({
  citizenId, citizenName, citizenEmail, onError, onLoadingChange
}: Props) {
  const [schemes, setSchemes]           = useState<WelfareScheme[]>([]);
  const [applications, setApplications] = useState<SchemeApplication[]>([]);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<WelfareScheme | null>(null);
  const [success, setSuccess]           = useState("");
  const [documents, setDocuments]       = useState<FileList | null>(null);


  useEffect(() => { loadSchemes(); loadApplications(); }, []);

  const loadSchemes = async () => {
    try {
      const res = await api.get("/api/welfare/schemes");
      setSchemes(res.data.filter((s: WelfareScheme) => s.status === "ACTIVE"));
    } catch { onError("Failed to load schemes"); }
  };

  const loadApplications = async () => {
    if (!citizenId) return;
    try {
      const res = await api.get(`/api/welfare/applications/citizen/${citizenId}`);
      setApplications(res.data);
    } catch { /* silent */ }
  };

  const submit = async () => {
    if (!selectedScheme || !citizenId) return;
    onError(""); onLoadingChange(true);
    try {
      const appRes = await api.post("/api/welfare/applications", {
        citizenId,
        citizenName,
        citizenEmail,
        schemeId: selectedScheme.id,
        documents: null, // Will upload separately
      });
      const applicationId = appRes.data.id;

      // Upload each document
      if (documents && documents.length > 0) {
        for (let i = 0; i < documents.length; i++) {
          const file = documents[i];
          const docType = file.name.split('.')[0]; // Use filename as doc type
          const formData = new FormData();
          formData.append("file", file);
          formData.append("docType", docType);
          try {
            await api.post(`/api/welfare/applications/${applicationId}/documents`, formData, {
              headers: { "Content-Type": "multipart/form-data" }
            });
          } catch (e) {
            console.warn(`Failed to upload ${file.name}`, e);
          }
        }
      }

      setSuccess(`Application submitted for ${selectedScheme.name}. Documents uploaded successfully.`);
      setShowApplyForm(false);
      setSelectedScheme(null);
      setDocuments(null);
      loadApplications();
    } catch (err: any) {
      onError(err?.response?.data?.message ?? "Failed to submit application");
    } finally { onLoadingChange(false); }
  };

  const hasAppliedFor = (schemeId: number) =>
    applications.some(a => a.schemeId === schemeId && a.status !== "REJECTED");

  const getApplicationStatus = (schemeId: number) =>
    applications.find(a => a.schemeId === schemeId)?.status;

  const STATUS_COLOR: Record<string, string> = {
    PENDING:  "#FFF3E0",
    APPROVED: "#E8F5E9",
    REJECTED: "#FFEBEE",
  };

  const STATUS_TEXT_COLOR: Record<string, string> = {
    PENDING:  "#E65100",
    APPROVED: "#2E7D32",
    REJECTED: "#C62828",
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: 2.5, background: "linear-gradient(135deg, #0F2557, #1A3A8F)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
          <AppsIcon />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F2557", lineHeight: 1.1 }}>Apply for Welfare Schemes</Typography>
          <Typography variant="caption" color="text.secondary">Browse available schemes and submit applications</Typography>
        </Box>
      </Box>

      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>{success}</Alert>}

      {/* Your Applications Summary */}
      {applications.length > 0 && (
        <Paper sx={{ p: 2.5, mb: 2.5, border: "1px solid #E4E8F0", bgcolor: "#F8F9FC" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#0F2557", mb: 1 }}>
            Your Applications ({applications.length})
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            {applications.map(a => (
              <Chip key={a.id} label={`${a.schemeName}: ${a.status}`}
                sx={{
                  fontWeight: 700, fontSize: "0.75rem",
                  bgcolor: STATUS_COLOR[a.status] ?? "#F5F5F5",
                  color: STATUS_TEXT_COLOR[a.status] ?? "#9AA3B5",
                }} />
            ))}
          </Stack>
        </Paper>
      )}

      {/* Schemes Grid */}
      <Grid container spacing={2}>
        {schemes.length === 0 ? (
          <Grid size={12}>
            <Paper sx={{ p: 4, textAlign: "center", border: "1px solid #E4E8F0" }}>
              <Typography color="text.secondary">No active schemes available right now.</Typography>
            </Paper>
          </Grid>
        ) : schemes.map(s => {
          const appliedStatus = getApplicationStatus(s.id);
          const canApply = !hasAppliedFor(s.id);
          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={s.id}>
              <Paper sx={{
                p: 2.5, height: "100%", border: "1px solid #E4E8F0",
                display: "flex", flexDirection: "column",
                opacity: canApply ? 1 : 0.7,
              }}>
                <Box sx={{ mb: 1 }}>
                  <Chip size="small" label={s.schemeType}
                    sx={{ fontSize: "0.7rem", fontWeight: 700, bgcolor: "#E8EDFB", color: "#1A3A8F" }} />
                </Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#0F2557", mb: 0.5 }}>
                  {s.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                  {s.department}
                </Typography>
                <Typography variant="caption" sx={{ color: "#5A6072", lineHeight: 1.5, mb: 1.5, flex: 1 }}>
                  {s.description}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#1A3A8F", display: "block", mb: 1 }}>
                  Eligibility:
                </Typography>
                <Typography variant="caption" sx={{ color: "#5A6072", lineHeight: 1.5, mb: 1.5 }}>
                  {s.eligibilityCriteria}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, fontSize: "0.8rem" }}>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>Budget Allocated:</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#1A3A8F" }}>
                    ₹{s.budgetAllocated.toLocaleString("en-IN")}
                  </Typography>
                </Box>
                {appliedStatus ? (
                  <Box sx={{
                    py: 1, px: 1.5, bgcolor: STATUS_COLOR[appliedStatus],
                    borderRadius: 1.5, textAlign: "center"
                  }}>
                    <Typography variant="caption" sx={{
                      fontWeight: 700,
                      color: STATUS_TEXT_COLOR[appliedStatus]
                    }}>
                      {appliedStatus === "PENDING" ? "🕐 Application Pending" :
                       appliedStatus === "APPROVED" ? "✓ Approved" : "✗ Rejected"}
                    </Typography>
                  </Box>
                ) : (
                  <Button variant="contained" size="small" fullWidth
                    startIcon={<SendIcon />}
                    onClick={(e) => {
                      (e.currentTarget as HTMLElement).blur();
                      setSelectedScheme(s);
                      setShowApplyForm(true);
                    }}>
                    Apply Now
                  </Button>
                )}
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* Apply Dialog */}
      <Dialog open={showApplyForm} onClose={() => { setShowApplyForm(false); setSelectedScheme(null); }} maxWidth="sm" fullWidth disableRestoreFocus>
        <DialogTitle sx={{ fontWeight: 700, color: "#0F2557" }}>
          Apply for {selectedScheme?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <Alert severity="info" sx={{ fontSize: "0.82rem" }}>
              Upload all supporting documents required for this scheme. Accepted formats: PDF, JPG, PNG.
            </Alert>
            <Box sx={{ p: 2, bgcolor: "#F8F9FC", borderRadius: 1.5, border: "1px solid #E4E8F0" }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#0F2557", display: "block", mb: 0.5 }}>
                Required Documents for {selectedScheme?.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                {selectedScheme?.eligibilityCriteria}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#5A6072", mb: 1, display: "block" }}>
                Upload Documents *
              </Typography>
              <Box sx={{
                border: "2px dashed #CBD2E0", borderRadius: 1.5, p: 2, textAlign: "center",
                bgcolor: "#F8F9FC", cursor: "pointer", transition: "all 0.2s",
                "&:hover": { borderColor: "#1A3A8F", bgcolor: "#E8EDFB" }
              }} component="label">
                <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => setDocuments(e.target.files || new FileList())}
                  style={{ display: "none" }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: "#1A3A8F", mb: 0.5 }}>
                  Click to browse or drag files here
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  PDF, JPG, PNG • Max 5 files
                </Typography>
              </Box>
              {documents && documents.length > 0 && (
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#2E7D32", display: "block", mb: 0.75 }}>
                    ✓ {documents.length} file(s) selected
                  </Typography>
                  {Array.from(documents).map((f, i) => (
                    <Typography key={i} variant="caption" sx={{ display: "block", color: "#5A6072" }}>
                      • {f.name}
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
            <Alert severity="warning" sx={{ fontSize: "0.78rem" }}>
              The {selectedScheme?.department} will review your application within 5–7 business days.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setShowApplyForm(false); setSelectedScheme(null); }}>Cancel</Button>
          <Button variant="contained" onClick={submit} startIcon={<SendIcon />}>Submit Application</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}