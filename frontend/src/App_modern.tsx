import { useState, useEffect, useCallback } from "react";
import CitizenRegistration from "./components/CitizenRegistration";
import {
  Typography, Alert, Button, Box, Chip, Divider,
  LinearProgress, Tooltip, Avatar, Badge
} from "@mui/material";

// MUI Icons
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import LogoutIcon from "@mui/icons-material/Logout";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DescriptionIcon from "@mui/icons-material/Description";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import AddCommentIcon from "@mui/icons-material/AddComment";
import ArticleIcon from "@mui/icons-material/Article";
import BarChartIcon from "@mui/icons-material/BarChart";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import GroupIcon from "@mui/icons-material/Group";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";

import type { Grievance, DepartmentInfo, Certificate, CertificateStatus, CertificateType, CitizenProfile } from "./types";
import { loginWithPassword, clearSession, hasSession, setSessionExpiredHandler, api, hasAnyRole, getUsername, getUserEmail } from "./api";

import LoginForm from "./components/LoginForm";
import Dashboard from "./components/Dashboard";
import CitizenForm from "./components/CitizenForm";
import GrievanceForm from "./components/GrievanceForm";
import GrievanceList from "./components/GrievanceList";
import CitizenApplyForm from "./components/citizen/CitizenApplyForm";
import CitizenApplications from "./components/citizen/CitizenApplications";
import CitizenGrievanceList from "./components/citizen/CitizenGrievanceList";
import OfficerApplicationList from "./components/officer/OfficerApplicationList";
import OfficerManagement from "./components/admin/OfficerManagement";

// ─── Nav config ───────────────────────────────────────────────────────────────

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  roles: ("CITIZEN" | "OFFICER" | "ADMIN")[];
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  // ── Officer / Admin ────────────────────────────────────────
  { id: "dashboard",        label: "Dashboard",            icon: <DashboardIcon fontSize="small" />,    roles: ["OFFICER", "ADMIN"] },
  { id: "applications",     label: "Applications",         icon: <DescriptionIcon fontSize="small" />,  roles: ["OFFICER", "ADMIN"], section: "Certificates & Permits" },
  { id: "grievances",       label: "Grievances",           icon: <ReportProblemIcon fontSize="small" />, roles: ["OFFICER", "ADMIN"], section: "Certificates & Permits" },
  { id: "register-citizen", label: "Register Citizen",     icon: <HowToRegIcon fontSize="small" />,     roles: ["OFFICER", "ADMIN"], section: "Management" },
  { id: "file-grievance",   label: "File Grievance",       icon: <AddCommentIcon fontSize="small" />,   roles: ["OFFICER", "ADMIN"], section: "Management" },
  // Admin only
  { id: "officer-mgmt",     label: "Manage Officers And Citizens",      icon: <GroupIcon fontSize="small" />,        roles: ["ADMIN"], section: "Administration" },
  { id: "reports",          label: "Reports & Analytics",  icon: <BarChartIcon fontSize="small" />,     roles: ["ADMIN"], section: "Administration" },

  // ── Citizen ────────────────────────────────────────────────
  { id: "my-applications",  label: "My Applications",      icon: <FolderOpenIcon fontSize="small" />,   roles: ["CITIZEN"] },
  { id: "apply",            label: "Apply for Certificate", icon: <ArticleIcon fontSize="small" />,     roles: ["CITIZEN"] },
  { id: "my-grievances",   label: "My Grievances",        icon: <ReportProblemIcon fontSize="small" />, roles: ["CITIZEN"] },
  { id: "track",            label: "Track Application",    icon: <TrackChangesIcon fontSize="small" />, roles: ["CITIZEN"] },
  { id: "file-grievance",   label: "File Grievance",       icon: <AddCommentIcon fontSize="small" />,   roles: ["CITIZEN"] },
];

