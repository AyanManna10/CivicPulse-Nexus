import { useState, useEffect } from "react";
import {
  Box, Typography, Paper, Button, Chip, Alert, Grid, Divider, Skeleton
} from "@mui/material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import type { Grievance, WelfareScheme } from "../../types";
import { api } from "../../api";

interface OfficerProfile {
  id: number;
  fullName: string;
  department: string;
  headOfficer: boolean;
}

interface Props {
  overdue: Grievance[];
  pendingCount: number;
  officerProfile: OfficerProfile | null;
  onNavigate: (tab: string) => void;
  onPendingWelfareAppsChange?: (count: number) => void;
}

interface QueueCounts {
  pendingWelfareApps: number;
  pendingDisbursements: number;
  openGrievances: number;
  resolvedToday: number;
}

function QueueCard({
  label, count, sublabel, color, bgColor, icon, actionLabel, onAction, urgent,
}: {
  label: string;
  count: number | null;
  sublabel?: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  actionLabel: string;
  onAction: () => void;
  urgent?: boolean;
}) {
  return (
    <Paper sx={{
      p: 2.5, border: "1px solid", height: "100%",
      borderColor: urgent && count ? "#FFCDD2" : "#E4E8F0",
      bgcolor: urgent && count ? "#FFFAFA" : "#fff",
      display: "flex", flexDirection: "column", gap: 1.5,
      position: "relative", overflow: "hidden",
      "&::before": {
        content: '""', position: "absolute",
        top: 0, left: 0, width: 4, height: "100%", bgcolor: color,
      },
    }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Box>
          <Typography variant="caption" sx={{
            color: "#9AA3B5", fontWeight: 700, fontSize: "0.68rem",
            textTransform: "uppercase", letterSpacing: 0.8,
          }}>
            {label}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mt: 0.5 }}>
            {count === null ? (
              <Skeleton width={48} height={40} />
            ) : (
              <Typography variant="h3" sx={{ fontWeight: 800, color, lineHeight: 1 }}>
                {count}
              </Typography>
            )}
            {urgent && count != null && count > 0 && (
              <Chip label="Action needed" size="small"
                sx={{ fontSize: "0.62rem", fontWeight: 700, bgcolor: "#FFEBEE", color: "#C62828", height: 18 }} />
            )}
          </Box>
          {sublabel && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              {sublabel}
            </Typography>
          )}
        </Box>
        <Box sx={{
          width: 44, height: 44, borderRadius: 2,
          display: "flex", alignItems: "center", justifyContent: "center",
          bgcolor: bgColor, color, flexShrink: 0,
        }}>
          {icon}
        </Box>
      </Box>
      <Box sx={{ mt: "auto" }}>
        <Button size="small" endIcon={<ArrowForwardIcon fontSize="small" />}
          onClick={onAction}
          sx={{ fontSize: "0.75rem", p: 0, color, "&:hover": { bgcolor: "transparent", textDecoration: "underline" } }}>
          {actionLabel}
        </Button>
      </Box>
    </Paper>
  );
}

