/**
 * AIReportsPage.tsx
 * Replaces ReportsPage.tsx for the CivicPulse Nexus project.
 *
 * Sections:
 *  1. Report type selector
 *  2. AI Report output (header, metrics, chart, analysis, predictions, recommendations, risk)
 *  3. (Placeholder) Legacy charts area — wire in old ReportsPage JSX below the divider comment
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Tooltip,
  Typography,
  Alert,
  Skeleton,
} from "@mui/material";

import type { SelectChangeEvent } from "@mui/material";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import InsightsIcon from "@mui/icons-material/Insights";
import RecommendIcon from "@mui/icons-material/Recommend";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import RefreshIcon from "@mui/icons-material/Refresh";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PsychologyAltIcon from "@mui/icons-material/PsychologyAlt";
import BarChartIcon from "@mui/icons-material/BarChart";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import PendingActionsIcon from "@mui/icons-material/HourglassEmpty";
import GroupsIcon from "@mui/icons-material/Groups";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList,
} from "recharts";
import { api } from "../../api"; // existing axios instance with Authorization header
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


// ─── Palette (matches GovernanceAnalytics.tsx) ────────────────────────────────
const COLOR = {
  navy: "#0F2557",
  blue: "#1565C0",
  orange: "#E65100",
  green: "#2E7D32",
  red: "#C62828",
  amber: "#E65100",
  lightBg: "#F0F4FF",
  border: "#E4E8F0",
};

// ─── Types ────────────────────────────────────────────────────────────────────
type Trend = "UP" | "DOWN" | "FLAT";
type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
type Performance = "Excellent" | "Good" | "Average" | "Poor" | string;

interface KeyMetric {
  label: string;
  value: string;
  trend: Trend;
  insight: string;
}

interface ChartDatum {
  label: string;
  value: number;
  secondary?: number;
}

interface AIReport {
  reportType: string;
  generatedAt: number;
  headline: string;
  performance: Performance;
  keyMetrics: KeyMetric[];
  chartData: ChartDatum[];
  analysis: string;
  predictions: string[];
  recommendations: string[];
  riskLevel: RiskLevel;
  riskNote: string;
}

// ─── Report type config ───────────────────────────────────────────────────────
const REPORT_TYPES = [
  { label: "Grievance Report", key: "grievance" },
  { label: "Citizen Report", key: "citizen" },
  { label: "Budget Report", key: "budget" },
  { label: "Certificate Report", key: "certificate" },
  { label: "Department Performance Report", key: "department" },
  { label: "Citizen Satisfaction Report", key: "satisfaction" },
] as const;

type ReportKey = (typeof REPORT_TYPES)[number]["key"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function performanceColor(p: Performance): string {
  if (p === "Excellent") return COLOR.green;
  if (p === "Good") return COLOR.blue;
  if (p === "Average") return COLOR.amber;
  return COLOR.red;
}

function riskConfig(level: RiskLevel) {
  const map: Record<RiskLevel, { color: "success" | "warning" | "error"; bg: string }> = {
    LOW: { color: "success", bg: "#E8F5E9" },
    MEDIUM: { color: "warning", bg: "#FFF3E0" },
    HIGH: { color: "error", bg: "#FFEBEE" },
  };
  return map[level] ?? map.MEDIUM;
}

function formatTs(ts: number): string {
  return new Date(ts).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** KPI metric card — mirrors GovernanceAnalytics KpiCard style */
