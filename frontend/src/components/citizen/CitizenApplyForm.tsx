import { useState } from "react";
import {
  Paper, Typography, TextField, Button, Box, Grid,
  Alert, Divider, Chip
} from "@mui/material";
import ArticleIcon from "@mui/icons-material/Article";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import type { CertificateType } from "../../types";
import { api } from "../../api";

// ── Certificate & Permit catalogue ───────────────────────────────────────────

const CERT_TYPES: { value: CertificateType; label: string; icon: string; desc: string; category: "Certificate" | "Permit / Licence" }[] = [
  // Certificates
  { value: "BIRTH",            label: "Birth Certificate",     icon: "👶", desc: "Proof of birth registration",               category: "Certificate" },
  { value: "DEATH",            label: "Death Certificate",     icon: "📋", desc: "Proof of death registration",               category: "Certificate" },
  { value: "INCOME",           label: "Income Certificate",    icon: "💰", desc: "Annual household income proof",             category: "Certificate" },
  { value: "RESIDENCE",        label: "Residence Certificate", icon: "🏠", desc: "Proof of current residential address",      category: "Certificate" },
  { value: "MARRIAGE",         label: "Marriage Certificate",  icon: "💍", desc: "Proof of registered marriage",             category: "Certificate" },
  // Permits & Licences
  { value: "TRADE_LICENSE",    label: "Trade License",         icon: "🏪", desc: "Authorisation for commercial trading",      category: "Permit / Licence" },
  { value: "SHOP_LICENSE",     label: "Shop License",          icon: "🏬", desc: "Shop & Establishment registration",         category: "Permit / Licence" },
  { value: "BUILDING_PERMIT",  label: "Building Permit",       icon: "🏗️",  desc: "Construction / renovation approval",        category: "Permit / Licence" },
  { value: "WATER_CONNECTION", label: "Water Connection",      icon: "💧", desc: "New domestic or commercial water connection", category: "Permit / Licence" },
];

