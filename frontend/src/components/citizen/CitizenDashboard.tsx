import { useState, useEffect } from "react";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import {
  Box, Typography, Paper, Grid, Chip, Stack, Alert
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AssignmentIcon from "@mui/icons-material/Assignment";
import GavelIcon from "@mui/icons-material/Gavel";
import AppsIcon from "@mui/icons-material/Apps";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import type { Grievance, SchemeApplication, Beneficiary } from "../../types";
import { api } from "../../api";

interface Props {
  citizenId: number | null;
  citizenName: string;
  onError: (msg: string) => void;
  onLoadingChange: (v: boolean) => void;
}

const STATUS_COLOR: Record<string, string> = {
  SUBMITTED: "#FFF3E0", ASSIGNED: "#FFF3E0", IN_PROGRESS: "#FFF3E0",
  RESOLVED: "#E8F5E9", CLOSED: "#E8F5E9",
  PENDING: "#FFF3E0", APPROVED: "#E8F5E9", REJECTED: "#FFEBEE",
  WITHDRAWN: "#F5F5F5"
};
const STATUS_TEXT_COLOR: Record<string, string> = {
  SUBMITTED: "#E65100", ASSIGNED: "#E65100", IN_PROGRESS: "#E65100",
  RESOLVED: "#2E7D32", CLOSED: "#2E7D32",
  PENDING: "#E65100", APPROVED: "#2E7D32", REJECTED: "#C62828",
  WITHDRAWN: "#9AA3B5"
};

// Payment timeline step config
const PAYMENT_STEPS = ["Applied", "Approved", "Distribution Created", "Paid"];

function getPaymentStep(app: SchemeApplication, beneficiary: Beneficiary | undefined): number {
  if (app.status !== "APPROVED") return 0;           // step 0: Applied
  if (!beneficiary) return 1;                         // step 1: Approved, no beneficiary yet
  if (!beneficiary.latestPaymentStatus) return 1;     // step 1: Approved, no distribution
  if (beneficiary.latestPaymentStatus === "PENDING") return 2; // step 2: Distribution created
  if (beneficiary.latestPaymentStatus === "PAID") return 3;    // step 3: Paid
  return 1;
}

export default function CitizenDashboard({ citizenId, citizenName, onError, onLoadingChange }: Props) {
  const [grievances, setGrievances]       = useState<Grievance[]>([]);
  const [applications, setApplications]   = useState<SchemeApplication[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => { load(); }, [citizenId]);

  const load = async () => {
    if (!citizenId) { setLoading(false); return; }
    onLoadingChange(true);
    try {
      const [gRes, aRes, bRes] = await Promise.all([
        api.get(`/api/grievances/citizen/${citizenId}`).catch(() => ({ data: [] })),
        api.get(`/api/welfare/applications/citizen/${citizenId}`).catch(() => ({ data: [] })),
        api.get(`/api/welfare/beneficiaries/citizen/${citizenId}`).catch(() => ({ data: [] })),
      ]);
      setGrievances(gRes.data);
      setApplications(aRes.data);
      setBeneficiaries(bRes.data);
    } catch { onError("Failed to load dashboard"); }
    finally { onLoadingChange(false); setLoading(false); }
  };

  const grievanceStats = {
    total: grievances.length,
    open: grievances.filter(g => ["SUBMITTED", "ASSIGNED", "IN_PROGRESS"].includes(g.status)).length,
    resolved: grievances.filter(g => g.status === "RESOLVED").length,
    overdue: grievances.filter(g => g.status === "OVERDUE").length,
  };

  const schemeStats = {
    total: applications.length,
    pending: applications.filter(a => a.status === "PENDING").length,
    approved: applications.filter(a => a.status === "APPROVED").length,
    rejected: applications.filter(a => a.status === "REJECTED").length,
  };

  // Approved applications that have a payment lifecycle to show
  const approvedApps = applications.filter(a => a.status === "APPROVED");

  // Total amount received (PAID distributions)
  const totalReceived = beneficiaries.reduce((sum, b) => {
    if (b.latestPaymentStatus === "PAID" && b.latestPaymentAmount != null)
      return sum + Number(b.latestPaymentAmount);
    return sum;
  }, 0);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: 2.5, background: "linear-gradient(135deg, #0F2557, #1A3A8F)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
          <DashboardIcon />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F2557", lineHeight: 1.1 }}>Dashboard</Typography>
          <Typography variant="caption" color="text.secondary">Welcome, {citizenName}</Typography>
        </Box>
      </Box>

      {loading ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography color="text.secondary">Loading your dashboard...</Typography>
        </Paper>
      ) : (
        <>
          {/* Grievance KPI cards */}
          <Grid container spacing={2} sx={{ mb: 2.5 }}>
            {[
              { label: "Total Grievances",  value: grievanceStats.total,    icon: <GavelIcon />,        color: "#1A3A8F", bg: "#E8EDFB" },
              { label: "Open",              value: grievanceStats.open,     icon: <AssignmentIcon />,   color: "#E65100", bg: "#FFF3E0" },
              { label: "Resolved",          value: grievanceStats.resolved, icon: <TrendingUpIcon />,   color: "#2E7D32", bg: "#E8F5E9" },
              { label: "SLA Breached",      value: grievanceStats.overdue,  icon: <WarningAmberIcon />, color: "#C62828", bg: "#FFEBEE" },
            ].map(({ label, value, icon, color, bg }) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={label}>
                <Paper sx={{ p: 2, border: "1px solid #E4E8F0", bgcolor: bg }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <Box sx={{ color, fontSize: 20 }}>{icon}</Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "#5A6072", textTransform: "uppercase", fontSize: "0.68rem" }}>
                      {label}
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, color, lineHeight: 1.1 }}>{value}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Scheme KPI cards */}
          <Grid container spacing={2} sx={{ mb: 2.5 }}>
            {[
              { label: "Scheme Applications", value: schemeStats.total,    icon: <AppsIcon />,       color: "#1A3A8F", bg: "#E8EDFB" },
              { label: "Pending",             value: schemeStats.pending,  icon: <AssignmentIcon />, color: "#E65100", bg: "#FFF3E0" },
              { label: "Approved",            value: schemeStats.approved, icon: <TrendingUpIcon />, color: "#2E7D32", bg: "#E8F5E9" },
              { label: "Rejected",            value: schemeStats.rejected, icon: <GavelIcon />,      color: "#C62828", bg: "#FFEBEE" },
            ].map(({ label, value, icon, color, bg }) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={label}>
                <Paper sx={{ p: 2, border: "1px solid #E4E8F0", bgcolor: bg }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <Box sx={{ color, fontSize: 20 }}>{icon}</Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "#5A6072", textTransform: "uppercase", fontSize: "0.68rem" }}>
                      {label}
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, color, lineHeight: 1.1 }}>{value}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* ── NEW: Payment Status Section ────────────────────────────────── */}
          {approvedApps.length > 0 && (
            <Paper sx={{ p: 2.5, mb: 2.5, border: "1px solid #E4E8F0" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <AccountBalanceWalletIcon sx={{ color: "#1A3A8F", fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#0F2557" }}>
                  Payment Status
                </Typography>
                {totalReceived > 0 && (
                  <Chip
                    size="small"
                    label={`Total Received: ₹${totalReceived.toLocaleString("en-IN")}`}
                    sx={{ ml: "auto", bgcolor: "#E8F5E9", color: "#2E7D32", fontWeight: 700, fontSize: "0.72rem" }}
                  />
                )}
              </Box>

              <Stack spacing={2}>
                {approvedApps.map(a => {
                  const beneficiary = beneficiaries.find(b => b.schemeId === a.schemeId);
                  const step = getPaymentStep(a, beneficiary);
                  const isPaid = beneficiary?.latestPaymentStatus === "PAID";
                  const isFailed = beneficiary?.latestPaymentStatus === "FAILED";

                  return (
                    <Box key={a.id} sx={{ p: 1.5, bgcolor: "#F8F9FC", borderRadius: 1.5, border: "1px solid #E4E8F0" }}>
                      {/* Scheme name + amount */}
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#0F2557" }}>
                          {a.schemeName}
                        </Typography>
                        {beneficiary?.latestPaymentAmount != null && (
                          <Typography variant="body2" sx={{ fontWeight: 700, color: isPaid ? "#2E7D32" : "#E65100" }}>
                            ₹{Number(beneficiary.latestPaymentAmount).toLocaleString("en-IN")}
                          </Typography>
                        )}
                      </Box>

                      {/* Payment timeline */}
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0 }}>
                        {PAYMENT_STEPS.map((label, i) => {
                          const done = i <= step;
                          const active = i === step;
                          return (
                            <Box key={label} sx={{ display: "flex", alignItems: "center", flex: i < PAYMENT_STEPS.length - 1 ? 1 : "none" }}>
                              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 60 }}>
                                <Box sx={{
                                  width: 20, height: 20, borderRadius: "50%",
                                  bgcolor: isFailed && i === step
                                    ? "#C62828"
                                    : done ? "#2E7D32" : "#E4E8F0",
                                  border: active ? "2px solid" : "none",
                                  borderColor: isFailed ? "#C62828" : "#2E7D32",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: "0.65rem", color: "#fff", fontWeight: 700,
                                }}>
                                  {done ? "✓" : i + 1}
                                </Box>
                                <Typography variant="caption" sx={{
                                  fontSize: "0.6rem", mt: 0.4, textAlign: "center",
                                  color: done ? "#2E7D32" : "#9AA3B5",
                                  fontWeight: active ? 700 : 400,
                                }}>
                                  {label}
                                </Typography>
                              </Box>
                              {i < PAYMENT_STEPS.length - 1 && (
                                <Box sx={{ flex: 1, height: 2, bgcolor: i < step ? "#2E7D32" : "#E4E8F0", mx: 0.5, mb: 2 }} />
                              )}
                            </Box>
                          );
                        })}
                      </Box>

                      {/* Failed warning */}
                      {isFailed && (
                        <Alert severity="error" sx={{ mt: 1, fontSize: "0.75rem", py: 0 }}>
                          Disbursement failed. Please contact your ward office.
                        </Alert>
                      )}
                    </Box>
                  );
                })}
              </Stack>
            </Paper>
          )}

          {/* Recent Grievances */}
          {grievances.length > 0 && (
            <Paper sx={{ p: 2.5, mb: 2.5, border: "1px solid #E4E8F0" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#0F2557", mb: 1.5 }}>
                Recent Grievances
              </Typography>
              <Stack spacing={1}>
                {grievances.slice(0, 3).map(g => (
                  <Box key={g.id} sx={{ p: 1.5, bgcolor: "#F8F9FC", borderRadius: 1.5, border: "1px solid #E4E8F0" }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#0F2557" }}>{g.title}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {g.department} • {new Date(g.createdAt).toLocaleDateString("en-IN")}
                        </Typography>
                      </Box>
                      <Chip size="small" label={g.status}
                        sx={{ fontWeight: 700, fontSize: "0.68rem",
                          bgcolor: STATUS_COLOR[g.status] ?? "#F5F5F5",
                          color: STATUS_TEXT_COLOR[g.status] ?? "#9AA3B5" }} />
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Paper>
          )}

          {/* Recent Scheme Applications */}
          {applications.length > 0 && (
            <Paper sx={{ p: 2.5, border: "1px solid #E4E8F0" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#0F2557", mb: 1.5 }}>
                Scheme Applications
              </Typography>
              <Stack spacing={1.5}>
                {applications.map(a => {
                  const isApproved  = a.status === "APPROVED";
                  const isRejected  = a.status === "REJECTED";
                  const isWithdrawn = a.status === "WITHDRAWN";
                  // Timeline steps: Submitted → In Review → Decision
                  const appStep = isApproved || isRejected || isWithdrawn ? 2 : 1;
                  const APP_STEPS = ["Submitted", "In Review", isRejected ? "Rejected" : isWithdrawn ? "Withdrawn" : "Approved"];
                  const stepColors = [
                    "#2E7D32", "#2E7D32",
                    isRejected ? "#C62828" : isWithdrawn ? "#9AA3B5" : "#2E7D32"
                  ];
                  return (
                    <Box key={a.id} sx={{ p: 1.5, bgcolor: "#F8F9FC", borderRadius: 1.5, border: "1px solid #E4E8F0" }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1, mb: 1.5 }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "#0F2557" }}>{a.schemeName}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Applied on {new Date(a.createdAt).toLocaleDateString("en-IN")}
                          </Typography>
                        </Box>
                      </Box>
                      {/* Application Status Timeline */}
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        {APP_STEPS.map((label, i) => {
                          const done = i <= appStep;
                          const color = done ? stepColors[i] : "#CBD2E0";
                          return (
                            <Box key={label} sx={{ display: "flex", alignItems: "center", flex: i < APP_STEPS.length - 1 ? 1 : "none" }}>
                              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 64 }}>
                                <Box sx={{
                                  width: 18, height: 18, borderRadius: "50%",
                                  bgcolor: color,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: "0.6rem", color: "#fff", fontWeight: 700,
                                }}>
                                  {done ? "✓" : i + 1}
                                </Box>
                                <Typography variant="caption" sx={{
                                  fontSize: "0.6rem", mt: 0.4, textAlign: "center",
                                  color, fontWeight: done ? 700 : 400,
                                }}>
                                  {label}
                                </Typography>
                              </Box>
                              {i < APP_STEPS.length - 1 && (
                                <Box sx={{ flex: 1, height: 2, bgcolor: i < appStep ? "#2E7D32" : "#E4E8F0", mx: 0.5, mb: 2 }} />
                              )}
                            </Box>
                          );
                        })}
                      </Box>
                      {a.status === "REJECTED" && a.rejectionReason && (
                        <Alert severity="error" sx={{ mt: 1, fontSize: "0.75rem", py: 0.5 }}>
                          {a.rejectionReason}
                        </Alert>
                      )}
                    </Box>
                  );
                })}
              </Stack>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
}