export interface Grievance {
  id: number;
  citizenId: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  department: string;
  assignedOfficer: string;
  createdAt: string;
  dueDate: string;
}

export interface DepartmentInfo {
  name: string;
  officers: string[];
}

export type CertificateType =
  | "BIRTH"
  | "DEATH"
  | "INCOME"
  | "RESIDENCE"
  | "MARRIAGE"
  | "TRADE_LICENSE"
  | "SHOP_LICENSE"
  | "BUILDING_PERMIT"
  | "WATER_CONNECTION";

export type CertificateStatus =
  | "SUBMITTED"
  | "UNDER_VERIFICATION"
  | "VERIFIED"
  | "APPROVED"
  | "REJECTED"
  | "CERTIFICATE_GENERATED"
  | "DOWNLOADED";

export interface Certificate {
  id: number;
  applicationNumber: string;
  citizenId: number;
  citizenName: string;
  citizenAddress: string;
  aadhaarNumber: string;
  certificateType: CertificateType;
  status: CertificateStatus;
  appliedBy: string;
  verifiedBy: string | null;
  decidedBy: string | null;
  rejectionReason: string | null;
  remarks: string | null;
  certificateNumber: string | null;
  downloadCount: number;
  appliedAt: string;
  verifiedAt: string | null;
  decidedAt: string | null;
  issuedAt: string | null;
}

export interface CertificateStats {
  total: number;
  submitted: number;
  underVerification: number;
  verified: number;
  approved: number;
  rejected: number;
  generated: number;
  downloaded: number;
}

export interface Officer {
  id: number;
  officerCode: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  keycloakRole: string;
  headOfficer: boolean;
  status: string;
  createdAt: string;
}

export interface CitizenProfile {
  id: number;
  citizenCode: string;
  fullName: string;
  email: string;
  phone: string;
  ward: number;
  address: string;
  aadharMasked: string;
  status: string;
}
// ── Welfare ──────────────────────────────────────────────────────────────────

export interface WelfareScheme {
  id: number;
  schemeCode: string;
  name: string;
  department: string;
  schemeType: string;
  description: string;
  eligibilityCriteria: string;
  budgetAllocated: number;
  budgetDisbursed: number;
  beneficiaryCount: number;
  startDate: string;
  endDate: string;
  status: string;
  createdBy: string;
  createdAt: string;
}

export interface Beneficiary {
  id: number;
  beneficiaryCode: string;
  citizenId: number;
  citizenName: string;
  schemeId: number;
  schemeName: string;
  enrollmentDate: string;
  eligibilityStatus: string;
  verifiedBy: string | null;
  verifiedAt: string | null;
  docsStatus: string;
  status: string;
  remarks: string | null;
  createdAt: string;
  latestPaymentStatus: string | null;
  latestPaymentAmount: number | null;
}

export interface FundDistribution {
  id: number;
  distributionCode: string;
  beneficiaryId: number;
  beneficiaryName: string;
  schemeId: number;
  schemeName: string;
  amount: number;
  paymentMode: string;
  paymentStatus: string;
  transactionRef: string | null;
  remarks: string | null;
  disbursedBy: string;
  paidAt: string | null;
  createdAt: string;
}

export interface WelfareStats {
  totalSchemes: number;
  activeSchemes: number;
  totalBeneficiaries: number;
  totalDisbursed: number;
  totalAllocated: number;
  utilizationPct: number;
}

// ── Scheme Applications ──────────────────────────────────────────────────────

export interface SchemeApplication {
  id: number;
  applicationCode: string;
  citizenId: number;
  citizenName: string;
  citizenEmail: string;
  schemeId: number;
  schemeName: string;
  status: string;
  rejectionReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  documents: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string | null;
}
// Add this to src/types.ts in the frontend

export interface AnalyticsSummaryDto {
  // Top KPI Cards
  citizenSatisfactionScore: number;
  serviceSlaPercent: number;
  totalRevenueDisbursed: number;
  budgetUtilizationPercent: number;
  totalRequests: number;
  complaintChangePercent: number;

  // Grievance Analytics
  totalGrievances: number;
  resolvedGrievances: number;
  overdueGrievances: number;
  openGrievances: number;
  avgResolutionDays: number;
  grievancesByMonth: MonthlyCount[];

  // Certificate Analytics
  totalCertificates: number;
  approvedCertificates: number;
  rejectedCertificates: number;
  pendingCertificates: number;
  avgProcessingDays: number;
  certificatesByMonth: MonthlyCount[];

  // Welfare Analytics
  totalWelfareApplications: number;
  approvedWelfareApplications: number;
  totalBeneficiaries: number;
  totalAmountDisbursed: number;
  totalBudgetAllocated: number;
  schemeUtilizations: SchemeUtilization[];

  // Citizen Analytics
  totalCitizens: number;
  activeCitizens: number;
  newCitizensThisMonth: number;

  // Department Performance
  departmentPerformances: DepartmentPerformance[];
}

export interface MonthlyCount {
  month: string;
  count: number;
}

export interface SchemeUtilization {
  schemeName: string;
  department: string;
  budgetAllocated: number;
  budgetDisbursed: number;
  utilizationPercent: number;
  beneficiaryCount: number;
}

export interface DepartmentPerformance {
  department: string;
  totalGrievances: number;
  resolvedGrievances: number;
  resolutionRate: number;
  avgResolutionDays: number;
  slaBreaches: number;
  certificatesProcessed: number;
  welfareApplicationsProcessed: number;
  performanceRating: string; // "EXCELLENT" | "GOOD" | "NEEDS_IMPROVEMENT"
}