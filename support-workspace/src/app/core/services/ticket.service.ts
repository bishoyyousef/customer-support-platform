import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, map } from 'rxjs';
import { Ticket, ManagerSummary } from '../models';
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

  // Pagination streams
  private pageSubject = new BehaviorSubject<number>(1);
  public page$ = this.pageSubject.asObservable();

  private totalPagesSubject = new BehaviorSubject<number>(1);
  public totalPages$ = this.totalPagesSubject.asObservable();

  private totalItemsSubject = new BehaviorSubject<number>(0);
  public totalItems$ = this.totalItemsSubject.asObservable();

  constructor(private http: HttpClient) {}

  fetchTickets(paramsObj?: any): Observable<Ticket[]> {
    if (this.ticketsSubject.value.length === 0) {
      this.loadingSubject.next(true);
    }
    let params = new HttpParams();
    if (paramsObj) {
      Object.entries(paramsObj).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          params = params.set(key, String(val));
        }
      });
    }

    return this.http.get<Ticket[]>(this.apiUrl, { params, observe: 'response' }).pipe(
      tap({
        next: (res) => {
          const tickets = res.body || [];
          this.ticketsSubject.next(tickets);
          
          const page = parseInt(res.headers.get('X-Pagination-Page') || '1', 10);
          const totalPages = parseInt(res.headers.get('X-Pagination-Total-Pages') || '1', 10);
          const totalItems = parseInt(res.headers.get('X-Pagination-Total-Count') || '0', 10);

          this.pageSubject.next(page);
          this.totalPagesSubject.next(totalPages);
          this.totalItemsSubject.next(totalItems);

          this.loadingSubject.next(false);
        },
        error: () => {
          this.loadingSubject.next(false);
        }
      }),
      map(res => res.body || [])
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

  uploadAttachment(ticketId: string, file: File, isInternal = false): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.apiUrl}/${ticketId}/attachments?isInternal=${isInternal}`, formData);
  }

  getManagerSummary(): Observable<ManagerSummary> {
    return this.http.get<ManagerSummary>(`${environment.apiUrl}/manager/summary`);
  }

  getSearchHistory(): Observable<string[]> {
    return this.http.get<string[]>(`${environment.apiUrl}/users/me/search-history`);
  }

  addSearchHistory(query: string): Observable<string[]> {
    return this.http.post<string[]>(`${environment.apiUrl}/users/me/search-history`, { query });
  }

  removeSearchHistory(query: string): Observable<string[]> {
    return this.http.delete<string[]>(`${environment.apiUrl}/users/me/search-history?query=${encodeURIComponent(query)}`);
  }

  clearSearchHistory(): Observable<string[]> {
    return this.http.delete<string[]>(`${environment.apiUrl}/users/me/search-history`);
  }

  getSuggestions(query: string): Observable<{ type: string; text: string; subtext?: string; ticketId?: string }[]> {
    return this.http.get<{ type: string; text: string; subtext?: string; ticketId?: string }[]>(
      `${this.apiUrl}/suggestions?q=${encodeURIComponent(query)}`
    );
  }
}
