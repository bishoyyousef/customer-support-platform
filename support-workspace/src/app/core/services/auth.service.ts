import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { User } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    // Restore session on app load
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
    return this.http.post<any>(`${this.apiUrl}/auth/login`, { username, password }).pipe(
      tap(res => {
        // Enforce employee role check (Agent / Manager)
        if (res.user.role !== 'agent' && res.user.role !== 'manager') {
          throw new Error('Unauthorized access: Only support employees can log into this workspace.');
        }
        localStorage.setItem('support_platform_token', res.token);
        localStorage.setItem('support_platform_user', JSON.stringify(res.user));
        this.currentUserSubject.next(res.user);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('support_platform_token');
    localStorage.removeItem('support_platform_user');
    this.currentUserSubject.next(null);
  }
}