function getRoleConfig(roles: string[]) {
  if (roles.includes("ADMIN"))   return { label: "Administrator",   color: "#C62828", bg: "#FFEBEE", role: "ADMIN"   as const };
  if (roles.includes("OFFICER")) return { label: "Dept. Officer",   color: "#E65100", bg: "#FFF3E0", role: "OFFICER" as const };
  return                                { label: "Citizen",         color: "#1565C0", bg: "#E3F2FD", role: "CITIZEN" as const };
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ tab, onTabChange, roleConfig, username, overdueCount, onLogout }: {
  tab: string;
  onTabChange: (t: string) => void;
  roleConfig: ReturnType<typeof getRoleConfig>;
  username: string;
  overdueCount: number;
  onLogout: () => void;
}) {
  const visibleItems = NAV_ITEMS.filter((n) => n.roles.includes(roleConfig.role));
  const sections     = ["", "Certificates & Permits", "Management", "Administration"] as const;

  const grouped = sections
    .map((section) => ({
      section,
      items: visibleItems.filter((n) => (section === "" ? !n.section : n.section === section)),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <Box sx={{ width: 238, minHeight: "100vh", bgcolor: "#0F2557", display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
      {/* Logo */}
      <Box sx={{ px: 2.5, py: 2.5, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 34, height: 34, borderRadius: 2, background: "linear-gradient(135deg, #1565C0, #42A5F5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AccountBalanceIcon sx={{ color: "#fff", fontSize: 18 }} />
          </Box>
          <Box>
            <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: "0.95rem", lineHeight: 1.1 }}>CivicPulse</Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.68rem" }}>Nexus Portal</Typography>
          </Box>
        </Box>
      </Box>

      {/* Nav */}
      <Box sx={{ flex: 1, px: 1.5, py: 2 }}>
        {grouped.map(({ section, items }) => (
          <Box key={section || "_"} sx={{ mb: 2 }}>
            {section && (
              <Typography sx={{ color: "rgba(255,255,255,0.35)", fontSize: "0.65rem", fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", px: 1.5, mb: 0.5 }}>
                {section}
              </Typography>
            )}
            {items.map((item) => {
              const isActive   = tab === item.id;
              const showBadge  = item.id === "grievances" && overdueCount > 0;
              return (
                <Box key={`${item.id}-${item.roles.join("")}`} onClick={() => onTabChange(item.id)} sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 1.5, py: 1, mb: 0.5, borderRadius: 2, cursor: "pointer", bgcolor: isActive ? "rgba(255,255,255,0.15)" : "transparent", borderLeft: isActive ? "3px solid #42A5F5" : "3px solid transparent", "&:hover": { bgcolor: "rgba(255,255,255,0.08)" }, transition: "all 0.15s" }}>
                  <Box sx={{ color: isActive ? "#42A5F5" : "rgba(255,255,255,0.55)", display: "flex" }}>
                    {showBadge ? (
                      <Badge badgeContent={overdueCount} color="error" sx={{ "& .MuiBadge-badge": { fontSize: "0.6rem", minWidth: 14, height: 14 } }}>
                        {item.icon}
                      </Badge>
                    ) : item.icon}
                  </Box>
                  <Typography sx={{ color: isActive ? "#fff" : "rgba(255,255,255,0.7)", fontSize: "0.85rem", fontWeight: isActive ? 700 : 400 }}>
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
          <Avatar sx={{ width: 32, height: 32, bgcolor: roleConfig.color, fontSize: "0.8rem", fontWeight: 700 }}>
            {username.slice(0, 1).toUpperCase()}
          </Avatar>
          <Box sx={{ overflow: "hidden" }}>
            <Typography sx={{ color: "#fff", fontSize: "0.82rem", fontWeight: 600, lineHeight: 1, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
              {username}
            </Typography>
            <Box sx={{ display: "inline-flex", mt: 0.5, px: 1, py: 0.25, borderRadius: 1, bgcolor: roleConfig.bg }}>
              <Typography sx={{ color: roleConfig.color, fontSize: "0.64rem", fontWeight: 700 }}>{roleConfig.label}</Typography>
            </Box>
          </Box>
        </Box>
        <Button fullWidth size="small" startIcon={<LogoutIcon fontSize="small" />} onClick={onLogout}
          sx={{ color: "rgba(255,255,255,0.6)", justifyContent: "flex-start", "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.08)" } }}>
          Sign Out
        </Button>
      </Box>
    </Box>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

function TopBar({ pageTitle, pageSubtitle, loading, overdueCount }: {
  pageTitle: string; pageSubtitle?: string; loading: boolean; overdueCount: number;
}) {
  return (
    <Box sx={{ bgcolor: "#fff", borderBottom: "1px solid #E4E8F0", px: 3, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F2557", lineHeight: 1 }}>{pageTitle}</Typography>
        {pageSubtitle && <Typography variant="caption" color="text.secondary">{pageSubtitle}</Typography>}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Tooltip title={overdueCount > 0 ? `${overdueCount} SLA breach(es)` : "No alerts"}>
          <Badge badgeContent={overdueCount} color="error">
            <NotificationsNoneIcon sx={{ color: "#5A6072", cursor: "pointer" }} />
          </Badge>
        </Tooltip>
        <Box sx={{ ml: 1, px: 1.5, py: 0.5, bgcolor: "#F0F2F8", borderRadius: 1.5, border: "1px solid #E4E8F0" }}>
          <Typography variant="caption" sx={{ color: "#0F2557", fontWeight: 600, fontSize: "0.7rem" }}>GOI · Municipal Services</Typography>
        </Box>
      </Box>
      {loading && <LinearProgress sx={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2 }} />}
    </Box>
  );
}

// ─── Page meta ────────────────────────────────────────────────────────────────

const PAGE_META: Record<string, { title: string; subtitle?: string }> = {
  "dashboard":        { title: "Dashboard",                    subtitle: "Overview of grievances and SLA compliance" },
  "applications":     { title: "Certificate & Permit Applications", subtitle: "Review, verify and approve citizen applications" },
  "grievances":       { title: "Grievance Management",         subtitle: "Assign, resolve and escalate citizen complaints" },
  "register-citizen": { title: "Register Citizen",             subtitle: "Enrol a new citizen in the portal" },
  "file-grievance":   { title: "File a Grievance",             subtitle: "Lodge a complaint on behalf of a citizen" },
  "officer-mgmt":     { title: "Officer Management",           subtitle: "Add officers, assign departments, set department heads" },
  "reports":          { title: "Reports & Analytics",          subtitle: "System-wide statistics and performance metrics" },
  "my-applications":  { title: "My Applications",              subtitle: "Track your certificate and permit applications" },
  "apply":            { title: "Apply for Certificate / Permit", subtitle: "Submit a new application" },
  "my-grievances":    { title: "My Grievances",                subtitle: "Track grievances you have filed" },
  "track":            { title: "Track Application",            subtitle: "Check the current status of a specific application" },
};

// ─── Reports view ─────────────────────────────────────────────────────────────

function ReportsView({ certStats }: { certStats: Record<string, number> }) {
  const rows = [
    { label: "Total Applications",    value: certStats.total           ?? 0, color: "#1A3A8F" },
    { label: "Submitted",             value: certStats.submitted        ?? 0, color: "#5A6072" },
    { label: "Under Verification",    value: certStats.underVerification ?? 0, color: "#E65100" },
    { label: "Verified",              value: certStats.verified         ?? 0, color: "#1565C0" },
    { label: "Approved",              value: certStats.approved         ?? 0, color: "#2E7D32" },
    { label: "Rejected",              value: certStats.rejected         ?? 0, color: "#C62828" },
    { label: "Certificates / Permits Issued", value: certStats.generated ?? 0, color: "#00897B" },
    { label: "Downloaded",            value: certStats.downloaded       ?? 0, color: "#6A1B9A" },
  ];
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2, mb: 3 }}>
        {[
          { label: "Total",    value: certStats.total    ?? 0, color: "#1A3A8F", bg: "#E8EDFB" },
          { label: "Approved", value: certStats.approved ?? 0, color: "#2E7D32", bg: "#E8F5E9" },
          { label: "Rejected", value: certStats.rejected ?? 0, color: "#C62828", bg: "#FFEBEE" },
          { label: "Issued",   value: certStats.generated ?? 0, color: "#00897B", bg: "#E0F2F1" },
        ].map(({ label, value, color, bg }) => (
          <Box key={label} sx={{ p: 2.5, bgcolor: "#fff", borderRadius: 2, border: "1px solid #E4E8F0", borderLeft: `4px solid ${color}` }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color }}>{value}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Typography>
          </Box>
        ))}
      </Box>
      <Box sx={{ bgcolor: "#fff", borderRadius: 2, p: 3, border: "1px solid #E4E8F0" }}>
        <Typography variant="subtitle1" sx={{ mb: 2.5, color: "#0F2557", fontWeight: 700 }}>Certificate & Permit Pipeline</Typography>
        {rows.map(({ label, value, color }) => (
          <Box key={label} sx={{ mb: 1.5 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: "#5A6072" }}>{label}</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color }}>{value}</Typography>
            </Box>
            <Box sx={{ height: 6, bgcolor: "#F0F2F8", borderRadius: 3 }}>
              <Box sx={{ height: 6, bgcolor: color, borderRadius: 3, width: `${Math.round((value / max) * 100)}%`, transition: "width 0.6s ease" }} />
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ─── Track Application view (citizen) ─────────────────────────────────────────

function TrackApplication({ citizenId }: { citizenId: number | null }) {
  const [appNo, setAppNo]   = useState("");
  const [result, setResult] = useState<any>(null);
  const [err, setErr]       = useState("");
  const [loading, setLoading] = useState(false);

  const search = async () => {
    setErr(""); setResult(null);
    if (!appNo.trim()) { setErr("Enter an application number"); return; }
    setLoading(true);
    try {
      // Search by citizenId and find matching applicationNumber
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
    SUBMITTED:            { color: "#5A6072", label: "Submitted — awaiting officer review" },
    UNDER_VERIFICATION:   { color: "#E65100", label: "Under Verification" },
    VERIFIED:             { color: "#1565C0", label: "Documents Verified" },
    APPROVED:             { color: "#2E7D32", label: "Approved — certificate being prepared" },
    REJECTED:             { color: "#C62828", label: "Rejected" },
    CERTIFICATE_GENERATED:{ color: "#00897B", label: "Certificate / Permit Issued — ready to download" },
    DOWNLOADED:           { color: "#6A1B9A", label: "Downloaded" },
  };

  return (
    <Box sx={{ maxWidth: 600 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: 2.5, background: "linear-gradient(135deg, #0F2557, #1A3A8F)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
          <TrackChangesIcon />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F2557", lineHeight: 1.1 }}>Track Application</Typography>
          <Typography variant="caption" color="text.secondary">Enter your application number to see the current status</Typography>
        </Box>
      </Box>

      <Box sx={{ display: "flex", gap: 1.5, mb: 2 }}>
        <input
          value={appNo}
          onChange={(e) => setAppNo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="e.g. APP-2026-000001"
          style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #CBD2E0", fontSize: "0.9rem", fontFamily: "inherit", outline: "none", color: "#1A1F36" }}
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
                <Chip label={meta.label} size="small" sx={{ bgcolor: `${meta.color}15`, color: meta.color, fontWeight: 700, fontSize: "0.72rem" }} />
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                {[
                  { label: "Certificate Type", value: result.certificateType?.replace(/_/g, " ") },
                  { label: "Applied On",        value: new Date(result.appliedAt).toLocaleDateString("en-IN") },
                  ...(result.verifiedBy   ? [{ label: "Verified By",  value: result.verifiedBy }]   : []),
                  ...(result.decidedBy    ? [{ label: "Decided By",   value: result.decidedBy }]    : []),
                  ...(result.certificateNumber ? [{ label: "Certificate No.", value: result.certificateNumber }] : []),
                  ...(result.rejectionReason   ? [{ label: "Rejection Reason", value: result.rejectionReason }]   : []),
                ].map(({ label, value }) => (
                  <Box key={label}>
                    <Typography variant="caption" sx={{ color: "#9AA3B5", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.65rem", display: "block" }}>{label}</Typography>
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

  // Shared state
  const [grievances, setGrievances]         = useState<Grievance[]>([]);
  const [myGrievances, setMyGrievances]     = useState<Grievance[]>([]);
  const [dashboard, setDashboard]           = useState<Record<string, any>>({});
  const [overdue, setOverdue]               = useState<Grievance[]>([]);
  const [departments, setDepartments]       = useState<DepartmentInfo[]>([]);
  const [certificates, setCertificates]     = useState<Certificate[]>([]);
  const [myCertificates, setMyCertificates] = useState<Certificate[]>([]);
  const [certStats, setCertStats]           = useState<Record<string, number>>({});

  // Citizen profile resolved from JWT email → /api/citizens/me
  const [citizenProfile, setCitizenProfile] = useState<CitizenProfile | null>(null);
  // citizenId derived from the resolved profile (null until resolved)
  const citizenId = citizenProfile?.id ?? null;
  // shared citizenId string for grievance form (officer side)
  const [officerCitizenId, setOfficerCitizenId] = useState("1");

  const isAdmin   = hasAnyRole("ADMIN");
  const isOfficer = hasAnyRole("OFFICER");
  const isCitizen = !isAdmin && !isOfficer;
  const currentUsername = getUsername();
  const roleConfig = getRoleConfig(isAdmin ? ["ADMIN"] : isOfficer ? ["OFFICER"] : []);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setLoggedIn(false);
      setError("Session expired — please sign in again");
    });
  }, []);

  // Resolve citizen profile from JWT email (citizen users only)
  const resolveCitizenProfile = useCallback(async () => {
    if (!hasAnyRole("CITIZEN") || hasAnyRole("ADMIN") || hasAnyRole("OFFICER")) return;
    const email = getUserEmail();
    if (!email) return;
    try {
      const res = await api.get("/api/citizens/me");
      setCitizenProfile(res.data);
    } catch {
      // Citizen not yet registered in DB — they can still view the portal
      // but Apply form will show a warning
      setCitizenProfile(null);
    }
  }, []);

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

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const isAdminOrOfficer = hasAnyRole("ADMIN", "OFFICER");
      try {
  if (isAdminOrOfficer) {
    const officerRes = await api.get("/api/officers");
    const officerList: any[] = officerRes.data;

    const deptMap: Record<string, string[]> = {};
    officerList
      .filter((o) => o.status === "ACTIVE" && o.keycloakRole !== "ADMIN")
      .forEach((o) => {
        if (!deptMap[o.department]) deptMap[o.department] = [];
        deptMap[o.department].push(o.fullName);
      });

    const built = Object.entries(deptMap).map(([name, officers]) => ({
      name,
      officers,
    }));
    setDepartments(built);
  }
} catch { /* officers endpoint optional */ }

      if (isAdminOrOfficer) {
        const [gRes, dRes, sRes, certRes, statsRes] = await Promise.all([
          api.get("/api/grievances"),
          api.get("/api/grievances/dashboard"),
          api.get("/api/grievances/sla"),
          api.get("/api/certificates"),
          api.get("/api/certificates/stats"),
        ]);
        setGrievances(gRes.data);
        setDashboard(dRes.data);
        setOverdue(sRes.data);
        setCertificates(certRes.data);
        setCertStats(statsRes.data);
      } else {
        // Citizen: first resolve their profile, then load scoped data
        await resolveCitizenProfile();
      }
    } catch {
      setError("Failed to load data — check that backend services are running");
    } finally { setLoading(false); }
  }, [resolveCitizenProfile]);

  // After citizenProfile is set, load citizen-scoped data
  useEffect(() => {
    if (citizenProfile?.id) {
      loadMyCertificates(citizenProfile.id);
      loadMyGrievances(citizenProfile.id);
    }
  }, [citizenProfile, loadMyCertificates, loadMyGrievances]);

  const login = async () => {
    setError(""); setLoading(true);
    try {
      await loginWithPassword(username, password);
      setLoggedIn(true);
      await loadAll();
      setTab(hasAnyRole("ADMIN") || hasAnyRole("OFFICER") ? "dashboard" : "my-applications");
    } catch {
      setError("Login failed — check your credentials and that Keycloak is running");
    } finally { setLoading(false); }
  };

  const logout = () => {
    clearSession(); setLoggedIn(false);
    setGrievances([]); setMyGrievances([]); setDashboard({});
    setOverdue([]); setDepartments([]); setCertificates([]);
    setMyCertificates([]); setCertStats({}); setCitizenProfile(null);
    setError(""); setTab("dashboard");
  };

  const handleSearch = async (name: string, status: CertificateStatus | "", type: CertificateType | "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (name)   params.append("citizenName", name);
      if (status) params.append("status", status);
      if (type)   params.append("type", type);
      const res = await api.get(`/api/certificates/search?${params.toString()}`);
      setCertificates(res.data);
    } catch { setError("Search failed"); }
    finally { setLoading(false); }
  };

  const refresh = async () => {
  if (!loggedIn) return;
  try {
    const [gRes, certRes] = await Promise.all([
      api.get("/api/grievances"),
      api.get("/api/certificates"),
    ]);
    setGrievances(gRes.data);
    setCertificates(certRes.data);
  } catch { /* silent */ }
};

  // ── Pre-login screens ────────────────────────────────────────────────────────
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
        tab={tab} onTabChange={setTab}
        roleConfig={roleConfig}
        username={currentUsername || username}
        overdueCount={overdue.length}
        onLogout={logout}
      />

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar
          pageTitle={pageMeta.title}
          pageSubtitle={pageMeta.subtitle}
          loading={loading}
          overdueCount={overdue.length}
        />

        <Box sx={{ flex: 1, p: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          {/* ── CITIZEN LAYOUT ─────────────────────────────────── */}
          {isCitizen && (
            <>
              {tab === "my-applications" && (
                <CitizenApplications
                  applications={myCertificates}
                  onError={setError}
                  onLoadingChange={setLoading}
                  onChanged={() => citizenId && loadMyCertificates(citizenId)}
                />
              )}
              {tab === "apply" && (
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
              )}
              {tab === "my-grievances" && (
                <CitizenGrievanceList grievances={myGrievances} />
              )}
              {tab === "track" && (
                <TrackApplication citizenId={citizenId} />
              )}
              {tab === "file-grievance" && (
                <GrievanceForm
                  citizenId={citizenId ? String(citizenId) : ""}
                  loading={loading}
                  onCitizenIdChange={() => {}}
                  onError={setError}
                  onLoadingChange={setLoading}
                  onGrievanceCreated={() => {
                    if (citizenId) loadMyGrievances(citizenId);
                    setTab("my-grievances");
                  }}
                />
              )}
            </>
          )}

          {/* ── OFFICER / ADMIN LAYOUT ─────────────────────────── */}
          {(isOfficer || isAdmin) && (
            <>
              {tab === "dashboard" && (
                <>
                  <Dashboard dashboard={dashboard} overdue={overdue} />
                  {/* Quick actions */}
                  <Box sx={{ mt: 3, bgcolor: "#fff", borderRadius: 2, p: 2.5, border: "1px solid #E4E8F0" }}>
                    <Typography variant="subtitle2" sx={{ mb: 1.5, color: "#5A6072", textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.72rem" }}>
                      Quick Actions
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                      <Button variant="contained" size="small" startIcon={<DescriptionIcon />} onClick={() => setTab("applications")}>
                        Review Applications
                      </Button>
                      <Button variant="outlined" size="small" startIcon={<ReportProblemIcon />} onClick={() => setTab("grievances")}>
                        Manage Grievances
                      </Button>
                      <Button variant="outlined" size="small" startIcon={<PersonAddIcon />} onClick={() => setTab("register-citizen")}>
                        Register Citizen
                      </Button>
                      {isAdmin && (
                        <>
                          <Button variant="outlined" size="small" startIcon={<GroupIcon />} onClick={() => setTab("officer-mgmt")}>
                            Manage Officers And Citizens
                          </Button>
                          <Button variant="outlined" size="small" color="secondary" startIcon={<BarChartIcon />} onClick={() => setTab("reports")}>
                            View Reports
                          </Button>
                        </>
                      )}
                    </Box>
                  </Box>
                  {/* Cert pipeline strip — admin only */}
                  {isAdmin && Object.keys(certStats).length > 0 && (
                    <Box sx={{ mt: 2, bgcolor: "#fff", borderRadius: 2, p: 2.5, border: "1px solid #E4E8F0" }}>
                      <Typography variant="subtitle2" sx={{ mb: 1.5, color: "#5A6072", textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.72rem" }}>
                        Certificate & Permit Pipeline
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
                          <Box key={key} sx={{ textAlign: "center", px: 2, py: 1, borderRadius: 2, border: `1px solid ${color}20`, bgcolor: `${color}08` }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, color }}>{certStats[key] ?? 0}</Typography>
                            <Typography variant="caption" sx={{ color: "#5A6072" }}>{label}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
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

              {tab === "grievances" && (
                <GrievanceList
                  grievances={grievances}
                  departments={departments}
                  canManage={true}
                  onError={setError}
                  onLoadingChange={setLoading}
                  onChanged={refresh}
                />
              )}

              {tab === "register-citizen" && (
                <CitizenForm
                  loading={loading}
                  onError={setError}
                  onLoadingChange={setLoading}
                  onCitizenRegistered={(id) => { setOfficerCitizenId(id); setTab("file-grievance"); }}
                />
              )}

              {tab === "file-grievance" && (
                <GrievanceForm
                  citizenId={officerCitizenId}
                  loading={loading}
                  onCitizenIdChange={setOfficerCitizenId}
                  onError={setError}
                  onLoadingChange={setLoading}
                  onGrievanceCreated={() => { refresh(); setTab("grievances"); }}
                />
              )}

              {tab === "officer-mgmt" && isAdmin && (
                <OfficerManagement onError={setError} onLoadingChange={setLoading} />
              )}

              {tab === "reports" && isAdmin && (
                <ReportsView certStats={certStats} />
              )}
            </>
          )}
        </Box>

        {/* Footer */}
        <Box sx={{ px: 3, py: 1.5, borderTop: "1px solid #E4E8F0", bgcolor: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
