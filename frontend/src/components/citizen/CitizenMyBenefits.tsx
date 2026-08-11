import { useState, useEffect } from "react";
import { Box, Typography, Paper, Chip, Grid, Alert, Divider, Button} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import ErrorIcon from "@mui/icons-material/Error";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import type { SchemeApplication, Beneficiary } from "../../types";
import { api } from "../../api";

interface Props {
  citizenId: number | null;
  citizenName: string;
  onError: (msg: string) => void;
  onLoadingChange: (v: boolean) => void;
}
const PAYMENT_STEPS = ["Applied", "Approved", "Distribution Created", "Paid"];

function getPaymentStep(beneficiary: Beneficiary | undefined): { step: number; failed: boolean } {
  if (!beneficiary) return { step: 1, failed: false };
  const status = beneficiary.latestPaymentStatus;
  if (status === "PAID") return { step: 3, failed: false };
  if (status === "FAILED") return { step: 2, failed: true };
  if (status === "PENDING") return { step: 2, failed: false };
  return { step: 1, failed: false };
}

function PaymentTimeline({ beneficiary }: { beneficiary: Beneficiary | undefined }) {
  const { step, failed } = getPaymentStep(beneficiary);
  return (
    <Box sx={{ display: "flex", alignItems: "center", mt: 1.5, mb: 0.5 }}>
      {PAYMENT_STEPS.map((label, i) => {
        const isDone = i <= step && !(failed && i === step);
        const isFailedHere = failed && i === step;
        return (
          <Box key={label} sx={{ display: "flex", alignItems: "center", flex: i < PAYMENT_STEPS.length - 1 ? 1 : "none" }}>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 76 }}>
              {isFailedHere ? (
                <ErrorIcon sx={{ color: "#C62828", fontSize: 22 }} />
              ) : isDone ? (
                <CheckCircleIcon sx={{ color: "#2E7D32", fontSize: 22 }} />
              ) : (
                <RadioButtonUncheckedIcon sx={{ color: "#CBD2E0", fontSize: 22 }} />
              )}
              <Typography variant="caption" sx={{
                mt: 0.5, fontSize: "0.68rem", textAlign: "center",
                fontWeight: isDone || isFailedHere ? 700 : 400,
                color: isFailedHere ? "#C62828" : isDone ? "#2E7D32" : "#9AA3B5",
              }}>
                {label}
              </Typography>
            </Box>
            {i < PAYMENT_STEPS.length - 1 && (
              <Box sx={{
                flex: 1, height: 2, mx: 0.5, mb: 2.2,
                bgcolor: i < step ? "#2E7D32" : "#E4E8F0",
              }} />
            )}
          </Box>
        );
      })}
    </Box>
  );
}

