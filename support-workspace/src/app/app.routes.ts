import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { 
    path: 'dashboard', 
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'tickets/:id', 
    loadComponent: () => import('./components/ticket-detail/ticket-detail.component').then(m => m.TicketDetailComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'manager', 
    loadComponent: () => import('./components/manager-summary/manager-summary.component').then(m => m.ManagerSummaryComponent),
    canActivate: [authGuard, roleGuard]
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];
