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
import UndoIcon from "@mui/icons-material/Undo";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import HowToRegIcon from "@mui/icons-material/HowToReg";
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
  const [perDocFiles, setPerDocFiles] = useState<Record<string, File>>({});
  const [eligibilityScheme, setEligibilityScheme] = useState<WelfareScheme | null>(null);
  const [eligibilityChecks, setEligibilityChecks] = useState<Record<string, boolean>>({});
  const [selfDeclared, setSelfDeclared] = useState(false);
  const [citizenIncome, setCitizenIncome] = useState<number | null>(null);
  const [citizenAge, setCitizenAge] = useState<number | null>(null);
  const [autoCheckLoading, setAutoCheckLoading] = useState(false);

  // Parse numeric thresholds out of free-text eligibility criteria
  const parseThreshold = (criteria: string) => {
    const incomeMatch = criteria.match(/income\s*(?:below|less than|<)\s*[₹]?\s*([\d,]+)/i);
    const ageMatch = criteria.match(/age\s*(?:above|over|greater than|>)\s*(\d+)/i);
    const ageBelowMatch = criteria.match(/age\s*(?:below|under|less than|<)\s*(\d+)/i);
    return {
      incomeBelow: incomeMatch ? Number(incomeMatch[1].replace(/,/g, "")) : null,
      ageAbove: ageMatch ? Number(ageMatch[1]) : null,
      ageBelow: ageBelowMatch ? Number(ageBelowMatch[1]) : null,
    };
  };

  const evaluateCriterion = (criterion: string): "pass" | "fail" | "unknown" => {
    const { incomeBelow, ageAbove, ageBelow } = parseThreshold(criterion);
    if (incomeBelow != null && citizenIncome != null) return citizenIncome < incomeBelow ? "pass" : "fail";
    if (ageAbove != null && citizenAge != null) return citizenAge > ageAbove ? "pass" : "fail";
    if (ageBelow != null && citizenAge != null) return citizenAge < ageBelow ? "pass" : "fail";
    return "unknown";
  };
  const [withdrawConfirmOpen, setWithdrawConfirmOpen] = useState(false);
  const [selectedAppForAction, setSelectedAppForAction] = useState<SchemeApplication | null>(null);
  const [resubmitDialogOpen, setResubmitDialogOpen] = useState(false);
  const [resubmitRemarks, setResubmitRemarks] = useState("");
  const [resubmitDocuments, setResubmitDocuments] = useState<FileList | null>(null);

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

    // Validate all required documents are uploaded
    const requiredDocs = SCHEME_REQUIRED_DOCS[selectedScheme.schemeType] ?? ["Supporting Document"];
    const missingDocs = requiredDocs.filter(doc => !perDocFiles[doc]);
    if (missingDocs.length > 0) {
      onError(`Please upload all required documents. Missing: ${missingDocs.join(", ")}`);
      return;
    }

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

      // Upload each document with its correct docType label
      for (const [docType, file] of Object.entries(perDocFiles)) {
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

      setSuccess(`Application submitted for ${selectedScheme.name}. Documents uploaded successfully.`);
      setShowApplyForm(false);
      setSelectedScheme(null);
      setPerDocFiles({});
      loadApplications();
    } catch (err: any) {
      const serverMsg: string = err?.response?.data?.message ?? "";
      if (serverMsg.toLowerCase().includes("limit of 3")) {
        onError("You have reached the limit of 3 scheme applications per day. Please try again tomorrow.");
      } else if (serverMsg.toLowerCase().includes("pending application")) {
        onError("You already have a pending application for this scheme.");
      } else {
        onError(serverMsg || "Failed to submit application. Please try again.");
      }
    } finally { onLoadingChange(false); }
  };

  const handleWithdraw = async () => {
    if (!selectedAppForAction || !citizenId) return;
    onLoadingChange(true);
    onError("");
    try {
      await api.put(`/api/welfare/applications/${selectedAppForAction.id}/withdraw`, {
        citizenId
      });
      setSuccess(`Application for ${selectedAppForAction.schemeName} has been withdrawn.`);
      setWithdrawConfirmOpen(false);
      setSelectedAppForAction(null);
      loadApplications();
    } catch (err: any) {
      onError(err?.response?.data?.message ?? "Failed to withdraw application");
    } finally { onLoadingChange(false); }
  };

  const handleResubmit = async () => {
    if (!selectedAppForAction || !citizenId) return;
    onLoadingChange(true);
    onError("");
    try {
      await api.put(`/api/welfare/applications/${selectedAppForAction.id}/resubmit`, {
        citizenId,
        remarks: resubmitRemarks
      });

      // Upload new documents if provided
      if (resubmitDocuments && resubmitDocuments.length > 0) {
        for (let i = 0; i < resubmitDocuments.length; i++) {
          const file = resubmitDocuments[i];
          const docType = file.name.split('.')[0];
          const formData = new FormData();
          formData.append("file", file);
          formData.append("docType", docType);
          try {
            await api.post(`/api/welfare/applications/${selectedAppForAction.id}/documents`, formData, {
              headers: { "Content-Type": "multipart/form-data" }
            });
          } catch (e) {
            console.warn(`Failed to upload ${file.name}`, e);
          }
        }
      }

      setSuccess(`Application for ${selectedAppForAction.schemeName} has been resubmitted with your remarks.`);
      setResubmitDialogOpen(false);
      setSelectedAppForAction(null);
      setResubmitRemarks("");
      setResubmitDocuments(null);
      loadApplications();
    } catch (err: any) {
      onError(err?.response?.data?.message ?? "Failed to resubmit application");
    } finally { onLoadingChange(false); }
  };

  const SCHEME_REQUIRED_DOCS: Record<string, string[]> = {
    HOUSING:        ["Aadhaar Card", "Income Proof", "Address Proof", "Land Document"],
    HEALTH:         ["Aadhaar Card", "Medical Certificate", "Income Proof"],
    AGRICULTURE:    ["Aadhaar Card", "Land Document", "Income Proof"],
    PENSION:        ["Aadhaar Card", "Age Proof", "Income Proof", "Bank Passbook"],
    INFRASTRUCTURE: ["Aadhaar Card", "Address Proof", "Site Plan"],
    EDUCATION:      ["Aadhaar Card", "Income Proof", "School Certificate"],
    SUBSIDY:        ["Aadhaar Card", "Income Proof", "Address Proof"],
    LABOUR:         ["Aadhaar Card", "Employment Certificate", "Income Proof"],
    DISABILITY:     ["Aadhaar Card", "Disability Certificate", "Income Proof"],
    EMPLOYMENT:     ["Aadhaar Card", "Educational Certificate", "Address Proof"],
  };

  const hasAppliedFor = (schemeId: number) =>
    applications.some(a => a.schemeId === schemeId && a.status !== "REJECTED" && a.status !== "WITHDRAWN");

  const getApplicationStatus = (schemeId: number) =>
    applications.find(a => a.schemeId === schemeId && a.status !== "WITHDRAWN")?.status;

  const STATUS_COLOR: Record<string, string> = {
    PENDING:  "#FFF3E0",
    APPROVED: "#E8F5E9",
    REJECTED: "#FFEBEE",
    WITHDRAWN: "#F5F5F5",
  };

  const STATUS_TEXT_COLOR: Record<string, string> = {
    PENDING:  "#E65100",
    APPROVED: "#2E7D32",
    REJECTED: "#C62828",
    WITHDRAWN: "#9AA3B5",
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
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#0F2557", mb: 1.5 }}>
            Your Applications ({applications.length})
          </Typography>
          <Stack spacing={1}>
            {applications.map(app => (
              <Box key={app.id} sx={{
                p: 1.5, bgcolor: "white", border: "1px solid #E4E8F0", borderRadius: 1.5,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 2
              }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "#0F2557", mb: 0.25 }}>
                    {app.schemeName}
                  </Typography>
                  <Chip label={app.status} size="small"
                    sx={{
                      fontWeight: 700, fontSize: "0.7rem",
                      bgcolor: STATUS_COLOR[app.status] ?? "#F5F5F5",
                      color: STATUS_TEXT_COLOR[app.status] ?? "#9AA3B5",
                    }} />
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                  {app.status === "PENDING" && (
                    <Button variant="outlined" size="small" color="error"
                      onClick={() => {
                        setSelectedAppForAction(app);
                        setWithdrawConfirmOpen(true);
                      }}>
                      Withdraw
                    </Button>
                  )}
                  {app.status === "REJECTED" && (
                    <Button variant="outlined" size="small" color="primary"
                      startIcon={<UndoIcon />}
                      onClick={() => {
                        setSelectedAppForAction(app);
                        setResubmitRemarks("");
                        setResubmitDocuments(null);
                        setResubmitDialogOpen(true);
                      }}>
                      Resubmit
                    </Button>
                  )}
                </Box>
              </Box>
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
                       appliedStatus === "APPROVED" ? "✓ Approved" :
                       appliedStatus === "WITHDRAWN" ? "↩ Withdrawn" : "✗ Rejected"}
                    </Typography>
                  </Box>
                ) : (
                  <Button variant="outlined" size="small" fullWidth
                    startIcon={<HowToRegIcon />}
                    onClick={async (e) => {
                      (e.currentTarget as HTMLElement).blur();
                      setEligibilityScheme(s);
                      setEligibilityChecks({});
                      setSelfDeclared(false);
                      setAutoCheckLoading(true);
                      try {
                        const res = await api.get(`/api/citizens/${citizenId}`);
                        const profile = res.data;
                        setCitizenIncome(profile.annualIncome ?? profile.income ?? null);
                        if (profile.dateOfBirth) {
                          const dob = new Date(profile.dateOfBirth);
                          const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));
                          setCitizenAge(age);
                        } else {
                          setCitizenAge(null);
                        }
                      } catch {
                        setCitizenIncome(null);
                        setCitizenAge(null);
                      } finally {
                        setAutoCheckLoading(false);
                      }
                    }}>
                    Check Eligibility
                  </Button>
                )}
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* Eligibility Self-Check Modal */}
      <Dialog open={!!eligibilityScheme} onClose={() => setEligibilityScheme(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "#0F2557" }}>
          Check Your Eligibility — {eligibilityScheme?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <Alert severity="info" sx={{ fontSize: "0.82rem" }}>
              Please confirm you meet all the eligibility criteria before applying.
            </Alert>
            <Box sx={{ p: 2, bgcolor: "#F8F9FC", borderRadius: 1.5, border: "1px solid #E4E8F0" }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#0F2557", display: "block", mb: 1.5, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.68rem" }}>
                Eligibility Criteria
              </Typography>
              <Stack spacing={1}>
                {autoCheckLoading ? (
                  <Typography variant="caption" color="text.secondary">Checking your profile…</Typography>
                ) : (
                  (eligibilityScheme?.eligibilityCriteria ?? "")
                    .split(/[,\n]/)
                    .map(c => c.trim())
                    .filter(Boolean)
                    .map((criterion, i) => {
                      const result = evaluateCriterion(criterion);
                      if (result !== "unknown" && eligibilityChecks[criterion] === undefined) {
                        // auto-set based on profile data (still overridable)
                        setTimeout(() => setEligibilityChecks(prev =>
                          prev[criterion] === undefined ? { ...prev, [criterion]: result === "pass" } : prev
                        ), 0);
                      }
                      return (
                        <Box key={i}>
                          <FormControlLabel
                            control={
                              <Checkbox size="small"
                                checked={!!eligibilityChecks[criterion]}
                                onChange={e => setEligibilityChecks(prev => ({ ...prev, [criterion]: e.target.checked }))}
                                sx={{ color: "#1A3A8F", "&.Mui-checked": { color: "#1A3A8F" } }} />
                            }
                            label={
                              <Typography variant="body2" sx={{ color: "#0F2557" }}>{criterion}</Typography>
                            }
                          />
                          {result === "pass" && (
                            <Chip size="small" label="✓ Matches your profile" sx={{ ml: 4, fontSize: "0.65rem", bgcolor: "#E8F5E9", color: "#2E7D32", height: 18 }} />
                          )}
                          {result === "fail" && (
                            <Chip size="small" label="⚠ May not match your profile" sx={{ ml: 4, fontSize: "0.65rem", bgcolor: "#FFEBEE", color: "#C62828", height: 18 }} />
                          )}
                        </Box>
                      );
                    })
                )}
              </Stack>
            </Box>
            <Box sx={{ p: 1.5, bgcolor: "#FFF3E0", borderRadius: 1.5, border: "1px solid #FFE0B2" }}>
              <FormControlLabel
                control={
                  <Checkbox size="small" checked={selfDeclared}
                    onChange={e => setSelfDeclared(e.target.checked)}
                    sx={{ color: "#E65100", "&.Mui-checked": { color: "#E65100" } }} />
                }
                label={
                  <Typography variant="body2" sx={{ color: "#E65100", fontWeight: 600 }}>
                    I hereby declare that the information I will provide is true and correct to the best of my knowledge.
                  </Typography>
                }
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEligibilityScheme(null)}>Cancel</Button>
          <Button variant="contained" startIcon={<SendIcon />}
            disabled={!selfDeclared || !Object.values(eligibilityChecks).every(Boolean)}
            onClick={() => {
              setSelectedScheme(eligibilityScheme);
              setEligibilityScheme(null);
              setShowApplyForm(true);
              setPerDocFiles({});
            }}>
            Proceed to Apply
          </Button>
        </DialogActions>
      </Dialog>

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
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#5A6072", mb: 1.5, display: "block" }}>
                Required Documents *
              </Typography>
              <Stack spacing={1.5}>
                {(SCHEME_REQUIRED_DOCS[selectedScheme?.schemeType ?? ""] ?? ["Supporting Document"]).map((docType) => {
                  const fileKey = docType;
                  const uploaded = perDocFiles[fileKey];
                  return (
                    <Box key={docType} sx={{ p: 1.5, border: "1px solid #E4E8F0", borderRadius: 1.5, bgcolor: "#F8F9FC" }}>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: "#0F2557" }}>
                          {docType}
                        </Typography>
                        {uploaded && (
                          <Typography variant="caption" sx={{ color: "#2E7D32", fontWeight: 600 }}>
                            ✓ {uploaded.name}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{
                        border: "2px dashed #CBD2E0", borderRadius: 1, p: 1, textAlign: "center",
                        bgcolor: uploaded ? "#E8F5E9" : "#fff", cursor: "pointer",
                        "&:hover": { borderColor: "#1A3A8F", bgcolor: "#E8EDFB" }
                      }} component="label">
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) setPerDocFiles(prev => ({ ...prev, [fileKey]: file }));
                          }}
                          style={{ display: "none" }} />
                        <Typography variant="caption" sx={{ color: uploaded ? "#2E7D32" : "#1A3A8F", fontWeight: 600 }}>
                          {uploaded ? "Click to replace" : "Click to upload"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.68rem" }}>
                          PDF, JPG, PNG
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
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

      {/* Withdraw Confirmation Dialog */}
      <Dialog open={withdrawConfirmOpen} onClose={() => setWithdrawConfirmOpen(false)} disableRestoreFocus>
        <DialogTitle sx={{ fontWeight: 700, color: "#0F2557" }}>
          Confirm Withdrawal
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography>
            Are you sure you want to withdraw your application for <strong>{selectedAppForAction?.schemeName}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => {
            setWithdrawConfirmOpen(false);
            setSelectedAppForAction(null);
          }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleWithdraw}>
            Withdraw Application
          </Button>
        </DialogActions>
      </Dialog>

      {/* Resubmit Dialog */}
      <Dialog open={resubmitDialogOpen} onClose={() => {
  setResubmitDialogOpen(false);
  setSelectedAppForAction(null);
}} maxWidth="sm" fullWidth disableRestoreFocus>
        <DialogTitle sx={{ fontWeight: 700, color: "#0F2557" }}>
          Resubmit Application
        </DialogTitle>
        <DialogContent sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          <Alert severity="info" sx={{ fontSize: "0.82rem" }}>
            Your application for <strong>{selectedAppForAction?.schemeName}</strong> was rejected. You can provide additional remarks and/or upload new documents.
          </Alert>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "#5A6072", mb: 1, display: "block" }}>
              Additional Remarks (Optional)
            </Typography>
            <TextField fullWidth multiline rows={3} placeholder="Explain why your application should be reconsidered..."
              value={resubmitRemarks} onChange={e => setResubmitRemarks(e.target.value)}
              variant="outlined" size="small" />
          </Box>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "#5A6072", mb: 1, display: "block" }}>
              Upload Updated Documents (Optional)
            </Typography>
            <Box sx={{
              border: "2px dashed #CBD2E0", borderRadius: 1.5, p: 2, textAlign: "center",
              bgcolor: "#F8F9FC", cursor: "pointer", transition: "all 0.2s",
              "&:hover": { borderColor: "#1A3A8F", bgcolor: "#E8EDFB" }
            }} component="label">
              <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png"
                onChange={e => setResubmitDocuments(e.target.files || new FileList())}
                style={{ display: "none" }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#1A3A8F", mb: 0.5 }}>
                Click to browse or drag files here
              </Typography>
              <Typography variant="caption" color="text.secondary">
                PDF, JPG, PNG • Max 5 files
              </Typography>
            </Box>
            {resubmitDocuments && resubmitDocuments.length > 0 && (
              <Box sx={{ mt: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#2E7D32", display: "block", mb: 0.75 }}>
                  ✓ {resubmitDocuments.length} file(s) selected
                </Typography>
                {Array.from(resubmitDocuments).map((f, i) => (
                  <Typography key={i} variant="caption" sx={{ display: "block", color: "#5A6072" }}>
                    • {f.name}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => {
            setResubmitDialogOpen(false);
            setSelectedAppForAction(null);
            setResubmitRemarks("");
            setResubmitDocuments(null);
          }}>Cancel</Button>
          <Button variant="contained" onClick={handleResubmit} startIcon={<UndoIcon />}>
            Resubmit Application
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}