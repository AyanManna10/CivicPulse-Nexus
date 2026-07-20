import { Paper, Typography, Alert, Box } from "@mui/material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import type { Grievance } from "../types";

interface Props {
  dashboard: Record<string, any>;
  overdue: Grievance[];
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  trend?: string;
}

function StatCard({ label, value, icon, color, bgColor, trend }: StatCardProps) {
  return (
    <Paper sx={{
      p: 2.5,
      display: "flex",
      flexDirection: "column",
      gap: 1.5,
      border: "1px solid",
      borderColor: "rgba(0,0,0,0.06)",
      position: "relative",
      overflow: "hidden",
      "&::before": {
        content: '""',
        position: "absolute",
        top: 0,
        left: 0,
        width: 4,
        height: "100%",
        bgcolor: color,
      }
    }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <Box>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.7rem" }}>
            {label}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "text.primary", lineHeight: 1.1, mt: 0.5 }}>
            {value ?? "—"}
          </Typography>
        </Box>
        <Box sx={{
          width: 44, height: 44, borderRadius: 2,
          display: "flex", alignItems: "center", justifyContent: "center",
          bgcolor: bgColor, color,
        }}>
          {icon}
        </Box>
      </Box>
      {trend && (
        <Typography variant="caption" sx={{ color: "success.main", fontWeight: 600 }}>
          {trend}
        </Typography>
      )}
    </Paper>
  );
}

export default function Dashboard({ dashboard, overdue }: Props) {
  const stats = [
    {
      label: "Total Grievances",
      value: dashboard.total ?? 0,
      icon: <AssignmentIcon fontSize="small" />,
      color: "#1A3A8F",
      bgColor: "#E8EDFB",
      trend: undefined,
    },
    {
      label: "Open",
      value: dashboard.open ?? 0,
      icon: <HourglassTopIcon fontSize="small" />,
      color: "#E65100",
      bgColor: "#FFF3E0",
      trend: undefined,
    },
    {
      label: "Resolved",
      value: dashboard.resolved ?? 0,
      icon: <CheckCircleOutlineIcon fontSize="small" />,
      color: "#2E7D32",
      bgColor: "#E8F5E9",
      trend: undefined,
    },
    {
      label: "Escalated",
      value: dashboard.escalated ?? 0,
      icon: <TrendingUpIcon fontSize="small" />,
      color: "#C62828",
      bgColor: "#FFEBEE",
      trend: undefined,
    },
  ];

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2, mb: overdue.length > 0 ? 2 : 0 }}>
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </Box>

      {overdue.length > 0 && (
        <Alert
          severity="error"
          icon={<WarningAmberIcon />}
          sx={{
            borderRadius: 2,
            border: "1px solid #FFCDD2",
            "& .MuiAlert-icon": { color: "#C62828" },
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            ⚠️ SLA Breach Alert — {overdue.length} grievance(s) overdue
          </Typography>
          <Box component="ul" sx={{ m: "4px 0 0 0", pl: 2.5 }}>
            {overdue.map((g) => (
              <li key={g.id}>
                <Typography variant="caption">
                  #{g.id} — <strong>{g.title}</strong> (Due: {g.dueDate})
                </Typography>
              </li>
            ))}
          </Box>
        </Alert>
      )}
    </Box>
  );
}