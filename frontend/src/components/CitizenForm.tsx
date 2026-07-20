import { useState } from "react";
import { Paper, Typography, TextField, Button, Box, Grid, Alert, Divider } from "@mui/material";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import { api } from "../api";

interface Props {
  loading: boolean;
  onError: (msg: string) => void;
  onLoadingChange: (v: boolean) => void;
  onCitizenRegistered: (citizenId: string) => void;
}

export default function CitizenForm({ loading, onError, onLoadingChange, onCitizenRegistered }: Props) {
  const [citizenName, setCitizenName] = useState("");
  const [citizenPhone, setCitizenPhone] = useState("");
  const [citizenEmail, setCitizenEmail] = useState("");
  const [citizenWard, setCitizenWard] = useState("1");
  const [aadhaar, setAadhaar] = useState("");
  const [address, setAddress] = useState("");
  const [success, setSuccess] = useState("");

  const registerCitizen = async () => {
    onError("");
    setSuccess("");

    if (!/^\d{10}$/.test(citizenPhone)) { onError("Phone must be exactly 10 digits"); return; }
    if (!/^\S+@\S+\.\S+$/.test(citizenEmail)) { onError("Enter a valid email address"); return; }
    if (!citizenName.trim()) { onError("Full name is required"); return; }

    onLoadingChange(true);
    try {
      const res = await api.post("/api/citizens", {
       fullName: citizenName,
       phone: citizenPhone,
       email: citizenEmail,
       ward: Number(citizenWard),
       aadhar: aadhaar || undefined,
       address: address || undefined,
      });
      const newId = String(res.data?.id ?? res.data?.citizenId ?? "");
      setSuccess(`Citizen registered successfully! Citizen ID: ${newId}. A Keycloak account has been auto-created (login: email, temp password: phone number).`);
      setCitizenName(""); setCitizenPhone(""); setCitizenEmail("");
      setCitizenWard("1"); setAadhaar(""); setAddress("");
      onCitizenRegistered(newId);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Registration failed — check that all fields are valid";
      onError(typeof msg === "string" ? msg : "Registration failed");
    } finally {
      onLoadingChange(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 640 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: 2.5,
          background: "linear-gradient(135deg, #0F2557, #1A3A8F)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff"
        }}>
          <HowToRegIcon />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F2557", lineHeight: 1.1 }}>
            Register New Citizen
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Enrol a citizen in the portal. A Keycloak account is auto-created on registration.
          </Typography>
        </Box>
      </Box>

      <Paper sx={{ overflow: "hidden", border: "1px solid #E4E8F0" }}>
        <Box sx={{ background: "linear-gradient(135deg, #0F2557, #1A3A8F)", px: 3, py: 1.5 }}>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.72rem" }}>
            Citizen Registration Form
          </Typography>
        </Box>

        <Box sx={{ p: 3 }}>
          {success && <Alert severity="success" sx={{ mb: 2.5, borderRadius: 1.5 }}>{success}</Alert>}

          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Full Name"
                value={citizenName}
                onChange={(e) => setCitizenName(e.target.value)}
                helperText="As per Aadhaar card"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Mobile Number"
                value={citizenPhone}
                onChange={(e) => setCitizenPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                helperText={`${citizenPhone.length}/10 digits · Used as temp password`}
                slotProps={{
                   htmlInput: {
                    maxLength: 10,
                     },
                  }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={citizenEmail}
                onChange={(e) => setCitizenEmail(e.target.value)}
                helperText="Used as Keycloak login username"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Ward Number"
                type="number"
                value={citizenWard}
                onChange={(e) => setCitizenWard(e.target.value)}
                slotProps={{
                htmlInput: { min: 1,
                },
                 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Aadhaar Number (optional)"
                value={aadhaar}
                onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, "").slice(0, 12))}
                helperText={`${aadhaar.length}/12 digits`}
                slotProps={{
                htmlInput: {
                   maxLength: 12,
                           },
                }}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Address (optional)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                multiline
                rows={2}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2.5 }} />

          <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5, fontSize: "0.8rem" }}>
            A Keycloak account will be auto-created for this citizen. Their login will be their <strong>email</strong> with a temporary password equal to their <strong>phone number</strong>.
          </Alert>

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={registerCitizen}
            disabled={loading}
            startIcon={<HowToRegIcon />}
            sx={{ py: 1.3 }}
          >
            {loading ? "Registering..." : "Register Citizen"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}