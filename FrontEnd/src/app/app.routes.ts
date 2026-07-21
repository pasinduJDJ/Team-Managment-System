import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/app-shell.component').then(m => m.AppShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'members' },
      { path: 'members', loadComponent: () => import('./features/members/member-list.component').then(m => m.MemberListComponent) },
      { path: 'members/:id', loadComponent: () => import('./features/members/member-profile.component').then(m => m.MemberProfileComponent) },
      { path: 'members/:id/edit', loadComponent: () => import('./features/members/member-edit.component').then(m => m.MemberEditComponent) },
      { path: 'approvals', loadComponent: () => import('./features/approvals/approvals.component').then(m => m.ApprovalsComponent) },
      { path: 'reports', loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent) }
    ]
  },
  { path: '**', loadComponent: () => import('./features/not-found/not-found.component').then(m => m.NotFoundComponent) }
];
