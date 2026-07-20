import { useState } from "react";
import {
  Box, Paper, TextField, Button, Typography, Alert, CircularProgress,
  InputAdornment, Divider, Grid, Checkbox, FormControlLabel, LinearProgress,
  Step, Stepper, StepLabel
} from "@mui/material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import axios from "axios";

interface Props {
  onRegistrationSuccess: () => void;
}

interface PasswordStrength {
  score: number;
  valid: boolean;
  feedback: string;
}

export default function CitizenRegistration({ onRegistrationSuccess }: Props) {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [ward, setWard] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [address, setAddress] = useState("");

  const [emailError, setEmailError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({ score: 0, valid: false, feedback: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const validateEmail = (e: string) => {
    setEmail(e);
    setEmailError("");
    if (!e) return;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(e)) { setEmailError("Invalid email format"); return; }
    axios
      .get(`/api/auth/check-email?email=${encodeURIComponent(e)}`)
      .then((res) => { if (!res.data.available) setEmailError("This email is already registered"); })
      .catch(() => {});
  };

  const validatePassword = (pwd: string) => {
    setPassword(pwd);
    if (!pwd) return;
    axios
      .post(`/api/auth/validate-password`, { password: pwd })
      .then((res) => setPasswordStrength(res.data))
      .catch(() => setPasswordStrength({ score: 0, valid: false, feedback: "Error validating password" }));
  };

  const validateStep0 = () => {
    const errors: Record<string, string> = {};
    if (!email || emailError) errors.email = emailError || "Email required";
    if (!password) errors.password = "Password required";
    else if (!passwordStrength.valid) errors.password = "Password does not meet requirements";
    if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep1 = () => {
    const errors: Record<string, string> = {};
    const nameRe = /^[a-zA-Z\s.\-']{2,80}$/;
    if (!fullName || !nameRe.test(fullName)) errors.fullName = "Valid name required (letters, spaces, dots, hyphens only)";
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) errors.phone = "Valid 10-digit mobile number required (starts with 6-9)";
    if (!ward || isNaN(Number(ward))) errors.ward = "Ward number required";
    if (aadhaar && !/^\d{12}$/.test(aadhaar)) errors.aadhaar = "Aadhaar must be 12 digits";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (step === 0 && !validateStep0()) return;
    if (step === 1 && !validateStep1()) return;
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!termsAccepted) { setError("Please accept the terms and conditions"); return; }
    setError("");
    setLoading(true);
    try {
      const response = await axios.post(`/api/auth/register`, {
        email, password, fullName, phone,
        ward: Number(ward),
        aadhaar: aadhaar || undefined,
        address: address || undefined,
      });
      setSuccess(`Registration successful! Your Citizen ID is: ${response.data.citizenId}. You can now log in.`);
      setTimeout(() => { onRegistrationSuccess(); }, 2500);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const passwordScore = passwordStrength.score;
  const passwordColor =
    passwordScore === 0 ? "#ccc"
    : passwordScore <= 1 ? "#C62828"
    : passwordScore <= 2 ? "#E65100"
    : passwordScore <= 3 ? "#F57C00"
    : "#2E7D32";

  const reviewRows: { label: string; value: string }[] = [
    { label: "Email", value: email },
    { label: "Full Name", value: fullName },
    { label: "Mobile", value: phone },
    { label: "Ward", value: ward },
    ...(aadhaar ? [{ label: "Aadhaar", value: "••••••••" + aadhaar.slice(-4) }] : []),
  ];

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: "#F0F2F8" }}>
      {/* Top banner */}
      <Box sx={{ bgcolor: "#0F2557", py: 1, px: 3, display: "flex", alignItems: "center", gap: 1.5, borderBottom: "3px solid #E65100" }}>
        <AccountBalanceIcon sx={{ color: "#fff", fontSize: 18 }} />
        <Typography variant="caption" sx={{ color: "#fff", fontWeight: 600, letterSpacing: 0.8, fontSize: "0.78rem" }}>
          GOVERNMENT OF INDIA &nbsp;·&nbsp; MINISTRY OF URBAN DEVELOPMENT
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.7rem" }}>Digital India Initiative</Typography>
      </Box>

      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
        <Box sx={{ width: "100%", maxWidth: 600 }}>

          {success ? (
            <Paper sx={{ p: 5, textAlign: "center", border: "1px solid #E4E8F0" }}>
              <CheckCircleIcon sx={{ fontSize: 64, color: "#2E7D32", mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#2E7D32", mb: 1 }}>Registration Successful!</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{success}</Typography>
              <Typography variant="caption" color="text.secondary">Redirecting to login page...</Typography>
            </Paper>
          ) : (
            <Paper sx={{ overflow: "hidden", border: "1px solid #E4E8F0" }}>
              {/* Header */}
              <Box sx={{ background: "linear-gradient(135deg, #0F2557 0%, #1A3A8F 100%)", borderBottom: "3px solid #E65100", p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <HowToRegIcon sx={{ color: "#fff", fontSize: 24 }} />
                  <Box>
                    <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700 }}>Create Citizen Account</Typography>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
                      Join CivicPulse and access government services online
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Stepper */}
              <Box sx={{ px: 3, py: 2, bgcolor: "#F8F9FC", borderBottom: "1px solid #E4E8F0" }}>
                <Stepper activeStep={step} sx={{ "& .MuiStepLabel-label": { fontSize: "0.8rem" } }}>
                  <Step><StepLabel>Account</StepLabel></Step>
                  <Step><StepLabel>Personal Info</StepLabel></Step>
                  <Step><StepLabel>Review</StepLabel></Step>
                </Stepper>
              </Box>

              <Box sx={{ p: 3 }}>
                {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{error}</Alert>}

                {/* ── Step 0: Account ── */}
                {step === 0 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: "#0F2557" }}>Email & Password</Typography>

                    <TextField
                      fullWidth
                      label="Email Address"
                      type="email"
                      value={email}
                      onChange={(e) => validateEmail(e.target.value)}
                      error={!!emailError}
                      helperText={emailError || "Will be your login username"}
                      sx={{ mb: 2 }}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <EmailIcon fontSize="small" sx={{ color: "#5A6072" }} />
                            </InputAdornment>
                          ),
                        },
                      }}
                    />

                    <TextField
                      fullWidth
                      label="Create Password"
                      type="password"
                      value={password}
                      onChange={(e) => validatePassword(e.target.value)}
                      error={!!fieldErrors.password && password.length > 0}
                      helperText={password.length > 0 ? "Must have 8+ chars, uppercase, lowercase, number, special char (@$!%*?&)" : ""}
                      sx={{ mb: 1.5 }}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <LockIcon fontSize="small" sx={{ color: "#5A6072" }} />
                            </InputAdornment>
                          ),
                        },
                      }}
                    />

                    {password && (
                      <Box sx={{ mb: 2.5 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: "#5A6072" }}>Password Strength</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: passwordColor }}>
                            {["None", "Weak", "Fair", "Good", "Strong"][passwordScore]}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={(passwordScore / 4) * 100}
                          sx={{ height: 6, borderRadius: 3, bgcolor: "#E4E8F0", "& .MuiLinearProgress-bar": { bgcolor: passwordColor } }}
                        />
                        {passwordStrength.feedback && (
                          <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.75 }}>
                            {passwordStrength.feedback}
                          </Typography>
                        )}
                      </Box>
                    )}

                    <TextField
                      fullWidth
                      label="Confirm Password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      error={!!fieldErrors.confirmPassword && confirmPassword.length > 0}
                      helperText={fieldErrors.confirmPassword}
                      sx={{ mb: 2 }}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <LockIcon fontSize="small" sx={{ color: "#5A6072" }} />
                            </InputAdornment>
                          ),
                          endAdornment: confirmPassword && password === confirmPassword ? (
                            <InputAdornment position="end">
                              <CheckCircleIcon sx={{ color: "#2E7D32", fontSize: 18 }} />
                            </InputAdornment>
                          ) : null,
                        },
                      }}
                    />

                    <Alert severity="info" sx={{ borderRadius: 1.5, fontSize: "0.8rem" }}>
                      Use a strong password with uppercase, lowercase, numbers, and special characters (@$!%*?&).
                    </Alert>
                  </Box>
                )}

                {/* ── Step 1: Personal Info ── */}
                {step === 1 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: "#0F2557" }}>Personal Information</Typography>
                    <Grid container spacing={2}>
                      <Grid size={12}>
                        <TextField
                          fullWidth
                          label="Full Name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          error={!!fieldErrors.fullName}
                          helperText={fieldErrors.fullName || "As per government records"}
                          slotProps={{
                            input: {
                              startAdornment: (
                                <InputAdornment position="start">
                                  <PersonIcon fontSize="small" sx={{ color: "#5A6072" }} />
                                </InputAdornment>
                              ),
                            },
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="Mobile Number"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          error={!!fieldErrors.phone}
                          helperText={fieldErrors.phone || `${phone.length}/10 digits`}
                          slotProps={{
                            input: {
                              startAdornment: (
                                <InputAdornment position="start">
                                  <PhoneIcon fontSize="small" sx={{ color: "#5A6072" }} />
                                </InputAdornment>
                              ),
                              inputProps: { maxLength: 10 },
                            },
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="Ward Number"
                          type="number"
                          value={ward}
                          onChange={(e) => setWard(e.target.value)}
                          error={!!fieldErrors.ward}
                          helperText={fieldErrors.ward}
                          slotProps={{ input: { inputProps: { min: 1 } } }}
                        />
                      </Grid>
                      <Grid size={12}>
                        <TextField
                          fullWidth
                          label="Aadhaar Number (optional)"
                          value={aadhaar}
                          onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, "").slice(0, 12))}
                          error={!!fieldErrors.aadhaar}
                          helperText={fieldErrors.aadhaar || `${aadhaar.length}/12 digits`}
                          slotProps={{ input: { inputProps: { maxLength: 12 } } }}
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
                  </Box>
                )}

                {/* ── Step 2: Review ── */}
                {step === 2 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: "#0F2557" }}>Review & Confirm</Typography>

                    <Box sx={{ bgcolor: "#F8F9FC", borderRadius: 2, p: 2, mb: 2.5, border: "1px solid #E4E8F0" }}>
                      {reviewRows.map(({ label, value }) => (
                        <Box
                          key={label}
                          sx={{
                            display: "flex", justifyContent: "space-between",
                            mb: 1, pb: 1, borderBottom: "1px solid #E4E8F0",
                            "&:last-child": { mb: 0, pb: 0, border: "none" },
                          }}
                        >
                          <Typography variant="caption" sx={{ fontWeight: 600, color: "#5A6072", textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.7rem" }}>
                            {label}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "#0F2557" }}>{value}</Typography>
                        </Box>
                      ))}
                    </Box>

                    <FormControlLabel
                      control={<Checkbox checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />}
                      label={
                        <Typography variant="caption" sx={{ color: "#5A6072" }}>
                          I agree to the <strong>Terms of Service</strong> and <strong>Privacy Policy</strong> of CivicPulse Nexus
                        </Typography>
                      }
                      sx={{ mb: 2 }}
                    />

                    {!termsAccepted && (
                      <Alert severity="warning" sx={{ borderRadius: 1.5, fontSize: "0.8rem" }}>
                        Please accept the terms to continue
                      </Alert>
                    )}
                  </Box>
                )}

                {/* Navigation buttons */}
                <Box sx={{ display: "flex", gap: 1.5, mt: 3 }}>
                  {step > 0 && (
                    <Button variant="outlined" onClick={() => setStep(step - 1)} sx={{ flex: 1 }}>
                      Back
                    </Button>
                  )}
                  {step < 2 ? (
                    <Button variant="contained" onClick={handleNext} sx={{ flex: 1 }}>
                      Next
                    </Button>
                  ) : (
                    <Button variant="contained" onClick={handleSubmit} disabled={loading || !termsAccepted} sx={{ flex: 1 }}>
                      {loading ? <CircularProgress size={20} color="inherit" /> : "Create Account"}
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