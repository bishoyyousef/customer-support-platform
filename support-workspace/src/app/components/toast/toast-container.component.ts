import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage } from '../../core/services/toast.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      aria-live="polite"
      aria-atomic="true"
      class="toast-wrapper"
    >
      <div
        *ngFor="let toast of toasts$ | async"
        class="toast-item"
        [ngClass]="'toast-' + toast.type"
      >
        <div class="toast-content">
          <div *ngIf="toast.title" class="toast-title">{{ toast.title }}</div>
          <div class="toast-message">{{ toast.message }}</div>
        </div>
        <button
          type="button"
          class="toast-close"
          (click)="remove(toast.id)"
          aria-label="Close notification"
        >
          &times;
        </button>
      </div>
    </div>
  `,
  styles: [`
    .toast-wrapper {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: 360px;
      width: 100%;
      pointer-events: none;
    }

    .toast-item {
      pointer-events: auto;
      background-color: var(--color-bg-surface);
      border-left: 4px solid #3b82f6;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border-radius: 6px;
      padding: 0.75rem 1rem;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .toast-success {
      border-left-color: #10b981;
    }

    .toast-danger {
      border-left-color: #ef4444;
    }

    .toast-warning {
      border-left-color: #f59e0b;
    }

    .toast-info {
      border-left-color: #3b82f6;
    }

    .toast-title {
      font-weight: 600;
      font-size: 0.875rem;
      margin-bottom: 0.125rem;
      color: var(--color-text-main);
    }

    .toast-message {
      font-size: 0.875rem;
      color: var(--color-text-main);
    }

    .toast-close {
      background: none;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
      font-size: 1rem;
      line-height: 1;
      padding: 0.125rem;
    }
  `]
})
export class ToastContainerComponent {
  public toasts$: Observable<ToastMessage[]>;

  constructor(private toastService: ToastService) {
    this.toasts$ = this.toastService.toasts$;
  }

  public remove(id: string): void {
    this.toastService.removeToast(id);
  }
}
