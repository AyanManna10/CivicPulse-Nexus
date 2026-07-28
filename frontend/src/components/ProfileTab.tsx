import { useState } from "react";
import {
  Box, Paper, Typography, TextField, Button, Alert, Divider,
  Avatar, Chip, Grid
} from "@mui/material";
import LockIcon          from "@mui/icons-material/Lock";
import CheckCircleIcon   from "@mui/icons-material/CheckCircle";
import BadgeIcon         from "@mui/icons-material/Badge";
import EmailIcon         from "@mui/icons-material/Email";
import PhoneIcon         from "@mui/icons-material/Phone";
import CakeIcon          from "@mui/icons-material/Cake";
import HomeIcon          from "@mui/icons-material/Home";
import WcIcon            from "@mui/icons-material/Wc";
import SecurityIcon      from "@mui/icons-material/Security";
import { api, getUsername, getUserEmail } from "../api";

interface Props {
  citizenProfile: any | null;
  roleLabel: string;
  roleColor: string;
  roleBg: string;
  onError: (msg: string) => void;
  onLoadingChange: (v: boolean) => void;
}

export default function ProfileTab({
  citizenProfile, roleLabel, roleColor, roleBg, onError, onLoadingChange
}: Props) {
  const username = getUsername();
  const email    = getUserEmail();

  const [oldPassword, setOldPassword]         = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSuccess, setPwSuccess]             = useState("");
  const [pwErrors, setPwErrors]               = useState<Record<string, string>>({});

  const validatePassword = () => {
    const errs: Record<string, string> = {};
    if (!oldPassword)                              errs.oldPassword     = "Current password is required";
    if (!newPassword || newPassword.length < 8)    errs.newPassword     = "Minimum 8 characters";
    if (newPassword === oldPassword)               errs.newPassword     = "New password must differ from current";
    if (newPassword !== confirmPassword)           errs.confirmPassword = "Passwords do not match";
    setPwErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const changePassword = async () => {
    onError(""); setPwSuccess("");
    if (!validatePassword()) return;
    onLoadingChange(true);
    try {
      await api.post("/api/citizens/change-password", { oldPassword, newPassword });
      setPwSuccess("Password changed successfully. Use your new password next time you log in.");
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
      setPwErrors({});
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? "Failed to change password.";
      onError(typeof msg === "string" ? msg : "Password change failed — check your current password.");
    } finally { onLoadingChange(false); }
  };

  const initials = username ? username.slice(0, 2).toUpperCase() : "?";

  const citizenFields = citizenProfile ? [
    { icon: <BadgeIcon  sx={{ fontSize: 16, color: "#1A3A8F" }} />, label: "Citizen Code", value: citizenProfile.citizenCode },
    { icon: <EmailIcon  sx={{ fontSize: 16, color: "#1A3A8F" }} />, label: "Email",        value: email },
    { icon: <PhoneIcon  sx={{ fontSize: 16, color: "#1A3A8F" }} />, label: "Mobile",       value: citizenProfile.phone },
    { icon: <CakeIcon   sx={{ fontSize: 16, color: "#1A3A8F" }} />, label: "Date of Birth",value: citizenProfile.dob ?? "—" },
    { icon: <WcIcon     sx={{ fontSize: 16, color: "#1A3A8F" }} />, label: "Gender",       value: citizenProfile.gender ?? "—" },
    { icon: <HomeIcon   sx={{ fontSize: 16, color: "#1A3A8F" }} />, label: "Ward",         value: citizenProfile.ward ? `Ward ${citizenProfile.ward}` : "—" },
  ] : [];

  return (
    <Box sx={{ maxWidth: 780, mx: "auto" }}>

      {/* ── Profile header ── */}
      <Paper sx={{ mb: 2.5, border: "1px solid #E4E8F0", overflow: "hidden", position: "relative" }}>
        <Box sx={{ height: 72, background: "linear-gradient(135deg, #0F2557, #1A3A8F)" }} />
        <Box sx={{ px: 3, pb: 2.5 }}>
          <Box sx={{ display: "flex", alignItems: "flex-end", gap: 2, mt: "-2px", mb: 1.5 }}>
            <Avatar sx={{
              width: 72, height: 72, bgcolor: roleColor, fontSize: "1.5rem", fontWeight: 700,
              border: "3px solid #fff", boxShadow: "0 2px 12px rgba(0,0,0,0.18)"
            }}>
              {initials}
            </Avatar>
            <Box sx={{ pb: 0.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F2557", lineHeight: 1.1 }}>
                {citizenProfile?.fullName ?? username}
              </Typography>
              <Typography variant="caption" color="text.secondary">{email}</Typography>
              <Box sx={{ mt: 0.5, display: "flex", gap: 1, alignItems: "center" }}>
                <Chip size="small" label={roleLabel}
                  sx={{ bgcolor: roleBg, color: roleColor, fontWeight: 700, fontSize: "0.7rem" }} />
                <Chip size="small" label={citizenProfile?.status ?? "Active"}
                  sx={{ bgcolor: "#E8F5E9", color: "#2E7D32", fontWeight: 700, fontSize: "0.7rem" }} />
              </Box>
            </Box>
          </Box>

          {citizenProfile && (
            <>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={1.5}>
                {citizenFields.map(({ icon, label, value }) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={label}>
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, p: 1.2,
                      bgcolor: "#F8F9FC", borderRadius: 1.5, border: "1px solid #E4E8F0" }}>
                      <Box sx={{ mt: 0.1, flexShrink: 0 }}>{icon}</Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: "#9AA3B5", fontWeight: 700,
                          textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.6rem", display: "block" }}>
                          {label}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#0F2557", fontSize: "0.82rem" }}>
                          {value}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </Box>
      </Paper>

      {/* ── Security notice ── */}
      <Paper sx={{ mb: 2.5, border: "1px solid #E3F2FD", bgcolor: "#F0F7FF", overflow: "hidden" }}>
        <Box sx={{ px: 2.5, py: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
          <SecurityIcon sx={{ fontSize: 18, color: "#1A3A8F" }} />
          <Typography variant="caption" sx={{ color: "#1A3A8F", fontWeight: 600 }}>
            Account security — your login credentials are managed through the portal's identity service.
            Changing your password here updates it immediately.
          </Typography>
        </Box>
      </Paper>

      {/* ── Change password ── */}
      <Paper sx={{ overflow: "hidden", border: "1px solid #E4E8F0" }}>
        <Box sx={{ background: "linear-gradient(135deg, #0F2557, #1A3A8F)", px: 3, py: 1.5,
          display: "flex", alignItems: "center", gap: 1 }}>
          <LockIcon sx={{ color: "rgba(255,255,255,0.8)", fontSize: 18 }} />
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 700,
            letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.72rem" }}>
            Change Password
          </Typography>
        </Box>
        <Box sx={{ p: 3 }}>
          {pwSuccess && (
            <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2.5, borderRadius: 1.5 }}
              onClose={() => setPwSuccess("")}>
              {pwSuccess}
            </Alert>
          )}

          <Grid container spacing={2}>
            {/* Old password — full width for clear separation */}
            <Grid size={12}>
              <TextField fullWidth type="password" label="Current Password"
                value={oldPassword} onChange={(e) => setOldPassword(e.target.value)}
                error={!!pwErrors.oldPassword} helperText={pwErrors.oldPassword || "Enter your existing password to confirm identity"}
                slotProps={{ input: { startAdornment: <LockIcon fontSize="small" sx={{ color: "#9AA3B5", mr: 1 }} /> } }}
              />
            </Grid>
            <Grid size={12}>
              <Divider>
                <Typography variant="caption" sx={{ color: "#9AA3B5", px: 1 }}>New password</Typography>
              </Divider>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth type="password" label="New Password"
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                error={!!pwErrors.newPassword} helperText={pwErrors.newPassword || "Minimum 8 characters"}
                slotProps={{ input: { startAdornment: <LockIcon fontSize="small" sx={{ color: "#9AA3B5", mr: 1 }} /> } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth type="password" label="Confirm New Password"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                error={!!pwErrors.confirmPassword} helperText={pwErrors.confirmPassword}
                slotProps={{ input: { startAdornment: <LockIcon fontSize="small" sx={{ color: "#9AA3B5", mr: 1 }} /> } }}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 2.5, display: "flex", alignItems: "center", gap: 2 }}>
            <Button variant="contained" onClick={changePassword} startIcon={<LockIcon />} sx={{ px: 3 }}>
              Update Password
            </Button>
            {(oldPassword || newPassword || confirmPassword) && (
              <Button variant="text" color="inherit" size="small" sx={{ color: "#9AA3B5" }}
                onClick={() => { setOldPassword(""); setNewPassword(""); setConfirmPassword(""); setPwErrors({}); }}>
                Clear
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

    </Box>
  );
}