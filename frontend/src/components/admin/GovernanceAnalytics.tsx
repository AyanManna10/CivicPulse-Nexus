import { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Paper, Grid, Button, Alert, Chip, Skeleton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, Divider, Tooltip
} from "@mui/material";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell
} from "recharts";
import BarChartIcon from "@mui/icons-material/BarChart";
import RefreshIcon from "@mui/icons-material/Refresh";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import StarIcon from "@mui/icons-material/Star";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import GavelIcon from "@mui/icons-material/Gavel";
import GroupsIcon from "@mui/icons-material/Groups";
import VerifiedIcon from "@mui/icons-material/Verified";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { api } from "../../api";

interface Props {
  onError: (msg: string) => void;
  onLoadingChange: (v: boolean) => void;
}

interface AnalyticsSummaryDto {
  citizenSatisfactionScore: number;
  serviceSlaPercent: number;
  totalRevenueDisbursed: number;
  budgetUtilizationPercent: number;
  totalRequests: number;
  complaintChangePercent: number;
  totalGrievances: number;
  resolvedGrievances: number;
  overdueGrievances: number;
  openGrievances: number;
  avgResolutionDays: number;
  grievancesByMonth: { month: string; count: number }[];
  totalCertificates: number;
  approvedCertificates: number;
  rejectedCertificates: number;
  pendingCertificates: number;
  avgProcessingDays: number;
  certificatesByMonth: { month: string; count: number }[];
  totalWelfareApplications: number;
  approvedWelfareApplications: number;
  totalBeneficiaries: number;
  totalAmountDisbursed: number;
  totalBudgetAllocated: number;
  schemeUtilizations: {
    schemeName: string;
    department: string;
    budgetAllocated: number;
    budgetDisbursed: number;
    utilizationPercent: number;
    beneficiaryCount: number;
  }[];
  totalCitizens: number;
  activeCitizens: number;
  newCitizensThisMonth: number;
  departmentPerformances: {
    department: string;
    totalGrievances: number;
    resolvedGrievances: number;
    resolutionRate: number;
    avgResolutionDays: number;
    slaBreaches: number;
    certificatesProcessed: number;
    welfareApplicationsProcessed: number;
    performanceRating: string;
  }[];
}

