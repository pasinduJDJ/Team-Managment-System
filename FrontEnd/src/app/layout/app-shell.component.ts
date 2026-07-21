import { Component, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { OldBoysService } from '../core/services/old-boys.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-shell">
      <button class="mobile-overlay" [class.show]="sidebarOpen()" (click)="sidebarOpen.set(false)" aria-label="Close navigation"></button>

      <aside class="sidebar" [class.open]="sidebarOpen()">
        <div class="brand">
          <div class="crest">BMV</div>
          <div>
            <strong>Digital Diary</strong>
            <span>Old Boys Association</span>
          </div>
        </div>

        <nav class="nav-list" aria-label="Main navigation">
          <a routerLink="/members" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" (click)="sidebarOpen.set(false)">
            <span class="nav-icon">⌕</span>
            <span>All Old Boys</span>
          </a>
          <a routerLink="/approvals" routerLinkActive="active" (click)="sidebarOpen.set(false)">
            <span class="nav-icon">✓</span>
            <span>Pending Approvals</span>
            @if (pendingCount() > 0) { <span class="nav-badge">{{ pendingCount() }}</span> }
          </a>
          <a routerLink="/reports" routerLinkActive="active" (click)="sidebarOpen.set(false)">
            <span class="nav-icon">▥</span>
            <span>Reports & Exports</span>
          </a>
        </nav>

        <div class="wave-card">
          <span class="wave-label">MVP STATUS</span>
          <strong>Wave 1 Ready</strong>
          <p>Frontend uses demo data and is prepared for Supabase integration.</p>
        </div>

        <div class="admin-card">
          <div class="avatar">SA</div>
          <div class="admin-copy">
            <strong>Super Admin</strong>
            <span>{{ auth.adminEmail() }}</span>
          </div>
          <button class="logout-icon" (click)="logout()" title="Log out">↪</button>
        </div>
      </aside>

      <main class="main-area">
        <header class="topbar">
          <button class="menu-button" (click)="sidebarOpen.set(!sidebarOpen())" aria-label="Open navigation">☰</button>
          <div>
            <span class="eyebrow">BUDDHAGHOSA MAHA VIDYALAYA</span>
            <h1>{{ pageTitle() }}</h1>
          </div>
          <div class="top-actions">
            <div class="sync-pill"><span></span> Mock data active</div>
            <button class="avatar top-avatar">SA</button>
          </div>
        </header>

        <section class="content"><router-outlet /></section>
      </main>
    </div>
  `,
  styleUrl: './app-shell.component.scss'
})
export class AppShellComponent {
  readonly sidebarOpen = signal(false);

  constructor(
    public readonly auth: AuthService,
    private readonly router: Router,
    private readonly oldBoys: OldBoysService
  ) {}

  pendingCount(): number {
    return this.oldBoys.members().filter(member => member.status === 'pending').length;
  }

  pageTitle(): string {
    const url = this.router.url;
    if (url.includes('/approvals')) return 'Pending Approvals';
    if (url.includes('/reports')) return 'Reports & Exports';
    if (url.includes('/edit')) return 'Edit Old Boy Profile';
    if (/\/members\/[^/]+$/.test(url)) return 'Old Boy Profile';
    return 'All Old Boys';
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
