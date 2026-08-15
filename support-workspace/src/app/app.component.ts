import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { User } from './core/models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, TitleCasePipe],
  template: `
    <div [class.app-container]="isLoggedIn">
      <!-- Sidebar Navigation Console -->
      <aside class="sidebar" *ngIf="isLoggedIn">
        <div class="sidebar-header">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" fill="var(--color-accent)"/>
          </svg>
          <span class="brand-name">SupportDesk</span>
        </div>
        
        <nav class="sidebar-nav">
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
            <span>Tickets</span>
          </a>

          <!-- Workload summary node (Manager only) -->
          <a *ngIf="isManager" routerLink="/manager" routerLinkActive="active" class="nav-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            <span>Workload Analytics</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="user-profile">
            <span class="avatar-circle">{{ userInitials }}</span>
            <div class="user-meta">
              <span class="user-name">{{ currentUser?.name }}</span>
              <span class="user-role">{{ currentUser?.role | titlecase }}</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Content Layout Pane -->
      <div [class.content-frame]="isLoggedIn">
        <header class="main-header" *ngIf="isLoggedIn">
          <div class="header-left">
            <span class="page-title">Workspace Console</span>
          </div>
          <div class="header-right">
            <button (click)="onLogout()" class="btn btn-secondary logout-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Logout
            </button>
          </div>
        </header>

        <div [class.main-viewport]="isLoggedIn">
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>
  `
})
export class AppComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  isManager = false;
  currentUser: User | null = null;
  userInitials = '';
  private authSub?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authSub = this.authService.currentUser$.subscribe({
      next: (user) => {
        this.currentUser = user;
        this.isLoggedIn = !!user;
        this.isManager = this.authService.isManager();
        this.userInitials = user ? this.getInitials(user.name) : '';
      }
    });
  }

  ngOnDestroy(): void {
    if (this.authSub) {
      this.authSub.unsubscribe();
    }
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private getInitials(name: string): string {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
}
export default AppComponent;
