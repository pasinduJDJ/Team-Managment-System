import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <main class="login-page">
      <section class="visual-panel">
        <div class="visual-overlay"></div>
        <div class="brand-mark">
          <div class="crest">BMV</div>
          <div><strong>Buddhaghosa Maha Vidyalaya</strong><span>Old Boys Association</span></div>
        </div>
        <div class="hero-copy">
          <span class="hero-kicker">CONNECTING GENERATIONS</span>
          <h1>Every old boy.<br><em>One digital home.</em></h1>
          <p>A secure, searchable directory built to strengthen the lifelong bond between our school and its old boys.</p>
          <div class="feature-row">
            <div><b>⌕</b><span>Find members<br>in seconds</span></div>
            <div><b>↻</b><span>Google Form<br>sync ready</span></div>
            <div><b>◈</b><span>Private admin<br>access</span></div>
          </div>
        </div>
        <div class="visual-footer">Since 1989 · Proudly serving our school community</div>
      </section>

      <section class="form-panel">
        <div class="mobile-brand"><div class="crest">BMV</div><strong>Digital Diary</strong></div>
        <div class="form-wrap">
          <span class="welcome">SUPER ADMIN PORTAL</span>
          <h2>Welcome back</h2>
          <p class="subtitle">Sign in to manage the Old Boys Digital Diary.</p>

          @if (error()) { <div class="alert error">{{ error() }}</div> }
          @if (resetMessage()) { <div class="alert success">{{ resetMessage() }}</div> }

          <form [formGroup]="form" (ngSubmit)="submit()">
            <label>Email address</label>
            <div class="input-wrap"><span>✉</span><input type="email" formControlName="email" autocomplete="email" placeholder="admin@example.com"></div>
            @if (form.controls.email.touched && form.controls.email.invalid) { <small>Enter a valid email address.</small> }

            <div class="label-row"><label>Password</label><button type="button" class="link" (click)="resetPassword()">Forgot password?</button></div>
            <div class="input-wrap"><span>⌾</span><input [type]="showPassword() ? 'text' : 'password'" formControlName="password" autocomplete="current-password" placeholder="Enter your password"><button type="button" class="eye" (click)="showPassword.set(!showPassword())">{{ showPassword() ? 'Hide' : 'Show' }}</button></div>
            @if (form.controls.password.touched && form.controls.password.invalid) { <small>Password is required.</small> }

            <label class="remember"><input type="checkbox" checked> <span>Keep me signed in on this device</span></label>
            <button class="submit" type="submit" [disabled]="loading()">{{ loading() ? 'Signing in…' : 'Sign in to Digital Diary' }} <span>→</span></button>
          </form>

          <div class="demo-box"><strong>Demo login</strong><span>admin@bmvoldboys.lk</span><span>Password: Admin@123</span></div>
          <p class="security">🔒 Access is restricted to authorised administrators only.</p>
        </div>
      </section>
    </main>
  `,
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly showPassword = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly resetMessage = signal('');

  readonly form = this.fb.nonNullable.group({
    email: ['admin@bmvoldboys.lk', [Validators.required, Validators.email]],
    password: ['Admin@123', Validators.required]
  });


  submit(): void {
    this.error.set('');
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    const result = this.auth.login(this.form.getRawValue().email, this.form.getRawValue().password);
    window.setTimeout(() => {
      this.loading.set(false);
      if (result.success) this.router.navigate(['/members']);
      else this.error.set(result.message ?? 'Unable to sign in.');
    }, 350);
  }

  resetPassword(): void {
    const email = this.form.controls.email.value;
    this.error.set('');
    this.resetMessage.set(this.auth.requestPasswordReset(email)
      ? 'Demo: a password recovery link would be sent to the administrator Gmail account.'
      : 'Enter the approved administrator email first.');
  }
}
