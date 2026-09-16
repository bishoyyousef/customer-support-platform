import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DemoEventService {
  public newMessage$ = new Subject<any>();
  public ticketUpdated$ = new Subject<any>();
  public ticketCreated$ = new Subject<any>();

  emitNewMessage(msg: any): void {
    this.newMessage$.next(msg);
  }

  emitTicketUpdated(ticket: any): void {
    this.ticketUpdated$.next(ticket);
  }

  emitTicketCreated(ticket: any): void {
    this.ticketCreated$.next(ticket);
  }
}
