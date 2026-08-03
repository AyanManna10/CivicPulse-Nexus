import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism";
import GroupsIcon from "@mui/icons-material/Groups";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import WelfareSchemes from "./components/admin/WelfareSchemes";
import BeneficiaryManagement from "./components/admin/BeneficiaryManagement";
import FundDisbursement from "./components/admin/FundDisbursement";
import { useState, useEffect, useCallback, useRef } from "react";
import CitizenRegistration from "./components/CitizenRegistration";
import CitizenDashboard from "./components/citizen/CitizenDashboard";
import AdminAuditLog from "./components/admin/AdminAuditLog";
import HistoryIcon from "@mui/icons-material/History";
import NotificationPanel from "./components/shared/NotificationPanel";
import {
  Typography, Alert, Button, Box, Chip, Divider, Grid, Paper,
  LinearProgress, Tooltip, Avatar, Badge
} from "@mui/material";

// MUI Icons
import AccountBalanceIcon     from "@mui/icons-material/AccountBalance";
import LogoutIcon             from "@mui/icons-material/Logout";
import DashboardIcon          from "@mui/icons-material/Dashboard";
import DescriptionIcon        from "@mui/icons-material/Description";
import ReportProblemIcon      from "@mui/icons-material/ReportProblem";
import PersonAddIcon          from "@mui/icons-material/PersonAdd";
import AddCommentIcon         from "@mui/icons-material/AddComment";
import ArticleIcon            from "@mui/icons-material/Article";
import BarChartIcon           from "@mui/icons-material/BarChart";
import FolderOpenIcon         from "@mui/icons-material/FolderOpen";
import HowToRegIcon           from "@mui/icons-material/HowToReg";
import GroupIcon              from "@mui/icons-material/Group";
import TrackChangesIcon       from "@mui/icons-material/TrackChangesOutlined";
import AccountCircleIcon      from "@mui/icons-material/AccountCircle";
import SupervisorAccountIcon  from "@mui/icons-material/SupervisorAccount";
import AssignmentIcon         from "@mui/icons-material/Assignment";

import type {
  Grievance, DepartmentInfo, Certificate, CertificateStatus, CertificateType, CitizenProfile
} from "./types";
import {
  loginWithPassword, clearSession, hasSession, setSessionExpiredHandler,
  api, hasAnyRole, getUsername, getUserEmail
} from "./api";

import LoginForm              from "./components/LoginForm";
import Dashboard              from "./components/Dashboard";
import GrievanceForm          from "./components/GrievanceForm";
import GrievanceList          from "./components/GrievanceList";
import CitizenApplyForm       from "./components/citizen/CitizenApplyForm";
import CitizenApplications    from "./components/citizen/CitizenApplications";
import CitizenGrievanceList   from "./components/citizen/CitizenGrievanceList";
import OfficerApplicationList from "./components/officer/OfficerApplicationList";
import OfficerManagement      from "./components/admin/OfficerManagement";
import DeptOfficerManagement  from "./components/officer/DeptOfficerManagement";
import ProfileTab             from "./components/ProfileTab";
import RegisterCitizenPage    from "./components/admin/RegisterCitizenPage";
import ReportsPage            from "./components/admin/ReportsPage";
import CitizenApplyScheme from "./components/citizen/CitizenApplyScheme";
import { usePollingNotifications } from "./hooks/usePollingNotifications";
import CitizenMyBenefits from "./components/citizen/CitizenMyBenefits";
import WelfareApplicationReview from "./components/officer/WelfareApplicationReview";
import OfficerQueueDashboard from "./components/officer/OfficerQueueDashboard";
// ─── Types ────────────────────────────────────────────────────────────────────

interface OfficerProfile {
  id: number;
  officerCode: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  headOfficer: boolean;
  status: string;
  keycloakRole: string;
}

// ─── Nav config ───────────────────────────────────────────────────────────────

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  roles: ("CITIZEN" | "OFFICER" | "ADMIN")[];
  section?: string;
  /** If true, only visible to officers who are department heads */
  headOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  // ── Officer / Admin ────────────────────────────────────────────────────────
  { id: "dashboard",        label: "Dashboard",            icon: <DashboardIcon fontSize="small" />,           roles: ["OFFICER", "ADMIN"] },
  { id: "applications",     label: "Applications",         icon: <DescriptionIcon fontSize="small" />,         roles: ["OFFICER", "ADMIN"], section: "Work" },
  { id: "grievances",       label: "Grievances",           icon: <ReportProblemIcon fontSize="small" />,       roles: ["OFFICER", "ADMIN"], section: "Work" },
  { id: "register-citizen", label: "Register Citizen",     icon: <HowToRegIcon fontSize="small" />,            roles: ["OFFICER", "ADMIN"], section: "Work" },
  { id: "file-grievance",   label: "File Grievance",       icon: <AddCommentIcon fontSize="small" />,          roles: ["OFFICER", "ADMIN"], section: "Work" },
  // Department head: manage their own department's officers
  { id: "dept-officers",    label: "My Dept Officers",     icon: <SupervisorAccountIcon fontSize="small" />,   roles: ["OFFICER"], section: "Management", headOnly: true },
  // Admin-only
  { id: "officer-mgmt",     label: "Manage Officers",      icon: <GroupIcon fontSize="small" />,               roles: ["ADMIN"], section: "Administration" },
  { id: "reports",          label: "Reports & Analytics",  icon: <BarChartIcon fontSize="small" />,            roles: ["ADMIN"], section: "Administration" },
  { id: "audit-log",        label: "Audit Log",            icon: <HistoryIcon fontSize="small" />,             roles: ["ADMIN"], section: "Administration" },
  { id: "profile",          label: "My Profile",           icon: <AccountCircleIcon fontSize="small" />,       roles: ["OFFICER", "ADMIN"], section: "Account" },
 

{ id: "welfare-schemes",   label: "Welfare Schemes",   icon: <VolunteerActivismIcon fontSize="small" />,    roles: ["ADMIN", "OFFICER"] },
{ id: "beneficiaries",     label: "Beneficiaries",     icon: <GroupsIcon fontSize="small" />,               roles: ["ADMIN", "OFFICER"] },
{ id: "fund-disbursement", label: "Fund Disbursement", icon: <AccountBalanceWalletIcon fontSize="small" />,  roles: ["ADMIN", "OFFICER"] },
{ id: "welfare-applications", label: "Welfare Applications", icon: <AssignmentIcon fontSize="small" />,      roles: ["OFFICER"] },

  // ── Citizen ────────────────────────────────────────────────────────────────
  { id: "citizen-dashboard", label: "Dashboard",            icon: <DashboardIcon fontSize="small" />,          roles: ["CITIZEN"] },
  { id: "my-applications",  label: "My Applications",       icon: <FolderOpenIcon fontSize="small" />,         roles: ["CITIZEN"] },
  { id: "apply-scheme", label: "Apply for Scheme",          icon: <VolunteerActivismIcon fontSize="small" />,  roles: ["CITIZEN"] },
  { id: "my-benefits",  label: "My Benefits",               icon: <AccountBalanceWalletIcon fontSize="small" />, roles: ["CITIZEN"] },
  { id: "apply",            label: "Apply for Certificate", icon: <ArticleIcon fontSize="small" />,            roles: ["CITIZEN"] },
  { id: "my-grievances",    label: "My Grievances",         icon: <ReportProblemIcon fontSize="small" />,      roles: ["CITIZEN"] },
  { id: "profile",          label: "My Profile",            icon: <AccountCircleIcon fontSize="small" />,      roles: ["CITIZEN"] },
 
];

