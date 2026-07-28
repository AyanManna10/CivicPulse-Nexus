import { useMemo } from "react";
import { Box, Paper, Typography, Grid, Divider } from "@mui/material";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList
} from "recharts";
import BarChartIcon from "@mui/icons-material/BarChart";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import PendingActionsIcon from "@mui/icons-material/HourglassEmpty";
import type { Grievance } from "../../types";

// ─── Colour tokens ─────────────────────────────────────────────────────────────
const C = {
  navy:    "#0F2557",
  blue:    "#1565C0",
  orange:  "#E65100",
  green:   "#2E7D32",
  red:     "#C62828",
  teal:    "#00897B",
  purple:  "#6A1B9A",
  grey:    "#5A6072",
  indigo:  "#303F9F",
  amber:   "#F57F17",
};

const STATUS_PALETTE: Record<string, string> = {
  OPEN:        C.blue,
  IN_PROGRESS: C.orange,
  RESOLVED:    C.green,
  ESCALATED:   C.red,
  CLOSED:      C.grey,
};

const PRIORITY_PALETTE: Record<string, string> = {
  HIGH:   C.red,
  MEDIUM: C.orange,
  LOW:    C.green,
};

const CERT_PALETTE = [C.blue, C.teal, C.indigo, C.green, C.orange, C.red, C.purple, C.amber];

// ─── Sub-components ────────────────────────────────────────────────────────────

/** A KPI card in the top summary row */
function KpiCard({
  label, value, sub, color, bg, icon,
}: {
  label: string; value: string | number; sub?: string;
  color: string; bg: string; icon: React.ReactNode;
}) {
  return (
    <Box sx={{
      p: 2.5, borderRadius: 2.5, bgcolor: bg,
      border: `1px solid ${color}22`,
      display: "flex", alignItems: "center", gap: 2,
    }}>
      <Box sx={{
        width: 46, height: 46, borderRadius: 2,
        bgcolor: color, display: "flex", alignItems: "center",
        justifyContent: "center", color: "#fff", flexShrink: 0,
      }}>
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontSize: "1.7rem", fontWeight: 800, color, lineHeight: 1 }}>
          {value}
        </Typography>
        <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: C.grey,
          textTransform: "uppercase", letterSpacing: 0.6 }}>
          {label}
        </Typography>
        {sub && (
          <Typography sx={{ fontSize: "0.7rem", color: C.grey, mt: 0.3 }}>{sub}</Typography>
        )}
      </Box>
    </Box>
  );
}

/** Chart card wrapper */
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

/** Custom recharts legend that shows name + count on one line */
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

// ─── Main component ────────────────────────────────────────────────────────────

interface Props {
  certStats: Record<string, number>;
  grievances: Grievance[];
}