export default function CitizenMyBenefits({ citizenId, onError, onLoadingChange }: Props) {
  const [applications, setApplications] = useState<SchemeApplication[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<number | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState("");

  useEffect(() => { if (citizenId) load(); }, [citizenId]);

  const load = async () => {
    if (!citizenId) return;
    onLoadingChange(true);
    try {
      const [appRes, benRes] = await Promise.all([
        api.get(`/api/welfare/applications/citizen/${citizenId}`).catch(() => ({ data: [] })),
        api.get(`/api/welfare/beneficiaries/citizen/${citizenId}`).catch(() => ({ data: [] })),
      ]);
      setApplications(appRes.data);
      setBeneficiaries(benRes.data);
    } catch {
      onError("Failed to load your benefits");
    } finally {
      onLoadingChange(false);
      setLoaded(true);
    }
  };

  const approved = applications.filter(a => a.status === "APPROVED");
  const findBeneficiary = (schemeId: number) => beneficiaries.find(b => b.schemeId === schemeId);
  const findApplication = (schemeId: number) => applications.find(a => a.schemeId === schemeId);

  const totalReceived = approved.reduce((sum, a) => {
    const b = findBeneficiary(a.schemeId);
    return b?.latestPaymentStatus === "PAID" ? sum + (b.latestPaymentAmount ?? 0) : sum;
  }, 0);

  const handleReupload = async (schemeId: number, file: File) => {
    const app = findApplication(schemeId);
    if (!app) {
      onError("Could not find your original application for this scheme");
      return;
    }
    setUploadingFor(schemeId);
    onError("");
    try {
      const docType = file.name.split(".")[0] || "Additional Document";
      const formData = new FormData();
      formData.append("file", file);
      formData.append("docType", docType);
      await api.post(`/api/welfare/applications/${app.id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setUploadSuccess("Document uploaded. Your department office will review it again.");
      load();
    } catch {
      onError("Failed to upload document. Please try again.");
    } finally {
      setUploadingFor(null);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2.5, flexWrap: "wrap", gap: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2.5, background: "linear-gradient(135deg, #0F2557, #1A3A8F)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <AccountBalanceWalletIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F2557", lineHeight: 1.1 }}>My Benefits</Typography>
            <Typography variant="caption" color="text.secondary">Payment status for your approved welfare schemes</Typography>
          </Box>
        </Box>
        {approved.length > 0 && (
          <Chip
            label={`Total Received: ₹${totalReceived.toLocaleString("en-IN")}`}
            sx={{ fontWeight: 700, fontSize: "0.8rem", bgcolor: "#E8F5E9", color: "#2E7D32", px: 1 }}
          />
        )}
      </Box>

      {uploadSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setUploadSuccess("")}>{uploadSuccess}</Alert>
      )}

      {loaded && approved.length === 0 && (
        <Paper sx={{ p: 4, textAlign: "center", border: "1px solid #E4E8F0" }}>
          <Typography color="text.secondary">You have no approved benefits yet.</Typography>
        </Paper>
      )}

      <Grid container spacing={2}>
        {approved.map(a => {
          const beneficiary = findBeneficiary(a.schemeId);
          const isPaid = beneficiary?.latestPaymentStatus === "PAID";
          const isFailed = beneficiary?.latestPaymentStatus === "FAILED";
          const docsMissing = beneficiary?.docsStatus === "MISSING";
          const isUploading = uploadingFor === a.schemeId;
          return (
            <Grid size={{ xs: 12, md: 6 }} key={a.id}>
              <Paper sx={{ p: 2.5, border: docsMissing ? "1px solid #FFCDD2" : "1px solid #E4E8F0", height: "100%" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#0F2557" }}>
                    {a.schemeName}
                  </Typography>
                  {isPaid && (
                    <Chip size="small" label="PAID" sx={{ fontWeight: 700, fontSize: "0.68rem", bgcolor: "#E8F5E9", color: "#2E7D32" }} />
                  )}
                  {isFailed && (
                    <Chip size="small" label="PAYMENT FAILED" sx={{ fontWeight: 700, fontSize: "0.68rem", bgcolor: "#FFEBEE", color: "#C62828" }} />
                  )}
                </Box>

                {!beneficiary && (
                  <Alert severity="info" sx={{ mt: 1.5, fontSize: "0.78rem" }}>
                    Approved — awaiting enrollment as a beneficiary by your department office.
                  </Alert>
                )}

                {isFailed && (
                  <Alert severity="error" sx={{ mt: 1.5, fontSize: "0.78rem" }}>
                    Your disbursement failed. Please contact your department office.
                  </Alert>
                )}

                {/* ── Documents Missing: citizen action required ── */}
                {docsMissing && (
                  <Box sx={{ mt: 1.5 }}>
                    <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ fontSize: "0.78rem", mb: 1 }}>
                      Your department office needs an additional or replacement document for this application.
                      {beneficiary?.remarks ? ` Note: ${beneficiary.remarks}` : ""}
                    </Alert>
                    <Box sx={{ display: "flex", flexDirection: "row", gap: 1, alignItems: "center" }}>
                   <Button
                     component="label"
                     size="small"
                     variant="outlined"
                     color="warning"
                     startIcon={<UploadFileIcon />}
                     disabled={isUploading}
                    >
                    {isUploading ? "Uploading…" : "Upload Document"}
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleReupload(a.schemeId, file);
                    e.target.value = "";
                    }}
                    />
                  </Button>
                  </Box>
                  </Box>
                )}

                <PaymentTimeline beneficiary={beneficiary} />

                {beneficiary?.latestPaymentAmount != null && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="caption" color="text.secondary">Amount</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "#1A3A8F" }}>
                        ₹{beneficiary.latestPaymentAmount.toLocaleString("en-IN")}
                      </Typography>
                    </Box>
                  </>
                )}
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}