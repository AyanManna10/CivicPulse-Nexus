import { useState, useEffect  } from "react";
import {
  Paper, Typography, Box, Button, TextField, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Collapse, Chip, Stack, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert
} from "@mui/material";
import VerifiedIcon from "@mui/icons-material/Verified";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import ApplicationStatusChip from "../shared/ApplicationStatusChip";
import type { Certificate, CertificateStatus, CertificateType } from "../../types";
import { api } from "../../api";

interface Props {
  certificates: Certificate[];
  onError: (msg: string) => void;
  onLoadingChange: (v: boolean) => void;
  onChanged: () => void;
  onSearchChange: (name: string, status: CertificateStatus | "", type: CertificateType | "") => void;
}

const TYPE_LABEL: Record<string, string> = {
  BIRTH: "Birth Certificate", DEATH: "Death Certificate",
  INCOME: "Income Certificate", RESIDENCE: "Residence Certificate",
  MARRIAGE: "Marriage Certificate", TRADE_LICENSE: "Trade License",
  SHOP_LICENSE: "Shop License", BUILDING_PERMIT: "Building Permit",
  WATER_CONNECTION: "Water Connection",
};

const TYPE_ICON: Record<string, string> = {
  BIRTH: "👶", DEATH: "📋", INCOME: "💰", RESIDENCE: "🏠",
  MARRIAGE: "💍", TRADE_LICENSE: "🏪", SHOP_LICENSE: "🏬",
  BUILDING_PERMIT: "🏗️", WATER_CONNECTION: "💧",
};

const TYPE_COLOR: Record<string, string> = {
  BIRTH: "#1565C0", DEATH: "#5A6072", INCOME: "#2E7D32",
  RESIDENCE: "#6A1B9A", MARRIAGE: "#AD1457",
  TRADE_LICENSE: "#E65100", SHOP_LICENSE: "#BF360C",
  BUILDING_PERMIT: "#827717", WATER_CONNECTION: "#006064",
};

const TYPE_CATEGORY: Record<string, "Certificate" | "Permit"> = {
  BIRTH: "Certificate", DEATH: "Certificate", INCOME: "Certificate",
  RESIDENCE: "Certificate", MARRIAGE: "Certificate",
  TRADE_LICENSE: "Permit", SHOP_LICENSE: "Permit",
  BUILDING_PERMIT: "Permit", WATER_CONNECTION: "Permit",
};

const STATUSES: CertificateStatus[] = [
  "SUBMITTED", "UNDER_VERIFICATION", "VERIFIED", "APPROVED",
  "REJECTED", "CERTIFICATE_GENERATED", "DOWNLOADED",
];
const TYPES: CertificateType[] = [
  "BIRTH", "DEATH", "INCOME", "RESIDENCE", "MARRIAGE",
  "TRADE_LICENSE", "SHOP_LICENSE", "BUILDING_PERMIT", "WATER_CONNECTION",
];

const DOC_TYPE_LABELS: Record<string, string> = {
  AADHAAR: "Aadhaar Card",
  BIRTH_PROOF: "Birth Proof",
  DEATH_PROOF: "Death Proof",
  INCOME_PROOF: "Income Proof",
  ADDRESS_PROOF: "Address Proof",
  MARRIAGE_PROOF: "Marriage Proof",
  BUSINESS_PROOF: "Business Proof",
  LAND_DOCUMENT: "Land Document",
  SITE_PLAN: "Site Plan",
  OTHER: "Other Document",
};

// ── Search bar ────────────────────────────────────────────────────────────────

