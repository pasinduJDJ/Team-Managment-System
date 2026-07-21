import { Injectable, signal } from '@angular/core';
import { MemberStatus, OldBoy } from '../models/old-boy.model';
import { MOCK_OLD_BOYS } from './mock-old-boys';

@Injectable({ providedIn: 'root' })
export class OldBoysService {
  private readonly storageKey = 'bmv-diary-members';
  private readonly _members = signal<OldBoy[]>(this.load());
  readonly members = this._members.asReadonly();

  getById(id: string): OldBoy | undefined {
    return this._members().find(member => member.id === id);
  }

  updateMember(id: string, changes: Partial<OldBoy>): OldBoy | undefined {
    let updated: OldBoy | undefined;
    this._members.update(members => members.map(member => {
      if (member.id !== id) return member;
      updated = { ...member, ...changes, updatedAt: new Date().toISOString() };
      return updated;
    }));
    this.persist();
    return updated;
  }

  setStatus(id: string, status: MemberStatus): void {
    this.updateMember(id, { status });
  }

  resetDemoData(): void {
    this._members.set(structuredClone(MOCK_OLD_BOYS));
    this.persist();
  }

  exportCsv(members: OldBoy[], selectedFields?: (keyof OldBoy)[]): void {
    const fields: (keyof OldBoy)[] = selectedFields?.length ? selectedFields : [
      'fullName', 'batch', 'admissionNumber', 'mobile', 'whatsapp', 'email',
      'profession', 'company', 'city', 'country', 'status', 'submittedAt'
    ];
    const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = [fields.map(field => escape(this.labelFor(field))).join(',')];
    for (const member of members) rows.push(fields.map(field => {
      const value = member[field];
      return escape((field === 'mobile' || field === 'whatsapp') && value ? `\t${value}` : value);
    }).join(','));
    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `old-boys-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private labelFor(field: keyof OldBoy): string {
    const labels: Partial<Record<keyof OldBoy, string>> = {
      fullName: 'Full Name', batch: 'Batch', admissionNumber: 'Admission Number',
      mobile: 'Mobile', whatsapp: 'WhatsApp', email: 'Email', profession: 'Profession',
      company: 'Company', city: 'City', country: 'Country', status: 'Status',
      submittedAt: 'Submitted At', updatedAt: 'Updated At', source: 'Source',
      address: 'Address', notes: 'Notes', id: 'ID'
    };
    return labels[field] ?? field;
  }

  private load(): OldBoy[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : structuredClone(MOCK_OLD_BOYS);
    } catch {
      return structuredClone(MOCK_OLD_BOYS);
    }
  }

  private persist(): void {
    try { localStorage.setItem(this.storageKey, JSON.stringify(this._members())); } catch { /* demo storage only */ }
  }
}
