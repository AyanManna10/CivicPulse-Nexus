import { useState, useEffect } from "react";
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, FormControl,
  InputLabel, Select, MenuItem, TextField, InputAdornment,
  Pagination
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import SearchIcon from "@mui/icons-material/Search";
import { api } from "../../api";

interface AuditLog {
  id: number;
  action: string;
  entityType: string;
  entityId: number;
  entityCode: string | null;
  performedBy: string;
  details: string | null;
  performedAt: string;
}

interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
}

interface Props {
  onError: (msg: string) => void;
  onLoadingChange: (v: boolean) => void;
}

const ACTION_COLOR: Record<string, { bg: string; color: string }> = {
  APPROVE_APPLICATION:  { bg: "#E8F5E9", color: "#2E7D32" },
  REJECT_APPLICATION:   { bg: "#FFEBEE", color: "#C62828" },
  WITHDRAW_APPLICATION: { bg: "#F5F5F5", color: "#9AA3B5" },
  VERIFY_BENEFICIARY:   { bg: "#E8F5E9", color: "#2E7D32" },
  MARK_DOCS_COMPLETE:   { bg: "#E8EDFB", color: "#1A3A8F" },
  MARK_DOCS_MISSING:    { bg: "#FFEBEE", color: "#C62828" },
  DISBURSE_FUNDS:       { bg: "#E8F5E9", color: "#2E7D32" },
  DISBURSE_FAILED:      { bg: "#FFEBEE", color: "#C62828" },
};

const ENTITY_TYPES = ["", "APPLICATION", "BENEFICIARY", "DISTRIBUTION", "SCHEME"];

export default function AdminAuditLog({ onError, onLoadingChange }: Props) {
  const [logs, setLogs]           = useState<AuditLog[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]           = useState(0);
  const [entityType, setEntityType] = useState("");
  const [searchOfficer, setSearchOfficer] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce officer search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchOfficer), 400);
    return () => clearTimeout(t);
  }, [searchOfficer]);

  useEffect(() => { setPage(0); }, [entityType, debouncedSearch]);
  useEffect(() => { load(); }, [page, entityType, debouncedSearch]);

  const load = async () => {
    onLoadingChange(true);
    try {
      let url = `/api/welfare/audit-logs?page=${page}&size=50`;
      if (debouncedSearch.trim()) {
        url = `/api/welfare/audit-logs/officer/${encodeURIComponent(debouncedSearch.trim())}?page=${page}&size=50`;
      } else if (entityType) {
        url = `/api/welfare/audit-logs/type/${entityType}?page=${page}&size=50`;
      }
      const res = await api.get(url);
      const data: PageResponse<AuditLog> = res.data;
      setLogs(data.content);
      setTotalPages(data.totalPages);
    } catch { onError("Failed to load audit logs"); }
    finally { onLoadingChange(false); }
  };

  const formatAction = (action: string) =>
    action.replace(/_/g, " ");

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: 2.5, background: "linear-gradient(135deg, #0F2557, #1A3A8F)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
          <HistoryIcon />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F2557", lineHeight: 1.1 }}>Audit Log</Typography>
          <Typography variant="caption" color="text.secondary">Read-only trail of all officer and admin actions</Typography>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2.5, border: "1px solid #E4E8F0" }}>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
          <TextField
            size="small" placeholder="Search by officer username..."
            value={searchOfficer}
            onChange={e => setSearchOfficer(e.target.value)}
            sx={{ minWidth: 260 }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Entity Type</InputLabel>
            <Select label="Filter by Entity Type" value={entityType}
              onChange={e => setEntityType(e.target.value)}>
              {ENTITY_TYPES.map(t => (
                <MenuItem key={t} value={t}>{t || "All Types"}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
            Showing page {page + 1} of {totalPages}
          </Typography>
        </Box>
      </Paper>

      {/* Table */}
      <Paper sx={{ border: "1px solid #E4E8F0", overflow: "hidden" }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#F8F9FC" }}>
                {["Time", "Action", "Entity", "Code", "Officer", "Details"].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, color: "#5A6072", fontSize: "0.75rem", whiteSpace: "nowrap" }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: "center", py: 5, color: "#9AA3B5" }}>
                    No audit records found
                  </TableCell>
                </TableRow>
              ) : logs.map(log => {
                const ac = ACTION_COLOR[log.action] ?? { bg: "#F5F5F5", color: "#5A6072" };
                return (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: "monospace", color: "#5A6072", whiteSpace: "nowrap" }}>
                        {new Date(log.performedAt).toLocaleString("en-IN", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={formatAction(log.action)}
                        sx={{ fontSize: "0.65rem", fontWeight: 700, bgcolor: ac.bg, color: ac.color }} />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={log.entityType}
                        sx={{ fontSize: "0.65rem", bgcolor: "#F5F5F5", color: "#5A6072" }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: "monospace", color: "#1A3A8F" }}>
                        {log.entityCode ?? `#${log.entityId}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {log.performedBy}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 280, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {log.details ?? "—"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <Pagination count={totalPages} page={page + 1}
            onChange={(_, v) => setPage(v - 1)} color="primary" />
        </Box>
      )}
    </Box>
  );
}
