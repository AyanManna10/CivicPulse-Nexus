import { Box, TextField, Select, MenuItem, InputLabel, FormControl, Button, Grid } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useState } from "react";
import type { CertificateStatus, CertificateType } from "../../types";

const STATUSES: CertificateStatus[] = [
  "SUBMITTED", "UNDER_VERIFICATION", "VERIFIED", "APPROVED",
  "REJECTED", "CERTIFICATE_GENERATED", "DOWNLOADED",
];
const TYPES: CertificateType[] = ["BIRTH", "DEATH", "INCOME", "RESIDENCE", "TRADE_LICENSE"];

interface Props {
  onSearch: (citizenName: string, status: CertificateStatus | "", type: CertificateType | "") => void;
}

export default function CertificateSearchBar({ onSearch }: Props) {
  const [citizenName, setCitizenName] = useState("");
  const [status, setStatus] = useState<CertificateStatus | "">("");
  const [type, setType] = useState<CertificateType | "">("");

  return (
    <Box sx={{ mb: 3, p: 2.5, bgcolor: "background.paper", borderRadius: 3, boxShadow: "0 2px 12px rgba(20,30,60,0.06)" }}>
  <Grid container spacing={2} sx={{ alignItems: "center" }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          
          

          <TextField fullWidth size="small" label="Citizen Name" value={citizenName}
            onChange={(e) => setCitizenName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch(citizenName, status, type)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as CertificateStatus | "")}>
              <MenuItem value="">All Statuses</MenuItem>
              {STATUSES.map((s) => <MenuItem key={s} value={s}>{s.replace(/_/g, " ")}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Type</InputLabel>
            <Select label="Type" value={type} onChange={(e) => setType(e.target.value as CertificateType | "")}>
              <MenuItem value="">All Types</MenuItem>
              {TYPES.map((t) => <MenuItem key={t} value={t}>{t.replace(/_/g, " ")}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 2 }}>
          <Button fullWidth variant="contained" startIcon={<SearchIcon />}
            onClick={() => onSearch(citizenName, status, type)}>
            Search
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}