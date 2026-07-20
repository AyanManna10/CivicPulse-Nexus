import { Box, Paper, Typography, Button, Alert, Divider } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import ApplicationStatusChip from "../shared/ApplicationStatusChip";
import type { Certificate } from "../../types";
import { api } from "../../api";

interface Props {
  applications: Certificate[];
  onError: (msg: string) => void;
  onLoadingChange: (v: boolean) => void;
  onChanged: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  BIRTH:            "Birth Certificate",
  DEATH:            "Death Certificate",
  INCOME:           "Income Certificate",
  RESIDENCE:        "Residence Certificate",
  MARRIAGE:         "Marriage Certificate",
  TRADE_LICENSE:    "Trade License",
  SHOP_LICENSE:     "Shop License",
  BUILDING_PERMIT:  "Building Permit",
  WATER_CONNECTION: "Water Connection Permit",
};

const TYPE_ICON: Record<string, string> = {
  BIRTH:            "👶",
  DEATH:            "📋",
  INCOME:           "💰",
  RESIDENCE:        "🏠",
  MARRIAGE:         "💍",
  TRADE_LICENSE:    "🏪",
  SHOP_LICENSE:     "🏬",
  BUILDING_PERMIT:  "🏗️",
  WATER_CONNECTION: "💧",
};

const WORKFLOW_STEPS = [
  { status: "SUBMITTED",            label: "Submitted" },
  { status: "UNDER_VERIFICATION",   label: "Under Verification" },
  { status: "VERIFIED",             label: "Verified" },
  { status: "APPROVED",             label: "Approved" },
  { status: "CERTIFICATE_GENERATED", label: "Issued" },
];

const STATUS_ORDER = [
  "SUBMITTED", "UNDER_VERIFICATION", "VERIFIED", "APPROVED",
  "CERTIFICATE_GENERATED", "DOWNLOADED",
];

function getStepState(stepStatus: string, currentStatus: string): "done" | "current" | "pending" {
  if (currentStatus === "REJECTED") {
    return STATUS_ORDER.indexOf(stepStatus) < STATUS_ORDER.indexOf(currentStatus) ? "done" : "pending";
  }
  const si = STATUS_ORDER.indexOf(stepStatus);
  const ci = STATUS_ORDER.indexOf(currentStatus);
  if (si < ci) return "done";
  if (si === ci) return "current";
  return "pending";
}

