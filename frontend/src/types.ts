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
