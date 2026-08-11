import {
  Box, Paper, TextField, Button, Typography, Alert,
  CircularProgress, InputAdornment, Divider
} from "@mui/material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ShieldIcon from "@mui/icons-material/Shield";
import { useState } from "react";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import IconButton from "@mui/material/IconButton";

interface Props {
  username: string; password: string; error: string; loading: boolean;
  onUsernameChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onLogin: () => void;
  onShowRegistration?: () => void;  // ← ADD THIS LINE
}

export default function LoginForm({
  username, password, error, loading,
  onUsernameChange, onPasswordChange, onLogin,
  onShowRegistration,  // ← ADD THIS
}: Props) {
  return (
    <Box sx={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      bgcolor: "#F0F2F8",
    }}>
      {/* Top Government Banner */}
      <Box sx={{
        bgcolor: "#0F2557",
        py: 1,
        px: 3,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        borderBottom: "3px solid #E65100",
      }}>
        <AccountBalanceIcon sx={{ color: "#fff", fontSize: 18 }} />
        <Typography variant="caption" sx={{ color: "#fff", fontWeight: 600, letterSpacing: 0.8, fontSize: "0.78rem" }}>
          GOVERNMENT OF INDIA &nbsp;·&nbsp; MINISTRY OF URBAN DEVELOPMENT
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.7rem" }}>
          Digital India Initiative
        </Typography>
      </Box>

      {/* Main content */}
      <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
        <Box sx={{ width: "100%", maxWidth: 960, display: "flex", gap: 4, alignItems: "center" }}>

          {/* Left panel — branding */}
          <Box sx={{ flex: 1, display: { xs: "none", md: "flex" }, flexDirection: "column", gap: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
              <Box sx={{
                width: 64, height: 64, borderRadius: 3,
                background: "linear-gradient(135deg, #0F2557, #1A3A8F)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 8px 24px rgba(15,37,87,0.4)"
              }}>
                <AccountBalanceIcon sx={{ color: "#fff", fontSize: 32 }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "#0F2557", letterSpacing: -0.5 }}>
                  CivicPulse Nexus
                </Typography>
                <Typography variant="body2" sx={{ color: "#5A6072" }}>
                  Smart Governance & Citizen Services Platform
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {[
                { icon: "📋", title: "Certificate Management", desc: "Apply for Birth, Death, Income, Residence certificates online" },
                { icon: "📣", title: "Grievance Redressal", desc: "File and track complaints with real-time SLA monitoring" },
                { icon: "🔐", title: "Secure & Authenticated", desc: "Powered by Keycloak IAM with role-based access control" },
              ].map(({ icon, title, desc }) => (
                <Box key={title} sx={{ display: "flex", gap: 2, p: 2, bgcolor: "#fff", borderRadius: 2, border: "1px solid #E4E8F0" }}>
                  <Typography sx={{ fontSize: 22, lineHeight: 1 }}>{icon}</Typography>
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: "#0F2557" }}>{title}</Typography>
                    <Typography variant="caption" sx={{ color: "#5A6072" }}>{desc}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Right panel — login form */}
          <Paper sx={{ width: "100%", maxWidth: 400, overflow: "hidden" }}>
            {/* Header stripe */}
            <Box sx={{
              background: "linear-gradient(135deg, #0F2557 0%, #1A3A8F 100%)",
              borderBottom: "3px solid #E65100",
              p: 3,
            }}>
              <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700 }}>
                Citizen / Staff Login
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
                Access your personalised government services dashboard
              </Typography>
            </Box>

            <Box sx={{ p: 3.5 }}>
              {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{error}</Alert>}

              <TextField
                fullWidth
                label="Username / Email"
                value={username}
                onChange={(e) => onUsernameChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onLogin()}
                sx={{ mb: 2 }}
                slotProps={{
    input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlineIcon fontSize="small" sx={{ color: "#5A6072" }} />
                    </InputAdornment>
                  )}
                }}
              />
              {/* Password with eye toggle */}
              {(() => {
                const [showPassword, setShowPassword] = useState(false);
                return (
                  <TextField
                    fullWidth
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => onPasswordChange(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && onLogin()}
                    sx={{ mb: 3 }}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockOutlinedIcon fontSize="small" sx={{ color: "#5A6072" }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                              sx={{ color: "#5A6072" }}
                            >
                              {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }
                    }}
                  />
                );
              })()}

              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={onLogin}
                disabled={loading}
                sx={{ py: 1.3, fontSize: "0.95rem", mb: 2.5 }}
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : "Sign In to Portal"}
              </Button>

              <Divider sx={{ mb: 2.5 }}>
                <Typography variant="caption" color="text.secondary">First Time Login?</Typography>
              </Divider>
                <Box sx={{ bgcolor: "#F8F9FC", borderRadius: 2, p: 2, border: "1px solid #E4E8F0" }}>
  <Typography variant="caption" sx={{ display: "block", fontWeight: 600, color: "#0F2557", mb: 1 }}>
    New to CivicPulse?
  </Typography>
  <Button
    fullWidth
    variant="outlined"
    color="primary"
    size="small"
    onClick={onShowRegistration}
    sx={{ mb: 1 }}
  >
    Create Your Citizen Account
  </Button>
  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
    Self-register with your email and password to access all services.
  </Typography>
</Box>
              <Box sx={{ bgcolor: "#F8F9FC", borderRadius: 2, p: 2, border: "1px solid #E4E8F0" }}>
                <Typography variant="caption" sx={{ display: "block", fontWeight: 600, color: "#0F2557", mb: 0.5 }}>
                  For newly registered citizens:
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Username = <strong>registered email</strong><br />
                  Temporary password = <strong>10-digit phone number</strong><br />
                  You will be prompted to change it on first login.
                </Typography>
              </Box>

              <Box sx={{ mt: 3, display: "flex", alignItems: "center", gap: 1, justifyContent: "center" }}>
                <ShieldIcon sx={{ fontSize: 14, color: "#5A6072" }} />
                <Typography variant="caption" color="text.secondary">
                  Secured by Keycloak IAM · All sessions encrypted
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Footer */}
      <Box sx={{ py: 1.5, textAlign: "center", borderTop: "1px solid #E4E8F0", bgcolor: "#fff" }}>
        <Typography variant="caption" color="text.secondary">
          © 2026 CivicPulse Nexus · Government Digital Services · Built under Digital India Programme
        </Typography>
      </Box>
    </Box>
  );
}