export default function ReportsPage({ certStats, grievances }: Props) {
  const now = Date.now();

  // ── Derived datasets ─────────────────────────────────────────────────────────

  const grievanceStatusData = useMemo(() =>
    Object.entries(
      grievances.reduce((acc, g) => {
        acc[g.status] = (acc[g.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name: name.replace("_", " "), value, rawStatus: name }))
  , [grievances]);

  const grievancePriorityData = useMemo(() =>
    Object.entries(
      grievances.reduce((acc, g) => {
        acc[g.priority] = (acc[g.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value }))
  , [grievances]);

  const slaBreached = useMemo(() =>
    grievances.filter(g =>
      g.dueDate && new Date(g.dueDate).getTime() < now && g.status !== "RESOLVED"
    )
  , [grievances, now]);

  const slaData = useMemo(() => [
    { name: "Within SLA", value: grievances.length - slaBreached.length },
    { name: "SLA Breached", value: slaBreached.length },
  ].filter(d => d.value > 0), [grievances.length, slaBreached.length]);

  const certPipelineData = useMemo(() => [
    { name: "Submitted",   value: certStats.submitted          ?? 0 },
    { name: "Verifying",   value: certStats.underVerification  ?? 0 },
    { name: "Verified",    value: certStats.verified           ?? 0 },
    { name: "Approved",    value: certStats.approved           ?? 0 },
    { name: "Rejected",    value: certStats.rejected           ?? 0 },
    { name: "Issued",      value: certStats.generated          ?? 0 },
    { name: "Downloaded",  value: certStats.downloaded         ?? 0 },
  ].filter(d => d.value > 0), [certStats]);

  const deptBarData = useMemo(() => {
    const deptMap: Record<string, { ok: number; breached: number }> = {};
    grievances.forEach(g => {
      const dept = (g.department || "Unassigned").replace(" Department", "");
      if (!deptMap[dept]) deptMap[dept] = { ok: 0, breached: 0 };
      const over = g.dueDate && new Date(g.dueDate).getTime() < now && g.status !== "RESOLVED";
      if (over) deptMap[dept].breached++;
      else deptMap[dept].ok++;
    });
    return Object.entries(deptMap).map(([dept, { ok, breached }]) => ({
      dept, "Within SLA": ok, "SLA Breached": breached,
    }));
  }, [grievances, now]);

  const resolvedCount = grievances.filter(g => g.status === "RESOLVED").length;
  const slaCompliancePct = grievances.length > 0
    ? Math.round(((grievances.length - slaBreached.length) / grievances.length) * 100)
    : 100;

  // ── Donut chart shared config ─────────────────────────────────────────────────
  // Using innerRadius to create donut + NO label prop = zero overlap
  const DONUT = { cx: "50%", cy: "50%", innerRadius: 52, outerRadius: 85 };

  const EmptyState = ({ msg }: { msg: string }) => (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
      <Typography variant="body2" color="text.secondary">{msg}</Typography>
    </Box>
  );

  return (
    <Box>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: 2.5,
          background: `linear-gradient(135deg, ${C.navy}, #1A3A8F)`,
          display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
          <BarChartIcon />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: C.navy, lineHeight: 1.1 }}>
            Reports & Analytics
          </Typography>
          <Typography variant="caption" color="text.secondary">
            System-wide performance metrics and SLA compliance
          </Typography>
        </Box>
      </Box>

      {/* ── KPI row ─────────────────────────────────────────────────────── */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 2, mb: 3 }}>
        <KpiCard label="Total Grievances" value={grievances.length}
          color={C.navy} bg="#EEF1FA"
          icon={<TrendingUpIcon fontSize="small" />} />
        <KpiCard label="SLA Compliance" value={`${slaCompliancePct}%`}
          sub={`${grievances.length - slaBreached.length} within deadline`}
          color={slaCompliancePct >= 80 ? C.green : C.red} bg={slaCompliancePct >= 80 ? "#E8F5E9" : "#FFEBEE"}
          icon={<CheckCircleOutlineIcon fontSize="small" />} />
        <KpiCard label="SLA Breached" value={slaBreached.length}
          color={slaBreached.length > 0 ? C.red : C.green} bg={slaBreached.length > 0 ? "#FFEBEE" : "#E8F5E9"}
          icon={<WarningAmberIcon fontSize="small" />} />
        <KpiCard label="Resolved" value={resolvedCount}
          sub={`${grievances.length > 0 ? Math.round((resolvedCount / grievances.length) * 100) : 0}% resolution rate`}
          color={C.green} bg="#E8F5E9"
          icon={<AssignmentTurnedInIcon fontSize="small" />} />
        <KpiCard label="Certs Issued" value={certStats.generated ?? 0}
          sub={`${certStats.downloaded ?? 0} downloaded`}
          color={C.teal} bg="#E0F2F1"
          icon={<PendingActionsIcon fontSize="small" />} />
      </Box>

      <Grid container spacing={2.5}>

        {/* ── Grievance Status Donut ──────────────────────────────────── */}
        <Grid size={{ xs: 12, md: 6 }}>
          <ChartCard title="Grievances by Status" subtitle="Current distribution across all grievance states">
            {grievanceStatusData.length === 0
              ? <EmptyState msg="No grievance data yet" />
              : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie {...DONUT} dataKey="value" data={grievanceStatusData}>
                      {grievanceStatusData.map(entry => (
                        <Cell key={entry.name} fill={STATUS_PALETTE[entry.rawStatus] ?? C.grey} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                    <Legend content={<CountLegend />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
          </ChartCard>
        </Grid>

        {/* ── SLA Compliance Donut ────────────────────────────────────── */}
        <Grid size={{ xs: 12, md: 6 }}>
          <ChartCard title="SLA Compliance" subtitle="Grievances resolved within vs. outside the SLA deadline">
            {slaData.length === 0
              ? <EmptyState msg="No data" />
              : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie {...DONUT} dataKey="value" data={slaData}>
                      <Cell fill={C.green} />
                      <Cell fill={C.red} />
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                    <Legend content={<CountLegend />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
          </ChartCard>
        </Grid>

        {/* ── Priority Donut ──────────────────────────────────────────── */}
        <Grid size={{ xs: 12, md: 6 }}>
          <ChartCard title="Grievances by Priority" subtitle="HIGH / MEDIUM / LOW breakdown">
            {grievancePriorityData.length === 0
              ? <EmptyState msg="No data" />
              : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie {...DONUT} dataKey="value" data={grievancePriorityData}>
                      {grievancePriorityData.map(entry => (
                        <Cell key={entry.name} fill={PRIORITY_PALETTE[entry.name] ?? C.grey} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                    <Legend content={<CountLegend />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
          </ChartCard>
        </Grid>

        {/* ── Certificate Pipeline Donut ──────────────────────────────── */}
        <Grid size={{ xs: 12, md: 6 }}>
          <ChartCard title="Certificate Pipeline" subtitle="Applications at each processing stage">
            {certPipelineData.length === 0
              ? <EmptyState msg="No certificate data yet" />
              : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie {...DONUT} dataKey="value" data={certPipelineData}>
                      {certPipelineData.map((_, i) => (
                        <Cell key={i} fill={CERT_PALETTE[i % CERT_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                    <Legend content={<CountLegend />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
          </ChartCard>
        </Grid>

        {/* ── SLA by Department Bar ────────────────────────────────────── */}
        {deptBarData.length > 0 && (
          <Grid size={12}>
            <ChartCard title="SLA Performance by Department"
              subtitle="Grievances within SLA vs. breached per department" minHeight={320}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={deptBarData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                  barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F8" vertical={false} />
                  <XAxis dataKey="dept" tick={{ fontSize: 12, fill: C.grey }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: C.grey }} tickLine={false} axisLine={false} width={28} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #E4E8F0", fontSize: "0.8rem" }}
                    cursor={{ fill: "#F5F7FF" }}
                  />
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

        {/* ── SLA Breach Detail List ───────────────────────────────────── */}
        {slaBreached.length > 0 && (
          <Grid size={12}>
            <Paper sx={{ border: "1px solid #FFCDD2", borderRadius: 2.5, overflow: "hidden" }}>
              <Box sx={{ px: 2.5, py: 1.5, bgcolor: "#FFEBEE",
                borderBottom: "1px solid #FFCDD2", display: "flex",
                alignItems: "center", gap: 1 }}>
                <WarningAmberIcon sx={{ color: C.red, fontSize: 18 }} />
                <Typography sx={{ color: C.red, fontWeight: 700, fontSize: "0.85rem" }}>
                  {slaBreached.length} grievance{slaBreached.length !== 1 ? "s" : ""} have breached SLA and
                  remain unresolved
                </Typography>
              </Box>
              <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                {slaBreached.slice(0, 8).map(g => {
                  const daysOver = Math.abs(
                    Math.ceil((new Date(g.dueDate!).getTime() - now) / 86_400_000)
                  );
                  return (
                    <Box key={g.id} sx={{
                      display: "flex", alignItems: "center", gap: 2,
                      p: 1.5, bgcolor: "#FFF8F8", borderRadius: 1.5,
                      border: "1px solid #FFCDD2",
                    }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                          #{g.id} — {g.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {g.department || "Unassigned"} · {g.priority} priority ·{" "}
                          {g.status.replace("_", " ")}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                        <Typography sx={{ color: C.red, fontWeight: 700, fontSize: "0.78rem" }}>
                          {daysOver}d overdue
                        </Typography>
                        {g.assignedOfficer && (
                          <Typography variant="caption" color="text.secondary">
                            {g.assignedOfficer}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                })}
                {slaBreached.length > 8 && (
                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", pt: 0.5 }}>
                    + {slaBreached.length - 8} more breached grievances — filter by "SLA Breach" in the
                    Grievance tab to see all
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