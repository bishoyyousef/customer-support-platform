import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { environment } from '../environments/environment';
import { TicketService } from './core/services/ticket.service';
import { DemoTicketService } from './core/services/demo-ticket.service';
import { AuthService } from './core/services/auth.service';
import { DemoAuthService } from './core/services/demo-auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: TicketService, useClass: environment.demoMode ? DemoTicketService : TicketService },
    { provide: AuthService, useClass: environment.demoMode ? DemoAuthService : AuthService }
  ]
};
