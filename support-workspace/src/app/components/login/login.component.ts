import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-wrapper">
      <div class="card login-card">
        <div class="login-header">
          <div class="login-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM12 6C9.79 6 8 7.79 8 10C8 12.21 9.79 14 12 14C14.21 14 16 12.21 16 10C16 7.79 14.21 6 12 6ZM12 12C10.9 12 10 11.1 10 10C10 8.9 10.9 8 12 8C13.1 8 14 8.9 14 10C14 11.1 13.1 12 12 12Z" fill="var(--color-accent)"/>
            </svg>
          </div>
          <h1>Agent Workspace Login</h1>
          <p class="subtitle">Operational Console for Customer Support Team</p>
        </div>

        <div *ngIf="errorMsg" class="alert alert-danger" role="alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{{ errorMsg }}</span>
        </div>

        <form (ngSubmit)="onSubmit()" #loginForm="ngForm" class="login-form">
          <div class="form-group">
            <label class="form-label" for="username">Agent Username</label>
            <input
              type="text"
              id="username"
              name="username"
              class="form-control"
              placeholder="e.g. agent_charlie"
              [(ngModel)]="username"
              required
              [disabled]="isSubmitting"
              autocomplete="username"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              class="form-control"
              placeholder="••••••••"
              [(ngModel)]="password"
              required
              [disabled]="isSubmitting"
              autocomplete="current-password"
            />
          </div>

          <button
            type="submit"
            class="btn btn-primary submit-btn"
            [disabled]="isSubmitting || loginForm.invalid"
          >
            {{ isSubmitting ? 'Authenticating...' : 'Sign In' }}
          </button>
        </form>

        <div class="divider">
          <span class="divider-text">select a support profile</span>
        </div>

        <div class="profile-list">
          <button
            type="button"
            class="btn btn-secondary profile-btn"
            (click)="selectProfile('agent_charlie')"
            [disabled]="isSubmitting"
          >
            <span class="avatar">CD</span>
            <div class="profile-info">
              <span class="profile-name">Charlie Davis</span>
              <span class="profile-role">Support Agent</span>
            </div>
          </button>

          <button
            type="button"
            class="btn btn-secondary profile-btn"
            (click)="selectProfile('agent_diana')"
            [disabled]="isSubmitting"
          >
            <span class="avatar">DE</span>
            <div class="profile-info">
              <span class="profile-name">Diana Evans</span>
              <span class="profile-role">Support Agent</span>
            </div>
          </button>

          <button
            type="button"
            class="btn btn-secondary profile-btn"
            (click)="selectProfile('manager_eve')"
            [disabled]="isSubmitting"
          >
            <span class="avatar">EF</span>
            <div class="profile-info">
              <span class="profile-name">Eve Foster</span>
              <span class="profile-role">Support Manager</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      width: 100vw;
      background-color: var(--color-bg-base);
    }
    .login-card {
      width: 100%;
      max-width: 400px;
      padding: 2.25rem;
    }
    .login-header {
      text-align: center;
      margin-bottom: 1.5rem;
    }
    .login-logo {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      background-color: var(--color-accent-light);
      margin-bottom: 0.75rem;
    }
    .subtitle {
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
      margin-top: 0.125rem;
    }
    .login-form {
      display: flex;
      flex-direction: column;
    }
    .submit-btn {
      width: 100%;
      margin-top: 0.5rem;
    }
    .divider {
      display: flex;
      align-items: center;
      text-align: center;
      margin: 1.25rem 0;
    }
    .divider-text {
      width: 100%;
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .profile-list {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }
    .profile-btn {
      display: flex;
      align-items: center;
      text-align: left;
      width: 100%;
      padding: 0.5rem 0.875rem;
      justify-content: flex-start;
    }
    .avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-color: var(--color-accent-light);
      color: var(--color-accent);
      font-weight: 600;
      font-size: var(--font-size-xs);
      margin-right: 0.75rem;
    }
    .profile-info {
      display: flex;
      flex-direction: column;
    }
    .profile-name {
      font-size: var(--font-size-sm);
      font-weight: 500;
      color: var(--color-text-main);
      line-height: 1.2;
    }
    .profile-role {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
    }
  `]
})
export class LoginComponent {
  username = '';
  password = '';
  isSubmitting = false;
  errorMsg: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    if (!this.username.trim() || !this.password.trim()) {
      this.errorMsg = 'Please enter both username and password.';
      return;
    }

    this.errorMsg = null;
    this.isSubmitting = true;

    this.authService.login(this.username.trim(), this.password).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.errorMsg = err.error?.message || err.message || 'Authentication failed.';
        this.isSubmitting = false;
      }
    });
  }

  selectProfile(profileUsername: string): void {
    this.errorMsg = null;
    this.isSubmitting = true;

    this.authService.login(profileUsername, 'password').subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.errorMsg = err.error?.message || err.message || 'Authentication failed.';
        this.isSubmitting = false;
      }
    });
  }
}
