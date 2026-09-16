import { Observable } from 'rxjs';
import { User } from '../models';

export abstract class IAuthService {
  abstract currentUser$: Observable<User | null>;
  abstract get currentUserValue(): User | null;
  abstract get token(): string | null;
  abstract get isAuthenticated(): boolean;
  abstract isManager(): boolean;
  abstract login(username: string, password: string): Observable<any>;
  abstract logout(): void;
}
