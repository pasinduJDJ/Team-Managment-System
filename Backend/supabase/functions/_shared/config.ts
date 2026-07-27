export function requireEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function optionalEnv(name: string, fallback = ''): string {
  return Deno.env.get(name)?.trim() || fallback;
}

export function allowedOrigins(): string[] {
  return optionalEnv('ALLOWED_ORIGINS', 'http://localhost:4200')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

export type GoogleFieldMap = {
  fullName: string;
  batch: string;
  admissionNumber: string;
  mobile: string;
  whatsapp: string;
  email: string;
  profession: string;
  company: string;
  city: string;
  country: string;
  location: string;
  address: string;
  notes: string;
  consent: string;
};

export function googleFieldMap(): GoogleFieldMap {
  return {
    fullName: optionalEnv('GOOGLE_FIELD_FULL_NAME'),
    batch: optionalEnv('GOOGLE_FIELD_BATCH'),
    admissionNumber: optionalEnv('GOOGLE_FIELD_ADMISSION_NUMBER'),
    mobile: optionalEnv('GOOGLE_FIELD_MOBILE'),
    whatsapp: optionalEnv('GOOGLE_FIELD_WHATSAPP'),
    email: optionalEnv('GOOGLE_FIELD_EMAIL'),
    profession: optionalEnv('GOOGLE_FIELD_PROFESSION'),
    company: optionalEnv('GOOGLE_FIELD_COMPANY'),
    city: optionalEnv('GOOGLE_FIELD_CITY'),
    country: optionalEnv('GOOGLE_FIELD_COUNTRY'),
    location: optionalEnv('GOOGLE_FIELD_LOCATION'),
    address: optionalEnv('GOOGLE_FIELD_ADDRESS'),
    notes: optionalEnv('GOOGLE_FIELD_NOTES'),
    consent: optionalEnv('GOOGLE_FIELD_CONSENT'),
  };
}

export function assertRequiredGoogleMappings(map: GoogleFieldMap): void {
  const missing = [
    ['GOOGLE_FIELD_FULL_NAME', map.fullName],
    ['GOOGLE_FIELD_BATCH', map.batch],
    ['GOOGLE_FIELD_MOBILE', map.mobile],
    ['GOOGLE_FIELD_PROFESSION', map.profession],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missing.length) {
    throw new Error(`Google field mapping is incomplete: ${missing.join(', ')}`);
  }
}
