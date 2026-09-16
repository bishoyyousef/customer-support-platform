import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { User } from '../models';
import { IAuthService } from './auth.service.interface';
import { getDemoDB } from './demo-store';

@Injectable({
  providedIn: 'root'
})
export class DemoAuthService implements IAuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    const storedToken = localStorage.getItem('support_platform_token');
    const storedUser = localStorage.getItem('support_platform_user');
    if (storedToken && storedUser) {
      try {
        this.currentUserSubject.next(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('support_platform_token');
        localStorage.removeItem('support_platform_user');
      }
    }
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public get token(): string | null {
    return localStorage.getItem('support_platform_token');
  }

  public get isAuthenticated(): boolean {
    return !!this.token;
  }

  public isManager(): boolean {
    const user = this.currentUserValue;
    return user ? user.role === 'manager' : false;
  }

  login(username: string, password: string): Observable<any> {
    const db = getDemoDB();
    const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user) {
      return throwError(() => new Error('Invalid credentials'));
    }

    if (user.role !== 'agent' && user.role !== 'manager') {
      return throwError(() => new Error('Unauthorized access: Only support employees can log into this workspace.'));
    }

    const token = `demo-token-${user.id}`;
    localStorage.setItem('support_platform_token', token);
    localStorage.setItem('support_platform_user', JSON.stringify(user));
    this.currentUserSubject.next(user);

    return of({ token, user });
  }

  logout(): void {
    localStorage.removeItem('support_platform_token');
    localStorage.removeItem('support_platform_user');
    this.currentUserSubject.next(null);
  }
}