const NAME_RE = /^[a-zA-Z\s.\-']{2,80}$/;

interface Props {
  citizenId: number | null;  // resolved automatically from /api/citizens/me
  onSuccess: () => void;
  onError: (msg: string) => void;
  onLoadingChange: (v: boolean) => void;
  loading: boolean;
}

export default function CitizenApplyForm({ citizenId, onSuccess, onError, onLoadingChange, loading }: Props) {
  const [citizenName, setCitizenName]       = useState("");
  const [citizenAddress, setCitizenAddress] = useState("");
  const [aadhaarNumber, setAadhaarNumber]   = useState("");
  const [certificateType, setCertificateType] = useState<CertificateType | "">("");
  const [fieldErrors, setFieldErrors]       = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!citizenId)                              errs.citizenId     = "Could not resolve your citizen ID — please re-login";
    if (!NAME_RE.test(citizenName))              errs.citizenName   = "Name must contain only letters and spaces (2–80 chars)";
    if (!/^\d{12}$/.test(aadhaarNumber))         errs.aadhaarNumber = "Aadhaar must be exactly 12 digits";
    if (!certificateType)                        errs.certificateType = "Please select a certificate / permit type";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async () => {
    onError("");
    if (!validate()) return;
    onLoadingChange(true);
    try {
      await api.post("/api/certificates", {
        citizenId: citizenId,
        citizenName,
        citizenAddress,
        aadhaarNumber,
        certificateType,
      });
      setCitizenName(""); setCitizenAddress("");
      setAadhaarNumber(""); setCertificateType(""); setFieldErrors({});
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.response?.data ?? "Application failed";
      onError(typeof msg === "string" ? msg : "Duplicate or invalid application");
    } finally {
      onLoadingChange(false);
    }
  };

  const selectedType = CERT_TYPES.find((t) => t.value === certificateType);
  const categories = ["Certificate", "Permit / Licence"] as const;

  return (
    <Box sx={{ maxWidth: 720 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: 2.5,
          background: "linear-gradient(135deg, #0F2557, #1A3A8F)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff"
        }}>
          <ArticleIcon />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F2557", lineHeight: 1.1 }}>
            Apply for Certificate / Permit
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Fill all fields carefully. Details must match official government records.
          </Typography>
        </Box>
      </Box>

      {/* Citizen ID resolved indicator */}
      <Box sx={{ mb: 2, px: 2, py: 1, bgcolor: citizenId ? "#E8F5E9" : "#FFF3E0", borderRadius: 1.5, border: `1px solid ${citizenId ? "#A5D6A7" : "#FFCC80"}`, display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: citizenId ? "#2E7D32" : "#E65100" }}>
          {citizenId
            ? `✓ Citizen ID resolved: #${citizenId}`
            : "⚠ Citizen profile not found — ensure your account is registered in the portal"}
        </Typography>
      </Box>

      <Paper sx={{ overflow: "hidden", border: "1px solid #E4E8F0" }}>
        <Box sx={{ background: "linear-gradient(135deg, #0F2557, #1A3A8F)", px: 3, py: 1.5 }}>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.72rem" }}>
            Application Form
          </Typography>
        </Box>

        <Box sx={{ p: 3 }}>
          {/* Type selector — grouped by category */}
          {categories.map((cat) => (
            <Box key={cat} sx={{ mb: 2.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#5A6072", textTransform: "uppercase", letterSpacing: 0.8, fontSize: "0.68rem", display: "block", mb: 1 }}>
                {cat}
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 1 }}>
                {CERT_TYPES.filter((t) => t.category === cat).map((t) => (
                  <Box
                    key={t.value}
                    onClick={() => setCertificateType(t.value)}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      border: "2px solid",
                      borderColor: certificateType === t.value ? "#1A3A8F" : "#E4E8F0",
                      cursor: "pointer",
                      bgcolor: certificateType === t.value ? "#E8EDFB" : "#F8F9FC",
                      transition: "all 0.15s",
                      "&:hover": { borderColor: "#1A3A8F", bgcolor: "#F0F4FF" },
                      textAlign: "center",
                    }}
                  >
                    <Typography sx={{ fontSize: 20, display: "block", mb: 0.25 }}>{t.icon}</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: certificateType === t.value ? "#0F2557" : "#5A6072", fontSize: "0.7rem", lineHeight: 1.2 }}>
                      {t.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}

          {fieldErrors.certificateType && (
            <Typography variant="caption" color="error" sx={{ display: "block", mb: 1.5 }}>{fieldErrors.certificateType}</Typography>
          )}

          {selectedType && (
            <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ mb: 2.5, borderRadius: 1.5, fontSize: "0.8rem" }}>
              <strong>{selectedType.label}</strong> — {selectedType.desc}
              <Chip size="small" label={selectedType.category} sx={{ ml: 1, height: 18, fontSize: "0.65rem", bgcolor: selectedType.category === "Certificate" ? "#E3F2FD" : "#FFF3E0", color: selectedType.category === "Certificate" ? "#1565C0" : "#E65100" }} />
            </Alert>
          )}

          <Divider sx={{ mb: 2.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              Personal Details
            </Typography>
          </Divider>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Aadhaar Number"
                value={aadhaarNumber}
                onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, "").slice(0, 12))}
                error={!!fieldErrors.aadhaarNumber}
                helperText={fieldErrors.aadhaarNumber ?? `${aadhaarNumber.length}/12 digits`}
                slotProps={{ htmlInput: { maxLength: 12 } }}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Full Name (as per official records)"
                value={citizenName}
                onChange={(e) => setCitizenName(e.target.value)}
                error={!!fieldErrors.citizenName}
                helperText={fieldErrors.citizenName ?? "Letters and spaces only, no abbreviations"}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Residential Address"
                value={citizenAddress}
                onChange={(e) => setCitizenAddress(e.target.value)}
                multiline
                rows={2}
                helperText="Enter your full address including ward number"
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2.5 }} />

          <Alert severity="warning" sx={{ mb: 2, borderRadius: 1.5, fontSize: "0.8rem" }}>
            After submission, a verification officer will review your application. Track status under <strong>My Applications</strong>.
          </Alert>

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={submit}
            disabled={loading || !certificateType || !citizenId}
            sx={{ py: 1.3, fontSize: "0.95rem" }}
          >
            {loading ? "Submitting..." : "Submit Application"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
