import { useEffect, useRef } from "react";
import { api } from "../api";
import { hasSession } from "../api";

export interface NotificationCounts {
  /** Citizen: pending welfare applications */
  pendingApplications: number;
  /** Citizen: open (unresolved) grievances */
  openGrievances: number;
  /** Officer / Admin: pending citizen registrations */
  pendingRegistrations: number;
  /** Officer / Admin: overdue grievances (past SLA, not resolved) */
  overdueGrievances: number;
  /** Admin: schemes at ≥80% budget utilization */
  criticalSchemes: number;
  /** Admin: names of schemes at ≥80% budget utilization */
  criticalSchemeNames: string[];
  docsMissingCount: number;
  newCertificateApplications: number;
}

interface PollingOptions {
  role: "CITIZEN" | "OFFICER" | "ADMIN" | null;
  citizenId?: number | null;
  department?: string | null;
  onUpdate: (counts: NotificationCounts) => void;
  intervalMs?: number;
}

const EMPTY: NotificationCounts = {
  pendingApplications: 0,
  openGrievances: 0,
  pendingRegistrations: 0,
  overdueGrievances: 0,
  criticalSchemes: 0,
  criticalSchemeNames: [],
  docsMissingCount: 0,
  newCertificateApplications: 0,
};

export function usePollingNotifications({
  role,
  citizenId,
  department,
  onUpdate,
  intervalMs = 20_000,
}: PollingOptions) {
  // Keep the callback ref stable so it never needs to be a dependency
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    // Don't poll when not logged in or role not yet determined
    if (!role) return;

    const fetchCounts = async () => {
  if (!hasSession()) return;
  try {
    if (role === "CITIZEN") {
          if (!citizenId) return;
          const [appsRes, grievRes, benRes] = await Promise.all([
            api.get(`/api/welfare/applications/citizen/${citizenId}`).catch(() => ({ data: [] })),
            api.get(`/api/grievances/my?citizenId=${citizenId}`).catch(() => ({ data: [] })),
            api.get(`/api/welfare/beneficiaries/citizen/${citizenId}`).catch(() => ({ data: [] })),
          ]);
          const docsMissingCount = (benRes.data as any[]).filter(b => b.docsStatus === "MISSING").length;
          onUpdateRef.current({
            ...EMPTY,
            pendingApplications: (appsRes.data as any[]).filter(a => a.status === "PENDING").length,
            openGrievances: (grievRes.data as any[]).filter(g =>
              ["SUBMITTED", "ASSIGNED", "IN_PROGRESS"].includes(g.status)
            ).length,
            docsMissingCount,
          });

        } else if (role === "OFFICER") {
          if (!department) return;
          const [pendingRes, grievRes, schemesRes, certRes] = await Promise.all([
            api.get("/api/citizens/pending").catch(() => ({ data: [] })),
            api.get(`/api/grievances/department/${encodeURIComponent(department)}`).catch(() => ({ data: [] })),
            api.get("/api/welfare/schemes").catch(() => ({ data: [] })),
            api.get(`/api/certificates?department=${encodeURIComponent(department)}`).catch(() => ({ data: [] })),
          ]);

          const deptSchemeIds = (schemesRes.data as any[])
            .filter(s => s.department === department)
            .map(s => s.id);
          const benResults = deptSchemeIds.length > 0
            ? await Promise.all(
                deptSchemeIds.map(id =>
                  api.get(`/api/welfare/beneficiaries/scheme/${id}`).then(r => r.data as any[]).catch(() => [])
                )
              )
            : [];
          const docsMissing = benResults.flat().filter((b: any) => b.docsStatus === "MISSING").length;

          const newCerts = (certRes.data as any[]).filter((c: any) =>
            c.status === "SUBMITTED" || c.status === "UNDER_VERIFICATION"
          ).length;

          onUpdateRef.current({
            ...EMPTY,
            pendingRegistrations: (pendingRes.data as any[]).length,
            overdueGrievances: (grievRes.data as any[]).filter(g =>
              g.dueDate && new Date(g.dueDate).getTime() < Date.now() && g.status !== "RESOLVED"
            ).length,
            docsMissingCount: docsMissing,
            newCertificateApplications: newCerts,
          });

        } else if (role === "ADMIN") {
          const [pendingRes, grievRes, schemesRes, certRes] = await Promise.all([
            api.get("/api/citizens/pending").catch(() => ({ data: [] })),
            api.get("/api/grievances").catch(() => ({ data: [] })),
            api.get("/api/welfare/schemes").catch(() => ({ data: [] })),
            api.get("/api/certificates").catch(() => ({ data: [] })),
          ]);

          const allSchemeIds = (schemesRes.data as any[]).map(s => s.id);
          const benResults = allSchemeIds.length > 0
            ? await Promise.all(
                allSchemeIds.map(id =>
                  api.get(`/api/welfare/beneficiaries/scheme/${id}`).then(r => r.data as any[]).catch(() => [])
                )
              )
            : [];
          const docsMissing = benResults.flat().filter((b: any) => b.docsStatus === "MISSING").length;

          const newCerts = (certRes.data as any[]).filter((c: any) =>
            c.status === "SUBMITTED" || c.status === "UNDER_VERIFICATION"
          ).length;

          onUpdateRef.current({
            ...EMPTY,
            pendingRegistrations: (pendingRes.data as any[]).length,
            overdueGrievances: (grievRes.data as any[]).filter(g =>
              g.dueDate && new Date(g.dueDate).getTime() < Date.now() && g.status !== "RESOLVED"
            ).length,
            criticalSchemes: (schemesRes.data as any[]).filter(s =>
              s.budgetAllocated > 0 && (s.budgetDisbursed / s.budgetAllocated) >= 0.8
            ).length,
            criticalSchemeNames: (schemesRes.data as any[])
              .filter(s => s.budgetAllocated > 0 && (s.budgetDisbursed / s.budgetAllocated) >= 0.8)
              .map(s => s.name),
            docsMissingCount: docsMissing,
            newCertificateApplications: newCerts,
          });
        }
      } catch (err: any) {
        // If 401, token expired — stop polling gracefully (user will be redirected on next action)
        if (err?.response?.status === 401) return;
        // Otherwise fail silently
      }
    };

    fetchCounts(); // Immediate fetch on mount / role change
    const id = setInterval(fetchCounts, intervalMs);
    return () => clearInterval(id); // Cleanup on unmount or role change

  }, [role, citizenId, department, intervalMs]);
  // onUpdate intentionally omitted — handled via ref above
}