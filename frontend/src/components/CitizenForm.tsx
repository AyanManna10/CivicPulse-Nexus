import { useState, useRef } from "react";
import {
  Paper, Typography, TextField, Button, Box, Grid, Alert, Divider,
  FormControl, InputLabel, Select, MenuItem, Chip, InputAdornment
} from "@mui/material";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import BadgeIcon from "@mui/icons-material/Badge";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { api } from "../api";

interface Props {
  loading: boolean;
  onError: (msg: string) => void;
  onLoadingChange: (v: boolean) => void;
  onCitizenRegistered: (citizenId: string) => void;
}

interface DocFile { file: File; docType: string; }

export default function CitizenForm({ loading, onError, onLoadingChange, onCitizenRegistered }: Props) {
  const [citizenName, setCitizenName]   = useState("");
  const [citizenPhone, setCitizenPhone] = useState("");
  const [citizenEmail, setCitizenEmail] = useState("");
  const [citizenWard, setCitizenWard]   = useState("");
  const [aadhaar, setAadhaar]           = useState("");
  const [address, setAddress]           = useState("");
  const [dob, setDob]                   = useState("");
  const [gender, setGender]             = useState("");
  const [registeredData, setRegisteredData] = useState<{ id: string; name: string; email: string; phone: string } | null>(null);
  const [uploadMsg, setUploadMsg]       = useState("");

  const [aadhaarFile, setAadhaarFile]   = useState<File | null>(null);
  const [otherDocs, setOtherDocs]       = useState<DocFile[]>([]);
  const aadhaarRef = useRef<HTMLInputElement>(null);
  const otherRef   = useRef<HTMLInputElement>(null);

  const handleAadhaarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { onError("File must be under 5MB"); return; }
    setAadhaarFile(f);
  };

  const handleOtherFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { onError("File must be under 5MB"); return; }
    setOtherDocs(prev => [...prev, { file: f, docType: "OTHER" }]);
    if (otherRef.current) otherRef.current.value = "";
  };

  const uploadFile = async (citizenId: string, file: File, docType: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("docType", docType);
    await api.post(`/api/citizens/pending/${citizenId}/documents`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  };

  const resetForm = () => {
    setCitizenName(""); setCitizenPhone(""); setCitizenEmail("");
    setCitizenWard(""); setAadhaar(""); setAddress("");
    setDob(""); setGender(""); setAadhaarFile(null); setOtherDocs([]);
  };

  const registerCitizen = async () => {
    onError("");
    if (!citizenName.trim())                            { onError("Full name is required"); return; }
    if (!/^\S+@\S+\.\S+$/.test(citizenEmail))          { onError("Enter a valid email address"); return; }
    if (!/^\d{10}$/.test(citizenPhone))                { onError("Phone must be exactly 10 digits"); return; }
    if (!dob)                                           { onError("Date of birth is required"); return; }
    if (!gender)                                        { onError("Gender is required"); return; }
    if (!aadhaar || !/^\d{12}$/.test(aadhaar))         { onError("Valid 12-digit Aadhaar number is required"); return; }
    if (!address.trim())                                { onError("Address is required"); return; }

    onLoadingChange(true);
    try {
      const res = await api.post("/api/citizens", {
        fullName: citizenName,
        phone: citizenPhone,
        email: citizenEmail,
        ward: citizenWard ? Number(citizenWard) : undefined,
        aadhar: aadhaar,
        address,
        dob,
        gender,
      });
      const newId = String(res.data?.id ?? res.data?.citizenId ?? "");

      if (aadhaarFile && newId) {
        setUploadMsg("Uploading Aadhaar card...");
        try { await uploadFile(newId, aadhaarFile, "AADHAAR"); } catch { /* non-fatal */ }
      }
      for (const { file, docType } of otherDocs) {
        if (newId) {
          setUploadMsg(`Uploading ${file.name}...`);
          try { await uploadFile(newId, file, docType); } catch { /* non-fatal */ }
        }
      }

      setUploadMsg("");
      setRegisteredData({ id: newId, name: citizenName, email: citizenEmail, phone: citizenPhone });
      resetForm();
      onCitizenRegistered(newId);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Registration failed — check that all fields are valid";
      onError(typeof msg === "string" ? msg : "Registration failed");
      setUploadMsg("");
    } finally {
      onLoadingChange(false);
    }
  };

  const FileBox = ({
    file, label, required, onClear, onBrowse, inputRef, onChange
  }: {
    file: File | null; label: string; required?: boolean;
    onClear: () => void; onBrowse: () => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }) => (
    <Box>
      <Typography variant="caption" sx={{ fontWeight: 700, color: "#5A6072", display: "block", mb: 0.75 }}>
        {label}{required && <Box component="span" sx={{ color: "#C62828", ml: 0.5 }}>*</Box>}
      </Typography>
      <input ref={inputRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={onChange} />
      {file ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, bgcolor: "#E8F5E9", borderRadius: 1.5, border: "1px solid #A5D6A7" }}>
          <CheckCircleIcon sx={{ color: "#2E7D32", fontSize: 20, flexShrink: 0 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: "#2E7D32", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {file.name}
            </Typography>
            <Typography variant="caption" sx={{ color: "#5A6072", fontSize: "0.68rem" }}>
              {(file.size / 1024).toFixed(0)} KB · ready to upload
            </Typography>
          </Box>
          <Button size="small" color="error" onClick={onClear} sx={{ minWidth: 0, px: 1, fontSize: "0.72rem", flexShrink: 0 }}>
            Remove
          </Button>
        </Box>
      ) : (
        <Box onClick={onBrowse} sx={{
          border: "2px dashed #CBD2E0", borderRadius: 1.5, p: 2,
          textAlign: "center", cursor: "pointer", bgcolor: "#F8F9FC",
          transition: "all 0.15s", "&:hover": { borderColor: "#1A3A8F", bgcolor: "#F0F4FF" }
        }}>
          <UploadFileIcon sx={{ color: "#9AA3B5", fontSize: 26, mb: 0.25 }} />
          <Typography variant="caption" sx={{ display: "block", color: "#5A6072", fontWeight: 600 }}>
            Click to browse
          </Typography>
          <Typography variant="caption" sx={{ color: "#9AA3B5", fontSize: "0.68rem" }}>
            PDF, JPG, PNG — max 5MB
          </Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <Box>
      {/* Success card */}
      {registeredData && (
        <Paper sx={{ mb: 3, overflow: "hidden", border: "1px solid #A5D6A7" }}>
          <Box sx={{ bgcolor: "#2E7D32", px: 3, py: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
            <CheckCircleIcon sx={{ color: "#fff", fontSize: 18 }} />
            <Typography variant="caption" sx={{ color: "#fff", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.72rem" }}>
              Citizen Registered Successfully
            </Typography>
          </Box>
          <Box sx={{ p: 2.5, bgcolor: "#F1F8E9" }}>
            <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap", mb: 1.5 }}>
              {[
                { label: "Citizen ID", value: `#${registeredData.id}` },
                { label: "Name", value: registeredData.name },
                { label: "Login Email", value: registeredData.email },
                { label: "Temp Password", value: registeredData.phone },
              ].map(({ label, value }) => (
                <Box key={label}>
                  <Typography variant="caption" sx={{ color: "#5A6072", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.62rem", display: "block" }}>
                    {label}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "#2E7D32" }}>{value}</Typography>
                </Box>
              ))}
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button size="small" variant="outlined" color="success" onClick={() => setRegisteredData(null)}>
                Register Another Citizen
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {uploadMsg && <Alert severity="info" sx={{ mb: 2, fontSize: "0.82rem" }}>{uploadMsg}</Alert>}

      {/* Section 1: Personal Information */}
      <Paper sx={{ mb: 2.5, overflow: "hidden", border: "1px solid #E4E8F0" }}>
        <Box sx={{ background: "linear-gradient(135deg, #0F2557, #1A3A8F)", px: 3, py: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}>
          <PersonIcon sx={{ color: "rgba(255,255,255,0.8)", fontSize: 18 }} />
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.72rem" }}>
            Personal Information
          </Typography>
        </Box>
        <Box sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField
                fullWidth required
                label="Full Name"
                value={citizenName}
                onChange={(e) => setCitizenName(e.target.value)}
                helperText="Exactly as on Aadhaar card"
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><PersonIcon fontSize="small" sx={{ color: "#9AA3B5" }} /></InputAdornment> } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth required
                label="Mobile Number"
                value={citizenPhone}
                onChange={(e) => setCitizenPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                helperText={`${citizenPhone.length}/10 · becomes login password`}
                slotProps={{
                  input: { startAdornment: <InputAdornment position="start"><PhoneIcon fontSize="small" sx={{ color: "#9AA3B5" }} /></InputAdornment> },
                  htmlInput: { maxLength: 10 }
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth required
                label="Email Address"
                type="email"
                value={citizenEmail}
                onChange={(e) => setCitizenEmail(e.target.value)}
                helperText="Becomes their login username"
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><EmailIcon fontSize="small" sx={{ color: "#9AA3B5" }} /></InputAdornment> } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth required
                label="Date of Birth"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                size="medium"
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required size="medium">
                <InputLabel>Gender</InputLabel>
                <Select label="Gender" value={gender} onChange={(e) => setGender(e.target.value)}>
                  <MenuItem value="MALE">Male</MenuItem>
                  <MenuItem value="FEMALE">Female</MenuItem>
                  <MenuItem value="OTHER">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Section 2: Address & Identity */}
      <Paper sx={{ mb: 2.5, overflow: "hidden", border: "1px solid #E4E8F0" }}>
        <Box sx={{ background: "linear-gradient(135deg, #0F2557, #1A3A8F)", px: 3, py: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}>
          <LocationOnIcon sx={{ color: "rgba(255,255,255,0.8)", fontSize: 18 }} />
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.72rem" }}>
            Address & Identity
          </Typography>
        </Box>
        <Box sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth required
                label="Aadhaar Number"
                value={aadhaar}
                onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, "").slice(0, 12))}
                helperText={`${aadhaar.length}/12 digits`}
                slotProps={{
                  input: { startAdornment: <InputAdornment position="start"><BadgeIcon fontSize="small" sx={{ color: "#9AA3B5" }} /></InputAdornment> },
                  htmlInput: { maxLength: 12 }
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Ward Number"
                type="number"
                value={citizenWard}
                onChange={(e) => setCitizenWard(e.target.value)}
                helperText="Optional"
                slotProps={{ htmlInput: { min: 1 } }}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth required
                label="Residential Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                multiline rows={2}
                helperText="Full address including locality, city and PIN"
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><LocationOnIcon fontSize="small" sx={{ color: "#9AA3B5", alignSelf: "flex-start", mt: 1 }} /></InputAdornment> } }}
              />
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Section 3: Documents */}
      <Paper sx={{ mb: 2.5, overflow: "hidden", border: "1px solid #E4E8F0" }}>
        <Box sx={{ background: "linear-gradient(135deg, #0F2557, #1A3A8F)", px: 3, py: 1.5, display: "flex", alignItems: "center", gap: 1.5, justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <InsertDriveFileIcon sx={{ color: "rgba(255,255,255,0.8)", fontSize: 18 }} />
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.72rem" }}>
              Supporting Documents
            </Typography>
          </Box>
          <Chip size="small" label="Optional" sx={{ bgcolor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)", fontSize: "0.65rem", height: 20 }} />
        </Box>
        <Box sx={{ p: 3 }}>
          <Alert severity="info" sx={{ mb: 2.5, fontSize: "0.82rem" }}>
            Upload the citizen's identity documents for record keeping. These will be stored securely and visible only to officers.
          </Alert>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <FileBox
              label="Aadhaar Card"
              file={aadhaarFile}
              onClear={() => setAadhaarFile(null)}
              onBrowse={() => aadhaarRef.current?.click()}
              inputRef={aadhaarRef}
              onChange={handleAadhaarFile}
            />
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#5A6072", display: "block", mb: 0.75 }}>
                Additional Documents
              </Typography>
              {otherDocs.map((d, i) => (
                <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.25, bgcolor: "#F8F9FC", borderRadius: 1.5, border: "1px solid #E4E8F0", mb: 0.75 }}>
                  <InsertDriveFileIcon sx={{ color: "#1A3A8F", fontSize: 18, flexShrink: 0 }} />
                  <Typography variant="caption" sx={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>
                    {d.file.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#9AA3B5", fontSize: "0.65rem", flexShrink: 0 }}>
                    {(d.file.size / 1024).toFixed(0)} KB
                  </Typography>
                  <Button size="small" color="error" onClick={() => setOtherDocs(prev => prev.filter((_, idx) => idx !== i))} sx={{ minWidth: 0, px: 1, fontSize: "0.72rem", flexShrink: 0 }}>
                    Remove
                  </Button>
                </Box>
              ))}
              <input ref={otherRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={handleOtherFile} />
              <Button variant="outlined" size="small" startIcon={<UploadFileIcon />} onClick={() => otherRef.current?.click()} sx={{ mt: 0.5, fontSize: "0.78rem" }}>
                Add Document
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Submit */}
      <Paper sx={{ overflow: "hidden", border: "1px solid #E4E8F0" }}>
        <Box sx={{ p: 3 }}>
          <Alert severity="info" sx={{ mb: 2.5, borderRadius: 1.5, fontSize: "0.82rem" }}>
            A Keycloak account will be created automatically. The citizen can log in using their <strong>email</strong> with their <strong>mobile number as the initial password</strong>.
          </Alert>
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={registerCitizen}
            disabled={loading}
            startIcon={<HowToRegIcon />}
            sx={{ py: 1.5, fontSize: "0.95rem", fontWeight: 700 }}
          >
            {loading ? "Registering..." : "Register Citizen & Create Account"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}