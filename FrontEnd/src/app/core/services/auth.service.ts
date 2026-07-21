import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey = 'bmv-diary-auth';
  readonly isAuthenticated = signal(this.readStoredAuth());
  readonly adminEmail = signal('admin@bmvoldboys.lk');

  login(email: string, password: string): { success: boolean; message?: string } {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail === 'admin@bmvoldboys.lk' && password === 'Admin@123') {
      localStorage.setItem(this.storageKey, 'true');
      this.isAuthenticated.set(true);
      return { success: true };
    }
    return { success: false, message: 'Incorrect email or password. Use the demo credentials shown below.' };
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
    this.isAuthenticated.set(false);
  }

  requestPasswordReset(email: string): boolean {
    return email.trim().toLowerCase() === this.adminEmail();
  }

  private readStoredAuth(): boolean {
    try {
      return localStorage.getItem(this.storageKey) === 'true';
    } catch {
      return false;
    }
  }
}
