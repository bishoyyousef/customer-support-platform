import { Injectable, Optional } from '@angular/core';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { DemoEventService } from './demo-event.service';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  
  private newMessageSubject = new Subject<any>();
  public onNewMessage$ = this.newMessageSubject.asObservable();

  private ticketUpdatedSubject = new Subject<any>();
  public onTicketUpdated$ = this.ticketUpdatedSubject.asObservable();

  private ticketCreatedSubject = new Subject<any>();
  public onTicketCreated$ = this.ticketCreatedSubject.asObservable();

  constructor(
    private authService: AuthService,
    @Optional() private demoEventService?: DemoEventService
  ) {
    if (this.demoEventService) {
      this.demoEventService.newMessage$.subscribe(msg => this.newMessageSubject.next(msg));
      this.demoEventService.ticketUpdated$.subscribe(t => this.ticketUpdatedSubject.next(t));
      this.demoEventService.ticketCreated$.subscribe(t => this.ticketCreatedSubject.next(t));
    }

    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.connect();
      } else {
        this.disconnect();
      }
    });
  }

  public connect(): void {
    const token = this.authService.token;
    if (!token) return;

    if ((environment as any).demoMode) {
      // In Demo Mode, bypass network connection
      return;
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    const socketUrl = (environment as any).socketUrl || 'http://localhost:5000';
    this.socket = io(socketUrl, {
      auth: { token },
      autoConnect: true
    });

    this.socket.on('new_message', (msg: any) => {
      this.newMessageSubject.next(msg);
    });

    this.socket.on('ticket_updated', (ticket: any) => {
      this.ticketUpdatedSubject.next(ticket);
    });

    this.socket.on('ticket_created', (ticket: any) => {
      this.ticketCreatedSubject.next(ticket);
    });
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public joinTicket(ticketId: string): void {
    if (this.socket && ticketId) {
      this.socket.emit('join_ticket', ticketId);
    }
  }

  public leaveTicket(ticketId: string): void {
    if (this.socket && ticketId) {
      this.socket.emit('leave_ticket', ticketId);
    }
  }

  public joinDashboard(): void {
    if (this.socket) {
      this.socket.emit('join_dashboard');
    }
  }
}
