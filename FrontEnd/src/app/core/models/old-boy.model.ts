export type MemberStatus = 'pending' | 'verified' | 'inactive' | 'rejected' | 'duplicate';

export interface OldBoy {
  id: string;
  fullName: string;
  batch: string;
  admissionNumber?: string;
  mobile: string;
  whatsapp?: string;
  email?: string;
  profession: string;
  company?: string;
  city: string;
  country: string;
  address?: string;
  notes?: string;
  status: MemberStatus;
  submittedAt: string;
  updatedAt: string;
  source: 'Google Form' | 'Manual';
}

export interface MemberFilters {
  search: string;
  batch: string;
  profession: string;
  location: string;
  status: string;
}