function getRoleConfig(roles: string[], officerProfile?: OfficerProfile | null) {
  if (roles.includes("ADMIN"))   return { label: "Administrator",             color: "#C62828", bg: "#FFEBEE", role: "ADMIN"   as const };
  if (roles.includes("OFFICER")) return {
    label: officerProfile?.headOfficer ? "Dept. Head" : "Dept. Officer",
    color: "#383533", bg: "#FFF3E0", role: "OFFICER" as const
  };
  return                                { label: "Citizen",                    color: "#1565C0", bg: "#E3F2FD", role: "CITIZEN" as const };
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  tab, onTabChange, roleConfig, username, overdueCount, pendingCount,
  officerProfile, onLogout, criticalSchemes = 0, docsMissingCount = 0, newCertificateApplications = 0,
}: {
  tab: string;
  onTabChange: (t: string) => void;
  roleConfig: ReturnType<typeof getRoleConfig>;
  username: string;
  overdueCount: number;
  pendingCount: number;
  officerProfile: OfficerProfile | null;
  onLogout: () => void;
  criticalSchemes?: number;
  docsMissingCount?: number;
  newCertificateApplications?: number;
}) {
  
  const isHeadOfficer = officerProfile?.headOfficer === true;

  const visibleItems = NAV_ITEMS.filter((n) => {
    if (!n.roles.includes(roleConfig.role)) return false;
    if (n.headOnly && !isHeadOfficer) return false;
    // Welfare tabs: only ADMIN or Revenue Department officers
    const isWelfareTab = ["welfare-schemes", "beneficiaries", "fund-disbursement"].includes(n.id);
    if (isWelfareTab && !hasAnyRole("ADMIN")) {
      if (officerProfile?.department !== "Revenue Department") return false;
    }
    return true;
  });

  const sections = ["", "Work", "Management", "Administration", "Account"] as const;
  const grouped = sections
    .map((section) => ({
      section,
      items: visibleItems.filter((n) => (section === "" ? !n.section : n.section === section)),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <Box sx={{
      width: 238, minHeight: "100vh", bgcolor: "#0F2557",
      display: "flex", flexDirection: "column", flexShrink: 0,
      position: "sticky", top: 0, height: "100vh", overflowY: "auto",
    }}>
      {/* Logo */}
      <Box sx={{ px: 2.5, py: 2.5, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <Box sx={{
            width: 34, height: 34, borderRadius: 2,
            background: "linear-gradient(135deg, #1565C0, #42A5F5)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <AccountBalanceIcon sx={{ color: "#fff", fontSize: 18 }} />
          </Box>
          <Box>
            <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: "0.95rem", lineHeight: 1.1 }}>
              CivicPulse
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.68rem" }}>
              Nexus Portal
            </Typography>
          </Box>
        </Box>
        {/* Department badge for officers */}
        {officerProfile?.department && (
          <Box sx={{
            mt: 1, px: 1, py: 0.4, borderRadius: 1,
            bgcolor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
          }}>
            <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: "0.62rem", fontWeight: 600 }}>
              {officerProfile.department}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Nav */}
      <Box sx={{ flex: 1, px: 1.5, py: 2 }}>
        {grouped.map(({ section, items }) => (
          <Box key={section || "_"} sx={{ mb: 2 }}>
            {section && (
              <Typography sx={{
                color: "rgba(255,255,255,0.35)", fontSize: "0.65rem", fontWeight: 700,
                letterSpacing: 1.2, textTransform: "uppercase", px: 1.5, mb: 0.5,
              }}>
                {section}
              </Typography>
            )}
            
            {items.map((item) => {
              const isActive = tab === item.id ||
                (item.id === "my-queue" && tab === "dashboard");
              const showBadge = (item.id === "grievances" && overdueCount > 0) ||
                               (item.id === "register-citizen" && pendingCount > 0) ||
                               (item.id === "welfare-schemes" && criticalSchemes > 0) ||
                               (item.id === "beneficiaries" && docsMissingCount > 0) ||
                               (item.id === "applications" && newCertificateApplications > 0);
              const badgeCount = item.id === "grievances" ? overdueCount
                : item.id === "welfare-schemes" ? criticalSchemes
                : item.id === "beneficiaries" ? docsMissingCount
                : item.id === "applications" ? newCertificateApplications
                : pendingCount;
              return (
                <Box
                  key={`${item.id}-${item.roles.join("")}`}
                  onClick={() => onTabChange(item.id)}
                  sx={{
                    display: "flex", alignItems: "center", gap: 1.5,
                    px: 1.5, py: 1, mb: 0.5, borderRadius: 2, cursor: "pointer",
                    bgcolor: isActive ? "rgba(255,255,255,0.15)" : "transparent",
                    borderLeft: isActive ? "3px solid #42A5F5" : "3px solid transparent",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.08)" },
                    transition: "all 0.15s",
                  }}
                >
                  <Box sx={{ color: isActive ? "#42A5F5" : "rgba(255,255,255,0.55)", display: "flex" }}>
                    {showBadge ? (
                      <Badge badgeContent={badgeCount} color="error"
                        sx={{ "& .MuiBadge-badge": { fontSize: "0.6rem", minWidth: 14, height: 14 } }}>
                        {item.icon}
                      </Badge>
                    ) : item.icon}
                  </Box>
                  <Typography sx={{
                    color: isActive ? "#fff" : "rgba(255,255,255,0.7)",
                    fontSize: "0.85rem", fontWeight: isActive ? 700 : 400,
                  }}>
                    {item.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>

      {/* User footer */}
      <Box sx={{ px: 2, py: 2, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
          <Avatar sx={{
            width: 32, height: 32, bgcolor: roleConfig.color,
            fontSize: "0.8rem", fontWeight: 700,
          }}>
            {username.slice(0, 1).toUpperCase()}
          </Avatar>
          <Box sx={{ overflow: "hidden" }}>
            <Typography sx={{
              color: "#fff", fontSize: "0.82rem", fontWeight: 600, lineHeight: 1,
              textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap",
            }}>
              {username}
            </Typography>
            <Box sx={{
              display: "inline-flex", mt: 0.5, px: 1, py: 0.25,
              borderRadius: 1, bgcolor: roleConfig.bg,
            }}>
              <Typography sx={{ color: roleConfig.color, fontSize: "0.64rem", fontWeight: 700 }}>
                {roleConfig.label}
              </Typography>
            </Box>
          </Box>
        </Box>
        <Button fullWidth size="small" startIcon={<LogoutIcon fontSize="small" />} onClick={onLogout}
          sx={{
            color: "rgba(255,255,255,0.6)", justifyContent: "flex-start",
            "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.08)" },
          }}>
          Sign Out
        </Button>
      </Box>
    </Box>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

function TopBar({
  pageTitle, pageSubtitle, loading, overdueCount, pendingCount, deptLabel, criticalSchemes, criticalSchemeNames,
  docsMissingCount, newCertificateApplications, onNavigate, isCitizen,
  citizenPendingApplications, citizenOpenGrievances,
}: {
  pageTitle: string; pageSubtitle?: string; loading: boolean;
  overdueCount: number; pendingCount: number; deptLabel?: string; criticalSchemes?: number; criticalSchemeNames?: string[];
  docsMissingCount?: number; newCertificateApplications?: number;
  onNavigate?: (tab: string) => void;
  isCitizen?: boolean;
  citizenPendingApplications?: number;
  citizenOpenGrievances?: number;
}) {
  return (
    <Box sx={{
      bgcolor: "#fff", borderBottom: "1px solid #E4E8F0", px: 3, py: 1.5,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      position: "sticky", top: 0, zIndex: 10,
    }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F2557", lineHeight: 1 }}>
          {pageTitle}
        </Typography>
        {pageSubtitle && (
          <Typography variant="caption" color="text.secondary">{pageSubtitle}</Typography>
        )}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        {deptLabel && (
          <Chip
            size="small"
            label={deptLabel}
            sx={{ fontSize: "0.68rem", bgcolor: "#E8EDFB", color: "#1A3A8F", fontWeight: 600 }}
          />
        )}
        <NotificationPanel
          overdueCount={overdueCount}
          pendingCount={pendingCount}
          criticalSchemes={criticalSchemes ?? 0}
          criticalSchemeNames={criticalSchemeNames ?? []}
          docsMissingCount={docsMissingCount ?? 0}
          newCertificateApplications={newCertificateApplications ?? 0}
          onNavigate={onNavigate ?? (() => {})}
          isCitizen={isCitizen}
          citizenPendingApplications={citizenPendingApplications ?? 0}
          citizenOpenGrievances={citizenOpenGrievances ?? 0}
        />
        <Box sx={{ ml: 1, px: 1.5, py: 0.5, bgcolor: "#F0F2F8", borderRadius: 1.5, border: "1px solid #E4E8F0" }}>
          <Typography variant="caption" sx={{ color: "#0F2557", fontWeight: 600, fontSize: "0.7rem" }}>
            GOI · Municipal Services
          </Typography>
        </Box>
      </Box>
      {loading && <LinearProgress sx={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2 }} />}
    </Box>
  );
}

// ─── Page meta ────────────────────────────────────────────────────────────────

const PAGE_META: Record<string, { title: string; subtitle?: string }> = {
  "dashboard":        { title: "Dashboard",                         subtitle: "Overview of grievances and SLA compliance" },
  "applications":     { title: "Certificate & Permit Applications", subtitle: "Review, verify and approve citizen applications for your department" },
  "grievances":       { title: "Grievance Management",              subtitle: "Assign, resolve and escalate citizen complaints" },
  "register-citizen": { title: "Register Citizen",                  subtitle: "Directly register a citizen or review self-submitted applications" },
  "profile":          { title: "My Profile",                        subtitle: "View your details and manage account settings" },
  "file-grievance":   { title: "File a Grievance",                  subtitle: "Lodge a complaint on behalf of a citizen" },
  "officer-mgmt":     { title: "Officer Management",                subtitle: "Add officers, assign departments, set department heads" },
  "dept-officers":    { title: "My Department Officers",            subtitle: "Manage officers in your department — edit details, activate/deactivate" },
  "reports":          { title: "Reports & Analytics",               subtitle: "System-wide statistics and performance metrics" },
  "my-applications":  { title: "My Applications",                   subtitle: "Track your certificate and permit applications" },
  "my-benefits":      { title: "My Benefits",                       subtitle: "Track payment status for your approved welfare schemes" },
  "apply":            { title: "Apply for Certificate / Permit",    subtitle: "Submit a new application" },
  "my-grievances":    { title: "My Grievances",                     subtitle: "Track grievances you have filed" },
  "track":            { title: "Track Application",                 subtitle: "Check the current status of a specific application" },
  "citizen-dashboard":{ title: "Dashboard",                         subtitle: "Your services overview" },
  "apply-scheme":     { title: "Apply for Scheme",                  subtitle: "Browse and apply for welfare schemes" },
};

// ─── Track Application (citizen) ──────────────────────────────────────────────

function TrackApplication({ citizenId }: { citizenId: number | null }) {
  const [appNo, setAppNo]     = useState("");
  const [result, setResult]   = useState<any>(null);
  const [err, setErr]         = useState("");
  const [loading, setLoading] = useState(false);

  const search = async () => {
    setErr(""); setResult(null);
    if (!appNo.trim()) { setErr("Enter an application number"); return; }
    setLoading(true);
    try {
      if (!citizenId) { setErr("Citizen profile not resolved — please re-login"); return; }
      const res = await api.get(`/api/certificates/citizen/${citizenId}`);
      const found = (res.data as any[]).find(
        (c) => c.applicationNumber?.toLowerCase() === appNo.trim().toLowerCase()
      );
      if (found) setResult(found);
      else setErr(`No application found with number "${appNo}" under your account.`);
    } catch { setErr("Failed to search — check backend is running"); }
    finally { setLoading(false); }
  };

  const STATUS_META: Record<string, { color: string; label: string }> = {
    SUBMITTED:             { color: "#5A6072", label: "Submitted — awaiting officer review" },
    UNDER_VERIFICATION:    { color: "#E65100", label: "Under Verification" },
    VERIFIED:              { color: "#1565C0", label: "Documents Verified" },
    APPROVED:              { color: "#2E7D32", label: "Approved — certificate being prepared" },
    REJECTED:              { color: "#C62828", label: "Rejected" },
    CERTIFICATE_GENERATED: { color: "#00897B", label: "Certificate / Permit Issued — ready to download" },
    DOWNLOADED:            { color: "#6A1B9A", label: "Downloaded" },
  };

  return (
    <Box sx={{ maxWidth: 600 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: 2.5,
          background: "linear-gradient(135deg, #0F2557, #1A3A8F)",
          display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
        }}>
          <TrackChangesIcon />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F2557", lineHeight: 1.1 }}>
            Track Application
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Enter your application number to see the current status
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: "flex", gap: 1.5, mb: 2 }}>
        <input
          value={appNo} onChange={(e) => setAppNo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="e.g. APP-2026-000001"
          style={{
            flex: 1, padding: "10px 14px", borderRadius: 8,
            border: "1px solid #CBD2E0", fontSize: "0.9rem",
            fontFamily: "inherit", outline: "none", color: "#1A1F36",
          }}
        />
        <Button variant="contained" onClick={search} disabled={loading}>
          {loading ? "Searching..." : "Track"}
        </Button>
      </Box>

      {err && <Alert severity="error" sx={{ borderRadius: 1.5, mb: 2 }}>{err}</Alert>}

      {result && (() => {
        const meta = STATUS_META[result.status] ?? { color: "#5A6072", label: result.status };
        return (
          <Box sx={{ bgcolor: "#fff", borderRadius: 2, border: "1px solid #E4E8F0", overflow: "hidden" }}>
            <Box sx={{ height: 4, bgcolor: meta.color }} />
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 700, color: "#5A6072" }}>
                    {result.applicationNumber}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.25 }}>{result.citizenName}</Typography>
                </Box>
                <Chip label={meta.label} size="small"
                  sx={{ bgcolor: `${meta.color}15`, color: meta.color, fontWeight: 700, fontSize: "0.72rem" }} />
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                {[
                  { label: "Certificate Type",  value: result.certificateType?.replace(/_/g, " ") },
                  { label: "Applied On",         value: new Date(result.appliedAt).toLocaleDateString("en-IN") },
                  { label: "Routed To",          value: result.assignedDepartment ?? "—" },
                  ...(result.verifiedBy        ? [{ label: "Verified By",     value: result.verifiedBy }]     : []),
                  ...(result.decidedBy         ? [{ label: "Decided By",      value: result.decidedBy }]      : []),
                  ...(result.certificateNumber ? [{ label: "Certificate No.", value: result.certificateNumber }] : []),
                  ...(result.rejectionReason   ? [{ label: "Rejection Reason",value: result.rejectionReason }]   : []),
                ].map(({ label, value }) => (
                  <Box key={label}>
                    <Typography variant="caption" sx={{
                      color: "#9AA3B5", fontWeight: 600, textTransform: "uppercase",
                      letterSpacing: 0.5, fontSize: "0.65rem", display: "block",
                    }}>
                      {label}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{value}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        );
      })()}
    </Box>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [username, setUsername]   = useState("AyanManna");
  const [password, setPassword]   = useState("admin123");
  const [loggedIn, setLoggedIn]   = useState(false);
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [tab, setTab]             = useState("dashboard");
  const [showRegistration, setShowRegistration] = useState(false);
  const [citizenAlertCount, setCitizenAlertCount] = useState(0);

  // Shared data state
  const [grievances, setGrievances]         = useState<Grievance[]>([]);
  const [myGrievances, setMyGrievances]     = useState<Grievance[]>([]);
  const [dashboard, setDashboard]           = useState<Record<string, any>>({});
  const [overdue, setOverdue]               = useState<Grievance[]>([]);
  const [departments, setDepartments]       = useState<DepartmentInfo[]>([]);
  const [certificates, setCertificates]     = useState<Certificate[]>([]);
  const [myCertificates, setMyCertificates] = useState<Certificate[]>([]);
  const [certStats, setCertStats]           = useState<Record<string, number>>({});
  const [pendingCount, setPendingCount]     = useState(0);

  // Profile states
  const [citizenProfile, setCitizenProfile]   = useState<CitizenProfile | null>(null);
  const [officerProfile, setOfficerProfile]   = useState<OfficerProfile | null>(null);

  // Ref so loadAll can always read the latest officerProfile without stale closure
  const officerProfileRef = useRef<OfficerProfile | null>(null);
  // Same pattern for citizen — citizenId is null on first render when loadAll runs
  const citizenProfileRef = useRef<CitizenProfile | null>(null);

  const citizenId        = citizenProfile?.id ?? null;
  const [officerCitizenId, setOfficerCitizenId] = useState("1");

  const isAdmin   = hasAnyRole("ADMIN");
  const isOfficer = hasAnyRole("OFFICER");
  const isCitizen = !isAdmin && !isOfficer;
  const currentUsername = getUsername();
  const roleConfig = getRoleConfig(
    isAdmin ? ["ADMIN"] : isOfficer ? ["OFFICER"] : [],
    officerProfile
  );

  // ── Polling: refresh notification counts every 20 s without a full reload ──
  const [criticalSchemes, setCriticalSchemes] = useState(0);
  const [criticalSchemeNames, setCriticalSchemeNames] = useState<string[]>([]);
  const [docsMissingCount, setDocsMissingCount] = useState(0);
  const [newCertificateApplications, setNewCertificateApplications] = useState(0);
  const [notificationCounts, setNotificationCounts] = useState({ pendingApplications: 0, openGrievances: 0 });

  const pollingRole = loggedIn
    ? isAdmin ? "ADMIN" as const : isOfficer ? "OFFICER" as const : "CITIZEN" as const
    : null;

  usePollingNotifications({
    role: pollingRole,
    citizenId,
    department: officerProfile?.department ?? null,
    onUpdate: (counts) => {
      if (pollingRole === "CITIZEN") {
        setCitizenAlertCount(counts.pendingApplications + counts.openGrievances);
        setNotificationCounts({ pendingApplications: counts.pendingApplications, openGrievances: counts.openGrievances });
      } else {
        // Update both badge sources for officer/admin
        setPendingCount(counts.pendingRegistrations);
        setCriticalSchemes(counts.criticalSchemes ?? 0);
        setCriticalSchemeNames(counts.criticalSchemeNames ?? []);
        setDocsMissingCount(counts.docsMissingCount ?? 0);
        setNewCertificateApplications(counts.newCertificateApplications ?? 0);
        if (counts.overdueGrievances !== overdue.length) {
          // Overdue count drifted — trigger a silent grievance refresh
          // (only updates the count badge, not the full table)
          setOverdue(prev =>
            counts.overdueGrievances === prev.length
              ? prev
              : prev.slice(0, counts.overdueGrievances) // shrink to match; full refresh on tab visit
          );
        }
      }
    },
  });

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setLoggedIn(false);
      setError("Session expired — please sign in again");
    });
  }, []);

  // ── Profile resolvers ─────────────────────────────────────────────────────────

  const resolveCitizenProfile = useCallback(async () => {
    if (!hasAnyRole("CITIZEN") || hasAnyRole("ADMIN") || hasAnyRole("OFFICER")) return;
    try {
      const res = await api.get("/api/citizens/me");
      setCitizenProfile(res.data);
      citizenProfileRef.current = res.data;
    } catch {
      setCitizenProfile(null);
      citizenProfileRef.current = null;
    }
  }, []);

  /**
   * Resolves the officer's own profile from the DB via /api/officers/me.
   * Stores it in both state (for UI) and ref (for use inside loadAll callback).
   * Officers who are NOT yet in the DB (Keycloak-only) will silently fail.
   */
  const resolveOfficerProfile = useCallback(async () => {
    if (!hasAnyRole("OFFICER") || hasAnyRole("ADMIN")) return;
    try {
      const res = await api.get("/api/officers/me");
      setOfficerProfile(res.data);
      officerProfileRef.current = res.data;
    } catch {
      // Officer not yet in DB — they can still use the portal, just no dept scoping
      setOfficerProfile(null);
      officerProfileRef.current = null;
    }
  }, []);

  // ── Data loaders ──────────────────────────────────────────────────────────────

  const loadMyCertificates = useCallback(async (cId: number) => {
    try {
      const res = await api.get(`/api/certificates/citizen/${cId}`);
      setMyCertificates(res.data);
    } catch { /* no certs yet */ }
  }, []);

  const loadMyGrievances = useCallback(async (cId: number) => {
    try {
      const res = await api.get(`/api/grievances/my?citizenId=${cId}`);
      setMyGrievances(res.data);
    } catch { /* no grievances yet */ }
  }, []);

  /**
   * Main data loader.
   *
   * Scoping rules:
   * - ADMIN    → loads ALL grievances (/api/grievances) and ALL certs (/api/certificates)
   * - OFFICER  → loads dept-scoped grievances (/api/grievances/department/{dept})
   *              and dept-scoped certs (/api/certificates?department={dept})
   *   * Open/unassigned grievances (dept=null) are NOT returned by the dept endpoint,
   *     so officers never see other departments' work.  Admins see unassigned ones
   *     and do the initial dept+officer assignment.
   * - CITIZEN  → handled separately via citizen profile and citizen-scoped endpoints
   */
  const loadAll = useCallback(async () => {
    setLoading(true);

    // Load pending registration count (officer/admin badge — not for citizens)
    if (hasAnyRole("ADMIN") || hasAnyRole("OFFICER")) {
      try {
        const pendingRes = await api.get("/api/citizens/pending");
        setPendingCount(pendingRes.data.length);
      } catch { /* silent */ }
    }

    try {
      const isAdminRole   = hasAnyRole("ADMIN");
      const isOfficerRole = hasAnyRole("OFFICER");
      const isAdminOrOfficer = isAdminRole || isOfficerRole;

      // Build department → officer map from the full officers list (both roles need this for assignment dropdowns)
      if (isAdminOrOfficer) {
        try {
          const officerRes = await api.get("/api/officers");
          const officerList: any[] = officerRes.data;
          const deptMap: Record<string, string[]> = {};
          officerList
            .filter((o) => o.status === "ACTIVE" && o.keycloakRole !== "ADMIN")
            .forEach((o) => {
              if (!deptMap[o.department]) deptMap[o.department] = [];
              deptMap[o.department].push(o.fullName);
            });
          setDepartments(Object.entries(deptMap).map(([name, officers]) => ({ name, officers })));
        } catch { /* optional */ }
      }

      if (isAdminRole) {
        // ── Admin: full visibility ─────────────────────────────────────────────
        const [gRes, dRes, certRes, statsRes] = await Promise.all([
          api.get("/api/grievances"),
          api.get("/api/grievances/dashboard"),
          api.get("/api/certificates"),
          api.get("/api/certificates/stats"),
        ]);
        const allGrievances: Grievance[] = gRes.data;
        setGrievances(allGrievances);
        setDashboard(dRes.data);
        setOverdue(allGrievances.filter(g =>
          g.dueDate && new Date(g.dueDate).getTime() < Date.now() && g.status !== "RESOLVED"
        ));
        setCertificates(certRes.data);
        setCertStats(statsRes.data);

      } else if (isOfficerRole) {
        // ── Officer: dept-scoped data ──────────────────────────────────────────
        const profile = officerProfileRef.current;
        const dept    = profile?.department;

        if (dept) {
          const [gRes, dRes, certRes, statsRes] = await Promise.all([
            api.get(`/api/grievances/department/${encodeURIComponent(dept)}`),
            api.get("/api/grievances/dashboard"),
            api.get(`/api/certificates?department=${encodeURIComponent(dept)}`),
            api.get("/api/certificates/stats"),
          ]);
          const deptGrievances: Grievance[] = gRes.data;
          setGrievances(deptGrievances);
          setDashboard(dRes.data);
          setOverdue(deptGrievances.filter(g =>
            g.dueDate && new Date(g.dueDate).getTime() < Date.now() && g.status !== "RESOLVED"
          ));
          setCertificates(certRes.data);
          setCertStats(statsRes.data);
        } else {
          // Officer profile not in DB yet — show empty state with guidance
          setGrievances([]);
          setCertificates([]);
        }

      } else {
        // ── Citizen: resolve profile then load citizen-scoped data ─────────────
        await resolveCitizenProfile();
      }
    } catch {
      setError("Failed to load data — check that backend services are running");
    } finally {
      setLoading(false);
    // Citizen alerts: count open grievances + pending scheme applications
    const resolvedCitizenId = citizenProfileRef.current?.id;
    if (hasAnyRole("CITIZEN") && resolvedCitizenId) {
      try {
        const [gRes, aRes] = await Promise.all([
          api.get(`/api/grievances/citizen/${resolvedCitizenId}`).catch(() => ({ data: [] })),
          api.get(`/api/welfare/applications/citizen/${resolvedCitizenId}`).catch(() => ({ data: [] })),
        ]);
        const openGrievances = gRes.data.filter((g: any) =>
          ["SUBMITTED", "ASSIGNED", "IN_PROGRESS"].includes(g.status)
        ).length;
        const pendingApps = aRes.data.filter((a: any) => a.status === "PENDING").length;
        setCitizenAlertCount(openGrievances + pendingApps);
      } catch { /* silent */ }
    }

  };  // end of loadAll}
  }, [resolveCitizenProfile]);

  // After citizenProfile is set, load citizen-scoped data
  useEffect(() => {
    if (citizenProfile?.id) {
      loadMyCertificates(citizenProfile.id);
      loadMyGrievances(citizenProfile.id);
    }
  }, [citizenProfile, loadMyCertificates, loadMyGrievances]);

  // ── Login / Logout ────────────────────────────────────────────────────────────

  const login = async () => {
    setError(""); setLoading(true);
    try {
      await loginWithPassword(username, password);
      setLoggedIn(true);
      
      // Set default tab based on role
      if (hasAnyRole("CITIZEN")) {
        setTab("citizen-dashboard");
      } else if (hasAnyRole("OFFICER")) {
        setTab("dashboard");
      } else if (hasAnyRole("ADMIN")) {
        setTab("dashboard");
      }

      // Resolve the appropriate profile BEFORE loadAll so data is correctly scoped
      if (hasAnyRole("OFFICER") && !hasAnyRole("ADMIN")) {
        await resolveOfficerProfile();
      }

      await loadAll();
      
    } catch {
      setError("Login failed — check your credentials and that Keycloak is running");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearSession();
    setLoggedIn(false);
    setGrievances([]); setMyGrievances([]); setDashboard({});
    setOverdue([]); setDepartments([]); setCertificates([]);
    setMyCertificates([]); setCertStats({}); setCitizenProfile(null);
    setOfficerProfile(null); officerProfileRef.current = null;
    citizenProfileRef.current = null;
    setError(""); setTab("dashboard");
  };
  /**
   * Refresh: re-loads data with the same dept scoping as loadAll.
   * Called after any create/update action (assign, resolve, verify, etc.)
   */
  const refresh = useCallback(async () => {
    if (!loggedIn) return;
    const isAdminRole   = hasAnyRole("ADMIN");
    const isOfficerRole = hasAnyRole("OFFICER");

    try {
      if (isAdminRole) {
        const [gRes, certRes] = await Promise.all([
          api.get("/api/grievances"),
          api.get("/api/certificates"),
        ]);
        const allGrievances: Grievance[] = gRes.data;
        setGrievances(allGrievances);
        setOverdue(allGrievances.filter(g =>
          g.dueDate && new Date(g.dueDate).getTime() < Date.now() && g.status !== "RESOLVED"
        ));
        setCertificates(certRes.data);
      } else if (isOfficerRole) {
        const dept = officerProfileRef.current?.department;
        if (dept) {
          const [gRes, certRes] = await Promise.all([
            api.get(`/api/grievances/department/${encodeURIComponent(dept)}`),
            api.get(`/api/certificates?department=${encodeURIComponent(dept)}`),
          ]);
          const deptGrievances: Grievance[] = gRes.data;
          setGrievances(deptGrievances);
          setOverdue(deptGrievances.filter(g =>
            g.dueDate && new Date(g.dueDate).getTime() < Date.now() && g.status !== "RESOLVED"
          ));
          setCertificates(certRes.data);
        }
      }
    } catch { /* silent — stale data is acceptable on a failed refresh */ }
  }, [loggedIn]);

  const handleSearch = async (name: string, status: CertificateStatus | "", type: CertificateType | "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (name)   params.append("citizenName", name);
      if (status) params.append("status", status);
      if (type)   params.append("type", type);
      // For officers, always scope by dept
      const isOfficerRole = hasAnyRole("OFFICER") && !hasAnyRole("ADMIN");
      const dept = officerProfileRef.current?.department;
      if (isOfficerRole && dept) params.append("department", dept);
      const res = await api.get(`/api/certificates/search?${params.toString()}`);
      setCertificates(res.data);
    } catch { setError("Search failed"); }
    finally { setLoading(false); }
  };

  // ── Pre-login screens ─────────────────────────────────────────────────────────

  if (!loggedIn || !hasSession()) {
    if (showRegistration) {
      return (
        <CitizenRegistration
          onRegistrationSuccess={() => {
            setShowRegistration(false);
            setUsername(""); setPassword("");
          }}
        />
      );
    }
    return (
      <LoginForm
        username={username} password={password} error={error} loading={loading}
        onUsernameChange={setUsername} onPasswordChange={setPassword} onLogin={login}
        onShowRegistration={() => setShowRegistration(true)}
      />
    );
  }

  const pageMeta = PAGE_META[tab] ?? { title: tab };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#F0F2F8" }}>
      <Sidebar
        tab={tab}
        onTabChange={setTab}
        roleConfig={roleConfig}
        username={currentUsername}
        overdueCount={overdue.length}
        pendingCount={pendingCount}
        criticalSchemes={criticalSchemes}
        officerProfile={officerProfile}
        onLogout={logout}
        docsMissingCount={docsMissingCount}
        newCertificateApplications={newCertificateApplications}
      />

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar
          pageTitle={pageMeta.title}
          pageSubtitle={pageMeta.subtitle}
          loading={loading}
          overdueCount={isCitizen ? 0 : overdue.length}
          pendingCount={isCitizen ? 0 : pendingCount}
          deptLabel={
            isOfficer && !isAdmin && officerProfile?.department
              ? officerProfile.department
              : undefined
          }
          criticalSchemes={isAdmin ? criticalSchemes : 0}
          criticalSchemeNames={isAdmin ? criticalSchemeNames : []}
          docsMissingCount={docsMissingCount}
          newCertificateApplications={newCertificateApplications}
          onNavigate={setTab}
          isCitizen={isCitizen}
          citizenPendingApplications={isCitizen ? notificationCounts.pendingApplications : 0}
          citizenOpenGrievances={isCitizen ? notificationCounts.openGrievances : 0}
        />

        <Box sx={{ flex: 1, p: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          {/* ── Officer profile not found warning ──────────────────────────── */}
          {isOfficer && !isAdmin && !officerProfile && (
            <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2 }}>
              Your officer profile was not found in the system. Contact an administrator to set up
              your department and ensure your email ({getUserEmail()}) is registered.
            </Alert>
          )}

          {/* ── CITIZEN LAYOUT ─────────────────────────────────────────────── */}
          {isCitizen && (
            <>
              {tab === "my-applications" && (
                <Box>
                  <Box sx={{ mb: 3 }}>
                    <TrackApplication citizenId={citizenId} />
                  </Box>
                  <CitizenApplications
                    applications={myCertificates}
                    onError={setError}
                    onLoadingChange={setLoading}
                    onChanged={() => citizenId && loadMyCertificates(citizenId)}
                  />
                </Box>
              )}
              {tab === "apply" && (
                <Box sx={{ maxWidth: 760, mx: "auto" }}>
                  <CitizenApplyForm
                    citizenId={citizenId}
                    loading={loading}
                    onError={setError}
                    onLoadingChange={setLoading}
                    onSuccess={() => {
                      setTab("my-applications");
                      if (citizenId) loadMyCertificates(citizenId);
                    }}
                  />
                </Box>
              )}
              {tab === "apply-scheme" && (
                  <CitizenApplyScheme
                    citizenId={citizenId}
                    citizenName={citizenProfile?.fullName ?? ""}
                    citizenEmail={getUserEmail()}
                    onError={setError}
                    onLoadingChange={setLoading}
                  />
              )}
              {tab === "my-benefits" && (
                  <CitizenMyBenefits
                    citizenId={citizenId}
                    citizenName={citizenProfile?.fullName ?? ""}
                    onError={setError}
                    onLoadingChange={setLoading}
                  />
              )}
              {tab === "my-grievances" && (
                <CitizenGrievanceList
                  grievances={myGrievances}
                  onFileNew={() => setTab("file-grievance")}
                />
              )}
              
              {tab === "profile" && isCitizen && (
                <Box sx={{ maxWidth: 700, mx: "auto" }}>
                  <ProfileTab
                    citizenProfile={citizenProfile}
                    roleLabel={roleConfig.label}
                    roleColor={roleConfig.color}
                    roleBg={roleConfig.bg}
                    onError={setError}
                    onLoadingChange={setLoading}
                  />
                </Box>
              )}
              {tab === "citizen-dashboard" && (
                 <CitizenDashboard
                   citizenId={citizenId}
                   citizenName={citizenProfile?.fullName ?? ""}
                   onError={setError}
                   onLoadingChange={setLoading}
                  />
                )}
              {tab === "file-grievance" && isCitizen && (
  <Grid container spacing={3} sx={{ alignItems: "flex-start" }}>
    <Grid size={{ xs: 12, md: 8 }}>
      <GrievanceForm
        citizenId={String(citizenId ?? "")}
        loading={loading}
        onCitizenIdChange={() => {}}
        onError={setError}
        onLoadingChange={setLoading}
        onGrievanceCreated={() => {
          setTab("my-grievances");
          if (citizenId) loadMyGrievances(citizenId);
        }}
        existingGrievances={myGrievances}
      />
    </Grid>
    <Grid size={{ xs: 12, lg: 4 }}>
                    <Box sx={{ mt: "66px" }}>
                    <Paper sx={{ border: "1px solid #E4E8F0", overflow: "hidden", mb: 2 }}>
                      <Box sx={{ background: "linear-gradient(135deg, #0F2557, #1A3A8F)", px: 2.5, py: 1.5 }}>
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.72rem" }}>
                          How it works
                        </Typography>
                      </Box>
                      <Box sx={{ p: 2 }}>
                        {[
                          { step: "1", text: "Enter the citizen's registered portal ID." },
                          { step: "2", text: "Describe the issue clearly — include location and date." },
                          { step: "3", text: "Set the priority. HIGH issues are resolved within 1 day." },
                          { step: "4", text: "Submit — it will appear in Grievances for assignment." },
                        ].map(({ step, text }) => (
                          <Box key={step} sx={{ display: "flex", gap: 1, mb: 1.5, "&:last-child": { mb: 0 } }}>
                            <Box sx={{ width: 20, height: 20, borderRadius: "50%", bgcolor: "#0F2557", color: "#fff", fontSize: "0.65rem", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, mt: 0.1 }}>
                              {step}
                            </Box>
                            <Typography variant="caption" sx={{ color: "#3D4A6B", lineHeight: 1.6 }}>{text}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </Paper>

                    <Paper sx={{ border: "1px solid #E4E8F0", overflow: "hidden" }}>
                      <Box sx={{ px: 2.5, py: 1.5, bgcolor: "#F0F4FF", borderBottom: "1px solid #E4E8F0" }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: "#1A3A8F", textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.72rem" }}>
                          SLA Reference
                        </Typography>
                      </Box>
                      <Box sx={{ p: 2 }}>
                        {[
                          { label: "HIGH",   sla: "1 day",  color: "#C62828", bg: "#FFEBEE" },
                          { label: "MEDIUM", sla: "3 days", color: "#E65100", bg: "#FFF3E0" },
                          { label: "LOW",    sla: "7 days", color: "#2E7D32", bg: "#E8F5E9" },
                        ].map(({ label, sla, color, bg }) => (
                          <Box key={label} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1, mb: 0.75, borderRadius: 1.5, bgcolor: bg, "&:last-child": { mb: 0 } }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color }}>{label}</Typography>
                            <Typography variant="caption" sx={{ color, fontWeight: 600 }}>Resolve within {sla}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </Paper>
                  </Box>
                  </Grid>
                </Grid>
              )}
            </>
          )}

          {/* ── OFFICER / ADMIN LAYOUT ─────────────────────────────────────── */}
          {(isOfficer || isAdmin) && (
            <>
              {(tab === "dashboard" || tab === "my-queue") && (
                <>
                  {isOfficer && !isAdmin ? (
                    <OfficerQueueDashboard
                      overdue={overdue}
                      pendingCount={pendingCount}
                      officerProfile={officerProfile}
                      onNavigate={setTab}
                    />
                  ) : (
                    <>
                      <Dashboard dashboard={dashboard} overdue={overdue} />

                      {/* Quick actions */}
                      <Box sx={{ mt: 3, bgcolor: "#fff", borderRadius: 2, p: 2.5, border: "1px solid #E4E8F0" }}>
                        <Typography variant="subtitle2" sx={{
                          mb: 1.5, color: "#5A6072", textTransform: "uppercase",
                          letterSpacing: 0.5, fontSize: "0.72rem",
                        }}>
                          Quick Actions
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                          <Button variant="contained" size="small"
                            startIcon={<DescriptionIcon />} onClick={() => setTab("applications")}>
                            {isOfficer && !isAdmin ? "My Dept Applications" : "Review Applications"}
                          </Button>
                          <Button variant="outlined" size="small"
                            startIcon={<ReportProblemIcon />} onClick={() => setTab("grievances")}>
                            {isOfficer && !isAdmin ? "My Dept Grievances" : "Manage Grievances"}
                          </Button>
                          <Button variant="outlined" size="small"
                            startIcon={<PersonAddIcon />} onClick={() => setTab("register-citizen")}>
                            Register Citizen
                          </Button>
                          {officerProfile?.headOfficer && (
                            <Button variant="outlined" size="small"
                              startIcon={<SupervisorAccountIcon />} onClick={() => setTab("dept-officers")}>
                              My Dept Officers
                            </Button>
                          )}
                          {isAdmin && (
                            <>
                              <Button variant="outlined" size="small"
                                startIcon={<GroupIcon />} onClick={() => setTab("officer-mgmt")}>
                                Manage Officers
                              </Button>
                              <Button variant="outlined" size="small" color="secondary"
                                startIcon={<BarChartIcon />} onClick={() => setTab("reports")}>
                                View Reports
                              </Button>
                            </>
                          )}
                        </Box>
                      </Box>

                      {/* Cert pipeline strip */}
                      {Object.keys(certStats).length > 0 && (
                        <Box sx={{ mt: 2, bgcolor: "#fff", borderRadius: 2, p: 2.5, border: "1px solid #E4E8F0" }}>
                          <Typography variant="subtitle2" sx={{
                            mb: 1.5, color: "#5A6072", textTransform: "uppercase",
                            letterSpacing: 0.5, fontSize: "0.72rem",
                          }}>
                            {isOfficer && !isAdmin ? "My Department — Certificate Pipeline" : "Certificate & Permit Pipeline"}
                          </Typography>
                          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                            {[
                              { key: "total",    label: "Total",    color: "#1A3A8F" },
                              { key: "submitted", label: "Submitted", color: "#5A6072" },
                              { key: "verified",  label: "Verified", color: "#1565C0" },
                              { key: "approved",  label: "Approved", color: "#2E7D32" },
                              { key: "rejected",  label: "Rejected", color: "#C62828" },
                              { key: "generated", label: "Issued",   color: "#00897B" },
                            ].map(({ key, label, color }) => (
                              <Box key={key} sx={{
                                textAlign: "center", px: 2, py: 1, borderRadius: 2,
                                border: `1px solid ${color}20`, bgcolor: `${color}08`,
                              }}>
                                <Typography variant="h6" sx={{ fontWeight: 800, color }}>
                                  {certStats[key] ?? 0}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "#5A6072" }}>{label}</Typography>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      )}
                    </>
                  )}
                </>
              )}

              {tab === "applications" && (
                <OfficerApplicationList
                  certificates={certificates}
                  onError={setError}
                  onLoadingChange={setLoading}
                  onChanged={refresh}
                  onSearchChange={handleSearch}
                />
              )}
              {tab === "welfare-applications" && (
                <WelfareApplicationReview
                   officerDept={officerProfile?.department}
                   onError={setError}
                   onLoadingChange={setLoading}
                    />
              )}
              {tab === "grievances" && (
                 <GrievanceList
                  grievances={grievances}
                  departments={departments}
                  canManage={true}
                  userRole={
                  hasAnyRole("ADMIN")
                   ? "ADMIN"
                  : officerProfile?.headOfficer
                   ? "HEAD_OFFICER"
                 : "OFFICER"
                    }
                  officerDept={officerProfile?.department}
                     onError={setError}
                     onLoadingChange={setLoading}
                    onChanged={refresh}
                    />
                    )}

              {tab === "register-citizen" && (
                <RegisterCitizenPage
                  loading={loading}
                  onError={setError}
                  onLoadingChange={setLoading}
                  onCitizenRegistered={(id) => { setOfficerCitizenId(id); setTab("file-grievance"); }}
                />
              )}
              {tab === "audit-log" && isAdmin && (
  <AdminAuditLog onError={setError} onLoadingChange={setLoading} />
)}
              {tab === "file-grievance" && (
                <Grid container spacing={3} sx={{ alignItems: "flex-start" }}>
                  <Grid size={{ xs: 12, lg: 8 }}>
                    <GrievanceForm
                      citizenId={officerCitizenId}
                      loading={loading}
                      onCitizenIdChange={setOfficerCitizenId}
                      onError={setError}
                      onLoadingChange={setLoading}
                      onGrievanceCreated={() => { refresh(); setTab("grievances"); }}
                    />
                  </Grid>
                 
                  <Grid size={{ xs: 12, lg: 4 }}>
                    <Box sx={{ mt: "66px" }}>
                    <Paper sx={{ border: "1px solid #E4E8F0", overflow: "hidden", mb: 2 }}>
                      <Box sx={{ background: "linear-gradient(135deg, #0F2557, #1A3A8F)", px: 2.5, py: 1.5 }}>
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.72rem" }}>
                          How it works
                        </Typography>
                      </Box>
                      <Box sx={{ p: 2 }}>
                        {[
                          { step: "1", text: "Enter the citizen's registered portal ID." },
                          { step: "2", text: "Describe the issue clearly — include location and date." },
                          { step: "3", text: "Set the priority. HIGH issues are resolved within 1 day." },
                          { step: "4", text: "Submit — it will appear in Grievances for assignment." },
                        ].map(({ step, text }) => (
                          <Box key={step} sx={{ display: "flex", gap: 1, mb: 1.5, "&:last-child": { mb: 0 } }}>
                            <Box sx={{ width: 20, height: 20, borderRadius: "50%", bgcolor: "#0F2557", color: "#fff", fontSize: "0.65rem", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, mt: 0.1 }}>
                              {step}
                            </Box>
                            <Typography variant="caption" sx={{ color: "#3D4A6B", lineHeight: 1.6 }}>{text}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </Paper>

                    <Paper sx={{ border: "1px solid #E4E8F0", overflow: "hidden" }}>
                      <Box sx={{ px: 2.5, py: 1.5, bgcolor: "#F0F4FF", borderBottom: "1px solid #E4E8F0" }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: "#1A3A8F", textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.72rem" }}>
                          SLA Reference
                        </Typography>
                      </Box>
                      <Box sx={{ p: 2 }}>
                        {[
                          { label: "HIGH",   sla: "1 day",  color: "#C62828", bg: "#FFEBEE" },
                          { label: "MEDIUM", sla: "3 days", color: "#E65100", bg: "#FFF3E0" },
                          { label: "LOW",    sla: "7 days", color: "#2E7D32", bg: "#E8F5E9" },
                        ].map(({ label, sla, color, bg }) => (
                          <Box key={label} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1, mb: 0.75, borderRadius: 1.5, bgcolor: bg, "&:last-child": { mb: 0 } }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color }}>{label}</Typography>
                            <Typography variant="caption" sx={{ color, fontWeight: 600 }}>Resolve within {sla}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </Paper>
                  </Box>
                  </Grid>
                </Grid>
              )}

              {/* Department Head: manage their own dept officers */}
              {tab === "dept-officers" && isOfficer && !isAdmin && officerProfile?.headOfficer && (
                <DeptOfficerManagement
                  department={officerProfile.department}
                  currentOfficerEmail={officerProfile.email}
                />
              )}

              {/* Admin-only tabs */}
              {tab === "officer-mgmt" && isAdmin && (
                <OfficerManagement onError={setError} onLoadingChange={setLoading} />
              )}

              {tab === "reports" && isAdmin && (
                <ReportsPage certStats={certStats} grievances={grievances} />
              )}

              {tab === "welfare-schemes" && (
  <WelfareSchemes
    onError={setError}
    onLoadingChange={setLoading}
  />
)}

{tab === "beneficiaries" && (
  <BeneficiaryManagement
  onError={setError}
  onLoadingChange={setLoading}
  onGoToDisburse={() => setTab("fund-disbursement")}
/>
)}

{tab === "fund-disbursement" && (
  <FundDisbursement
    onError={setError}
    onLoadingChange={setLoading}
  />
)}

              {tab === "profile" && (isOfficer || isAdmin) && (
                <ProfileTab
                  citizenProfile={null}
                  roleLabel={roleConfig.label}
                  roleColor={roleConfig.color}
                  roleBg={roleConfig.bg}
                  onError={setError}
                  onLoadingChange={setLoading}
                />
              )}
            </>
          )}
        </Box>

        {/* Footer */}
        <Box sx={{
          px: 3, py: 1.5, borderTop: "1px solid #E4E8F0", bgcolor: "#fff",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <Typography variant="caption" color="text.secondary">
            © 2026 CivicPulse Nexus · Government Digital Services
          </Typography>
          <Chip size="small" label="Secured by Keycloak IAM"
            sx={{ fontSize: "0.65rem", height: 20, bgcolor: "#E8EDFB", color: "#1A3A8F" }} />
        </Box>
      </Box>
    </Box>
  );
}