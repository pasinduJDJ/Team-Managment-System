export type MemberStatus = 'pending' | 'verified' | 'inactive' | 'rejected' | 'duplicate';

export type FrontendOldBoy = {
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
};

export type CanonicalMemberInput = {
  fullName: string;
  batch: string;
  admissionNumber?: string | null;
  mobile: string;
  whatsapp?: string | null;
  email?: string | null;
  profession: string;
  company?: string | null;
  city?: string | null;
  country?: string | null;
  address?: string | null;
  notes?: string | null;
  consentConfirmed?: boolean;
  submittedAt?: string;
};

export type GoogleWebhookPayload = {
  submissionId?: string;
  submittedAt?: string;
  sheetId?: string;
  sheetName?: string;
  rowNumber?: number;
  values?: Record<string, unknown>;
  member?: CanonicalMemberInput;
};

export type AdminRecord = {
  auth_user_id: string;
  email: string;
  role: 'super_admin' | 'batch_admin';
  batch_scope: string[];
  is_active: boolean;
  display_name: string | null;
};