function SearchBar({ onSearch }: {
  onSearch: (n: string, s: CertificateStatus | "", t: CertificateType | "") => void;
}) {
  const [name, setName]               = useState("");
  const [status, setStatus]           = useState<CertificateStatus | "">("");
  const [type, setType]               = useState<CertificateType | "">("");
  const [showFilters, setShowFilters] = useState(false);

  return (
    <Box sx={{ mb: 2.5, bgcolor: "#fff", borderRadius: 2, border: "1px solid #E4E8F0", overflow: "hidden" }}>
      <Box sx={{ p: 2, display: "flex", gap: 1.5, alignItems: "center" }}>
        <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 1, border: "1px solid #CBD2E0", borderRadius: 1.5, px: 1.5, py: 0.75, bgcolor: "#F8F9FC" }}>
          <SearchIcon sx={{ color: "#9AA3B5", fontSize: 18 }} />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch(name, status, type)}
            placeholder="Search by citizen name..."
            style={{ border: "none", background: "transparent", outline: "none", flex: 1, fontSize: "0.875rem", fontFamily: "inherit", color: "#1A1F36" }}
          />
        </Box>
        <Button variant="contained" size="small" startIcon={<SearchIcon />}
          onClick={() => onSearch(name, status, type)} sx={{ whiteSpace: "nowrap" }}>
          Search
        </Button>
        <Button variant="outlined" size="small" startIcon={<FilterListIcon />}
          onClick={() => setShowFilters(!showFilters)} sx={{ whiteSpace: "nowrap" }}>
          Filters {showFilters ? <ExpandLessIcon sx={{ ml: 0.5, fontSize: 14 }} /> : <ExpandMoreIcon sx={{ ml: 0.5, fontSize: 14 }} />}
        </Button>
        {(status || type) && (
          <Button size="small" color="error" variant="text"
            onClick={() => { setStatus(""); setType(""); onSearch(name, "", ""); }}>
            Clear
          </Button>
        )}
      </Box>

      <Collapse in={showFilters}>
        <Divider />
        <Box sx={{ p: 2, bgcolor: "#F8F9FC" }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "#5A6072", display: "block", mb: 0.75, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.68rem" }}>Status</Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 2 }}>
            <Chip size="small" label="All" onClick={() => { setStatus(""); onSearch(name, "", type); }}
              variant={status === "" ? "filled" : "outlined"} color={status === "" ? "primary" : "default"} />
            {STATUSES.map((s) => (
              <Chip key={s} size="small" label={s.replace(/_/g, " ")}
                onClick={() => { setStatus(s); onSearch(name, s, type); }}
                variant={status === s ? "filled" : "outlined"} color={status === s ? "primary" : "default"} />
            ))}
          </Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "#5A6072", display: "block", mb: 0.75, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.68rem" }}>Certificates</Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1.5 }}>
            <Chip size="small" label="All Types" onClick={() => { setType(""); onSearch(name, status, ""); }}
              variant={type === "" ? "filled" : "outlined"} color={type === "" ? "secondary" : "default"} />
            {TYPES.filter(t => TYPE_CATEGORY[t] === "Certificate").map((t) => (
              <Chip key={t} size="small" label={`${TYPE_ICON[t]} ${t.replace(/_/g, " ")}`}
                onClick={() => { setType(t); onSearch(name, status, t); }}
                variant={type === t ? "filled" : "outlined"} color={type === t ? "secondary" : "default"} />
            ))}
          </Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "#5A6072", display: "block", mb: 0.75, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.68rem" }}>Permits &amp; Licences</Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {TYPES.filter(t => TYPE_CATEGORY[t] === "Permit").map((t) => (
              <Chip key={t} size="small" label={`${TYPE_ICON[t]} ${t.replace(/_/g, " ")}`}
                onClick={() => { setType(t); onSearch(name, status, t); }}
                variant={type === t ? "filled" : "outlined"} color={type === t ? "secondary" : "default"} />
            ))}
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}

// ── Expandable application row ────────────────────────────────────────────────

