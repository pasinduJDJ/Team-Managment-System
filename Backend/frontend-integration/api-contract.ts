export type MemberStatus = 'pending' | 'verified' | 'inactive' | 'rejected' | 'duplicate';

export interface OldBoy {
  id: string;
  fullName: string;
  batch: string;
  admissionNumber?: string | null;
  mobile: string;
  whatsapp?: string | null;
  email?: string | null;
  profession: string;
  company?: string | null;
  city: string;
  country: string;
  address?: string | null;
  notes?: string | null;
  status: MemberStatus;
  submittedAt: string;
  updatedAt: string;
  source: 'Google Form' | 'Manual';
}

export interface MemberListResponse {
  data: OldBoy[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
