import { assertRequiredGoogleMappings, googleFieldMap } from './config.ts';
import { HttpError } from './http.ts';
import type {
  CanonicalMemberInput,
  FrontendOldBoy,
  GoogleWebhookPayload,
  MemberStatus,
} from './types.ts';

const statuses: MemberStatus[] = ['pending', 'verified', 'inactive', 'rejected', 'duplicate'];

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function nullable(value: unknown): string | null {
  const result = clean(value);
  return result || null;
}

export function normalizePhone(value: unknown): string | null {
  const digits = clean(value).replace(/\D/g, '');
  return digits || null;
}

export function normalizeEmail(value: unknown): string | null {
  const result = clean(value).toLowerCase();
  return result || null;
}

export function parseConsent(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  const text = clean(value).toLowerCase();
  return ['yes', 'true', '1', 'agree', 'agreed', 'confirmed', 'i agree'].includes(text);
}

export function validateCanonicalMember(input: CanonicalMemberInput): CanonicalMemberInput {
  const member: CanonicalMemberInput = {
    fullName: clean(input.fullName),
    batch: clean(input.batch),
    admissionNumber: nullable(input.admissionNumber),
    mobile: clean(input.mobile),
    whatsapp: nullable(input.whatsapp),
    email: nullable(input.email),
    profession: clean(input.profession),
    company: nullable(input.company),
    city: nullable(input.city),
    country: nullable(input.country),
    address: nullable(input.address),
    notes: nullable(input.notes),
    consentConfirmed: Boolean(input.consentConfirmed),
    submittedAt: input.submittedAt,
  };

  const missing: string[] = [];
  if (!member.fullName) missing.push('fullName');
  if (!member.batch) missing.push('batch');
  if (!member.mobile) missing.push('mobile');
  if (!member.profession) missing.push('profession');
  if (!member.city && !member.country) missing.push('city or country');

  if (missing.length) {
    throw new HttpError(
      422,
      `Required member fields are missing: ${missing.join(', ')}`,
      'MEMBER_VALIDATION_FAILED',
      { missing },
    );
  }

  if (!normalizePhone(member.mobile)) {
    throw new HttpError(422, 'Mobile number must contain digits.', 'INVALID_MOBILE');
  }

  if (member.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email)) {
    throw new HttpError(422, 'Email address format is invalid.', 'INVALID_EMAIL');
  }

  if (member.submittedAt && Number.isNaN(Date.parse(member.submittedAt))) {
    throw new HttpError(422, 'submittedAt must be a valid date.', 'INVALID_SUBMISSION_DATE');
  }

  return member;
}

export function memberFromGooglePayload(payload: GoogleWebhookPayload): CanonicalMemberInput {
  if (payload.member) {
    return validateCanonicalMember({
      ...payload.member,
      submittedAt: payload.member.submittedAt || payload.submittedAt,
    });
  }

  const values = payload.values;
  if (!values || typeof values !== 'object') {
    throw new HttpError(
      422,
      'Provide either member or values in the webhook payload.',
      'WEBHOOK_VALUES_MISSING',
    );
  }

  const map = googleFieldMap();
  assertRequiredGoogleMappings(map);
  const value = (header: string): unknown => header ? values[header] : undefined;

  const cityValue = nullable(value(map.city));
  const countryValue = nullable(value(map.country));
  const combinedLocation = nullable(value(map.location));

  const consentConfirmed = map.consent ? parseConsent(value(map.consent)) : false;
  if (map.consent && !consentConfirmed) {
    throw new HttpError(
      422,
      'Consent confirmation is required for Google Form submissions.',
      'CONSENT_REQUIRED',
    );
  }

  return validateCanonicalMember({
    fullName: clean(value(map.fullName)),
    batch: clean(value(map.batch)),
    admissionNumber: nullable(value(map.admissionNumber)),
    mobile: clean(value(map.mobile)),
    whatsapp: nullable(value(map.whatsapp)),
    email: nullable(value(map.email)),
    profession: clean(value(map.profession)),
    company: nullable(value(map.company)),
    city: cityValue || combinedLocation,
    country: countryValue,
    address: nullable(value(map.address)),
    notes: nullable(value(map.notes)),
    consentConfirmed,
    submittedAt: payload.submittedAt,
  });
}

