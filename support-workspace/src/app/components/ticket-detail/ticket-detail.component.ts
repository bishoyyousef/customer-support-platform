import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription, interval, switchMap, Observable } from 'rxjs';
import { TicketService } from '../../core/services/ticket.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { SocketService } from '../../core/services/socket.service';
import { Ticket, Message, ActivityEvent, User, TicketStatus } from '../../core/models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TitleCasePipe],
  template: `

    <div class="workspace-grid">
      <!-- 1. Left Column: Compact Ticket Queue List -->
      <div class="queue-pane">
        <div class="pane-header">
          <h4>Active Queue</h4>
          <span class="queue-count">{{ (activeTickets$ | async)?.length || 0 }}</span>
        </div>
        <div class="queue-list">
          <div 
            *ngFor="let t of activeTickets$ | async" 
            [routerLink]="['/tickets', t.id]" 
            routerLinkActive="active" 
            class="queue-item"
          >
            <div class="queue-item-meta">
              <span class="q-id">{{ t.id }}</span>
              <span [class]="getUrgencyBadgeClass(t.urgency)">
                <span class="heroui-chip-dot"></span>
                {{ t.urgency[0] }}
              </span>
            </div>
            <div class="q-title">{{ t.title }}</div>
            <div class="q-customer">by {{ t.customerName }}</div>
          </div>
        </div>
      </div>

      <!-- 2. Center Column: Chat Timeline & Dual-Channel Composer -->
      <div class="timeline-pane">
        <div class="pane-header">
          <h3>Conversation & Activity History</h3>
        </div>

        <div #scrollContainer class="timeline-feed">
          <div *ngFor="let item of sortedTimeline" class="feed-item">
            <!-- System Activity log -->
            <div *ngIf="item.type === 'activity'" class="activity-log">
              <span class="activity-text">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 0.25rem; display: inline-block; vertical-align: middle;">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                {{ item.data.message }}
              </span>
              <span class="activity-time">{{ formatDate(item.data.timestamp) }}</span>
            </div>

            <!-- Message bubble with HeroUI Avatar -->
            <div 
              *ngIf="item.type === 'message'" 
              class="message-row"
              [class.msg-internal]="item.data.isInternal"
              [class.msg-agent]="item.data.senderRole !== 'customer'"
              style="display: flex; gap: 0.75rem; align-items: flex-start;"
            >
              <div 
                *ngIf="item.data.senderRole === 'customer'"
                class="heroui-avatar heroui-avatar-customer"
              >
                {{ getUserInitials(item.data.senderName) }}
              </div>

              <div class="msg-bubble">
                <div class="msg-meta">
                  <span class="msg-sender">{{ item.data.senderName }}</span>
                  <span *ngIf="item.data.isInternal" class="internal-tag">INTERNAL NOTE</span>
                  <span class="msg-role" *ngIf="!item.data.isInternal">
                    ({{ item.data.senderRole | titlecase }})
                  </span>
                </div>
                 <div class="msg-body">{{ item.data.content }}</div>
                 <!-- Render attachments if present -->
                 <div *ngIf="item.data.attachment" class="attachment-box" style="display: inline-flex; align-items: center; gap: 0.25rem; margin-top: 0.25rem; background-color: var(--color-bg-base); padding: 0.375rem 0.625rem; border-radius: var(--radius-sm); border: 1px solid var(--color-border);">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2">
                     <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                   </svg>
                   <a
                     [href]="getAttachmentDownloadUrl(item.data.attachment.id)"
                     target="_blank"
                     style="font-size: var(--font-size-xs); color: var(--color-primary); text-decoration: none; font-weight: 500;"
                   >
                     {{ item.data.attachment.filename }} ({{ getAttachmentSizeKb(item.data.attachment.size) }} KB)
                   </a>
                 </div>
                 <div class="msg-time">{{ formatDate(item.data.timestamp) }}</div>
              </div>

              <div 
                *ngIf="item.data.senderRole !== 'customer'"
                class="heroui-avatar heroui-avatar-agent"
              >
                {{ getUserInitials(item.data.senderName) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Dual Channel Composer Tab Panel -->
        <div class="composer-container">
          <div *ngIf="ticket && ticket.status === 'resolved'" class="resolved-banner">
            <p>This request has been resolved. The conversation is closed.</p>
            <div *ngIf="ticket.resolutionSummary" class="resolution-detail">
              <strong>Resolution Summary:</strong>
              <div class="resolution-text">{{ ticket.resolutionSummary }}</div>
            </div>
          </div>

          <div *ngIf="ticket && ticket.status !== 'resolved'">
            <!-- Tab headers -->
            <div class="composer-tabs">
              <button 
                type="button"
                (click)="activeChannel = 'public'" 
                class="composer-tab-btn" 
                [class.active]="activeChannel === 'public'"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span>Public Reply</span>
              </button>
              <button 
                type="button"
                (click)="activeChannel = 'internal'" 
                class="composer-tab-btn tab-internal" 
                [class.active]="activeChannel === 'internal'"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span>Internal Note</span>
              </button>
            </div>

            <form (ngSubmit)="sendReply()" class="composer-form">
              <textarea
                class="form-control composer-textarea"
                [placeholder]="activeChannel === 'public' ? 'Message customer (Press Enter to send)...' : 'Record private internal note (Press Enter to send)...'"
                [(ngModel)]="composerText"
                name="composerText"
                rows="3"
                required
                (keydown)="onComposerKeyDown($event)"
                [disabled]="isSubmitting"
                [class.internal-textarea]="activeChannel === 'internal'"
              ></textarea>
              
               <div class="composer-actions">
                 <input
                   type="file"
                   #fileInput
                   style="display: none;"
                   (change)="handleFileUpload($event)"
                   [disabled]="isSubmitting"
                 />
                 <button
                   type="button"
                   class="btn btn-secondary"
                   (click)="fileInput.click()"
                   [disabled]="isSubmitting"
                   style="margin-right: 0.5rem; display: inline-flex; align-items: center; gap: 0.25rem;"
                 >
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                     <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                   </svg>
                   Attach File
                 </button>
                 <button
                   type="submit"
                   class="btn"
                   [class.btn-primary]="activeChannel === 'public'"
                   [class.btn-warning]="activeChannel === 'internal'"
                   [disabled]="isSubmitting || !composerText.trim()"
                 >
                   {{ isSubmitting ? 'Posting...' : (activeChannel === 'public' ? 'Send Message' : 'Add Note') }}
                 </button>
               </div>
            </form>
          </div>
        </div>
      </div>

      <!-- 3. Right Column: Details & Stepper Actions -->
      <div class="details-pane">
        <div class="card details-card">
          <h4>Request Info</h4>
          
          <div class="meta-row">
            <span class="lbl">ID</span>
            <span class="val font-mono">{{ ticket?.id }}</span>
          </div>

          <div class="meta-row">
            <span class="lbl">Customer</span>
            <span class="val">{{ ticket?.customerName }}</span>
          </div>

          <div class="meta-row">
            <span class="lbl">Category</span>
            <span class="val">{{ ticket?.category }}</span>
          </div>

          <div class="meta-row">
            <span class="lbl">Urgency</span>
            <span [class]="getUrgencyBadgeClass(ticket?.urgency || 'Low')">
              <span class="heroui-chip-dot"></span>
              {{ ticket?.urgency }}
            </span>
          </div>

          <div class="meta-row">
            <span class="lbl">Status</span>
            <span [class]="getStatusClass(ticket?.status || 'requires_attention')">
              <span class="heroui-chip-dot" [class.heroui-chip-dot-pulse]="ticket?.status === 'requires_attention'"></span>
              {{ getStatusText(ticket?.status) }}
            </span>
          </div>

          <!-- Manager Reassignment controls -->
          <div class="meta-row-vertical" *ngIf="currentUser?.role === 'manager'">
            <label class="form-label" for="assignee-select">Assign Agent</label>
            <select
              id="assignee-select"
              class="form-control select-control"
              [ngModel]="ticket?.assignedTo"
              (ngModelChange)="onReassign($event)"
              [disabled]="isSubmitting"
            >
              <option [value]="null">Unassigned</option>
              <option *ngFor="let agent of availableAgents" [value]="agent.id">{{ agent.name }}</option>
            </select>
          </div>

          <div class="meta-row" *ngIf="currentUser?.role !== 'manager'">
            <span class="lbl">Assignee</span>
            <span class="val">{{ ticket?.assignedName || 'Unassigned' }}</span>
          </div>

          <!-- Status Stepper controls -->
          <div class="stepper-section" *ngIf="ticket && ticket.status !== 'resolved'">
            <h5>Status Progression</h5>
            <div class="stepper-buttons">
              <!-- Claim -->
              <button 
                *ngIf="!ticket.assignedTo || (currentUser && currentUser.role === 'manager' && ticket.assignedTo !== currentUser.id)" 
                (click)="claimTicket()" 
                class="btn btn-primary btn-block"
                [disabled]="isSubmitting"
              >
                {{ currentUser && currentUser.role === 'manager' && ticket.assignedTo ? 'Claim for Myself' : 'Claim Ticket' }}
              </button>

              <!-- Move to Under Investigation -->
              <button 
                *ngIf="ticket.assignedTo && ticket.status !== 'under_investigation'" 
                (click)="updateStatus('under_investigation')" 
                class="btn btn-secondary btn-block"
                [disabled]="isSubmitting"
              >
                Investigate
              </button>

              <!-- Move to Awaiting Customer -->
              <button 
                *ngIf="ticket.assignedTo && ticket.status !== 'pending_customer'" 
                (click)="updateStatus('pending_customer')" 
                class="btn btn-secondary btn-block"
                [disabled]="isSubmitting"
              >
                Awaiting Customer
              </button>

              <!-- Resolve -->
              <button 
                *ngIf="ticket.assignedTo" 
                (click)="openResolveModal()" 
                class="btn btn-success-action btn-block"
                [disabled]="isSubmitting"
              >
                Resolve Ticket
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Resolution Modal Overlay -->
    <div *ngIf="showResolveModal" class="modal-overlay">
      <div class="card modal-card">
        <h4>Resolve Ticket: {{ ticket?.id }}</h4>
        <p class="subtitle">A brief resolution summary is required to close this support ticket.</p>
        
        <form (ngSubmit)="submitResolve()" #resolveForm="ngForm">
          <div class="form-group" style="margin-top: 1rem;">
            <label class="form-label" for="res-summary">Resolution Summary</label>
            <textarea
              id="res-summary"
              class="form-control"
              style="height: 120px; resize: none;"
              placeholder="Describe the solution applied (minimum 10 characters)..."
              [(ngModel)]="resolutionSummary"
              name="resolutionSummary"
              required
              minlength="10"
              maxlength="1000"
              #resInput="ngModel"
            ></textarea>
            <div *ngIf="resInput.invalid && (resInput.dirty || resInput.touched)" class="form-error-msg">
              Summary must be at least 10 characters.
            </div>
            <div class="char-count">
              {{ resolutionSummary.trim().length }} / 1000 characters
            </div>
          </div>

          <div class="modal-actions">
            <button 
              type="button" 
              (click)="closeResolveModal()" 
              class="btn btn-secondary"
              [disabled]="isSubmitting"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              class="btn btn-primary"
              [disabled]="isSubmitting || resolveForm.invalid"
            >
              Confirm Resolve
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .workspace-grid {
      display: grid;
      grid-template-columns: 200px 1fr 260px;
      height: calc(100vh - 56px - 3rem); /* Subtract headers and margins */
      gap: 1rem;
      overflow: hidden;
    }

    @media (max-width: 992px) {
      .workspace-grid {
        grid-template-columns: 1fr 260px;
        height: auto;
        overflow: visible;
      }
      .queue-pane {
        display: none;
      }
    }

    @media (max-width: 768px) {
      .workspace-grid {
        display: flex;
        flex-direction: column;
        height: auto;
        overflow: visible;
      }
      .queue-pane {
        display: block;
        max-height: 200px;
      }
      .timeline-pane {
        height: 500px;
      }
      .details-pane {
        height: auto;
      }
    }

    /* Column 1: Queue list */
    .queue-pane {
      background-color: var(--color-bg-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .pane-header {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--color-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: var(--color-bg-base);
    }
    .pane-header h4 {
      font-size: var(--font-size-sm);
      font-weight: 600;
    }
    .queue-count {
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: var(--color-text-muted);
      background-color: var(--color-bg-base);
      padding: 0.125rem 0.375rem;
      border-radius: 9999px;
    }
    .queue-list {
      flex: 1;
      overflow-y: auto;
    }
    .queue-item {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--color-border);
      cursor: pointer;
      transition: all var(--transition-fast);
      text-decoration: none;
      display: block;
    }
    .queue-item:hover {
      background-color: var(--color-bg-base);
    }
    .queue-item.active {
      background-color: var(--color-accent-light);
      border-left: 3px solid var(--color-accent);
    }
    .queue-item-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.25rem;
    }
    .q-id {
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: var(--color-text-muted);
    }
    .q-title {
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--color-text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .q-customer {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      margin-top: 0.125rem;
    }

    /* Column 2: Timeline feed */
    .timeline-pane {
      background-color: var(--color-bg-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .timeline-feed {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      background-color: var(--color-bg-base);
    }
    .feed-item {
      display: flex;
      flex-direction: column;
    }
    .message-row {
      display: flex;
      justify-content: flex-start;
      width: 100%;
    }
    .message-row.msg-agent {
      justify-content: flex-end;
    }
    .msg-bubble {
      max-width: 75%;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      background-color: var(--color-bg-surface);
      box-shadow: 0 1px 1px 0 rgba(0, 0, 0, 0.02);
      display: flex;
      flex-direction: column;
    }
    .message-row.msg-agent .msg-bubble {
      background-color: var(--color-bg-surface);
      border-color: var(--color-border);
    }
    .message-row.msg-internal .msg-bubble {
      background-color: var(--color-warning-light);
      border-color: rgba(245, 158, 11, 0.25);
    }
    .msg-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
    }
    .msg-sender {
      font-size: var(--font-size-xs);
      font-weight: 600;
      color: var(--color-text-main);
    }
    .msg-role {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
    }
    .internal-tag {
      font-size: 0.625rem;
      font-weight: 700;
      background-color: #f59e0b;
      color: #ffffff;
      padding: 0.125rem 0.375rem;
      border-radius: var(--radius-sm);
    }
    .msg-body {
      font-size: var(--font-size-sm);
      color: var(--color-text-main);
      white-space: pre-wrap;
      line-height: 1.4;
    }
    .msg-time {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
      margin-top: 0.375rem;
      align-self: flex-start;
    }
    .message-row.msg-agent .msg-time {
      align-self: flex-end;
    }
    .activity-log {
      align-self: center;
      text-align: center;
      display: flex;
      flex-direction: column;
      margin: 0.25rem 0;
    }
    .activity-text {
      font-size: var(--font-size-xs);
      font-weight: 500;
      color: var(--color-text-muted);
      background-color: var(--color-bg-base);
      padding: 0.25rem 0.625rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
    }
    .activity-time {
      font-size: 0.625rem;
      color: var(--color-text-muted);
      margin-top: 0.125rem;
    }

    /* Composer */
    .composer-container {
      padding: 1.25rem;
      border-top: 1px solid var(--color-border);
      background-color: var(--color-bg-surface);
    }
    .composer-tabs {
      display: flex;
      gap: 0.625rem;
      margin-bottom: 0.875rem;
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 0.75rem;
    }
    .composer-tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.4375rem 0.875rem;
      font-size: var(--font-size-xs);
      font-weight: 600;
      border-radius: 9999px;
      border: 1px solid var(--color-border);
      background-color: var(--color-bg-base);
      color: var(--color-text-muted);
      cursor: pointer;
      transition: all 0.2s ease;
      outline: none;
    }
    .composer-tab-btn:hover {
      color: var(--color-text-main);
      border-color: var(--color-text-muted);
      transform: translateY(-1px);
    }
    .composer-tab-btn.active {
      background-color: var(--color-accent);
      color: #ffffff;
      border-color: var(--color-accent);
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
    }
    .composer-tab-btn.tab-internal {
      background-color: var(--color-warning-light);
      color: #d97706;
      border-color: rgba(245, 158, 11, 0.3);
    }
    .composer-tab-btn.tab-internal:hover {
      border-color: var(--color-warning);
      color: #b45309;
      transform: translateY(-1px);
    }
    .composer-tab-btn.tab-internal.active {
      background-color: #f59e0b;
      color: #ffffff;
      border-color: #f59e0b;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
    }
    [data-theme="dark"] .composer-tab-btn.tab-internal {
      background-color: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border-color: rgba(245, 158, 11, 0.35);
    }
    [data-theme="dark"] .composer-tab-btn.tab-internal.active {
      background-color: #f59e0b;
      color: #ffffff;
    }
    .composer-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .composer-textarea {
      resize: none;
      height: 72px;
    }
    .internal-textarea {
      border-color: rgba(245, 158, 11, 0.3);
    }
    .internal-textarea:focus {
      border-color: var(--color-warning);
      box-shadow: 0 0 0 3px var(--color-warning-light);
    }
    .composer-actions {
      display: flex;
      justify-content: flex-end;
    }
    .btn-warning {
      background-color: #f59e0b;
      color: #ffffff;
    }
    .btn-warning:hover {
      background-color: #d97706;
    }
    .resolved-banner {
      padding: 0.5rem;
      text-align: center;
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }
    .resolution-detail {
      margin-top: 0.5rem;
      text-align: left;
      background-color: var(--color-success-light);
      padding: 0.75rem;
      border-radius: var(--radius-md);
      border: 1px solid rgba(16, 185, 129, 0.15);
    }
    .resolution-text {
      font-size: var(--font-size-xs);
      color: var(--color-success);
      margin-top: 0.25rem;
    }

    /* Column 3: Detail stats sidebar */
    .details-pane {
      overflow-y: auto;
      height: 100%;
    }
    .details-card {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
    }
    .details-card h4 {
      font-size: var(--font-size-base);
      font-weight: 600;
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 0.5rem;
      margin-bottom: 0.25rem;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: var(--font-size-sm);
      border-bottom: 1px solid #f4f4f5;
      padding-bottom: 0.5rem;
    }
    .meta-row-vertical {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      border-bottom: 1px solid #f4f4f5;
      padding-bottom: 0.5rem;
    }
    .lbl {
      color: var(--color-text-muted);
    }
    .val {
      color: var(--color-text-main);
      font-weight: 500;
    }
    .font-mono {
      font-family: monospace;
      font-size: var(--font-size-xs);
    }
    .select-control {
      width: 100%;
      height: 32px;
      padding: 0.25rem 0.5rem;
      font-size: var(--font-size-xs);
    }
    
    /* Stepper buttons */
    .stepper-section {
      margin-top: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .stepper-section h5 {
      font-size: var(--font-size-xs);
      font-weight: 600;
      text-transform: uppercase;
      color: var(--color-text-muted);
      letter-spacing: 0.05em;
    }
    .stepper-buttons {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .btn-block {
      width: 100%;
      font-size: var(--font-size-xs);
      height: 32px;
      padding: 0;
    }
    .btn-success-action {
      background-color: var(--color-success);
      color: #ffffff;
    }
    .btn-success-action:hover {
      background-color: #059669;
    }

    /* Modal dialog */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(9, 9, 11, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
    .modal-card {
      width: 100%;
      max-width: 460px;
      padding: 1.75rem;
    }
    .char-count {
      text-align: right;
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      margin-top: 0.25rem;
    }
    .form-error-msg {
      color: var(--color-danger);
      font-size: var(--font-size-xs);
      margin-top: 0.25rem;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.25rem;
      border-top: 1px solid var(--color-border);
      padding-top: 1rem;
    }
  `]
})
export class TicketDetailComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer?: ElementRef;
  
  ticket: Ticket | null = null;
  currentUser: User | null = null;
  activeTickets$!: Observable<Ticket[]>;

  // UI state
  activeChannel: 'public' | 'internal' = 'public';
  composerText = '';
  isSubmitting = false;
  
  // Resolution modal state
  showResolveModal = false;
  resolutionSummary = '';
  
  // Timeline sorting array helper
  sortedTimeline: Array<{ type: 'message' | 'activity'; timestamp: string; data: any }> = [];
  
  // Preseeded agents list for reassignment
  availableAgents = [
    { id: 'agent_1', name: 'Charlie Davis' },
    { id: 'agent_2', name: 'Diana Evans' }
  ];

  private routeSub?: Subscription;
  private pollSub?: Subscription;
  private socketSub?: Subscription;
  private currentTicketId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private ticketService: TicketService,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router,
    private http: HttpClient,
    private socketService: SocketService
  ) {}


  ngOnInit(): void {
    this.activeTickets$ = this.ticketService.tickets$;
    this.currentUser = this.authService.currentUserValue;
    
    // Listen to ID changes in router parameter
    this.routeSub = this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.setupPoll(id);
      }
    });

    // Subscribe to real-time socket updates for tickets
    this.socketSub = this.socketService.onNewMessage$.subscribe((msg: any) => {
      if (this.currentTicketId && msg.ticketId === this.currentTicketId) {
        this.fetchDetails(this.currentTicketId);
      }
    });

    this.socketSub.add(
      this.socketService.onTicketUpdated$.subscribe((updatedTicket: any) => {
        if (this.currentTicketId && updatedTicket.id === this.currentTicketId) {
          this.ticket = updatedTicket;
          this.sortTimeline();
        }
      })
    );

    // Make sure sidebar queue is cached
    this.ticketService.fetchTickets().subscribe();
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.pollSub?.unsubscribe();
    this.socketSub?.unsubscribe();
    if (this.currentTicketId) {
      this.socketService.leaveTicket(this.currentTicketId);
    }
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  private setupPoll(ticketId: string): void {
    if (this.currentTicketId && this.currentTicketId !== ticketId) {
      this.socketService.leaveTicket(this.currentTicketId);
    }

    this.currentTicketId = ticketId;
    this.socketService.joinTicket(ticketId);

    this.pollSub?.unsubscribe();
    
    // Fetch details instantly
    this.fetchDetails(ticketId);

    // Setup periodic polling every 5 seconds fallback
    this.pollSub = interval(5000).pipe(
      switchMap(() => this.ticketService.getTicketDetails(ticketId))
    ).subscribe({
      next: (ticket) => {
        this.ticket = ticket;
        this.sortTimeline();
      }
    });
  }

  private fetchDetails(ticketId: string): void {
    this.ticketService.getTicketDetails(ticketId).subscribe({
      next: (ticket) => {
        this.ticket = ticket;
        this.sortTimeline();
      },
      error: (err: any) => {
        alert(err.error?.message || 'Failed to fetch ticket details.');
        this.router.navigate(['/dashboard']);
      }
    });
  }

  private sortTimeline(): void {
    if (!this.ticket) return;

    const timeline: Array<{ type: 'message' | 'activity'; timestamp: string; data: any }> = [];
    
    this.ticket.messages.forEach(m => {
      timeline.push({ type: 'message', timestamp: m.timestamp, data: m });
    });

    this.ticket.activityTimeline.forEach(a => {
      const rawMsg = a.message || '';
      const lower = rawMsg.toLowerCase();

      // Filter out redundant activity entries when actual message bubbles exist
      if (
        lower.includes('added a reply') ||
        lower.includes('response added') ||
        lower.includes('note added') ||
        lower.includes('message posted') ||
        lower.includes('added internal note')
      ) {
        return;
      }

      // Clean up verbose assignment & status messages
      let cleanMessage = rawMsg;
      if (rawMsg.includes('Assignment changed from')) {
        const match = rawMsg.match(/to '(.*?)'/);
        const target = match ? match[1] : '';
        if (target && target !== 'Unassigned') {
          cleanMessage = `Assigned to ${target}`;
        } else {
          cleanMessage = 'Unassigned ticket';
        }
      } else if (rawMsg.includes('Status updated from') || rawMsg.includes('Status reverted from')) {
        if (rawMsg.includes('requires_attention')) {
          cleanMessage = 'Status changed to Requires Attention';
        } else if (rawMsg.includes('under_investigation')) {
          cleanMessage = 'Status changed to Under Investigation';
        } else if (rawMsg.includes('pending_customer')) {
          cleanMessage = 'Status changed to Pending Customer';
        } else if (rawMsg.includes('resolved')) {
          cleanMessage = 'Ticket Resolved';
        }
      }

      timeline.push({
        type: 'activity',
        timestamp: a.timestamp,
        data: { ...a, message: cleanMessage }
      });
    });

    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    this.sortedTimeline = timeline;
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  onComposerKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (this.composerText.trim() && !this.isSubmitting) {
        this.sendReply();
      }
    }
  }

  sendReply(): void {
    if (!this.composerText.trim() || !this.ticket) return;
    
    const content = this.composerText.trim();
    this.isSubmitting = true;

    const req$ = this.activeChannel === 'public' 
      ? this.ticketService.claimTicket(this.ticket.id, this.currentUser?.id || '').pipe(
          switchMap(() => this.ticketService.getTicketDetails(this.ticket!.id)), // Fetch details fresh
          switchMap(() => this.httpPost(`${this.ticket!.id}/messages`, { content }))
        )
      : this.httpPost(`${this.ticket.id}/notes`, { content });

    req$.subscribe({
      next: () => {
        const isNote = this.activeChannel === 'internal';
        this.toastService.addToast(
          isNote ? 'Internal note added successfully' : 'Public message sent to customer',
          'success'
        );
        this.composerText = '';
        this.isSubmitting = false;
        // Refetch fresh detail
        this.fetchDetails(this.ticket!.id);
      },
      error: (err: any) => {
        const msg = err.error?.message || err.message || 'Failed to post message.';
        this.toastService.addToast(msg, 'danger', 'Post Error');
        this.isSubmitting = false;
      }
    });
  }

  claimTicket(): void {
    if (!this.ticket || !this.currentUser) return;
    this.isSubmitting = true;
    this.ticketService.claimTicket(this.ticket.id, this.currentUser.id).subscribe({
      next: () => {
        this.toastService.addToast('Ticket claimed successfully', 'success');
        this.isSubmitting = false;
        this.fetchDetails(this.ticket!.id);
        // Refresh sidebar queue cache
        this.ticketService.fetchTickets().subscribe();
      },
      error: (err: any) => {
        const msg = err.error?.message || err.message || 'Claim request failed.';
        this.toastService.addToast(msg, 'danger', 'Claim Error');
        this.isSubmitting = false;
      }
    });
  }

  updateStatus(status: TicketStatus): void {
    if (!this.ticket) return;
    this.isSubmitting = true;
    this.ticketService.reassignTicket(this.ticket.id, this.ticket.assignedTo).pipe(
      switchMap(() => this.patchTicketField({ status }))
    ).subscribe({
      next: () => {
        this.toastService.addToast(`Status updated to ${this.getStatusText(status)}`, 'info');
        this.isSubmitting = false;
        this.fetchDetails(this.ticket!.id);
      },
      error: (err: any) => {
        const msg = err.error?.message || err.message || 'Failed to update status.';
        this.toastService.addToast(msg, 'danger', 'Status Error');
        this.isSubmitting = false;
      }
    });
  }

  onReassign(newAgentId: string | null): void {
    if (!this.ticket) return;
    const targetId = newAgentId === 'null' ? null : newAgentId;
    
    this.isSubmitting = true;
    this.ticketService.reassignTicket(this.ticket.id, targetId).subscribe({
      next: () => {
        this.toastService.addToast('Agent reassigned successfully', 'success');
        this.isSubmitting = false;
        this.fetchDetails(this.ticket!.id);
        // Refresh sidebar queue cache
        this.ticketService.fetchTickets().subscribe();
      },
      error: (err: any) => {
        const msg = err.error?.message || err.message || 'Reassignment failed.';
        this.toastService.addToast(msg, 'danger', 'Reassign Error');
        this.isSubmitting = false;
      }
    });
  }

  // Resolution modal handlers
  openResolveModal(): void {
    this.resolutionSummary = '';
    this.showResolveModal = true;
  }

  closeResolveModal(): void {
    this.showResolveModal = false;
  }

  submitResolve(): void {
    if (!this.ticket || this.resolutionSummary.trim().length < 10) return;
    
    this.isSubmitting = true;
    this.patchTicketField({
      status: 'resolved',
      resolutionSummary: this.resolutionSummary.trim()
    }).subscribe({
      next: () => {
        this.toastService.addToast('Ticket resolved successfully', 'success');
        this.showResolveModal = false;
        this.isSubmitting = false;
        this.fetchDetails(this.ticket!.id);
        // Refresh sidebar queue cache
        this.ticketService.fetchTickets().subscribe();
      },
      error: (err: any) => {
        const msg = err.error?.message || err.message || 'Failed to resolve ticket.';
        this.toastService.addToast(msg, 'danger', 'Resolution Error');
        this.isSubmitting = false;
      }
    });
  }


  // Native HttpClient wrappers for notes/messages to keep code simple
  private httpPost(pathSuffix: string, body: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/tickets/${pathSuffix}`, body);
  }

  private patchTicketField(body: any): Observable<any> {
    return this.http.patch(`${environment.apiUrl}/tickets/${this.ticket!.id}`, body);
  }

  // CSS mappings
  getUrgencyBadgeClass(urgency: string): string {
    switch (urgency.toLowerCase()) {
      case 'high': return 'heroui-chip heroui-chip-danger';
      case 'medium': return 'heroui-chip heroui-chip-warning';
      default: return 'heroui-chip heroui-chip-info';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'requires_attention': return 'heroui-chip heroui-chip-danger';
      case 'under_investigation': return 'heroui-chip heroui-chip-info';
      case 'pending_customer': return 'heroui-chip heroui-chip-warning';
      case 'resolved': return 'heroui-chip heroui-chip-success';
      default: return 'heroui-chip heroui-chip-info';
    }
  }

  getUserInitials(name?: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getStatusText(status?: string): string {
    switch (status) {
      case 'requires_attention': return 'Requires Attention';
      case 'under_investigation': return 'Under Investigation';
      case 'pending_customer': return 'Awaiting Customer';
      case 'resolved': return 'Resolved';
      default: return status || '';
    }
  }

  formatDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + 
        ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  }

  getAttachmentDownloadUrl(attachmentId: string): string {
    const token = localStorage.getItem('support_platform_token') || '';
    return `${environment.apiUrl}/attachments/${attachmentId}?token=${token}`;
  }

  getAttachmentSizeKb(size: number): number {
    return Math.round(size / 1024);
  }

  handleFileUpload(event: Event): void {
    const element = event.target as HTMLInputElement;
    const file = element.files?.[0];
    if (!file || !this.ticket) return;

    const allowedExtensions = ['png', 'jpg', 'jpeg', 'gif', 'pdf', 'txt', 'doc', 'docx', 'csv'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !allowedExtensions.includes(ext)) {
      alert('Invalid file type. Only standard documents and images are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds the 5 MB limit.');
      return;
    }

    this.isSubmitting = true;
    const isInternal = this.activeChannel === 'internal';

    this.ticketService.uploadAttachment(this.ticket.id, file, isInternal).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.fetchDetails(this.ticket!.id);
        this.ticketService.fetchTickets().subscribe();
        element.value = '';
      },
      error: (err: any) => {
        alert(err.error?.message || err.message || 'File upload failed.');
        this.isSubmitting = false;
        element.value = '';
      }
    });
  }
}
export default TicketDetailComponent;
