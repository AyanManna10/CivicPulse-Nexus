import { useState, useRef } from "react";
import {
  Box, Paper, TextField, Button, Typography, Alert, CircularProgress,
  InputAdornment, Divider, Grid, MenuItem, Select, FormControl,
  InputLabel, FormHelperText, Step, Stepper, StepLabel, Chip
} from "@mui/material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EmailIcon from "@mui/icons-material/Email";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import axios from "axios";

interface Props {
  onRegistrationSuccess: () => void;
}

interface UploadedFile {
  file: File;
  docType: string;
}

export default function CitizenRegistration({ onRegistrationSuccess }: Props) {
  const [step, setStep] = useState(0);

  // Step 0 — email
  const [email, setEmail]             = useState("");
  const [emailError, setEmailError]   = useState("");
  const [emailChecking, setEmailChecking] = useState(false);

  // Step 1 — personal
  const [fullName, setFullName] = useState("");
  const [phone, setPhone]       = useState("");
  const [dob, setDob]           = useState("");
  const [gender, setGender]     = useState("");
  const [ward, setWard]         = useState("");
  const [aadhaar, setAadhaar]   = useState("");
  const [address, setAddress]   = useState("");

  // Step 2 — documents
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [panFile, setPanFile]         = useState<File | null>(null);
  const [otherFiles, setOtherFiles]   = useState<UploadedFile[]>([]);
  const aadhaarRef = useRef<HTMLInputElement>(null);
  const panRef     = useRef<HTMLInputElement>(null);
  const otherRef   = useRef<HTMLInputElement>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading]         = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");

  const checkEmail = async (val: string) => {
    setEmail(val);
    setEmailError("");
    if (!val) return;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(val)) { setEmailError("Invalid email format"); return; }
    setEmailChecking(true);
    try {
      const res = await axios.get(`http://localhost:9000/api/citizens/check-email?email=${encodeURIComponent(val)}`);
      if (!res.data.available) setEmailError("This email is already registered or has a pending application");
    } catch { /* ignore */ }
    finally { setEmailChecking(false); }
  };

  const validateStep0 = () => {
    if (!email || emailError) { setEmailError(emailError || "Valid email is required"); return false; }
    return true;
  };

  const validateStep1 = () => {
    const errors: Record<string, string> = {};
    if (!fullName || fullName.trim().length < 2) errors.fullName = "Full name is required";
    if (!phone || !/^[6-9]\d{9}$/.test(phone))  errors.phone    = "Valid 10-digit mobile number required";
    if (!dob)                                     errors.dob      = "Date of birth is required";
    if (!gender)                                  errors.gender   = "Gender is required";
    if (!aadhaar || !/^\d{12}$/.test(aadhaar))   errors.aadhaar  = "Valid 12-digit Aadhaar number is required";
    if (!address || address.trim().length < 5)    errors.address  = "Address is required";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = () => {
    if (!aadhaarFile) {
      setFieldErrors({ aadhaarFile: "Aadhaar card document is required" });
      return false;
    }
    setFieldErrors({});
    return true;
  };

  const handleNext = () => {
    if (step === 0 && !validateStep0()) return;
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep(step + 1);
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (f: File | null) => void
  ) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setError("File must be under 5MB"); return; }
    setter(f);
    setError("");
  };

  const handleOtherFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setError("File must be under 5MB"); return; }
    setOtherFiles(prev => [...prev, { file: f, docType: "OTHER" }]);
    setError("");
    if (otherRef.current) otherRef.current.value = "";
  };



const uploadFile = async (pendingId: string, file: File, docType: string) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("docType", docType);
  await axios.post(
    `http://localhost:9000/api/citizens/pending/${pendingId}/documents`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
};

