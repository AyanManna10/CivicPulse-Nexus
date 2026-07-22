import { useState, useRef } from "react";
import { Paper, Typography, TextField, Button, Box, Grid, Alert, Divider } from "@mui/material";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
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
  const [citizenWard, setCitizenWard]   = useState("1");
  const [aadhaar, setAadhaar]           = useState("");
  const [address, setAddress]           = useState("");
  const [dob, setDob]                   = useState("");
  const [gender, setGender]             = useState("");
  const [success, setSuccess]           = useState("");
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

  const registerCitizen = async () => {
    onError("");
    setSuccess("");
    if (!/^\d{10}$/.test(citizenPhone)) { onError("Phone must be exactly 10 digits"); return; }
    if (!/^\S+@\S+\.\S+$/.test(citizenEmail)) { onError("Enter a valid email address"); return; }
    if (!citizenName.trim()) { onError("Full name is required"); return; }
    if (!aadhaar || !/^\d{12}$/.test(aadhaar)) { onError("Valid 12-digit Aadhaar number is required"); return; }
    if (!address.trim()) { onError("Address is required"); return; }

    onLoadingChange(true);
    try {
      const res = await api.post("/api/citizens", {
        fullName: citizenName,
        phone: citizenPhone,
        email: citizenEmail,
        ward: Number(citizenWard),
        aadhar: aadhaar,
        address,
        dob: dob || undefined,
        gender: gender || undefined,
      });
      const newId = String(res.data?.id ?? res.data?.citizenId ?? "");

      // Upload Aadhaar document if provided
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
      setSuccess(`Citizen registered! Citizen ID: ${newId}. Login: ${citizenEmail} / ${citizenPhone}`);
      setCitizenName(""); setCitizenPhone(""); setCitizenEmail("");
      setCitizenWard("1"); setAadhaar(""); setAddress("");
      setDob(""); setGender(""); setAadhaarFile(null); setOtherDocs([]);
      onCitizenRegistered(newId);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Registration failed — check that all fields are valid";
      onError(typeof msg === "string" ? msg : "Registration failed");
      setUploadMsg("");
    } finally {
      onLoadingChange(false);
    }
  };

  const FileBox = ({ file, label, onClear, onBrowse, inputRef, onChange }: {
    file: File | null; label: string; onClear: () => void; onBrowse: () => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }) => (
    <Box>
      <Typography variant="caption" sx={{ fontWeight: 700, color: "#5A6072", display: "block", mb: 0.5 }}>{label}</Typography>
      <input ref={inputRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={onChange} />
      {file ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 1.5, bgcolor: "#E8F5E9", borderRadius: 1.5, border: "1px solid #A5D6A7" }}>
          <CheckCircleIcon sx={{ color: "#2E7D32", fontSize: 18 }} />
          <Typography variant="caption" sx={{ flex: 1, fontWeight: 600, color: "#2E7D32", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</Typography>
          <Button size="small" color="error" onClick={onClear} sx={{ minWidth: 0, px: 1, fontSize: "0.72rem" }}>Remove</Button>
        </Box>
      ) : (
        <Box onClick={onBrowse} sx={{ border: "2px dashed #CBD2E0", borderRadius: 1.5, p: 1.5, textAlign: "center", cursor: "pointer", bgcolor: "#F8F9FC", "&:hover": { borderColor: "#1A3A8F" } }}>
          <UploadFileIcon sx={{ color: "#9AA3B5", fontSize: 22 }} />
          <Typography variant="caption" sx={{ display: "block", color: "#5A6072", fontWeight: 600 }}>Click to browse</Typography>
          <Typography variant="caption" sx={{ color: "#9AA3B5", fontSize: "0.68rem" }}>PDF, JPG, PNG — max 5MB</Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ maxWidth: 640 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: 2.5, background: "linear-gradient(135deg, #0F2557, #1A3A8F)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
          <HowToRegIcon />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F2557", lineHeight: 1.1 }}>Register New Citizen</Typography>
          <Typography variant="caption" color="text.secondary">Enrol a citizen in the portal. A Keycloak account is auto-created on registration.</Typography>
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
          {uploadMsg && <Alert severity="info" sx={{ mb: 2, fontSize: "0.82rem" }}>{uploadMsg}</Alert>}

          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField fullWidth label="Full Name" value={citizenName}
                onChange={(e) => setCitizenName(e.target.value)} helperText="As per Aadhaar card" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Mobile Number" value={citizenPhone}
                onChange={(e) => setCitizenPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                helperText={`${citizenPhone.length}/10 digits · Used as temp password`}
                slotProps={{ htmlInput: { maxLength: 10 } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Email Address" type="email" value={citizenEmail}
                onChange={(e) => setCitizenEmail(e.target.value)} helperText="Used as Keycloak login username" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Date of Birth" type="date" value={dob}
                onChange={(e) => setDob(e.target.value)} helperText="Optional"
                slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth select label="Gender" value={gender} onChange={(e) => setGender(e.target.value)} helperText="Optional">
                <option value="">Select</option>
                {[["MALE","Male"],["FEMALE","Female"],["OTHER","Other"]].map(([v,l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Ward Number" type="number" value={citizenWard}
                onChange={(e) => setCitizenWard(e.target.value)}
                slotProps={{ htmlInput: { min: 1 } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth required label="Aadhaar Number" value={aadhaar}
                onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, "").slice(0, 12))}
                helperText={`${aadhaar.length}/12 digits — required`}
                slotProps={{ htmlInput: { maxLength: 12 } }} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth required label="Address" value={address}
                onChange={(e) => setAddress(e.target.value)} multiline rows={2}
                helperText="Full residential address — required" />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Supporting Documents</Typography>
          </Divider>

          <Alert severity="info" sx={{ mb: 2, fontSize: "0.82rem" }}>
            Upload the citizen's identity documents for record keeping. Aadhaar card upload is recommended.
          </Alert>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <FileBox label="Aadhaar Card (recommended)" file={aadhaarFile}
              onClear={() => setAadhaarFile(null)} onBrowse={() => aadhaarRef.current?.click()}
              inputRef={aadhaarRef} onChange={handleAadhaarFile} />

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#5A6072", display: "block", mb: 0.5 }}>Additional Documents (optional)</Typography>
              {otherDocs.map((d, i) => (
                <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1, p: 1, bgcolor: "#F8F9FC", borderRadius: 1, border: "1px solid #E4E8F0", mb: 0.5 }}>
                  <InsertDriveFileIcon sx={{ color: "#5A6072", fontSize: 16 }} />
                  <Typography variant="caption" sx={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.file.name}</Typography>
                  <Button size="small" color="error" onClick={() => setOtherDocs(prev => prev.filter((_, idx) => idx !== i))} sx={{ minWidth: 0, px: 1, fontSize: "0.72rem" }}>Remove</Button>
                </Box>
              ))}
              <input ref={otherRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={handleOtherFile} />
              <Button variant="outlined" size="small" startIcon={<UploadFileIcon />} onClick={() => otherRef.current?.click()} sx={{ mt: 0.5, fontSize: "0.78rem" }}>
                Add Document
              </Button>
            </Box>
          </Box>

          <Divider sx={{ my: 2.5 }} />

          <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5, fontSize: "0.8rem" }}>
            A Keycloak account will be auto-created. Login: <strong>email</strong> · Temp password: <strong>phone number</strong>
          </Alert>

          <Button variant="contained" size="large" fullWidth onClick={registerCitizen}
            disabled={loading} startIcon={<HowToRegIcon />} sx={{ py: 1.3 }}>
            {loading ? "Registering..." : "Register Citizen"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}