function ApplicationRow({ c, onVerify, onApprove, onReject, onGenerate, onDownload, onViewDocs }: {
  c: Certificate;
  onVerify: (id: number) => void;
  onApprove: (id: number) => void;
  onReject: (id: number, reason: string) => void;
  onGenerate: (id: number) => void;
  onDownload: (c: Certificate) => void;
  onViewDocs: (c: Certificate) => void;
}) {
  const [expanded, setExpanded]         = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject]     = useState(false);

  const typeColor    = TYPE_COLOR[c.certificateType] ?? "#1A3A8F";
  const typeCategory = TYPE_CATEGORY[c.certificateType] ?? "Certificate";

  return (
    <>
      <TableRow hover sx={{ cursor: "pointer", borderLeft: `3px solid ${typeColor}` }}
        onClick={() => setExpanded(!expanded)}>
        <TableCell>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "#0F2557", fontFamily: "monospace" }}>
            {c.applicationNumber}
          </Typography>
        </TableCell>
        <TableCell>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{c.citizenName}</Typography>
            <Typography variant="caption" color="text.secondary">ID: {c.citizenId}</Typography>
          </Box>
        </TableCell>
        <TableCell>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Typography sx={{ fontSize: 14 }}>{TYPE_ICON[c.certificateType] ?? "📄"}</Typography>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: typeColor, display: "block", lineHeight: 1.2 }}>
                {TYPE_LABEL[c.certificateType] ?? c.certificateType}
              </Typography>
              <Chip size="small" label={typeCategory} sx={{
                height: 16, fontSize: "0.6rem", fontWeight: 700,
                bgcolor: typeCategory === "Certificate" ? "#E3F2FD" : "#FFF3E0",
                color: typeCategory === "Certificate" ? "#1565C0" : "#E65100",
              }} />
            </Box>
          </Box>
        </TableCell>
        <TableCell><ApplicationStatusChip status={c.status} /></TableCell>
        <TableCell>
          <Typography variant="caption" color="text.secondary">
            {new Date(c.appliedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          </Typography>
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Stack direction="row" spacing={0.5}>
            {/* View Documents button — always visible */}
            <Tooltip title="View submitted documents">
              <IconButton size="small" onClick={() => onViewDocs(c)} sx={{ color: "#1A3A8F" }}>
                <FolderOpenIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {(c.status === "SUBMITTED" || c.status === "UNDER_VERIFICATION") && (
              <>
                <Tooltip title="Mark as Verified">
                  <IconButton size="small" color="primary" onClick={() => onVerify(c.id)}>
                    <VerifiedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Reject">
                  <IconButton size="small" color="error"
                    onClick={() => { setShowReject(true); setExpanded(true); }}>
                    <CancelIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
            {c.status === "VERIFIED" && (
              <>
                <Tooltip title="Approve Application">
                  <IconButton size="small" color="success" onClick={() => onApprove(c.id)}>
                    <CheckCircleIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Reject">
                  <IconButton size="small" color="error"
                    onClick={() => { setShowReject(true); setExpanded(true); }}>
                    <CancelIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
            {c.status === "APPROVED" && (
              <Tooltip title="Generate Certificate / Permit PDF">
                <IconButton size="small" color="primary" onClick={() => onGenerate(c.id)}>
                  <PictureAsPdfIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {(c.status === "CERTIFICATE_GENERATED" || c.status === "DOWNLOADED") && (
              <Tooltip title="Download PDF">
                <IconButton size="small" color="success" onClick={() => onDownload(c)}>
                  <PictureAsPdfIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </TableCell>
        <TableCell padding="checkbox">
          <IconButton size="small" sx={{ color: "#9AA3B5" }}>
            {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </TableCell>
      </TableRow>

      {/* Expanded detail row */}
      <TableRow>
        <TableCell colSpan={7} sx={{ py: 0, border: 0 }}>
          <Collapse in={expanded} timeout="auto">
            <Box sx={{ p: 2, bgcolor: "#F8F9FC", borderRadius: 1.5, mx: 1, mb: 1 }}>
              <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap", mb: showReject ? 2 : 0 }}>
                {[
                  { label: "Aadhaar", value: c.aadhaarNumber },
                  { label: "Address", value: c.citizenAddress || "—" },
                  { label: "Applied By", value: c.appliedBy || "Self" },
                  { label: "Verified By", value: c.verifiedBy || "—" },
                  { label: "Decided By", value: c.decidedBy || "—" },
                  ...(c.certificateNumber ? [{ label: typeCategory === "Certificate" ? "Certificate No." : "Permit / Licence No.", value: c.certificateNumber }] : []),
                  ...(c.downloadCount ? [{ label: "Downloads", value: String(c.downloadCount) }] : []),
                  ...(c.remarks ? [{ label: "Remarks", value: c.remarks }] : []),
                ].map(({ label, value }) => (
                  <Box key={label}>
                    <Typography variant="caption" sx={{ color: "#5A6072", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.65rem" }}>{label}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{value}</Typography>
                  </Box>
                ))}
              </Box>

              {c.status === "REJECTED" && c.rejectionReason && (
                <Box sx={{ mt: 1.5, p: 1.5, bgcolor: "#FFEBEE", borderRadius: 1.5, border: "1px solid #FFCDD2" }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#C62828" }}>Rejection Reason:</Typography>
                  <Typography variant="body2" sx={{ color: "#C62828" }}>{c.rejectionReason}</Typography>
                </Box>
              )}

              {showReject && (
                <Box sx={{ mt: 1.5 }}>
                  <TextField fullWidth multiline rows={2} size="small"
                    label="Reason for rejection (citizen will see this)"
                    value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                    sx={{ mb: 1, bgcolor: "#fff" }} />
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="contained" color="error"
                      onClick={() => {
                        if (!rejectReason.trim()) return;
                        onReject(c.id, rejectReason);
                        setShowReject(false); setRejectReason(""); setExpanded(false);
                      }}>
                      Confirm Rejection
                    </Button>
                    <Button size="small" variant="outlined"
                      onClick={() => { setShowReject(false); setRejectReason(""); }}>
                      Cancel
                    </Button>
                  </Stack>
                </Box>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

// ── Documents Dialog ──────────────────────────────────────────────────────────

function CertDocumentsDialog({ cert, onClose }: {
  cert: Certificate | null;
  onClose: () => void;
}) {
  const [docs, setDocs]       = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded]   = useState(false);

  // Fetch docs when cert changes
  useEffect(() => {
  if (!cert) return;
  setLoading(true);
  setLoaded(false);
  api.get(`/api/certificates/${cert.id}/documents`)
    .then(res => { setDocs(res.data); setLoaded(true); })
    .catch(() => { setDocs([]); setLoaded(true); })
    .finally(() => setLoading(false));
}, [cert?.id]);

  if (!cert) return null;

  return (
    <Dialog open={!!cert} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, color: "#0F2557", borderBottom: "1px solid #E4E8F0" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <FolderOpenIcon sx={{ color: "#1A3A8F" }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F2557", lineHeight: 1.1 }}>
              Submitted Documents
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {TYPE_LABEL[cert.certificateType]} · {cert.citizenName} · {cert.applicationNumber}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {loading ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">Loading documents...</Typography>
          </Box>
        ) : !loaded || docs.length === 0 ? (
          <Alert severity="warning" sx={{ mt: 1 }}>
            No documents uploaded for this application. The citizen may not have attached any files.
          </Alert>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1 }}>
            <Typography variant="caption" sx={{ color: "#5A6072", fontWeight: 700 }}>
              {docs.length} document(s) submitted
            </Typography>
            {docs.map((doc: any) => (
              <Box key={doc.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, bgcolor: "#F8F9FC", borderRadius: 1.5, border: "1px solid #E4E8F0" }}>
                <InsertDriveFileIcon sx={{ color: "#1A3A8F", fontSize: 24, flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "#0F2557" }}>
                    {DOC_TYPE_LABELS[doc.docType] || doc.docType}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {doc.originalName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#9AA3B5", fontSize: "0.68rem" }}>
                    Uploaded: {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString("en-IN") : "—"}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => window.open(`http://localhost:9000/api/certificates/documents/${doc.id}/view`, "_blank")}
                  sx={{ fontSize: "0.72rem", whiteSpace: "nowrap", flexShrink: 0 }}
                >
                  View
                </Button>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined">Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function OfficerApplicationList({
  certificates, onError, onLoadingChange, onChanged, onSearchChange
}: Props) {
  const [docsCert, setDocsCert] = useState<Certificate | null>(null);

  const verify = async (id: number) => {
    onError(""); onLoadingChange(true);
    try { await api.put(`/api/certificates/${id}/verify`, { verified: true }); onChanged(); }
    catch { onError("Verification failed"); } finally { onLoadingChange(false); }
  };

  const approve = async (id: number) => {
    onError(""); onLoadingChange(true);
    try { await api.put(`/api/certificates/${id}/approve`); onChanged(); }
    catch { onError("Approval failed"); } finally { onLoadingChange(false); }
  };

  const reject = async (id: number, reason: string) => {
    onError(""); onLoadingChange(true);
    try { await api.put(`/api/certificates/${id}/reject`, { reason }); onChanged(); }
    catch { onError("Rejection failed"); } finally { onLoadingChange(false); }
  };

  const generate = async (id: number) => {
    onError(""); onLoadingChange(true);
    try { await api.put(`/api/certificates/${id}/generate`); onChanged(); }
    catch { onError("Certificate generation failed"); } finally { onLoadingChange(false); }
  };

  const download = async (cert: Certificate) => {
    onError(""); onLoadingChange(true);
    try {
      const res = await api.get(`/api/certificates/${cert.id}/download`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url; link.download = `${cert.certificateNumber ?? "certificate"}.pdf`;
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
      onChanged();
    } catch { onError("Download failed"); } finally { onLoadingChange(false); }
  };

  const pendingCount   = certificates.filter(c => c.status === "SUBMITTED" || c.status === "UNDER_VERIFICATION").length;
  const verifiedCount  = certificates.filter(c => c.status === "VERIFIED").length;
  const approvedCount  = certificates.filter(c => c.status === "APPROVED").length;
  const generatedCount = certificates.filter(c => c.status === "CERTIFICATE_GENERATED" || c.status === "DOWNLOADED").length;

  return (
    <>
      <SearchBar onSearch={onSearchChange} />

      {/* Pipeline summary */}
      {certificates.length > 0 && (
        <Box sx={{ mb: 2.5, display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          {[
            { label: "Pending Review", count: pendingCount, color: "#E65100", bg: "#FFF3E0" },
            { label: "Verified", count: verifiedCount, color: "#1565C0", bg: "#E3F2FD" },
            { label: "Awaiting Generate", count: approvedCount, color: "#2E7D32", bg: "#E8F5E9" },
            { label: "Issued", count: generatedCount, color: "#00897B", bg: "#E0F2F1" },
          ].map(({ label, count, color, bg }) => (
            <Box key={label} sx={{ px: 1.5, py: 0.75, borderRadius: 1.5, bgcolor: bg, border: `1px solid ${color}30` }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color, fontSize: "0.8rem" }}>
                {count} <span style={{ fontWeight: 400, color: "#5A6072" }}>{label}</span>
              </Typography>
            </Box>
          ))}
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center", ml: "auto" }}>
            {certificates.length} total shown
          </Typography>
        </Box>
      )}

      {certificates.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: "center", border: "1px solid #E4E8F0" }}>
          <Typography color="text.secondary">No applications match your filters.</Typography>
          <Typography variant="caption" color="text.secondary">Try clearing the search or filters.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ border: "1px solid #E4E8F0" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#F8F9FC" }}>
                {["Application No.", "Citizen", "Type", "Status", "Applied On", "Actions", ""].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, color: "#5A6072", fontSize: "0.75rem" }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {certificates.map((c) => (
                <ApplicationRow
                  key={c.id} c={c}
                  onVerify={verify} onApprove={approve}
                  onReject={reject} onGenerate={generate} onDownload={download}
                  onViewDocs={(cert) => setDocsCert(cert)}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Certificate Documents Dialog */}
      <CertDocumentsDialog
        cert={docsCert}
        onClose={() => setDocsCert(null)}
      />
    </>
  );
}