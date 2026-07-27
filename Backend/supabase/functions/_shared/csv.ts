import type { FrontendOldBoy } from './types.ts';

const labels: Record<string, string> = {
  id: 'ID',
  fullName: 'Full Name',
  batch: 'Batch',
  admissionNumber: 'Admission Number',
  mobile: 'Mobile',
  whatsapp: 'WhatsApp',
  email: 'Email',
  profession: 'Profession',
  company: 'Company',
  city: 'City',
  country: 'Country',
  address: 'Address',
  notes: 'Notes',
  status: 'Status',
  submittedAt: 'Submitted At',
  updatedAt: 'Updated At',
  source: 'Source',
};

export const allowedExportFields = Object.keys(labels);

function escapeCsv(value: unknown): string {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export function buildCsv(
  members: FrontendOldBoy[],
  requestedFields?: string[],
): { csv: string; fields: string[] } {
  const fields = requestedFields?.length
    ? requestedFields.filter(field => allowedExportFields.includes(field))
    : [
        'fullName', 'batch', 'admissionNumber', 'mobile', 'whatsapp',
        'email', 'profession', 'company', 'city', 'country',
        'status', 'submittedAt',
      ];

  const selected = fields.length ? fields : ['fullName', 'batch', 'mobile'];
  const rows = [selected.map(field => escapeCsv(labels[field])).join(',')];

  for (const member of members) {
    rows.push(selected.map(field => {
      const value = member[field as keyof FrontendOldBoy];
      const excelSafe = ['mobile', 'whatsapp'].includes(field) && value
        ? `\t${String(value)}`
        : value;
      return escapeCsv(excelSafe);
    }).join(','));
  }

  return {
    csv: '\uFEFF' + rows.join('\r\n'),
    fields: selected,
  };
}