function ProgressTimeline({ status }: { status: string }) {
  if (status === "REJECTED") {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1.5 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#C62828" }} />
        <Typography variant="caption" color="error" sx={{ fontWeight: 600 }}>Application Rejected</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 1.5 }}>
      <Box sx={{ display: "flex", alignItems: "center" }}>
        {WORKFLOW_STEPS.map((step, i) => {
          const state = getStepState(step.status, status);
          return (
            <Box key={step.status} sx={{ display: "flex", alignItems: "center", flex: i < WORKFLOW_STEPS.length - 1 ? 1 : "none" }}>
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.25 }}>
                <Box sx={{ color: state === "done" ? "#2E7D32" : state === "current" ? "#1A3A8F" : "#CBD2E0" }}>
                  {state === "done" ? (
                    <CheckCircleIcon sx={{ fontSize: 16 }} />
                  ) : state === "current" ? (
                    <HourglassTopIcon sx={{ fontSize: 16 }} />
                  ) : (
                    <RadioButtonUncheckedIcon sx={{ fontSize: 16 }} />
                  )}
                </Box>
                <Typography sx={{
                  fontSize: "0.6rem",
                  fontWeight: state === "current" ? 700 : 400,
                  color: state === "done" ? "#2E7D32" : state === "current" ? "#1A3A8F" : "#9AA3B5",
                  textAlign: "center",
                  maxWidth: 60,
                  lineHeight: 1.2,
                }}>
                  {step.label}
                </Typography>
              </Box>
              {i < WORKFLOW_STEPS.length - 1 && (
                <Box sx={{
                  flex: 1, height: 2,
                  bgcolor: state === "done" ? "#2E7D32" : "#E4E8F0",
                  mx: 0.5, mb: 2.5,
                }} />
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export default function CitizenApplications({ applications, onError, onLoadingChange, onChanged }: Props) {
  const download = async (cert: Certificate) => {
    onError(""); onLoadingChange(true);
    try {
      const res = await api.get(`/api/certificates/${cert.id}/download`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${cert.certificateNumber ?? "certificate"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      onChanged();
    } catch { onError("Download failed"); } finally { onLoadingChange(false); }
  };

  if (applications.length === 0) {
    return (
      <Paper sx={{ p: 5, textAlign: "center", border: "1px solid #E4E8F0" }}>
        <Typography sx={{ fontSize: 40, mb: 1 }}>📋</Typography>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>No Applications Yet</Typography>
        <Typography variant="body2" color="text.secondary">
          You have not applied for any certificates or permits. Use "Apply for Certificate" to get started.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {applications.map((c) => (
        <Paper
          key={c.id}
          sx={{
            overflow: "hidden",
            border: "1px solid",
            borderColor: c.status === "REJECTED" ? "#FFCDD2"
              : (c.status === "CERTIFICATE_GENERATED" || c.status === "DOWNLOADED") ? "#C8E6C9"
              : "#E4E8F0",
          }}
        >
          <Box sx={{
            height: 3,
            bgcolor: c.status === "REJECTED" ? "#C62828"
              : (c.status === "CERTIFICATE_GENERATED" || c.status === "DOWNLOADED") ? "#2E7D32"
              : "#1A3A8F",
          }} />

          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
              <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                <Typography sx={{ fontSize: 24 }}>{TYPE_ICON[c.certificateType] ?? "📄"}</Typography>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    {TYPE_LABEL[c.certificateType] ?? c.certificateType}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#5A6072", fontFamily: "monospace", fontWeight: 600 }}>
                    {c.applicationNumber}
                  </Typography>
                </Box>
              </Box>
              <ApplicationStatusChip status={c.status} />
            </Box>

            <Box sx={{ display: "flex", gap: 3, mb: 1.5, flexWrap: "wrap" }}>
              <Box>
                <Typography variant="caption" sx={{ color: "#9AA3B5", display: "block", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.65rem" }}>Applied On</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {new Date(c.appliedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
                </Typography>
              </Box>
              {c.certificateNumber && (
                <Box>
                  <Typography variant="caption" sx={{ color: "#9AA3B5", display: "block", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.65rem" }}>Certificate / Permit No.</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "#2E7D32", fontFamily: "monospace" }}>
                    {c.certificateNumber}
                  </Typography>
                </Box>
              )}
              {c.issuedAt && (
                <Box>
                  <Typography variant="caption" sx={{ color: "#9AA3B5", display: "block", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.65rem" }}>Issued On</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {new Date(c.issuedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
                  </Typography>
                </Box>
              )}
            </Box>

            <ProgressTimeline status={c.status} />

            {c.status === "REJECTED" && c.rejectionReason && (
              <Alert severity="error" sx={{ mt: 1.5, fontSize: "0.8rem", borderRadius: 1.5 }}>
                <strong>Rejection Reason:</strong> {c.rejectionReason}
                <Box component="p" sx={{ m: "4px 0 0 0", fontStyle: "italic", fontSize: "0.78rem" }}>
                  You may re-apply after addressing the above issue.
                </Box>
              </Alert>
            )}

            {c.remarks && c.status !== "REJECTED" && (
              <Box sx={{ mt: 1.5, p: 1.5, bgcolor: "#F0F4FF", borderRadius: 1.5, border: "1px solid #C5D0F0" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#1A3A8F" }}>Officer Note:</Typography>
                <Typography variant="body2" sx={{ color: "#1A3A8F" }}>{c.remarks}</Typography>
              </Box>
            )}

            {(c.status === "CERTIFICATE_GENERATED" || c.status === "DOWNLOADED") && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CheckCircleIcon sx={{ color: "#2E7D32", fontSize: 18 }} />
                    <Typography variant="body2" sx={{ color: "#2E7D32", fontWeight: 600 }}>
                      Your document is ready to download
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={() => download(c)}
                    sx={{ bgcolor: "#2E7D32", "&:hover": { bgcolor: "#1B5E20" }, borderRadius: 1.5 }}
                  >
                    Download PDF
                  </Button>
                </Box>
              </>
            )}
          </Box>
        </Paper>
      ))}
    </Box>
  );
}
