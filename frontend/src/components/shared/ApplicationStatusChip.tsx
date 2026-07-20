import { Chip } from "@mui/material";
import type { CertificateStatus } from "../../types";

const STATUS_CONFIG: Record<CertificateStatus, { label: string; color: string; bg: string }> = {
  SUBMITTED: { label: "Submitted", color: "#1565C0", bg: "#E3F2FD" },
  UNDER_VERIFICATION: { label: "Verification", color: "#E65100", bg: "#FFF3E0" },
  VERIFIED: { label: "Verified", color: "#1565C0", bg: "#E3F2FD" },
  APPROVED: { label: "Approved", color: "#2E7D32", bg: "#E8F5E9" },
  REJECTED: { label: "Rejected", color: "#C62828", bg: "#FFEBEE" },
  CERTIFICATE_GENERATED: { label: "Issued", color: "#00897B", bg: "#E0F2F1" },
  DOWNLOADED: { label: "Downloaded", color: "#6A1B9A", bg: "#F3E5F5" },
};

interface Props {
  status: CertificateStatus;
}

export default function ApplicationStatusChip({ status }: Props) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "#5A6072", bg: "#F0F2F8" };
  return (
    <Chip
      size="small"
      label={cfg.label}
      sx={{
        bgcolor: cfg.bg,
        color: cfg.color,
        fontWeight: 700,
        fontSize: "0.72rem",
        borderRadius: "6px",
        height: 22,
      }}
    />
  );
}