export function dbInsertFromCanonical(
  member: CanonicalMemberInput,
  payload: GoogleWebhookPayload,
  status: MemberStatus,
  duplicateOf: string | null,
): Record<string, unknown> {
  return {
    full_name: member.fullName,
    batch: member.batch,
    admission_number: member.admissionNumber,
    mobile: member.mobile,
    whatsapp: member.whatsapp,
    email: member.email,
    profession: member.profession,
    company: member.company,
    city: member.city || '',
    country: member.country || '',
    address: member.address,
    notes: member.notes,
    status,
    source: 'google_form',
    consent_confirmed: member.consentConfirmed || false,
    source_submission_id: payload.submissionId || null,
    source_row_number: payload.rowNumber || null,
    source_payload: payload,
    duplicate_of: duplicateOf,
    submitted_at: member.submittedAt || new Date().toISOString(),
  };
}

export function mapDatabaseMember(row: Record<string, unknown>): FrontendOldBoy {
  return {
    id: String(row.id),
    fullName: String(row.full_name ?? ''),
    batch: String(row.batch ?? ''),
    admissionNumber: row.admission_number ? String(row.admission_number) : null,
    mobile: String(row.mobile ?? ''),
    whatsapp: row.whatsapp ? String(row.whatsapp) : null,
    email: row.email ? String(row.email) : null,
    profession: String(row.profession ?? ''),
    company: row.company ? String(row.company) : null,
    city: String(row.city ?? ''),
    country: String(row.country ?? ''),
    address: row.address ? String(row.address) : null,
    notes: row.notes ? String(row.notes) : null,
    status: String(row.status) as MemberStatus,
    submittedAt: String(row.submitted_at),
    updatedAt: String(row.updated_at),
    source: row.source === 'google_form' ? 'Google Form' : 'Manual',
  };
}

export function patchToDatabase(input: Record<string, unknown>): Record<string, unknown> {
  const mapping: Record<string, string> = {
    fullName: 'full_name',
    batch: 'batch',
    admissionNumber: 'admission_number',
    mobile: 'mobile',
    whatsapp: 'whatsapp',
    email: 'email',
    profession: 'profession',
    company: 'company',
    city: 'city',
    country: 'country',
    address: 'address',
    notes: 'notes',
  };

  const patch: Record<string, unknown> = {};
  for (const [frontend, database] of Object.entries(mapping)) {
    if (Object.prototype.hasOwnProperty.call(input, frontend)) {
      patch[database] = typeof input[frontend] === 'string'
        ? (input[frontend] as string).trim()
        : input[frontend];
    }
  }

  if (!Object.keys(patch).length) {
    throw new HttpError(422, 'No editable fields were supplied.', 'EMPTY_PATCH');
  }

  for (const required of ['full_name', 'batch', 'mobile', 'profession']) {
    if (required in patch && !clean(patch[required])) {
      throw new HttpError(422, `${required} cannot be blank.`, 'REQUIRED_FIELD_BLANK');
    }
  }

  if ('email' in patch && patch.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(patch.email))) {
    throw new HttpError(422, 'Email address format is invalid.', 'INVALID_EMAIL');
  }

  return patch;
}

export function assertStatus(value: unknown): MemberStatus {
  if (!statuses.includes(value as MemberStatus)) {
    throw new HttpError(
      422,
      `status must be one of: ${statuses.join(', ')}`,
      'INVALID_MEMBER_STATUS',
    );
  }
  return value as MemberStatus;
}