function MetricCard({ metric }: { metric: KeyMetric }) {
  const isUp = metric.trend === "UP";
  const isDown = metric.trend === "DOWN";

  return (
    <Paper
      elevation={0}
      sx={{
        border: `1px solid ${COLOR.border}`,
        borderRadius: 2.5,
        p: 2.5,
        height: "100%",
        background: "#FAFBFF",
        transition: "box-shadow 0.2s",
        "&:hover": { boxShadow: "0 4px 16px rgba(15,37,87,0.10)" },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Typography variant="caption" sx={{ color: "#637085", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {metric.label}
        </Typography>
        <Tooltip title={metric.insight} arrow placement="top">
          <IconButton size="small" sx={{ p: 0.25 }}>
            <InfoOutlinedIcon sx={{ fontSize: 16, color: "#9AAABB" }} />
          </IconButton>
        </Tooltip>
      </Box>

      <Typography variant="h5" sx={{ fontWeight: 800, color: COLOR.navy, lineHeight: 1.1 }}>
        {metric.value}
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", mt: 1, gap: 0.5 }}>
        {isUp && <TrendingUpIcon sx={{ fontSize: 18, color: COLOR.green }} />}
        {isDown && <TrendingDownIcon sx={{ fontSize: 18, color: COLOR.red }} />}
        <Typography
          variant="caption"
          sx={{ fontWeight: 600, color: isUp ? COLOR.green : isDown ? COLOR.red : "#637085" }}
        >
          {metric.trend}
        </Typography>
      </Box>
    </Paper>
  );
}

/** Section header shared styling */
function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
      {icon}
      <Typography variant="h6" sx={{ fontWeight: 700, color: COLOR.navy }}>
        {title}
      </Typography>
    </Box>
  );
}

// ─── Legacy Charts Section ────────────────────────────────────────────────────
function LegacyChartsSection() {
  const [data, setData]             = useState<AnalyticsSummaryDto | null>(null);
  const [grievances, setGrievances] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [failed, setFailed]         = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const [analyticsRes, grievanceRes] = await Promise.all([
        api.get("/api/analytics/summary"),
        api.get("/api/grievances").catch(() => ({ data: [] })),
      ]);
      setData(analyticsRes.data);
      setGrievances(grievanceRes.data ?? []);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const C = {
    navy: "#0F2557", blue: "#1565C0", orange: "#E65100", green: "#2E7D32",
    red: "#C62828", teal: "#00897B", purple: "#6A1B9A", grey: "#5A6072",
    indigo: "#303F9F", amber: "#F57F17",
  };

  const STATUS_PALETTE: Record<string, string> = {
    OPEN: C.blue, IN_PROGRESS: C.orange, RESOLVED: C.green, ESCALATED: C.red, CLOSED: C.grey,
  };
  const PRIORITY_PALETTE: Record<string, string> = { HIGH: C.red, MEDIUM: C.orange, LOW: C.green };
  const CERT_PALETTE = [C.blue, C.teal, C.indigo, C.green, C.orange, C.red, C.purple, C.amber];
  const RATING_STYLE: Record<string, { bg: string; color: string }> = {
    EXCELLENT: { bg: "#E8F5E9", color: "#2E7D32" },
    GOOD: { bg: "#E3F2FD", color: "#1565C0" },
    NEEDS_IMPROVEMENT: { bg: "#FFEBEE", color: "#C62828" },
  };

  const DONUT = { cx: "50%", cy: "50%", innerRadius: 52, outerRadius: 85 };
  const now = Date.now();

  const grievanceStatusData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Open",     value: data.openGrievances,     rawStatus: "OPEN" },
      { name: "Resolved", value: data.resolvedGrievances, rawStatus: "RESOLVED" },
      { name: "Overdue",  value: data.overdueGrievances,  rawStatus: "ESCALATED" },
    ].filter(d => d.value > 0);
  }, [data]);

  const slaData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Within SLA",   value: data.totalGrievances - data.overdueGrievances },
      { name: "SLA Breached", value: data.overdueGrievances },
    ].filter(d => d.value > 0);
  }, [data]);

  const certPipelineData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Pending",  value: data.pendingCertificates },
      { name: "Approved", value: data.approvedCertificates },
      { name: "Rejected", value: data.rejectedCertificates },
      { name: "Issued",   value: data.totalCertificates - data.pendingCertificates - data.approvedCertificates - data.rejectedCertificates },
    ].filter(d => d.value > 0);
  }, [data]);

  const deptBarData = useMemo(() => {
    if (!data) return [];
    return data.departmentPerformances.map(d => ({
      dept: d.department.replace(" Department", ""),
      "Within SLA": d.resolvedGrievances,
      "SLA Breached": d.slaBreaches,
    }));
  }, [data]);

  const welfareBarData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Total Applications", value: data.totalWelfareApplications, fill: C.blue },
      { name: "Approved",           value: data.approvedWelfareApplications, fill: C.green },
      { name: "Beneficiaries",      value: data.totalBeneficiaries, fill: C.purple },
    ];
  }, [data]);

  const grievancePriorityData = useMemo(() =>
    Object.entries(
      grievances.reduce((acc: any, g: any) => {
        acc[g.priority] = (acc[g.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value }))
  , [grievances]);

  const slaBreached = useMemo(() =>
    grievances.filter((g: any) =>
      g.dueDate &&
      new Date(g.dueDate).getTime() < Date.now() &&
      g.status !== "RESOLVED" &&
      g.status !== "CLOSED"
    )
  , [grievances]);

  const slaCompliancePct = data
    ? Math.round(((data.totalGrievances - data.overdueGrievances) / Math.max(data.totalGrievances, 1)) * 100)
    : 0;

  function CountLegend({ payload }: { payload?: any[] }) {
    if (!payload?.length) return null;
    return (
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", justifyContent: "center", mt: 1 }}>
        {payload.map((entry: any) => (
          <Box key={entry.value} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: entry.color, flexShrink: 0 }} />
            <Typography sx={{ fontSize: "0.73rem", color: C.grey, fontWeight: 600 }}>
              {entry.value}: <span style={{ color: C.navy }}>{entry.payload?.value ?? ""}</span>
            </Typography>
          </Box>
        ))}
      </Box>
    );
  }

  function ChartCard({ title, subtitle, children, minHeight = 310 }: {
    title: string; subtitle: string; children: React.ReactNode; minHeight?: number;
  }) {
    return (
      <Paper sx={{ p: 3, border: "1px solid #E4E8F0", borderRadius: 2.5,
        minHeight, display: "flex", flexDirection: "column" }}>
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: C.navy }}>{title}</Typography>
          <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ flex: 1 }}>{children}</Box>
      </Paper>
    );
  }

  function EmptyState({ msg }: { msg: string }) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
        <Typography variant="body2" color="text.secondary">{msg}</Typography>
      </Box>
    );
  }

  function SkeletonCard() {
    return (
      <Paper sx={{ p: 3, border: "1px solid #E4E8F0", borderRadius: 2.5, minHeight: 310 }}>
        <Skeleton variant="text" width="40%" height={24} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="60%" height={16} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" width="100%" height={220} sx={{ borderRadius: 1 }} />
      </Paper>
    );
  }

  if (failed) return (
    <Paper sx={{ p: 2, mb: 3, bgcolor: "#FFEBEE", border: "1px solid #FFCDD2", borderRadius: 2 }}>
      <Typography variant="body2" sx={{ color: C.red, fontWeight: 600 }}>
        Failed to load analytics charts.{" "}
        <Button size="small" onClick={load}>Retry</Button>
      </Typography>
    </Paper>
  );

  return (
    <Box>
      {/* KPI row */}
      {loading ? (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 2, mb: 3 }}>
          {[1,2,3,4,5].map(i => <Skeleton key={i} variant="rectangular" height={90} sx={{ borderRadius: 2.5 }} />)}
        </Box>
      ) : data ? (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 2, mb: 3 }}>
          {[
            { label: "Total Grievances", value: data.totalGrievances, color: C.navy, bg: "#EEF1FA" },
            { label: "SLA Compliance", value: `${slaCompliancePct}%`, color: slaCompliancePct >= 80 ? C.green : C.red, bg: slaCompliancePct >= 80 ? "#E8F5E9" : "#FFEBEE" },
            { label: "SLA Breached", value: data.overdueGrievances, color: data.overdueGrievances > 0 ? C.red : C.green, bg: data.overdueGrievances > 0 ? "#FFEBEE" : "#E8F5E9" },
            { label: "Resolved", value: data.resolvedGrievances, color: C.green, bg: "#E8F5E9" },
            { label: "Certs Issued", value: data.approvedCertificates, color: C.teal, bg: "#E0F2F1" },
          ].map(({ label, value, color, bg }) => (
            <Box key={label} sx={{ p: 2.5, borderRadius: 2.5, bgcolor: bg, border: `1px solid ${color}22`, display: "flex", alignItems: "center", gap: 2 }}>
              <Box>
                <Typography sx={{ fontSize: "1.7rem", fontWeight: 800, color, lineHeight: 1 }}>{value}</Typography>
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: C.grey, textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      ) : null}

      <Grid container spacing={2.5}>
        {/* Grievance Status Donut */}
        <Grid size={{ xs: 12, md: 6 }}>
          {loading ? <SkeletonCard /> : (
            <ChartCard title="Grievances by Status" subtitle="Current distribution across all grievance states">
              {grievanceStatusData.length === 0 ? <EmptyState msg="No grievance data yet" /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie {...DONUT} dataKey="value" data={grievanceStatusData}>
                      {grievanceStatusData.map(entry => (
                        <Cell key={entry.name} fill={STATUS_PALETTE[entry.rawStatus] ?? C.grey} />
                      ))}
                    </Pie>
                    <ReTooltip formatter={(v: any, n: any) => [v, n]} />
                    <Legend content={<CountLegend />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          )}
        </Grid>

        {/* SLA Compliance Donut */}
        <Grid size={{ xs: 12, md: 6 }}>
          {loading ? <SkeletonCard /> : (
            <ChartCard title="SLA Compliance" subtitle="Grievances resolved within vs. outside the SLA deadline">
              {slaData.length === 0 ? <EmptyState msg="No data" /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie {...DONUT} dataKey="value" data={slaData}>
                      <Cell fill={C.green} />
                      <Cell fill={C.red} />
                    </Pie>
                    <ReTooltip formatter={(v: any, n: any) => [v, n]} />
                    <Legend content={<CountLegend />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          )}
        </Grid>

        {/* Certificate Pipeline Donut */}
        <Grid size={{ xs: 12, md: 6 }}>
          {loading ? <SkeletonCard /> : (
            <ChartCard title="Certificate Pipeline" subtitle="Applications at each processing stage">
              {certPipelineData.length === 0 ? <EmptyState msg="No certificate data yet" /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie {...DONUT} dataKey="value" data={certPipelineData}>
                      {certPipelineData.map((_, i) => (
                        <Cell key={i} fill={CERT_PALETTE[i % CERT_PALETTE.length]} />
                      ))}
                    </Pie>
                    <ReTooltip formatter={(v: any, n: any) => [v, n]} />
                    <Legend content={<CountLegend />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          )}
        </Grid>

        {/* Priority Donut */}
        <Grid size={{ xs: 12, md: 6 }}>
          {loading ? <SkeletonCard /> : (
            <ChartCard title="Grievances by Priority" subtitle="HIGH / MEDIUM / LOW breakdown">
              {grievancePriorityData.length === 0 ? <EmptyState msg="No data" /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie {...DONUT} dataKey="value" data={grievancePriorityData}>
                      {grievancePriorityData.map(entry => (
                        <Cell key={entry.name} fill={PRIORITY_PALETTE[entry.name] ?? C.grey} />
                      ))}
                    </Pie>
                    <ReTooltip formatter={(v: any, n: any) => [v, n]} />
                    <Legend content={<CountLegend />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          )}
        </Grid>

        {/* Welfare Bar */}
        <Grid size={{ xs: 12, md: 6 }}>
          {loading ? <SkeletonCard /> : (
            <ChartCard title="Welfare Application Status" subtitle="Total applications, approvals, and active beneficiaries">
              {welfareBarData.every(d => d.value === 0) ? <EmptyState msg="No welfare data yet" /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={welfareBarData} margin={{ top: 10, right: 16, left: 0, bottom: 4 }} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F8" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.grey }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: C.grey }} tickLine={false} axisLine={false} width={32} />
                    <ReTooltip contentStyle={{ borderRadius: 8, border: "1px solid #E4E8F0", fontSize: "0.8rem" }} cursor={{ fill: "#F5F7FF" }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {welfareBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      <LabelList dataKey="value" position="top" style={{ fontSize: "0.75rem", fill: C.grey }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          )}
        </Grid>

        {/* SLA by Department Bar */}
        {!loading && deptBarData.length > 0 && (
          <Grid size={12}>
            <ChartCard title="SLA Performance by Department" subtitle="Resolved grievances vs SLA breaches per department" minHeight={320}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={deptBarData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F8" vertical={false} />
                  <XAxis dataKey="dept" tick={{ fontSize: 12, fill: C.grey }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: C.grey }} tickLine={false} axisLine={false} width={28} />
                  <ReTooltip contentStyle={{ borderRadius: 8, border: "1px solid #E4E8F0", fontSize: "0.8rem" }} cursor={{ fill: "#F5F7FF" }} />
                  <Legend wrapperStyle={{ fontSize: "0.78rem" }} />
                  <Bar dataKey="Within SLA" fill={C.green} radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="Within SLA" position="top" style={{ fontSize: "0.7rem", fill: C.green }} />
                  </Bar>
                  <Bar dataKey="SLA Breached" fill={C.red} radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="SLA Breached" position="top" style={{ fontSize: "0.7rem", fill: C.red }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
        )}

        {/* Citizen Statistics */}
        {!loading && data && (
          <Grid size={12}>
            <Paper sx={{ p: 2.5, border: "1px solid #E4E8F0", borderRadius: 2.5 }}>
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: C.navy }}>Citizen Statistics</Typography>
                <Typography variant="caption" color="text.secondary">Registered citizens and growth this month</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 2 }}>
                {[
                  { label: "Total Citizens",        value: data.totalCitizens,        color: C.navy,   bg: "#EEF1FA" },
                  { label: "Active Citizens",        value: data.activeCitizens,       color: C.green,  bg: "#E8F5E9" },
                  { label: "New This Month",         value: data.newCitizensThisMonth, color: C.orange, bg: "#FFF3E0" },
                  { label: "Welfare Beneficiaries",  value: data.totalBeneficiaries,   color: C.purple, bg: "#F3E5F5" },
                ].map(({ label, value, color, bg }) => (
                  <Box key={label} sx={{ p: 2, bgcolor: bg, borderRadius: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box sx={{ width: 38, height: 38, borderRadius: 1.5, bgcolor: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
                      <GroupsIcon fontSize="small" />
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, color, lineHeight: 1 }}>{value.toLocaleString("en-IN")}</Typography>
                      <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: C.grey, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Department Performance Mini-Table */}
        {!loading && data && data.departmentPerformances.length > 0 && (
          <Grid size={12}>
            <Paper sx={{ border: "1px solid #E4E8F0", borderRadius: 2.5, overflow: "hidden" }}>
              <Box sx={{ px: 2.5, py: 1.5, borderBottom: "1px solid #E4E8F0", display: "flex", alignItems: "center", gap: 1 }}>
                <VolunteerActivismIcon sx={{ color: C.navy, fontSize: 18 }} />
                <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: C.navy }}>Department Performance Summary</Typography>
              </Box>
              <Box>
                <Box sx={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr 1fr", px: 2.5, py: 1, bgcolor: "#F8F9FC", borderBottom: "1px solid #E4E8F0" }}>
                  {["Department", "Resolution %", "SLA Breaches", "Rating"].map(h => (
                    <Typography key={h} sx={{ fontSize: "0.72rem", fontWeight: 700, color: C.grey, textTransform: "uppercase", letterSpacing: 0.6 }}>{h}</Typography>
                  ))}
                </Box>
                {[...data.departmentPerformances].sort((a, b) => b.resolutionRate - a.resolutionRate).map((d, i) => {
                  const rs = RATING_STYLE[d.performanceRating] ?? { bg: "#F5F5F5", color: C.grey };
                  return (
                    <Box key={d.department} sx={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr 1fr", px: 2.5, py: 1.25, alignItems: "center", bgcolor: i % 2 === 0 ? "#fff" : "#FAFBFE", borderBottom: "1px solid #F0F2F8", "&:last-child": { borderBottom: "none" } }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{d.department}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: d.resolutionRate >= 80 ? C.green : d.resolutionRate >= 60 ? C.orange : C.red }}>{d.resolutionRate.toFixed(0)}%</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: d.slaBreaches > 0 ? C.red : C.green }}>{d.slaBreaches}</Typography>
                      <Chip size="small" label={d.performanceRating.replace("_", " ")} sx={{ fontSize: "0.65rem", fontWeight: 700, bgcolor: rs.bg, color: rs.color, width: "fit-content" }} />
                    </Box>
                  );
                })}
              </Box>
            </Paper>
          </Grid>
        )}

        {/* SLA Breach Detail List */}
        {!loading && slaBreached.length > 0 && (
          <Grid size={12}>
            <Paper sx={{ border: "1px solid #FFCDD2", borderRadius: 2.5, overflow: "hidden" }}>
              <Box sx={{ px: 2.5, py: 1.5, bgcolor: "#FFEBEE", borderBottom: "1px solid #FFCDD2", display: "flex", alignItems: "center", gap: 1 }}>
                <WarningAmberIcon sx={{ color: C.red, fontSize: 18 }} />
                <Typography sx={{ color: C.red, fontWeight: 700, fontSize: "0.85rem" }}>
                  {slaBreached.length} grievance{slaBreached.length !== 1 ? "s" : ""} have breached SLA and remain unresolved
                </Typography>
              </Box>
              <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                {slaBreached.slice(0, 8).map((g: any) => {
                  const daysOver = Math.abs(Math.ceil((new Date(g.dueDate).getTime() - now) / 86_400_000));
                  return (
                    <Box key={g.id} sx={{ display: "flex", alignItems: "center", gap: 2, p: 1.5, bgcolor: "#FFF8F8", borderRadius: 1.5, border: "1px solid #FFCDD2" }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>#{g.id} — {g.title}</Typography>
                        <Typography variant="caption" color="text.secondary">{g.department || "Unassigned"} · {g.priority} priority · {g.status.replace("_", " ")}</Typography>
                      </Box>
                      <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                        <Typography sx={{ color: C.red, fontWeight: 700, fontSize: "0.78rem" }}>{daysOver}d overdue</Typography>
                        {g.assignedOfficer && <Typography variant="caption" color="text.secondary">{g.assignedOfficer}</Typography>}
                      </Box>
                    </Box>
                  );
                })}
                {slaBreached.length > 8 && (
                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", pt: 0.5 }}>
                    + {slaBreached.length - 8} more — filter by "SLA Breach" in Grievance tab to see all
                  </Typography>
                )}
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const AIReportsPage: React.FC = () => {
  const [selectedType, setSelectedType] = useState<ReportKey | "">("");
  const [report, setReport] = useState<AIReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Partial<Record<ReportKey, AIReport>>>({});

  const fetchReport = useCallback(async (key: ReportKey, bust = false) => {
    if (!bust && cacheRef.current[key]) {
      setReport(cacheRef.current[key]!);
      return;
    }
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await api.get<AIReport>(`/api/analytics/report/${key}`);
      cacheRef.current[key] = res.data;
      setReport(res.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Failed to generate report. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTypeChange = (e: SelectChangeEvent<string>) => {
    const key = e.target.value as ReportKey;
    setSelectedType(key);
    fetchReport(key);
  };

  const handleRegenerate = () => {
    if (selectedType) {
      delete cacheRef.current[selectedType];
      fetchReport(selectedType, true);
    }
  };

  const handleExportPDF = () => window.print();

  const hasSecondary = report?.chartData?.some((d) => d.secondary !== undefined);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: "auto" }}>
      {/* ── Page Title ─────────────────────────────────────────────────────── */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: COLOR.navy, letterSpacing: -0.5 }}>
          AI-Powered Reports
        </Typography>
        <Typography variant="body2" sx={{ color: "#637085", mt: 0.5 }}>
          Select a report type to generate a live AI analysis of your civic data.
        </Typography>
      </Box>

      {/* ── Report Selector + Actions ──────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{ border: `1px solid ${COLOR.border}`, borderRadius: 2.5, p: 2.5, mb: 3 }}
      >
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box sx={{ flex: "1 1 260px", minWidth: 220 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "#637085", textTransform: "uppercase", letterSpacing: 0.5, mb: 0.5, display: "block" }}>
              Report Type
            </Typography>
            <Select
              value={selectedType}
              onChange={handleTypeChange}
              displayEmpty
              fullWidth
              size="small"
              sx={{ borderRadius: 2, background: "#fff" }}
            >
              <MenuItem value="" disabled>
                <Typography color="text.secondary">Select a report…</Typography>
              </MenuItem>
              {REPORT_TYPES.map((r) => (
                <MenuItem key={r.key} value={r.key}>
                  {r.label}
                </MenuItem>
              ))}
            </Select>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, pt: { xs: 0, sm: "18px" } }}>
            <ButtonGroup variant="outlined" size="small">
              <Tooltip title="Regenerate (bypass cache)">
                <span>
                  <Button
                    startIcon={<RefreshIcon />}
                    onClick={handleRegenerate}
                    disabled={!selectedType || loading}
                  >
                    Regenerate
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="Export as PDF">
                <span>
                  <Button
                    startIcon={<PictureAsPdfIcon />}
                    onClick={handleExportPDF}
                    disabled={!report}
                  >
                    Export PDF
                  </Button>
                </span>
              </Tooltip>
            </ButtonGroup>
          </Box>
        </Box>
      </Paper>

      {/* ── Loading State ─────────────────────────────────────────────────── */}
      {loading && (
        <Paper
          elevation={0}
          sx={{
            border: `1px solid ${COLOR.border}`,
            borderRadius: 2.5,
            p: 6,
            mb: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            background: COLOR.lightBg,
          }}
        >
          <CircularProgress size={48} sx={{ color: COLOR.blue }} />
          <Typography variant="h6" sx={{ color: COLOR.navy, fontWeight: 700 }}>
            Generating AI Report…
          </Typography>
          <Typography variant="body2" sx={{ color: "#637085" }}>
            The AI is analysing data and building insights. This may take a few seconds.
          </Typography>
        </Paper>
      )}

      {/* ── Error State ───────────────────────────────────────────────────── */}
      {error && !loading && (
        <Alert
          severity="error"
          sx={{ mb: 3, borderRadius: 2 }}
          action={
            <Button size="small" color="inherit" onClick={handleRegenerate}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* ── AI Report Output ──────────────────────────────────────────────── */}
      {report && !loading && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* 1 ── Header Card ────────────────────────────────────────────── */}
          <Paper
            elevation={0}
            sx={{
              border: `1px solid ${COLOR.border}`,
              borderRadius: 2.5,
              p: 3,
              background: `linear-gradient(135deg, ${COLOR.navy} 0%, #1A3A7A 100%)`,
              color: "#fff",
            }}
          >
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 2, mb: 2 }}>
              <Chip
                label={report.reportType}
                size="small"
                sx={{ background: "rgba(255,255,255,0.18)", color: "#fff", fontWeight: 700, letterSpacing: 0.5 }}
              />
              <Chip
                label={`Performance: ${report.performance}`}
                size="small"
                sx={{ background: performanceColor(report.performance), color: "#fff", fontWeight: 700 }}
              />
              <Chip
                label={`Risk: ${report.riskLevel}`}
                size="small"
                sx={{
                  background: report.riskLevel === "LOW" ? COLOR.green : report.riskLevel === "HIGH" ? COLOR.red : COLOR.amber,
                  color: "#fff",
                  fontWeight: 700,
                }}
              />
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.65)", ml: "auto", alignSelf: "center" }}>
                Generated: {formatTs(report.generatedAt)}
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.3 }}>
              {report.headline}
            </Typography>
          </Paper>

          {/* 2 ── Key Metrics ────────────────────────────────────────────── */}
          <Paper elevation={0} sx={{ border: `1px solid ${COLOR.border}`, borderRadius: 2.5, p: 3 }}>
            <SectionHeader
              icon={<AutoGraphIcon sx={{ color: COLOR.blue }} />}
              title="Key Metrics"
            />
            <Grid container spacing={2}>
              {report.keyMetrics.map((m, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <MetricCard metric={m} />
                </Grid>
              ))}
            </Grid>
          </Paper>

          {/* 3 ── Chart ──────────────────────────────────────────────────── */}
          {report.chartData?.length > 0 && (
            <Paper elevation={0} sx={{ border: `1px solid ${COLOR.border}`, borderRadius: 2.5, p: 3 }}>
              <SectionHeader
                icon={<InsightsIcon sx={{ color: COLOR.blue }} />}
                title="Data Breakdown"
              />
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={report.chartData.map((d) => ({ ...d, name: d.label }))}
                  margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={COLOR.border} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "#637085" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 12, fill: "#637085" }} axisLine={false} tickLine={false} />
                  <ReTooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: `1px solid ${COLOR.border}`,
                      fontSize: 13,
                    }}
                  />
                  {hasSecondary && <Legend />}
                  <Bar dataKey="value" name="Primary" fill={COLOR.blue} radius={[4, 4, 0, 0]} />
                  {hasSecondary && (
                    <Bar dataKey="secondary" name="Secondary" fill={COLOR.orange} radius={[4, 4, 0, 0]} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          )}

          {/* 4 ── AI Analysis ─────────────────────────────────────────────── */}
          <Paper elevation={0} sx={{ border: `1px solid ${COLOR.border}`, borderRadius: 2.5, p: 3 }}>
            <SectionHeader
              icon={<PsychologyAltIcon sx={{ color: COLOR.blue }} />}
              title="AI Analysis"
            />
            <Box
              sx={{
                background: COLOR.lightBg,
                borderLeft: `4px solid ${COLOR.blue}`,
                borderRadius: "0 12px 12px 0",
                p: 2.5,
              }}
            >
              <Typography variant="body1" sx={{ color: "#2C3A4F", lineHeight: 1.75 }}>
                {report.analysis}
              </Typography>
            </Box>
          </Paper>

          {/* 5 ── Predictions ─────────────────────────────────────────────── */}
          {report.predictions?.length > 0 && (
            <Paper elevation={0} sx={{ border: `1px solid ${COLOR.border}`, borderRadius: 2.5, p: 3 }}>
              <SectionHeader
                icon={<TrendingUpIcon sx={{ color: COLOR.blue }} />}
                title="Predictions"
              />
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {report.predictions.map((pred, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 1.5,
                      background: "#F8F9FF",
                      border: `1px solid ${COLOR.border}`,
                      borderRadius: 2,
                      p: 1.5,
                    }}
                  >
                    <Typography sx={{ fontSize: 20, lineHeight: 1 }}>🔮</Typography>
                    <Typography variant="body2" sx={{ color: "#2C3A4F", lineHeight: 1.6 }}>
                      {pred}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          )}

          {/* 6 ── Recommendations ────────────────────────────────────────── */}
          {report.recommendations?.length > 0 && (
            <Paper elevation={0} sx={{ border: `1px solid ${COLOR.border}`, borderRadius: 2.5, p: 3 }}>
              <SectionHeader
                icon={<RecommendIcon sx={{ color: COLOR.blue }} />}
                title="Recommendations"
              />
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {report.recommendations.map((rec, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 2,
                      background: "#EBF2FF",
                      border: "1px solid #C5D8F8",
                      borderRadius: 2,
                      p: 2,
                    }}
                  >
                    <Box
                      sx={{
                        minWidth: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: COLOR.blue,
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: 13,
                        flexShrink: 0,
                        mt: 0.15,
                      }}
                    >
                      {i + 1}
                    </Box>
                    <Typography variant="body2" sx={{ color: "#1A2D55", lineHeight: 1.65 }}>
                      {rec}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          )}

          {/* 7 ── Risk Alert ──────────────────────────────────────────────── */}
          {report.riskNote && (
            <Alert
              severity={riskConfig(report.riskLevel).color}
              icon={<WarningAmberIcon />}
              sx={{
                borderRadius: 2.5,
                border: `1px solid ${COLOR.border}`,
                "& .MuiAlert-message": { width: "100%" },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Risk Level: {report.riskLevel}
                </Typography>
              </Box>
              <Typography variant="body2">{report.riskNote}</Typography>
            </Alert>
          )}
        </Box>
      )}

      {/* ── Empty State ───────────────────────────────────────────────────── */}
      {!report && !loading && !error && (
        <Paper
          elevation={0}
          sx={{
            border: `1px dashed ${COLOR.border}`,
            borderRadius: 2.5,
            p: 6,
            mb: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1.5,
            background: "#FAFBFF",
          }}
        >
          <InsightsIcon sx={{ fontSize: 48, color: "#C5D0E0" }} />
          <Typography variant="h6" sx={{ color: COLOR.navy, fontWeight: 700 }}>
            No Report Selected
          </Typography>
          <Typography variant="body2" sx={{ color: "#637085", textAlign: "center", maxWidth: 380 }}>
            Choose a report type from the dropdown above. The AI will analyse live data and produce a
            structured report within seconds.
          </Typography>
        </Paper>
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          LEGACY CHARTS SECTION
          Wire in the existing charts from old ReportsPage.tsx below this
          divider. They remain fully intact — just positioned after the AI
          report output.
      ───────────────────────────────────────────────────────────────────── */}
      <Divider sx={{ my: 4 }}>
        <Chip label="Analytics Overview" sx={{ fontWeight: 700, color: COLOR.navy, border: `1px solid ${COLOR.border}` }} variant="outlined" />
      </Divider>

      <LegacyChartsSection />

    </Box>
  );
};

export default AIReportsPage;