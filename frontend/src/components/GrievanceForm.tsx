import { useState } from "react";
import { Paper, Typography, TextField, Button, Box, Grid, Alert, Divider, MenuItem, Select, InputLabel, FormControl } from "@mui/material";
import AddCommentIcon from "@mui/icons-material/AddComment";
import { api } from "../api";

interface Props {
  citizenId: string;
  loading: boolean;
  onCitizenIdChange: (v: string) => void;
  onError: (msg: string) => void;
  onLoadingChange: (v: boolean) => void;
  onGrievanceCreated: () => void;
}

export default function GrievanceForm({
  citizenId, loading, onCitizenIdChange, onError, onLoadingChange, onGrievanceCreated
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");

  const createGrievance = async () => {
    onError("");
    if (!title.trim() || !description.trim()) { onError("Title and description are required"); return; }
    if (!citizenId || !/^\d+$/.test(citizenId)) { onError("Enter a valid Citizen ID"); return; }
    onLoadingChange(true);
    try {
      await api.post("/api/grievances", {
        citizenId: Number(citizenId),
        title,
        description,
        priority,
      });
      setTitle(""); setDescription("");
      onGrievanceCreated();
    } catch {
      onError("Failed to create grievance — check that the Citizen ID exists");
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
          <AddCommentIcon />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F2557", lineHeight: 1.1 }}>
            File a Grievance
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Lodge a formal complaint for a citizen. Officers will be notified.
          </Typography>
        </Box>
      </Box>

      <Paper sx={{ overflow: "hidden", border: "1px solid #E4E8F0" }}>
        <Box sx={{ background: "linear-gradient(135deg, #0F2557, #1A3A8F)", px: 3, py: 1.5 }}>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.72rem" }}>
            Grievance Form
          </Typography>
        </Box>

        <Box sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Citizen ID"
                value={citizenId}
                onChange={(e) => onCitizenIdChange(e.target.value)}
                helperText="Registered citizen portal ID"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Priority</InputLabel>
                <Select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <MenuItem value="LOW">Low</MenuItem>
                  <MenuItem value="MEDIUM">Medium</MenuItem>
                  <MenuItem value="HIGH">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Grievance Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                helperText="Summarise the issue in one line (e.g. 'Water supply disruption in Ward 5')"
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Full Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                rows={4}
                helperText="Provide full details including location, date, and impact"
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2.5 }} />

          <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5, fontSize: "0.8rem" }}>
            The grievance will be assigned an SLA deadline automatically. Officers will review and assign it to the appropriate department.
          </Alert>

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={createGrievance}
            disabled={loading}
            startIcon={<AddCommentIcon />}
            sx={{ py: 1.3 }}
          >
            {loading ? "Submitting..." : "Submit Grievance"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}