export default function OfficerQueueDashboard({ overdue, pendingCount, officerProfile, onNavigate, onPendingWelfareAppsChange }: Props) {
  const [counts, setCounts] = useState<QueueCounts | null>(null);
  const dept = officerProfile?.department;

  useEffect(() => {
    if (dept) fetchCounts();
  }, [dept]);

  const fetchCounts = async () => {
    if (!dept) return;
    try {
      // ── Step 1: Get all schemes for this officer's department ────────────
      const schemesRes = await api.get(
        `/api/welfare/schemes/department/${encodeURIComponent(dept)}`
      ).catch(() => ({ data: [] }));
      const schemes: WelfareScheme[] = schemesRes.data ?? [];
      const schemeIds = schemes.map(s => s.id);

      // ── Step 2: Fetch applications + distributions per scheme ────────────
      // Only fetch if there are schemes to query — avoids waterfall of empty calls
      const [appResults, distResults, grievRes] = await Promise.all([
        schemeIds.length > 0
          ? Promise.all(
              schemeIds.map(id =>
                api.get(`/api/welfare/applications/scheme/${id}`)
                  .then(r => r.data as any[])
                  .catch(() => [] as any[])
              )
            )
          : Promise.resolve([]),
        schemeIds.length > 0
          ? Promise.all(
              schemeIds.map(id =>
                api.get(`/api/welfare/distributions/scheme/${id}`)
                  .then(r => r.data as any[])
                  .catch(() => [] as any[])
              )
            )
          : Promise.resolve([]),
        api.get(`/api/grievances/department/${encodeURIComponent(dept)}`)
          .catch(() => ({ data: [] })),
      ]);

      // Flatten arrays from all schemes
      const allApps: any[]  = appResults.flat();
      const allDists: any[] = distResults.flat();
      const allGrievances: any[] = grievRes.data ?? [];

      const todayStr = new Date().toISOString().slice(0, 10);

      const pendingWelfare = allApps.filter(a => a.status === "PENDING").length;
      onPendingWelfareAppsChange?.(pendingWelfare);
      setCounts({
        pendingWelfareApps: pendingWelfare,
        pendingDisbursements: allDists.filter(d => d.paymentStatus === "PENDING").length,
        openGrievances: allGrievances.filter(
          g => !["RESOLVED", "CLOSED"].includes(g.status)
        ).length,
        resolvedToday: allGrievances.filter(
          g => g.status === "RESOLVED" && g.resolvedAt?.slice(0, 10) === todayStr
        ).length,
      });
    } catch {
      setCounts({ pendingWelfareApps: 0, openGrievances: 0, resolvedToday: 0, pendingDisbursements: 0 });
    }
  };

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? "Good morning" :
    now.getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: "#0F2557", lineHeight: 1.2 }}>
          {greeting}, {officerProfile?.fullName?.split(" ")[0] ?? "Officer"} 👋
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {dept} · {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </Typography>
      </Box>

      {/* SLA Breach Alert */}
      {overdue.length > 0 && (
        <Alert severity="error" icon={<WarningAmberIcon />}
          sx={{ mb: 3, borderRadius: 2, border: "1px solid #FFCDD2" }}
          action={
            <Button color="error" size="small" endIcon={<ArrowForwardIcon />}
              onClick={() => onNavigate("grievances")}>
              Resolve Now
            </Button>
          }>
          <Typography variant="subtitle2">
            {overdue.length} grievance{overdue.length > 1 ? "s" : ""} have breached SLA
          </Typography>
          <Typography variant="caption" color="error.dark">
            {overdue.slice(0, 3).map(g => `#${g.id} ${g.title}`).join(" · ")}
            {overdue.length > 3 ? ` · +${overdue.length - 3} more` : ""}
          </Typography>
        </Alert>
      )}

      {/* Queue cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <QueueCard
            label="Pending Welfare Applications"
            count={counts?.pendingWelfareApps ?? null}
            sublabel="Awaiting your review"
            color="#E65100" bgColor="#FFF3E0"
            icon={<VolunteerActivismIcon fontSize="small" />}
            actionLabel="Review applications"
            onAction={() => onNavigate("welfare-applications")}
            urgent
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <QueueCard
            label="Open Grievances"
            count={counts?.openGrievances ?? null}
            sublabel={overdue.length > 0 ? `${overdue.length} overdue` : "All within SLA"}
            color="#1A3A8F" bgColor="#E8EDFB"
            icon={<ReportProblemIcon fontSize="small" />}
            actionLabel="Manage grievances"
            onAction={() => onNavigate("grievances")}
            urgent={overdue.length > 0}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <QueueCard
            label="Pending Disbursements"
            count={counts?.pendingDisbursements ?? null}
            sublabel="Distributions not yet paid"
            color="#6A1B9A" bgColor="#F3E5F5"
            icon={<AccountBalanceWalletIcon fontSize="small" />}
            actionLabel="Go to disbursement"
            onAction={() => onNavigate("fund-disbursement")}
            urgent
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <QueueCard
            label="Resolved Today"
            count={counts?.resolvedToday ?? null}
            sublabel="Grievances closed today"
            color="#2E7D32" bgColor="#E8F5E9"
            icon={<CheckCircleOutlineIcon fontSize="small" />}
            actionLabel="View all grievances"
            onAction={() => onNavigate("grievances")}
          />
        </Grid>
      </Grid>

      {/* Pending registrations strip */}
      {pendingCount > 0 && (
        <Paper sx={{ p: 2, mb: 3, border: "1px solid #FFF3E0", bgcolor: "#FFFDE7", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <AssignmentIcon sx={{ color: "#E65100" }} />
            <Box>
              <Typography variant="subtitle2" sx={{ color: "#E65100", fontWeight: 700 }}>
                {pendingCount} citizen registration{pendingCount > 1 ? "s" : ""} awaiting approval
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Review and approve or reject pending self-registrations
              </Typography>
            </Box>
          </Box>
          <Button size="small" variant="outlined" color="warning"
            endIcon={<ArrowForwardIcon />} onClick={() => onNavigate("register-citizen")}>
            Review
          </Button>
        </Paper>
      )}

      {/* Quick actions */}
      <Paper sx={{ p: 2.5, border: "1px solid #E4E8F0" }}>
        <Typography variant="caption" sx={{
          fontWeight: 700, color: "#9AA3B5", textTransform: "uppercase",
          letterSpacing: 0.8, fontSize: "0.68rem", display: "block", mb: 1.5,
        }}>
          Quick Actions
        </Typography>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <Button variant="contained" size="small" startIcon={<VolunteerActivismIcon />}
            onClick={() => onNavigate("welfare-applications")}>
            Welfare Applications
          </Button>
          <Button variant="outlined" size="small" startIcon={<ReportProblemIcon />}
            onClick={() => onNavigate("grievances")}>
            Grievances
          </Button>
          <Button variant="outlined" size="small" startIcon={<AccountBalanceWalletIcon />}
            onClick={() => onNavigate("fund-disbursement")}>
            Fund Disbursement
          </Button>
          <Button variant="outlined" size="small" startIcon={<AssignmentIcon />}
            onClick={() => onNavigate("beneficiaries")}>
            Beneficiaries
          </Button>
          {officerProfile?.headOfficer && (
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          )}
          {officerProfile?.headOfficer && (
            <Button variant="outlined" size="small" color="secondary"
              onClick={() => onNavigate("dept-officers")}>
              My Dept Officers
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
}