const handleSubmit = async () => {
  setError("");
  setLoading(true);
  try {
    setUploadProgress("Submitting registration...");
    const res = await axios.post("http://localhost:9000/api/citizens/register", {
      fullName, phone, email, dob, gender,
      ward: ward ? Number(ward) : null,
      aadhaar, address,
    });
    

    const pendingId = res.data.id;
    console.log("Pending ID:", pendingId, "Full response:", res.data);

    // 2. Upload Aadhaar document
    if (aadhaarFile && pendingId) {
      setUploadProgress("Uploading Aadhaar card...");
      await uploadFile(pendingId, aadhaarFile, "AADHAAR");
    }

    // 3. Upload PAN card if provided
    if (panFile && pendingId) {
      setUploadProgress("Uploading PAN card...");
      await uploadFile(pendingId, panFile, "PAN");
    }

    // 4. Upload any other documents
    for (const { file, docType } of otherFiles) {
      if (pendingId) {
        setUploadProgress(`Uploading ${file.name}...`);
        await uploadFile(pendingId, file, docType);
      }
    }

    setUploadProgress("");
    setSuccess("Your registration and documents have been submitted! An officer will verify your details and activate your account. Your login password will be your mobile number.");
    setTimeout(() => onRegistrationSuccess(), 4000);
  } catch (err: any) {
    setError(err?.response?.data?.error || "Submission failed. Please try again.");
    setUploadProgress("");
  } finally {
    setLoading(false);
  }
};

  const FileUploadBox = ({
    label, required, file, onClear, onBrowse, inputRef, onChange, accept = "image/*,.pdf", error: ferr
  }: {
    label: string; required?: boolean; file: File | null;
    onClear: () => void; onBrowse: () => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    accept?: string; error?: string;
  }) => (
    <Box>
      <Typography variant="caption" sx={{ fontWeight: 700, color: "#5A6072", display: "block", mb: 0.75 }}>
        {label} {required && <Box component="span" sx={{ color: "#C62828" }}>*</Box>}
      </Typography>
      <input ref={inputRef} type="file" accept={accept} style={{ display: "none" }} onChange={onChange} />
      {file ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 1.5, bgcolor: "#E8F5E9", borderRadius: 1.5, border: "1px solid #A5D6A7" }}>
          <InsertDriveFileIcon sx={{ color: "#2E7D32", fontSize: 20 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: "#2E7D32", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {file.name}
            </Typography>
            <Typography variant="caption" sx={{ color: "#5A6072", fontSize: "0.68rem" }}>
              {(file.size / 1024).toFixed(0)} KB
            </Typography>
          </Box>
          <Button size="small" color="error" onClick={onClear} sx={{ minWidth: 0, px: 1, fontSize: "0.72rem" }}>Remove</Button>
        </Box>
      ) : (
        <Box
          onClick={onBrowse}
          sx={{
            border: `2px dashed ${ferr ? "#C62828" : "#CBD2E0"}`, borderRadius: 1.5,
            p: 2, textAlign: "center", cursor: "pointer",
            bgcolor: "#F8F9FC", transition: "all 0.15s",
            "&:hover": { borderColor: "#1A3A8F", bgcolor: "#F0F4FF" }
          }}
        >
          <UploadFileIcon sx={{ color: "#9AA3B5", fontSize: 28, mb: 0.5 }} />
          <Typography variant="caption" sx={{ display: "block", color: "#5A6072", fontWeight: 600 }}>
            Click to browse
          </Typography>
          <Typography variant="caption" sx={{ color: "#9AA3B5", fontSize: "0.68rem" }}>
            PDF, JPG, PNG — max 5MB
          </Typography>
        </Box>
      )}
      {ferr && <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.5 }}>{ferr}</Typography>}
    </Box>
  );

  const reviewRows = [
    { label: "Email", value: email },
    { label: "Full Name", value: fullName },
    { label: "Mobile", value: phone },
    { label: "Date of Birth", value: dob },
    { label: "Gender", value: gender },
    { label: "Aadhaar", value: "••••••••" + aadhaar.slice(-4) },
    { label: "Address", value: address },
    ...(ward ? [{ label: "Ward", value: ward }] : []),
  ];

  const docsSummary = [
    ...(aadhaarFile ? [{ name: "Aadhaar Card", file: aadhaarFile }] : []),
    ...(panFile ? [{ name: "PAN Card", file: panFile }] : []),
    ...otherFiles.map(o => ({ name: "Other Document", file: o.file })),
  ];

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: "#F0F2F8" }}>
      <Box sx={{ bgcolor: "#0F2557", py: 1, px: 3, display: "flex", alignItems: "center", gap: 1.5, borderBottom: "3px solid #E65100" }}>
        <AccountBalanceIcon sx={{ color: "#fff", fontSize: 18 }} />
        <Typography variant="caption" sx={{ color: "#fff", fontWeight: 600, letterSpacing: 0.8, fontSize: "0.78rem" }}>
          GOVERNMENT OF INDIA &nbsp;·&nbsp; MINISTRY OF URBAN DEVELOPMENT
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.7rem" }}>Digital India Initiative</Typography>
      </Box>

      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
        <Box sx={{ width: "100%", maxWidth: 620 }}>
          {success ? (
            <Paper sx={{ p: 5, textAlign: "center", border: "1px solid #E4E8F0" }}>
              <CheckCircleIcon sx={{ fontSize: 64, color: "#2E7D32", mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#2E7D32", mb: 1 }}>Application Submitted!</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{success}</Typography>
              <Typography variant="caption" color="text.secondary">Redirecting to login...</Typography>
            </Paper>
          ) : (
            <Paper sx={{ overflow: "hidden", border: "1px solid #E4E8F0" }}>
              <Box sx={{ background: "linear-gradient(135deg, #0F2557 0%, #1A3A8F 100%)", borderBottom: "3px solid #E65100", p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <HowToRegIcon sx={{ color: "#fff", fontSize: 24 }} />
                  <Box>
                    <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700 }}>Citizen Registration</Typography>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
                      Submit your details and documents for officer verification
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ px: 3, py: 2, bgcolor: "#F8F9FC", borderBottom: "1px solid #E4E8F0" }}>
                <Stepper activeStep={step} sx={{ "& .MuiStepLabel-label": { fontSize: "0.78rem" } }}>
                  <Step><StepLabel>Email</StepLabel></Step>
                  <Step><StepLabel>Personal Details</StepLabel></Step>
                  <Step><StepLabel>Documents</StepLabel></Step>
                  <Step><StepLabel>Review</StepLabel></Step>
                </Stepper>
              </Box>

              <Box sx={{ p: 3 }}>
                {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{error}</Alert>}

                {/* Step 0 — Email */}
                {step === 0 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: "#0F2557" }}>Your Email Address</Typography>
                    <Alert severity="info" sx={{ mb: 2.5, fontSize: "0.82rem" }}>
                      This email will be your login username after your account is verified by an officer.
                    </Alert>
                    <TextField
                      fullWidth label="Email Address" type="email" value={email}
                      onChange={(e) => checkEmail(e.target.value)}
                      error={!!emailError}
                      helperText={emailChecking ? "Checking..." : emailError || "Must be unique — this becomes your login"}
                      slotProps={{
                        input: {
                          startAdornment: <InputAdornment position="start"><EmailIcon fontSize="small" sx={{ color: "#5A6072" }} /></InputAdornment>,
                          endAdornment: emailChecking
                            ? <InputAdornment position="end"><CircularProgress size={16} /></InputAdornment>
                            : email && !emailError
                              ? <InputAdornment position="end"><CheckCircleIcon sx={{ color: "#2E7D32", fontSize: 18 }} /></InputAdornment>
                              : null,
                        },
                      }}
                    />
                  </Box>
                )}

                {/* Step 1 — Personal Details */}
                {step === 1 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: "#0F2557" }}>Personal Information</Typography>
                    <Grid container spacing={2}>
                      <Grid size={12}>
                        <TextField fullWidth required label="Full Name" value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          error={!!fieldErrors.fullName} helperText={fieldErrors.fullName || "As per government records"}
                          slotProps={{ input: { startAdornment: <InputAdornment position="start"><PersonIcon fontSize="small" sx={{ color: "#5A6072" }} /></InputAdornment> } }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth required label="Mobile Number" value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          error={!!fieldErrors.phone} helperText={fieldErrors.phone || `${phone.length}/10 — also your initial password`}
                          slotProps={{ input: { startAdornment: <InputAdornment position="start"><PhoneIcon fontSize="small" sx={{ color: "#5A6072" }} /></InputAdornment> } }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth required label="Date of Birth" type="date" value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          error={!!fieldErrors.dob} helperText={fieldErrors.dob}
                          slotProps={{ inputLabel: { shrink: true } }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth required error={!!fieldErrors.gender}>
                          <InputLabel>Gender</InputLabel>
                          <Select value={gender} label="Gender" onChange={(e) => setGender(e.target.value)}>
                            <MenuItem value="MALE">Male</MenuItem>
                            <MenuItem value="FEMALE">Female</MenuItem>
                            <MenuItem value="OTHER">Other</MenuItem>
                          </Select>
                          {fieldErrors.gender && <FormHelperText>{fieldErrors.gender}</FormHelperText>}
                        </FormControl>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth label="Ward Number" type="number" value={ward}
                          onChange={(e) => setWard(e.target.value)} helperText="Optional"
                          slotProps={{ input: { inputProps: { min: 1 } } }}
                        />
                      </Grid>
                      <Grid size={12}>
                        <TextField fullWidth required label="Aadhaar Number" value={aadhaar}
                          onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, "").slice(0, 12))}
                          error={!!fieldErrors.aadhaar} helperText={fieldErrors.aadhaar || `${aadhaar.length}/12 digits`}
                        />
                      </Grid>
                      <Grid size={12}>
                        <TextField fullWidth required label="Residential Address" value={address}
                          onChange={(e) => setAddress(e.target.value)} multiline rows={2}
                          error={!!fieldErrors.address} helperText={fieldErrors.address || "Full address including locality and city"}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {/* Step 2 — Documents */}
                {step === 2 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 700, color: "#0F2557" }}>Upload Identity Documents</Typography>
                    <Alert severity="warning" sx={{ mb: 2.5, fontSize: "0.82rem" }}>
                      Documents are required for officer verification. Upload clear, readable scans or photos. Accepted formats: PDF, JPG, PNG (max 5MB each).
                    </Alert>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <FileUploadBox
                        label="Aadhaar Card" required
                        file={aadhaarFile}
                        onClear={() => setAadhaarFile(null)}
                        onBrowse={() => aadhaarRef.current?.click()}
                        inputRef={aadhaarRef}
                        onChange={(e) => handleFileChange(e, setAadhaarFile)}
                        error={fieldErrors.aadhaarFile}
                      />
                      <FileUploadBox
                        label="PAN Card (optional)"
                        file={panFile}
                        onClear={() => setPanFile(null)}
                        onBrowse={() => panRef.current?.click()}
                        inputRef={panRef}
                        onChange={(e) => handleFileChange(e, setPanFile)}
                      />
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: "#5A6072", display: "block", mb: 0.75 }}>
                          Additional Documents (optional)
                        </Typography>
                        {otherFiles.map((o, i) => (
                          <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1, p: 1, bgcolor: "#F8F9FC", borderRadius: 1, border: "1px solid #E4E8F0", mb: 0.75 }}>
                            <InsertDriveFileIcon sx={{ color: "#5A6072", fontSize: 18 }} />
                            <Typography variant="caption" sx={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.file.name}</Typography>
                            <Button size="small" color="error" onClick={() => setOtherFiles(prev => prev.filter((_, idx) => idx !== i))} sx={{ minWidth: 0, px: 1, fontSize: "0.72rem" }}>Remove</Button>
                          </Box>
                        ))}
                        <input ref={otherRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={handleOtherFile} />
                        <Button variant="outlined" size="small" startIcon={<UploadFileIcon />} onClick={() => otherRef.current?.click()} sx={{ mt: 0.5, fontSize: "0.78rem" }}>
                          Add Document
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                )}

                {/* Step 3 — Review */}
                {step === 3 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: "#0F2557" }}>Review & Submit</Typography>
                    <Alert severity="warning" sx={{ mb: 2, fontSize: "0.82rem" }}>
                      Your application and documents will be reviewed by an officer. After approval, you can log in using your email and mobile number as password.
                    </Alert>
                    <Box sx={{ bgcolor: "#F8F9FC", borderRadius: 2, p: 2, mb: 2, border: "1px solid #E4E8F0" }}>
                      {reviewRows.map(({ label, value }) => (
                        <Box key={label} sx={{ display: "flex", justifyContent: "space-between", mb: 1, pb: 1, borderBottom: "1px solid #E4E8F0", "&:last-child": { mb: 0, pb: 0, border: "none" } }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: "#5A6072", textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.7rem" }}>
                            {label}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "#0F2557", maxWidth: "60%", textAlign: "right" }}>{value}</Typography>
                        </Box>
                      ))}
                    </Box>
                    <Box sx={{ bgcolor: "#F8F9FC", borderRadius: 2, p: 2, border: "1px solid #E4E8F0" }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "#5A6072", textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.7rem", display: "block", mb: 1 }}>
                        Documents to Upload ({docsSummary.length})
                      </Typography>
                      {docsSummary.length === 0
                        ? <Typography variant="caption" color="error">No documents selected</Typography>
                        : docsSummary.map((d, i) => (
                          <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                            <CheckCircleIcon sx={{ fontSize: 14, color: "#2E7D32" }} />
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>{d.name}</Typography>
                            <Typography variant="caption" color="text.secondary">— {d.file.name}</Typography>
                          </Box>
                        ))
                      }
                    </Box>
                    {uploadProgress && (
                      <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1 }}>
                        <CircularProgress size={16} />
                        <Typography variant="caption" color="text.secondary">{uploadProgress}</Typography>
                      </Box>
                    )}
                  </Box>
                )}

                <Box sx={{ display: "flex", gap: 1.5, mt: 3 }}>
                  {step > 0 && (
                    <Button variant="outlined" onClick={() => setStep(step - 1)} disabled={loading} sx={{ flex: 1 }}>Back</Button>
                  )}
                  {step < 3 ? (
                    <Button variant="contained" onClick={handleNext} sx={{ flex: 1 }}>Next</Button>
                  ) : (
                    <Button variant="contained" onClick={handleSubmit} disabled={loading} sx={{ flex: 1 }}>
                      {loading ? <CircularProgress size={20} color="inherit" /> : "Submit for Verification"}
                    </Button>
                  )}
                </Box>

                <Divider sx={{ my: 2.5 }} />
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", display: "block" }}>
                  Already have an account? Go back and sign in with your email and password.
                </Typography>
              </Box>
            </Paper>
          )}
        </Box>
      </Box>

      <Box sx={{ py: 1.5, textAlign: "center", borderTop: "1px solid #E4E8F0", bgcolor: "#fff" }}>
        <Typography variant="caption" color="text.secondary">
          © 2026 CivicPulse Nexus · Government Digital Services · Built under Digital India Programme
        </Typography>
      </Box>
    </Box>
  );
}