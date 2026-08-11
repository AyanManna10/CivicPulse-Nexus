import { Paper, Typography, Chip, Box, Divider, Button } from "@mui/material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AddCommentIcon from "@mui/icons-material/AddComment";
import type { Grievance } from "../../types";

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  OPEN:        { label: "Open",        color: "#1565C0", bg: "#E3F2FD" },
  IN_PROGRESS: { label: "In Progress", color: "#E65100", bg: "#FFF3E0" },
  RESOLVED:    { label: "Resolved",    color: "#2E7D32", bg: "#E8F5E9" },
  ESCALATED:   { label: "Escalated",   color: "#C62828", bg: "#FFEBEE" },
};

const PRIORITY_COLOR: Record<string, string> = {
  HIGH: "#C62828", MEDIUM: "#E65100", LOW: "#2E7D32"
};

interface Props {
  grievances: Grievance[];
  onFileNew?: () => void;
}

export default function CitizenGrievanceList({ grievances, onFileNew }: Props) {
  const active   = grievances.filter(g => g.status !== "RESOLVED");
  const resolved = grievances.filter(g => g.status === "RESOLVED");

  return (
    <Box>
      {/* Header row */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2.5, background: "linear-gradient(135deg, #0F2557, #1A3A8F)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <AssignmentIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F2557", lineHeight: 1.1 }}>My Grievances</Typography>
            <Typography variant="caption" color="text.secondary">
              {active.length} active · {resolved.length} resolved
            </Typography>
          </Box>
        </Box>
        {onFileNew && (
          <Button variant="contained" size="small" startIcon={<AddCommentIcon />} onClick={() => onFileNew?.()}>
            File New Grievance
          </Button>
        )}
      </Box>

      {grievances.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: "center", border: "1px solid #E4E8F0" }}>
          <AssignmentIcon sx={{ fontSize: 52, color: "#CBD2E0", mb: 1.5 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5, color: "#5A6072" }}>No Grievances Filed</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            You have not filed any grievances yet.
          </Typography>
          {onFileNew && (
            <Button variant="contained" startIcon={<AddCommentIcon />} onClick={onFileNew}>
              File Your First Grievance
            </Button>
          )}
        </Paper>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {grievances.map((g) => {
            const style = STATUS_STYLE[g.status] ?? { label: g.status, color: "#5A6072", bg: "#F0F2F8" };
            const daysLeft = g.dueDate
              ? Math.ceil((new Date(g.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null;

            return (
              <Paper key={g.id} sx={{ overflow: "hidden", border: "1px solid #E4E8F0", display: "flex" }}>
                <Box sx={{ width: 4, bgcolor: style.color, flexShrink: 0 }} />
                <Box sx={{ flex: 1, p: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.75 }}>
                    <Box sx={{ flex: 1, minWidth: 0, mr: 1 }}>
                      <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 700, color: "#9AA3B5", display: "block" }}>
                        #{g.id}
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                        {g.title}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 0.75, flexShrink: 0 }}>
                      <Chip size="small" label={g.priority}
                        sx={{ bgcolor: PRIORITY_COLOR[g.priority] + "18", color: PRIORITY_COLOR[g.priority], fontWeight: 700, fontSize: "0.65rem", height: 20 }} />
                      <Chip size="small" label={style.label}
                        sx={{ bgcolor: style.bg, color: style.color, fontWeight: 700, fontSize: "0.72rem" }} />
                    </Box>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: "0.82rem" }}>
                    {g.description}
                  </Typography>

                  <Divider sx={{ mb: 1 }} />

                  <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                    {g.department && (
                      <Box>
                        <Typography variant="caption" sx={{ color: "#9AA3B5", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.62rem", display: "block" }}>Department</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "0.78rem" }}>{g.department}</Typography>
                      </Box>
                    )}
                    {g.assignedOfficer && (
                      <Box>
                        <Typography variant="caption" sx={{ color: "#9AA3B5", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.62rem", display: "block" }}>Officer</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "0.78rem" }}>{g.assignedOfficer}</Typography>
                      </Box>
                    )}
                    {daysLeft !== null && g.status !== "RESOLVED" && (
                      <Box>
                        <Typography variant="caption" sx={{ color: "#9AA3B5", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.62rem", display: "block" }}>SLA</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.78rem", color: daysLeft < 0 ? "#C62828" : daysLeft < 2 ? "#E65100" : "#2E7D32" }}>
                          {daysLeft < 0 ? `Overdue by ${Math.abs(daysLeft)}d` : daysLeft === 0 ? "Due today" : `${daysLeft}d remaining`}
                        </Typography>
                      </Box>
                    )}
                    {g.createdAt && (
                      <Box>
                        <Typography variant="caption" sx={{ color: "#9AA3B5", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.62rem", display: "block" }}>Filed</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "0.78rem" }}>
                          {new Date(g.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}
    </Box>
  );
}