const RATING_STYLE: Record<string, { bg: string; color: string }> = {
  EXCELLENT:        { bg: "#E8F5E9", color: "#2E7D32" },
  GOOD:             { bg: "#E3F2FD", color: "#1565C0" },
  NEEDS_IMPROVEMENT:{ bg: "#FFEBEE", color: "#C62828" },
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const fmtK = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` :
  n >= 1000   ? `₹${(n / 1000).toFixed(1)}K`   : `₹${n}`;

function KpiCard({
  label, value, sub, icon, color, bg, warn = false
}: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; color: string; bg: string; warn?: boolean;
}) {
  return (
    <Paper sx={{
      p: 2.5, border: "1px solid", borderColor: warn ? "#FFCDD2" : "#E4E8F0",
      bgcolor: warn ? "#FFFAFA" : "#fff", height: "100%",
      position: "relative", overflow: "hidden",
      "&::before": {
        content: '""', position: "absolute",
        top: 0, left: 0, width: 4, height: "100%", bgcolor: color,
      }
    }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
        <Typography variant="caption" sx={{
          color: "#9AA3B5", fontWeight: 700, fontSize: "0.68rem",
          textTransform: "uppercase", letterSpacing: 0.8
        }}>
          {label}
        </Typography>
        <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: bg, color, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </Box>
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 800, color, lineHeight: 1.1, mb: 0.5 }}>
        {value}
      </Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </Paper>
  );
}

function KpiSkeleton() {
  return (
    <Paper sx={{ p: 2.5, border: "1px solid #E4E8F0", height: "100%" }}>
      <Skeleton variant="text" width="60%" height={16} sx={{ mb: 1 }} />
      <Skeleton variant="text" width="40%" height={48} sx={{ mb: 0.5 }} />
      <Skeleton variant="text" width="70%" height={14} />
    </Paper>
  );
}

export default function GovernanceAnalytics({ onError, onLoadingChange }: Props) {
  const [data, setData]       = useState<AnalyticsSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed]   = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    onLoadingChange(true);
    try {
      const res = await api.get("/api/analytics/summary");
      setData(res.data);
      setLastUpdated(new Date());
    } catch {
      setFailed(true);
      onError("Failed to load analytics. Check that reporting-service is running on port 8086.");
    } finally {
      setLoading(false);
      onLoadingChange(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  // Merge grievance + certificate monthly data for trend chart
  const trendData = data
    ? data.grievancesByMonth.map(g => {
        const cert = data.certificatesByMonth.find(c => c.month === g.month);
        return { month: g.month, Grievances: g.count, Certificates: cert?.count ?? 0 };
      })
    : [];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2.5, background: "linear-gradient(135deg, #0F2557, #1A3A8F)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <BarChartIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F2557", lineHeight: 1.1 }}>
              Governance Analytics
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString("en-IN")}` : "Executive dashboard — all departments"}
            </Typography>
          </Box>
        </Box>
        <Button variant="outlined" size="small" startIcon={<RefreshIcon />}
          onClick={load} disabled={loading}>
          Refresh
        </Button>
      </Box>

      {failed && (
        <Alert severity="error" sx={{ mb: 2.5 }}
          action={<Button color="error" size="small" onClick={load}>Retry</Button>}>
          Failed to load analytics. Ensure reporting-service is running on port 8086 and the gateway route is configured.
        </Alert>
      )}

      {data?.overdueGrievances && data.overdueGrievances > 0 ? (
        <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 2.5 }}>
          {data.overdueGrievances} grievance{data.overdueGrievances > 1 ? "s" : ""} have breached SLA and need immediate attention.
        </Alert>
      ) : null}

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {loading ? (
          [1,2,3,4,5,6].map(i => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }} key={i}>
              <KpiSkeleton />
            </Grid>
          ))
        ) : data ? (
          <>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <KpiCard
                label="Citizen Satisfaction"
                value={`${data.citizenSatisfactionScore}/5`}
                sub="avg rating across services"
                icon={<StarIcon fontSize="small" />}
                color={data.citizenSatisfactionScore < 4.0 ? "#C62828" : "#E65100"}
                bg={data.citizenSatisfactionScore < 4.0 ? "#FFEBEE" : "#FFF3E0"}
                warn={data.citizenSatisfactionScore < 4.0}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <KpiCard
                label="Service SLA"
                value={`${data.serviceSlaPercent}%`}
                sub="grievances resolved on time"
                icon={<VerifiedIcon fontSize="small" />}
                color={data.serviceSlaPercent >= 90 ? "#2E7D32" : "#C62828"}
                bg={data.serviceSlaPercent >= 90 ? "#E8F5E9" : "#FFEBEE"}
                warn={data.serviceSlaPercent < 90}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <KpiCard
                label="Total Disbursed"
                value={fmtK(data.totalRevenueDisbursed)}
                sub="welfare fund disbursements"
                icon={<AccountBalanceWalletIcon fontSize="small" />}
                color="#1A3A8F"
                bg="#E8EDFB"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <KpiCard
                label="Budget Utilized"
                value={`${data.budgetUtilizationPercent}%`}
                sub="of total welfare budget"
                icon={<BarChartIcon fontSize="small" />}
                color={data.budgetUtilizationPercent > 80 ? "#C62828" : "#6A1B9A"}
                bg={data.budgetUtilizationPercent > 80 ? "#FFEBEE" : "#F3E5F5"}
                warn={data.budgetUtilizationPercent > 80}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <KpiCard
                label="Total Requests"
                value={data.totalRequests >= 1000 ? `${(data.totalRequests / 1000).toFixed(1)}K` : String(data.totalRequests)}
                sub="grievances + certs + welfare"
                icon={<GavelIcon fontSize="small" />}
                color="#0F2557"
                bg="#E8EDFB"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <KpiCard
                label="Complaint Trend"
                value={`${data.complaintChangePercent > 0 ? "↑" : "↓"}${Math.abs(data.complaintChangePercent)}%`}
                sub={data.complaintChangePercent < 0 ? "vs last month (good)" : "vs last month"}
                icon={data.complaintChangePercent < 0 ? <TrendingDownIcon fontSize="small" /> : <TrendingUpIcon fontSize="small" />}
                color={data.complaintChangePercent < 0 ? "#2E7D32" : "#C62828"}
                bg={data.complaintChangePercent < 0 ? "#E8F5E9" : "#FFEBEE"}
                warn={data.complaintChangePercent > 0}
              />
            </Grid>
          </>
        ) : null}
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Trend Chart */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 2.5, border: "1px solid #E4E8F0", height: 320 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#0F2557", mb: 2 }}>
              Monthly Request Trends
            </Typography>
            {loading ? (
              <Skeleton variant="rectangular" width="100%" height={240} sx={{ borderRadius: 1 }} />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F8" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9AA3B5" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#9AA3B5" }} />
                  <RechartsTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Grievances" stroke="#E65100" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Certificates" stroke="#1A3A8F" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Citizen Stats */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2.5, border: "1px solid #E4E8F0", height: 320 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#0F2557", mb: 2 }}>
              Citizen Overview
            </Typography>
            {loading ? (
              [1,2,3].map(i => <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1, borderRadius: 1 }} />)
            ) : data ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {[
                  { label: "Total Citizens", value: data.totalCitizens, color: "#1A3A8F", bg: "#E8EDFB" },
                  { label: "Active Citizens", value: data.activeCitizens, color: "#2E7D32", bg: "#E8F5E9" },
                  { label: "New This Month", value: data.newCitizensThisMonth, color: "#E65100", bg: "#FFF3E0" },
                ].map(({ label, value, color, bg }) => (
                  <Box key={label} sx={{ p: 1.5, bgcolor: bg, borderRadius: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <GroupsIcon sx={{ color, fontSize: 18 }} />
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "#0F2557" }}>{label}</Typography>
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color }}>{value.toLocaleString("en-IN")}</Typography>
                  </Box>
                ))}
                <Box sx={{ p: 1.5, bgcolor: "#F3E5F5", borderRadius: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <GroupsIcon sx={{ color: "#6A1B9A", fontSize: 18 }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: "#0F2557" }}>Welfare Beneficiaries</Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: "#6A1B9A" }}>{data.totalBeneficiaries.toLocaleString("en-IN")}</Typography>
                </Box>
              </Box>
            ) : null}
          </Paper>
        </Grid>
      </Grid>

      {/* Scheme Utilization Bar Chart */}
      <Paper sx={{ p: 2.5, border: "1px solid #E4E8F0", mb: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#0F2557", mb: 2 }}>
          Welfare Scheme Budget Utilization
        </Typography>
        {loading ? (
          <Skeleton variant="rectangular" width="100%" height={200} sx={{ borderRadius: 1 }} />
        ) : data?.schemeUtilizations ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.schemeUtilizations} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F8" />
              <XAxis dataKey="schemeName" tick={{ fontSize: 10, fill: "#9AA3B5" }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11, fill: "#9AA3B5" }} unit="%" domain={[0, 100]} />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <Paper sx={{ p: 1.5, border: "1px solid #E4E8F0", fontSize: "0.78rem" }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: "block" }}>{d.schemeName}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{d.department}</Typography>
                      <Typography variant="caption" sx={{ display: "block" }}>Utilization: <strong>{d.utilizationPercent}%</strong></Typography>
                      <Typography variant="caption" sx={{ display: "block" }}>Disbursed: <strong>{fmt(d.budgetDisbursed)}</strong></Typography>
                      <Typography variant="caption" sx={{ display: "block" }}>Beneficiaries: <strong>{d.beneficiaryCount}</strong></Typography>
                    </Paper>
                  );
                }}
              />
              <Bar dataKey="utilizationPercent" radius={[4, 4, 0, 0]}>
                {data.schemeUtilizations.map((entry, i) => (
                  <Cell key={i} fill={entry.utilizationPercent >= 80 ? "#C62828" : "#2E7D32"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : null}
      </Paper>

      {/* Department Performance Table */}
      <Paper sx={{ border: "1px solid #E4E8F0", overflow: "hidden", mb: 3 }}>
        <Box sx={{ px: 2.5, py: 1.5, borderBottom: "1px solid #E4E8F0" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#0F2557" }}>
            Department Performance
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#F8F9FC" }}>
                {["Department", "Total Grievances", "Resolved", "Resolution %", "Avg Days", "SLA Breaches", "Certs Processed", "Welfare Apps", "Rating"].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, color: "#5A6072", fontSize: "0.72rem", whiteSpace: "nowrap" }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <TableRow key={i}>
                    {[1,2,3,4,5,6,7,8,9].map(j => (
                      <TableCell key={j}><Skeleton variant="text" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data?.departmentPerformances?.length ? (
                [...data.departmentPerformances]
                  .sort((a, b) => b.resolutionRate - a.resolutionRate)
                  .map(d => {
                    const rs = RATING_STYLE[d.performanceRating] ?? { bg: "#F5F5F5", color: "#9AA3B5" };
                    return (
                      <TableRow key={d.department} hover>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{d.department}</Typography></TableCell>
                        <TableCell><Typography variant="caption">{d.totalGrievances}</Typography></TableCell>
                        <TableCell><Typography variant="caption" sx={{ color: "#2E7D32", fontWeight: 600 }}>{d.resolvedGrievances}</Typography></TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <LinearProgress variant="determinate" value={Math.min(d.resolutionRate, 100)}
                              sx={{ flex: 1, borderRadius: 2, bgcolor: "#E0E0E0", "& .MuiLinearProgress-bar": { bgcolor: d.resolutionRate >= 80 ? "#2E7D32" : "#E65100" } }} />
                            <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 36 }}>{d.resolutionRate.toFixed(0)}%</Typography>
                          </Box>
                        </TableCell>
                        <TableCell><Typography variant="caption">{d.avgResolutionDays.toFixed(1)} days</Typography></TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ color: d.slaBreaches > 0 ? "#C62828" : "#2E7D32", fontWeight: 700 }}>
                            {d.slaBreaches}
                          </Typography>
                        </TableCell>
                        <TableCell><Typography variant="caption">{d.certificatesProcessed}</Typography></TableCell>
                        <TableCell><Typography variant="caption">{d.welfareApplicationsProcessed}</Typography></TableCell>
                        <TableCell>
                          <Chip size="small" label={d.performanceRating.replace("_", " ")}
                            sx={{ fontSize: "0.65rem", fontWeight: 700, bgcolor: rs.bg, color: rs.color }} />
                        </TableCell>
                      </TableRow>
                    );
                  })
              ) : (
                <TableRow>
                  <TableCell colSpan={9} sx={{ textAlign: "center", py: 4, color: "#9AA3B5" }}>
                    No department data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Metrics Detail Row */}
      <Grid container spacing={2}>
        {/* Grievance Metrics */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2.5, border: "1px solid #E4E8F0", height: "100%" }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "#E65100", textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.68rem", display: "block", mb: 1.5 }}>
              Grievance Metrics
            </Typography>
            {loading ? [1,2,3,4,5].map(i => <Skeleton key={i} variant="text" sx={{ mb: 0.5 }} />) :
            data ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                {[
                  { label: "Total", value: data.totalGrievances },
                  { label: "Resolved", value: data.resolvedGrievances, color: "#2E7D32" },
                  { label: "Open", value: data.openGrievances, color: "#E65100" },
                  { label: "Overdue", value: data.overdueGrievances, color: "#C62828" },
                  { label: "Avg Resolution", value: `${data.avgResolutionDays.toFixed(1)} days` },
                ].map(({ label, value, color }) => (
                  <Box key={label} sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: color ?? "#0F2557" }}>{value}</Typography>
                  </Box>
                ))}
              </Box>
            ) : null}
          </Paper>
        </Grid>

        {/* Certificate Metrics */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2.5, border: "1px solid #E4E8F0", height: "100%" }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "#1A3A8F", textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.68rem", display: "block", mb: 1.5 }}>
              Certificate Metrics
            </Typography>
            {loading ? [1,2,3,4,5].map(i => <Skeleton key={i} variant="text" sx={{ mb: 0.5 }} />) :
            data ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                {[
                  { label: "Total", value: data.totalCertificates },
                  { label: "Approved", value: data.approvedCertificates, color: "#2E7D32" },
                  { label: "Pending", value: data.pendingCertificates, color: "#E65100" },
                  { label: "Rejected", value: data.rejectedCertificates, color: "#C62828" },
                  { label: "Avg Processing", value: `${data.avgProcessingDays.toFixed(1)} days` },
                ].map(({ label, value, color }) => (
                  <Box key={label} sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: color ?? "#0F2557" }}>{value}</Typography>
                  </Box>
                ))}
              </Box>
            ) : null}
          </Paper>
        </Grid>

        {/* Welfare Metrics */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2.5, border: "1px solid #E4E8F0", height: "100%" }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "#6A1B9A", textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.68rem", display: "block", mb: 1.5 }}>
              Welfare Metrics
            </Typography>
            {loading ? [1,2,3,4,5].map(i => <Skeleton key={i} variant="text" sx={{ mb: 0.5 }} />) :
            data ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                {[
                  { label: "Total Applications", value: data.totalWelfareApplications },
                  { label: "Approved", value: data.approvedWelfareApplications, color: "#2E7D32" },
                  { label: "Beneficiaries", value: data.totalBeneficiaries, color: "#6A1B9A" },
                  { label: "Total Disbursed", value: fmtK(data.totalAmountDisbursed) },
                  { label: "Budget Allocated", value: fmtK(data.totalBudgetAllocated) },
                ].map(({ label, value, color }) => (
                  <Box key={label} sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: color ?? "#0F2557" }}>{value}</Typography>
                  </Box>
                ))}
              </Box>
            ) : null}
          </Paper>
        </Grid>

        {/* SLA Summary */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2.5, border: "1px solid #E4E8F0", height: "100%" }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "#2E7D32", textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.68rem", display: "block", mb: 1.5 }}>
              Performance Summary
            </Typography>
            {loading ? [1,2,3].map(i => <Skeleton key={i} variant="rectangular" height={40} sx={{ mb: 1, borderRadius: 1 }} />) :
            data ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Box sx={{ p: 1.5, bgcolor: data.serviceSlaPercent >= 90 ? "#E8F5E9" : "#FFEBEE", borderRadius: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Service SLA</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: data.serviceSlaPercent >= 90 ? "#2E7D32" : "#C62828" }}>
                    {data.serviceSlaPercent}%
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, bgcolor: data.citizenSatisfactionScore >= 4.0 ? "#E8F5E9" : "#FFEBEE", borderRadius: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Citizen Satisfaction</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: data.citizenSatisfactionScore >= 4.0 ? "#2E7D32" : "#C62828" }}>
                    {data.citizenSatisfactionScore} / 5
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, bgcolor: "#F8F9FC", borderRadius: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Dept Rating</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "#1A3A8F", mt: 0.25 }}>
                    {data.departmentPerformances.filter(d => d.performanceRating === "EXCELLENT").length} Excellent ·{" "}
                    {data.departmentPerformances.filter(d => d.performanceRating === "GOOD").length} Good ·{" "}
                    {data.departmentPerformances.filter(d => d.performanceRating === "NEEDS_IMPROVEMENT").length} Needs Work
                  </Typography>
                </Box>
              </Box>
            ) : null}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}