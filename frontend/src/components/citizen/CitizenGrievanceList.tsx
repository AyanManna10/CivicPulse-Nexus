import { Paper, Typography, Chip, Box, Divider } from "@mui/material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import type { Grievance } from "../../types";

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: "Open", color: "#1565C0", bg: "#E3F2FD" },
  IN_PROGRESS: { label: "In Progress", color: "#E65100", bg: "#FFF3E0" },
  RESOLVED: { label: "Resolved", color: "#2E7D32", bg: "#E8F5E9" },
  ESCALATED: { label: "Escalated", color: "#C62828", bg: "#FFEBEE" },
};

interface Props {
  grievances: Grievance[];
}

export default function CitizenGrievanceList({ grievances }: Props) {
  if (grievances.length === 0) {
    return (
      <Paper sx={{ p: 5, textAlign: "center", border: "1px solid #E4E8F0" }}>
        <AssignmentIcon sx={{ fontSize: 48, color: "#CBD2E0", mb: 1 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>No Grievances Filed</Typography>
        <Typography variant="body2" color="text.secondary">
          You have not filed any grievances. Use "File Grievance" to submit a complaint.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {grievances.map((g) => {
        const style = STATUS_STYLE[g.status] ?? { label: g.status, color: "#5A6072", bg: "#F0F2F8" };
        const daysLeft = g.dueDate
          ? Math.ceil((new Date(g.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null;

        return (
          <Paper key={g.id} sx={{
            overflow: "hidden",
            border: "1px solid #E4E8F0",
            display: "flex",
          }}>
            {/* Left accent */}
            <Box sx={{ width: 4, bgcolor: style.color, flexShrink: 0 }} />

            <Box sx={{ flex: 1, p: 2.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                <Box>
                  <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 700, color: "#5A6072" }}>
                    #{g.id}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    {g.title}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={style.label}
                  sx={{ bgcolor: style.bg, color: style.color, fontWeight: 700, fontSize: "0.72rem" }}
                />
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {g.description}
              </Typography>

              <Divider sx={{ mb: 1.5 }} />

              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                {g.priority && (
                  <Box>
                    <Typography variant="caption" sx={{ color: "#9AA3B5", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.65rem", display: "block" }}>Priority</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: g.priority === "HIGH" ? "#C62828" : g.priority === "MEDIUM" ? "#E65100" : "#2E7D32" }}>
                      {g.priority}
                    </Typography>
                  </Box>
                )}
                {g.department && (
                  <Box>
                    <Typography variant="caption" sx={{ color: "#9AA3B5", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.65rem", display: "block" }}>Department</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{g.department}</Typography>
                  </Box>
                )}
                {g.assignedOfficer && (
                  <Box>
                    <Typography variant="caption" sx={{ color: "#9AA3B5", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.65rem", display: "block" }}>Assigned Officer</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{g.assignedOfficer}</Typography>
                  </Box>
                )}
                {daysLeft !== null && (
                  <Box>
                    <Typography variant="caption" sx={{ color: "#9AA3B5", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.65rem", display: "block" }}>SLA Due</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: daysLeft < 0 ? "#C62828" : daysLeft < 2 ? "#E65100" : "#2E7D32" }}>
                      {daysLeft < 0 ? `Overdue by ${Math.abs(daysLeft)}d` : daysLeft === 0 ? "Due today" : `${daysLeft} day(s) left`}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Paper>
        );
      })}
    </Box>
  );
}