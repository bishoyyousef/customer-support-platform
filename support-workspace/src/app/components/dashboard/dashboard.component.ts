import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';
import { TicketService } from '../../core/services/ticket.service';
import { AuthService } from '../../core/services/auth.service';
import { Ticket, TicketStatus } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="dashboard-viewport">
      <!-- Summary Bar -->
      <div class="dashboard-header">
        <div>
          <h2>Agent Ticket Console</h2>
          <p class="subtitle">Respond to customer issues and monitor assignment queues.</p>
        </div>
      </div>

      <!-- Filters & Toolbar -->
      <div class="toolbar card" style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;">
        <div class="toolbar-left" style="flex: 1;">
          <!-- Search Box -->
          <div class="search-box">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              class="form-control search-input"
              placeholder="Search by ID, title, or customer name..."
              [ngModel]="searchQuery$ | async"
              (ngModelChange)="onSearchChange($event)"
            />
          </div>

          <!-- Category Selector -->
          <select
            class="form-control filter-select"
            [ngModel]="selectedCategory$ | async"
            (ngModelChange)="onCategoryChange($event)"
          >
            <option value="All">All Categories</option>
            <option *ngFor="let cat of categories" [value]="cat">{{ cat }}</option>
          </select>

          <!-- Sorting Selector -->
          <select
            class="form-control filter-select"
            [ngModel]="selectedSort$ | async"
            (ngModelChange)="onSortChange($event)"
          >
            <option value="urgency-desc">Urgency: High to Low</option>
            <option value="urgency-asc">Urgency: Low to High</option>
            <option value="date-desc">Updated: Newest First</option>
            <option value="date-asc">Updated: Oldest First</option>
          </select>
        </div>

        <div class="toolbar-right">
          <button (click)="saveCurrentPreset()" class="btn btn-secondary" style="height: 36px; display: inline-flex; align-items: center; gap: 0.375rem;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            Save View
          </button>
        </div>
      </div>

      <!-- Saved Presets Bar -->
      <div class="presets-bar" *ngIf="savedPresets.length > 0">
        <span class="presets-lbl">Saved Views:</span>
        <span 
          *ngFor="let p of savedPresets" 
          class="preset-tag"
          (click)="applyPreset(p)"
        >
          {{ p.name }}
          <button class="clear-preset-btn" (click)="deletePreset(p.name, $event)">&times;</button>
        </span>
      </div>

      <!-- Queue Tabs -->
      <div class="tabs-container">
        <button
          class="tab-btn"
          [class.active]="(activeTab$ | async) === 'attention'"
          (click)="onTabChange('attention')"
        >
          Requires Attention
        </button>
        <button
          class="tab-btn"
          [class.active]="(activeTab$ | async) === 'mine'"
          (click)="onTabChange('mine')"
        >
          My Workload
        </button>
        <button
          class="tab-btn"
          [class.active]="(activeTab$ | async) === 'all'"
          (click)="onTabChange('all')"
        >
          All Tickets
        </button>
      </div>

      <!-- Error Alerts -->
      <div *ngIf="errorMsg" class="alert alert-danger" role="alert">
        <span>{{ errorMsg }}</span>
        <button (click)="loadTickets()" class="btn btn-secondary" style="margin-left: auto; height: 28px; padding: 0 0.5rem;">Retry</button>
      </div>

      <!-- Tickets Grid Table -->
      <div class="table-container card">
        <div *ngIf="loading$ | async" class="loading-state">
          <div class="skeleton-row" *ngFor="let item of [1,2,3,4]">
            <div class="skeleton" style="height: 18px; width: 80px;"></div>
            <div class="skeleton" style="height: 18px; width: 240px;"></div>
            <div class="skeleton" style="height: 18px; width: 80px;"></div>
            <div class="skeleton" style="height: 18px; width: 100px;"></div>
          </div>
        </div>

        <div *ngIf="!(loading$ | async) && (filteredTickets$ | async)?.length === 0" class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" stroke-width="1.5">
            <rect x="2" y="2" width="20" height="20" rx="2" ry="2"/>
            <path d="M12 18V12m0-4h.01"/>
          </svg>
          <h3>No tickets found in this queue</h3>
          <p>Try adjusting your search query or sorting options.</p>
        </div>

        <table *ngIf="!(loading$ | async) && ((filteredTickets$ | async)?.length ?? 0) > 0" class="density-table">
          <thead>
            <tr>
              <th style="width: 100px;">ID</th>
              <th>Subject</th>
              <th style="width: 110px;">Category</th>
              <th style="width: 120px;">Urgency</th>
              <th style="width: 150px;">Status</th>
              <th style="width: 150px;">Assignee</th>
              <th style="width: 110px;">Updated</th>
              <th style="width: 110px; text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let t of filteredTickets$ | async">
              <td class="ref-cell">
                <span class="ref-badge">{{ t.id }}</span>
              </td>
              <td>
                <a [routerLink]="['/tickets', t.id]" class="ticket-subject">{{ t.title }}</a>
                <div class="customer-subtitle">by {{ t.customerName }}</div>
              </td>
              <td>{{ t.category }}</td>
              <td>
                <span [class]="getUrgencyClass(t.urgency)">{{ t.urgency }}</span>
              </td>
              <td>
                <span [class]="getStatusClass(t.status)">{{ getStatusText(t.status) }}</span>
              </td>
              <td class="assignee-cell">
                <span *ngIf="t.assignedTo; else unassignedText" class="assignee-tag">
                  {{ t.assignedName }}
                </span>
                <ng-template #unassignedText>
                  <span class="unassigned-lbl">Unassigned</span>
                </ng-template>
              </td>
              <td class="date-cell">{{ formatDate(t.updatedAt) }}</td>
              <td style="text-align: right;">
                <button
                  *ngIf="!t.assignedTo"
                  (click)="claimTicket(t.id)"
                  class="btn btn-secondary claim-btn"
                >
                  Claim
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-viewport {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .toolbar-right {
      display: flex;
      align-items: center;
    }
    .presets-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: -0.25rem;
      margin-bottom: 0.25rem;
    }
    .presets-lbl {
      font-size: var(--font-size-xs);
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .preset-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      background-color: var(--color-bg-surface);
      border: 1px solid var(--color-border);
      font-size: var(--font-size-xs);
      font-weight: 500;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      cursor: pointer;
      color: var(--color-text-main);
      transition: all var(--transition-fast);
    }
    .preset-tag:hover {
      border-color: var(--color-accent);
      color: var(--color-accent);
    }
    .clear-preset-btn {
      background: none;
      border: none;
      color: var(--color-text-muted);
      font-size: 14px;
      line-height: 1;
      padding: 0;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .clear-preset-btn:hover {
      color: var(--color-danger);
    }
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .subtitle {
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
      margin-top: 0.125rem;
    }
    .toolbar {
      padding: 0.75rem 1rem;
    }
    .toolbar-left {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      align-items: center;
      width: 100%;
    }
    .search-box {
      position: relative;
      flex: 1;
      min-width: 280px;
    }
    .search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
    }
    .search-input {
      padding-left: 2.25rem;
      height: 36px;
    }
    .filter-select {
      width: 180px;
      height: 36px;
      cursor: pointer;
    }
    .tabs-container {
      display: flex;
      border-bottom: 1px solid var(--color-border);
      gap: 1rem;
    }
    .tab-btn {
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      padding: 0.625rem 0.5rem;
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--color-text-muted);
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    .tab-btn:hover, .tab-btn.active {
      color: var(--color-accent);
      border-bottom-color: var(--color-accent);
    }
    .table-container {
      padding: 0;
      overflow-x: auto;
    }
    .density-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: var(--font-size-sm);
    }
    .density-table th {
      background-color: #fcfcfd;
      border-bottom: 1px solid var(--color-border);
      padding: 0.75rem 1rem;
      font-weight: 600;
      color: var(--color-text-muted);
      font-size: var(--font-size-xs);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .density-table td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--color-border);
      vertical-align: middle;
    }
    .density-table tr:hover {
      background-color: #fafafa;
    }
    .ref-badge {
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: var(--color-text-muted);
      background-color: var(--color-bg-base);
      padding: 0.125rem 0.375rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
    }
    .ticket-subject {
      font-weight: 600;
      color: var(--color-text-main);
      text-decoration: none;
    }
    .ticket-subject:hover {
      color: var(--color-accent);
      text-decoration: underline;
    }
    .customer-subtitle {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      margin-top: 0.125rem;
    }
    .assignee-tag {
      font-size: var(--font-size-xs);
      font-weight: 500;
      background-color: #f1f5f9;
      color: #334155;
      padding: 0.125rem 0.5rem;
      border-radius: var(--radius-sm);
    }
    .unassigned-lbl {
      color: var(--color-text-muted);
      font-style: italic;
      font-size: var(--font-size-xs);
    }
    .date-cell {
      color: var(--color-text-muted);
      font-size: var(--font-size-xs);
    }
    .claim-btn {
      padding: 0 0.75rem;
      height: 28px;
      font-size: var(--font-size-xs);
    }
    .loading-state {
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .skeleton-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }
    .empty-state {
      padding: 3rem 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 0.5rem;
    }
    .empty-state h3 {
      font-size: var(--font-size-base);
      font-weight: 600;
      color: var(--color-text-main);
    }
    .empty-state p {
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }
  `]
})
export class DashboardComponent implements OnInit {
  categories = ['Billing', 'Technical', 'Account', 'Other'];
  errorMsg: string | null = null;
  savedPresets: any[] = [];

  // RxJS Store Streams
  searchQuery$ = new BehaviorSubject<string>('');
  selectedCategory$ = new BehaviorSubject<string>('All');
  selectedSort$ = new BehaviorSubject<string>('urgency-desc');
  activeTab$ = new BehaviorSubject<'attention' | 'mine' | 'all'>('attention');
  
  loading$!: Observable<boolean>;
  filteredTickets$!: Observable<Ticket[]>;

  constructor(
    private ticketService: TicketService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPresets();
    this.loading$ = this.ticketService.loading$;
    this.loadTickets();

    // Map filters and lists reactively
    this.filteredTickets$ = combineLatest([
      this.ticketService.tickets$,
      this.searchQuery$,
      this.selectedCategory$,
      this.selectedSort$,
      this.activeTab$,
      this.authService.currentUser$
    ]).pipe(
      map(([tickets, search, category, sort, tab, currentUser]) => {
        if (!currentUser) return [];

        let result = [...tickets];

        // 1. Tab Queues
        if (tab === 'attention') {
          // Requires Attention: unassigned tickets OR marked requires_attention
          result = result.filter(t => !t.assignedTo || t.status === 'requires_attention');
        } else if (tab === 'mine') {
          // My Workload: assigned to logged in user
          result = result.filter(t => t.assignedTo === currentUser.id);
        }

        // 2. Category filtering
        if (category !== 'All') {
          result = result.filter(t => t.category === category);
        }

        // 3. Search text matching (ID, title, customer name)
        if (search.trim()) {
          const q = search.toLowerCase().trim();
          result = result.filter(t => 
            t.id.toLowerCase().includes(q) || 
            t.title.toLowerCase().includes(q) || 
            t.customerName.toLowerCase().includes(q)
          );
        }

        // 4. Queue sorting
        result.sort((a, b) => {
          if (sort.startsWith('urgency')) {
            const urgencyWeight = { 'High': 3, 'Medium': 2, 'Low': 1 };
            const weightA = urgencyWeight[a.urgency] || 0;
            const weightB = urgencyWeight[b.urgency] || 0;
            return sort === 'urgency-desc' ? weightB - weightA : weightA - weightB;
          } else {
            const dateA = new Date(a.updatedAt).getTime();
            const dateB = new Date(b.updatedAt).getTime();
            return sort === 'date-desc' ? dateB - dateA : dateA - dateB;
          }
        });

        return result;
      })
    );
  }

  loadTickets(): void {
    this.errorMsg = null;
    this.ticketService.fetchTickets().subscribe({
      error: (err) => {
        this.errorMsg = err.error?.message || err.message || 'Failed to load tickets.';
      }
    });
  }

  onSearchChange(val: string): void {
    this.searchQuery$.next(val);
  }

  onCategoryChange(val: string): void {
    this.selectedCategory$.next(val);
  }

  onSortChange(val: string): void {
    this.selectedSort$.next(val);
  }

  onTabChange(tab: 'attention' | 'mine' | 'all'): void {
    this.activeTab$.next(tab);
  }

  claimTicket(ticketId: string): void {
    const user = this.authService.currentUserValue;
    if (!user) return;
    
    this.errorMsg = null;
    this.ticketService.claimTicket(ticketId, user.id).subscribe({
      error: (err) => {
        this.errorMsg = err.error?.message || err.message || 'Failed to claim ticket.';
      }
    });
  }

  getUrgencyClass(urgency: 'Low' | 'Medium' | 'High'): string {
    return `badge badge-${urgency.toLowerCase()}`;
  }

  getStatusClass(status: TicketStatus): string {
    return `badge badge-${status}`;
  }

  getStatusText(status: TicketStatus): string {
    switch (status) {
      case 'requires_attention': return 'Requires Attention';
      case 'under_investigation': return 'Under Investigation';
      case 'pending_customer': return 'Awaiting Customer';
      case 'resolved': return 'Resolved';
      default: return status;
    }
  }

  formatDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  loadPresets(): void {
    const raw = localStorage.getItem('support_saved_presets');
    if (raw) {
      try {
        this.savedPresets = JSON.parse(raw);
      } catch {
        this.savedPresets = [];
      }
    }
  }

  saveCurrentPreset(): void {
    const name = prompt('Enter a name for this custom view:');
    if (!name || !name.trim()) return;

    const preset = {
      name: name.trim(),
      category: this.selectedCategory$.value,
      search: this.searchQuery$.value,
      sort: this.selectedSort$.value,
      tab: this.activeTab$.value
    };

    // Filter duplicates
    this.savedPresets = this.savedPresets.filter(p => p.name.toLowerCase() !== preset.name.toLowerCase());
    this.savedPresets.push(preset);

    localStorage.setItem('support_saved_presets', JSON.stringify(this.savedPresets));
  }

  applyPreset(p: any): void {
    this.selectedCategory$.next(p.category);
    this.searchQuery$.next(p.search);
    this.selectedSort$.next(p.sort);
    this.activeTab$.next(p.tab);
  }

  deletePreset(name: string, event: Event): void {
    event.stopPropagation();
    this.savedPresets = this.savedPresets.filter(p => p.name !== name);
    localStorage.setItem('support_saved_presets', JSON.stringify(this.savedPresets));
  }
}
