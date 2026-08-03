import { useState } from "react";
import {
  Box, Typography, Popover, Badge, IconButton, Divider, Button, Chip
} from "@mui/material";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import FolderOffIcon from "@mui/icons-material/FolderOff";
import DescriptionIcon from "@mui/icons-material/Description";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";

interface NotificationItem {
  id: string;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  tab: string;
  count: number;
}

interface Props {
  overdueCount: number;
  pendingCount: number;
  criticalSchemes: number;
  criticalSchemeNames: string[];
  docsMissingCount: number;
  newCertificateApplications: number;
  onNavigate: (tab: string) => void;
  // Citizen-specific
  citizenPendingApplications?: number;
  citizenOpenGrievances?: number;
  isCitizen?: boolean;
}

export default function NotificationPanel({
  overdueCount, pendingCount, criticalSchemes, criticalSchemeNames,
  docsMissingCount, newCertificateApplications, onNavigate,
  citizenPendingApplications = 0, citizenOpenGrievances = 0, isCitizen = false,
}: Props) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);

  const totalCount = isCitizen
    ? citizenPendingApplications + citizenOpenGrievances + docsMissingCount
    : overdueCount + pendingCount + criticalSchemes + docsMissingCount + newCertificateApplications;

  const staffNotifications: NotificationItem[] = [
    overdueCount > 0 && {
      id: "overdue",
      icon: <WarningAmberIcon fontSize="small" />,
      iconColor: "#C62828", iconBg: "#FFEBEE",
      title: `${overdueCount} SLA Breach${overdueCount > 1 ? "es" : ""}`,
      description: "Grievances past their resolution deadline",
      tab: "grievances", count: overdueCount,
    },
    pendingCount > 0 && {
      id: "pending",
      icon: <PersonAddIcon fontSize="small" />,
      iconColor: "#E65100", iconBg: "#FFF3E0",
      title: `${pendingCount} Pending Registration${pendingCount > 1 ? "s" : ""}`,
      description: "Citizens awaiting account approval",
      tab: "register-citizen", count: pendingCount,
    },
    criticalSchemes > 0 && {
      id: "budget",
      icon: <AccountBalanceIcon fontSize="small" />,
      iconColor: "#6A1B9A", iconBg: "#F3E5F5",
      title: `${criticalSchemes} Scheme${criticalSchemes > 1 ? "s" : ""} at 80%+ Budget`,
      description: criticalSchemeNames.slice(0, 2).join(", ") + (criticalSchemeNames.length > 2 ? ` +${criticalSchemeNames.length - 2} more` : ""),
      tab: "welfare-schemes", count: criticalSchemes,
    },
    docsMissingCount > 0 && {
      id: "docs",
      icon: <FolderOffIcon fontSize="small" />,
      iconColor: "#1565C0", iconBg: "#E3F2FD",
      title: `${docsMissingCount} Missing Document${docsMissingCount > 1 ? "s" : ""}`,
      description: "Beneficiaries need to re-upload documents",
      tab: "beneficiaries", count: docsMissingCount,
    },
    newCertificateApplications > 0 && {
      id: "certs",
      icon: <DescriptionIcon fontSize="small" />,
      iconColor: "#00695C", iconBg: "#E0F2F1",
      title: `${newCertificateApplications} New Certificate Application${newCertificateApplications > 1 ? "s" : ""}`,
      description: "Pending review in Applications tab",
      tab: "applications", count: newCertificateApplications,
    },
  ].filter(Boolean) as NotificationItem[];

  const citizenNotifications: NotificationItem[] = [
    docsMissingCount > 0 && {
      id: "docs-missing",
      icon: <FolderOffIcon fontSize="small" />,
      iconColor: "#E65100", iconBg: "#FFF3E0",
      title: `${docsMissingCount} Document Request${docsMissingCount > 1 ? "s" : ""}`,
      description: "Your department office needs additional documents. Go to My Benefits to upload.",
      tab: "my-benefits", count: docsMissingCount,
    },
    citizenPendingApplications > 0 && {
      id: "pending-apps",
      icon: <DescriptionIcon fontSize="small" />,
      iconColor: "#E65100", iconBg: "#FFF3E0",
      title: `${citizenPendingApplications} Pending Application${citizenPendingApplications > 1 ? "s" : ""}`,
      description: "Welfare scheme applications awaiting officer review",
      tab: "apply-scheme", count: citizenPendingApplications,
    },
    citizenOpenGrievances > 0 && {
      id: "open-grievances",
      icon: <WarningAmberIcon fontSize="small" />,
      iconColor: "#1565C0", iconBg: "#E3F2FD",
      title: `${citizenOpenGrievances} Open Grievance${citizenOpenGrievances > 1 ? "s" : ""}`,
      description: "Grievances still being resolved",
      tab: "my-grievances", count: citizenOpenGrievances,
    },
  ].filter(Boolean) as NotificationItem[];

  const notifications = isCitizen ? citizenNotifications : staffNotifications;

  return (
    <>
      <IconButton
        size="small"
        onClick={e => { e.currentTarget.blur(); setAnchor(e.currentTarget); }}
        sx={{ p: 0.5 }}
      >
        <Badge
          badgeContent={totalCount || 0}
          color="error"
          sx={{ "& .MuiBadge-badge": { fontSize: "0.65rem", minWidth: 16, height: 16 } }}
        >
          <NotificationsNoneIcon sx={{ color: "#5A6072" }} />
        </Badge>
      </IconButton>

      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        disableRestoreFocus
        slotProps={{
          paper: {
            sx: {
              width: 360,
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              border: "1px solid #E4E8F0",
              borderRadius: 2,
              overflow: "hidden",
            }
          }
        }}
      >
        {/* Header */}
        <Box sx={{
          px: 2.5, py: 1.5,
          background: "linear-gradient(135deg, #0F2557, #1A3A8F)",
          display: "flex", alignItems: "center", justifyContent: "space-between"
        }}>
          <Typography variant="subtitle2" sx={{ color: "#fff", fontWeight: 700 }}>
            Notifications
          </Typography>
          {totalCount > 0 && (
            <Chip
              label={`${totalCount} active`}
              size="small"
              sx={{ bgcolor: "rgba(255,255,255,0.15)", color: "#fff", fontSize: "0.68rem", height: 20 }}
            />
          )}
        </Box>

        {/* Notification list */}
        <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
          {notifications.length === 0 ? (
            <Box sx={{ py: 4, textAlign: "center" }}>
              <CheckCircleOutlineIcon sx={{ color: "#CBD2E0", fontSize: 36, mb: 1 }} />
              <Typography variant="body2" color="text.secondary">All clear — no alerts right now</Typography>
            </Box>
          ) : (
            notifications.map((n, i) => (
              <Box key={n.id}>
                <Box sx={{
                  px: 2, py: 1.5,
                  display: "flex", gap: 1.5, alignItems: "flex-start",
                  "&:hover": { bgcolor: "#F8F9FC" },
                  transition: "background 0.15s",
                }}>
                  <Box sx={{
                    width: 36, height: 36, borderRadius: 1.5, flexShrink: 0,
                    bgcolor: n.iconBg, color: n.iconColor,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {n.icon}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "#0F2557", lineHeight: 1.2 }}>
                      {n.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25, lineHeight: 1.4 }}>
                      {n.description}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    endIcon={<ArrowForwardIcon sx={{ fontSize: "12px !important" }} />}
                    onClick={(e) => { (e.currentTarget as HTMLElement).blur(); setAnchor(null); setTimeout(() => onNavigate(n.tab), 50); }}
                    sx={{ fontSize: "0.7rem", whiteSpace: "nowrap", flexShrink: 0, p: "2px 6px", minWidth: "auto" }}
                  >
                    View
                  </Button>
                </Box>
                {i < notifications.length - 1 && <Divider />}
              </Box>
            ))
          )}
        </Box>

        {/* Footer */}
        <Box sx={{ px: 2, py: 1, borderTop: "1px solid #E4E8F0", bgcolor: "#F8F9FC" }}>
          <Typography variant="caption" color="text.secondary">
            {notifications.length === 0 ? "Checked just now" : "Auto-refreshes every 20 seconds"}
          </Typography>
        </Box>
      </Popover>
    </>
  );
}