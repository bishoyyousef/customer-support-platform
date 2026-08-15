import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Ticket } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private apiUrl = `${environment.apiUrl}/tickets`;
  
  // Reactive ticket cache store
  private ticketsSubject = new BehaviorSubject<Ticket[]>([]);
  public tickets$ = this.ticketsSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) {}

  fetchTickets(): Observable<Ticket[]> {
    this.loadingSubject.next(true);
    return this.http.get<Ticket[]>(this.apiUrl).pipe(
      tap({
        next: (tickets) => {
          this.ticketsSubject.next(tickets);
          this.loadingSubject.next(false);
        },
        error: () => {
          this.loadingSubject.next(false);
        }
      })
    );
  }

  getTicketDetails(id: string): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.apiUrl}/${id}`);
  }

  claimTicket(ticketId: string, agentId: string): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.apiUrl}/${ticketId}`, { assignedTo: agentId }).pipe(
      tap(updatedTicket => {
        // Reactively update cache
        const currentTickets = this.ticketsSubject.value;
        const index = currentTickets.findIndex(t => t.id === ticketId);
        if (index !== -1) {
          const updatedList = [...currentTickets];
          updatedList[index] = { ...updatedList[index], ...updatedTicket };
          this.ticketsSubject.next(updatedList);
        }
      })
    );
  }

  reassignTicket(ticketId: string, agentId: string | null): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.apiUrl}/${ticketId}`, { assignedTo: agentId }).pipe(
      tap(updatedTicket => {
        // Reactively update cache
        const currentTickets = this.ticketsSubject.value;
        const index = currentTickets.findIndex(t => t.id === ticketId);
        if (index !== -1) {
          const updatedList = [...currentTickets];
          updatedList[index] = { ...updatedList[index], ...updatedTicket };
          this.ticketsSubject.next(updatedList);
        }
      })
    );
  }
}
