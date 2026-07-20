import { useState } from "react";
import {
  Paper, Typography, TextField, Button, Box, Grid,
  Select, MenuItem, InputLabel, FormControl
} from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";
import type { CertificateType } from "../types";
import { api } from "../api";

interface Props {
  citizenId: string;
  loading: boolean;
  onCitizenIdChange: (v: string) => void;
  onError: (msg: string) => void;
  onLoadingChange: (v: boolean) => void;
  onCertificateApplied: () => void;
}

const CERT_TYPES: CertificateType[] = ["BIRTH", "DEATH", "INCOME", "RESIDENCE", "TRADE_LICENSE"];

export default function CertificateForm({
  citizenId, loading, onCitizenIdChange, onError, onLoadingChange, onCertificateApplied
}: Props) {
  const [citizenName, setCitizenName] = useState("");
  const [citizenAddress, setCitizenAddress] = useState("");
  const [certificateType, setCertificateType] = useState<CertificateType | "">("");

  const applyForCertificate = async () => {
    onError("");
    if (!/^\d+$/.test(citizenId)) {
      onError("Citizen ID must be numeric");
      return;
    }
    if (!citizenName.trim()) {
      onError("Citizen name is required");
      return;
    }
    if (!certificateType) {
      onError("Select a certificate type");
      return;
    }
    onLoadingChange(true);
    try {
      await api.post("/api/certificates", {
        citizenId: Number(citizenId),
        citizenName,
        citizenAddress,
        certificateType,
      });
      setCitizenName("");
      setCitizenAddress("");
      setCertificateType("");
      onCertificateApplied();
      alert("Certificate application submitted — status: PENDING");
    } catch {
      onError("Certificate application failed");
    } finally {
      onLoadingChange(false);
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 520 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <DescriptionIcon color="primary" />
        <Typography variant="h6">Apply for a certificate</Typography>
      </Box>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth label="Citizen ID" value={citizenId}
            onChange={(e) => onCitizenIdChange(e.target.value)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth>
            <InputLabel>Certificate Type</InputLabel>
            <Select
              label="Certificate Type"
              value={certificateType}
              onChange={(e) => setCertificateType(e.target.value as CertificateType)}
            >
              {CERT_TYPES.map((t) => (
                <MenuItem key={t} value={t}>{t.replace("_", " ")}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={12}>
          <TextField fullWidth label="Citizen Name" value={citizenName}
            onChange={(e) => setCitizenName(e.target.value)} />
        </Grid>
        <Grid size={12}>
          <TextField fullWidth label="Citizen Address" value={citizenAddress}
            onChange={(e) => setCitizenAddress(e.target.value)} />
        </Grid>
        <Grid size={12}>
          <Button variant="contained" size="large" fullWidth onClick={applyForCertificate} disabled={loading}>
            Apply for Certificate
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
}