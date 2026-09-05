import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { BehaviorSubject, Observable, combineLatest, map, Subscription, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { TicketService } from '../../core/services/ticket.service';
import { AuthService } from '../../core/services/auth.service';
import { Ticket, TicketStatus } from '../../core/models';
import { HighlightPipe } from '../../shared/pipes/highlight.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HighlightPipe],
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
          <div class="search-box" style="position: relative;">
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
              (focus)="onSearchFocus()"
              (blur)="onSearchBlur()"
              (keydown)="onSearchKeyDown($event)"
            />

            <!-- Search Autocomplete & History Dropdown -->
            <div
              *ngIf="showHistoryDropdown && (isSuggestionMode || searchHistory.length > 0)"
              class="card"
              style="position: absolute; top: 42px; left: 0; right: 0; z-index: 105; padding: 0.5rem 0; box-shadow: 0 8px 20px rgba(0,0,0,0.15); border: 1px solid var(--color-border); background-color: var(--color-bg-surface, #ffffff);"
              (mousedown)="$event.preventDefault()"
            >
              <ng-container *ngIf="isSuggestionMode; else historyTpl">
                <div style="padding: 0.25rem 0.75rem 0.5rem; font-size: 0.75rem; font-weight: 600; color: var(--color-text-muted);">
                  SUGGESTIONS
                </div>
                <div
                  *ngFor="let item of suggestions; let i = index"
                  (click)="selectSuggestionItem(item)"
                  (mouseenter)="activeIndex = i"
                  [style.backgroundColor]="i === activeIndex ? 'var(--color-bg-subtle, #f3f4f6)' : 'transparent'"
                  style="padding: 0.5rem 0.75rem; display: flex; align-items: center; justify-content: space-between; cursor: pointer; font-size: 0.85rem;"
                >
                  <div style="display: flex; flex-direction: column; gap: 0.1rem;">
                    <span style="font-weight: 500; display: inline-flex; align-items: center; gap: 0.4rem;">
                      <svg *ngIf="item.type === 'category'" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                      </svg>
                      <svg *ngIf="item.type !== 'category'" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <span [innerHTML]="item.text | highlight:(searchQuery$ | async)"></span>
                    </span>
                    <span *ngIf="item.subtext" style="font-size: 0.75rem; color: var(--color-text-muted); margin-left: 1.25rem;">
                      {{ item.subtext }}
                    </span>
                  </div>
                  <span class="badge" style="font-size: 0.7rem; padding: 0.15rem 0.4rem; text-transform: capitalize;">
                    {{ item.type }}
                  </span>
                </div>
              </ng-container>
              <ng-template #historyTpl>
                <div style="padding: 0.25rem 0.75rem 0.5rem; font-size: 0.75rem; font-weight: 600; color: var(--color-text-muted); display: flex; justify-content: space-between; align-items: center;">
                  <span>RECENT SEARCHES</span>
                  <button
                    type="button"
                    (click)="clearSearchHistory($event)"
                    style="background: none; border: none; color: var(--color-primary); font-size: 0.75rem; cursor: pointer; padding: 0;"
                  >
                    Clear All
                  </button>
                </div>
                <div
                  *ngFor="let item of searchHistory; let i = index"
                  (click)="selectHistoryItem(item)"
                  (mouseenter)="activeIndex = i"
                  [style.backgroundColor]="i === activeIndex ? 'var(--color-bg-subtle, #f3f4f6)' : 'transparent'"
                  style="padding: 0.4rem 0.75rem; display: flex; align-items: center; justify-content: space-between; cursor: pointer; font-size: 0.85rem;"
                >
                  <span style="display: inline-flex; align-items: center; gap: 0.5rem;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    {{ item }}
                  </span>
                  <button
                    type="button"
                    (click)="removeFromHistory(item, $event)"
                    style="background: none; border: none; color: var(--color-text-muted); font-size: 1rem; cursor: pointer; line-height: 1;"
                  >
                    &times;
                  </button>
                </div>
              </ng-template>
            </div>
          </div>

          <!-- Single Multi-Attribute Filter Popover Button -->
          <div style="position: relative; display: inline-block;">
            <button
              type="button"
              class="btn btn-secondary"
              (click)="toggleFilterPopover()"
              style="height: 36px; display: inline-flex; align-items: center; gap: 0.5rem;"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
              Filter
              <span *ngIf="activeFilterCount > 0" class="badge" style="background-color: var(--color-primary); color: white; border-radius: 999px; padding: 0.15rem 0.45rem; font-size: 0.75rem;">
                {{ activeFilterCount }}
              </span>
            </button>

            <!-- Filter Popover Panel -->
            <div *ngIf="showFilterPopover" class="card" style="position: absolute; top: 42px; left: 0; z-index: 100; min-width: 260px; padding: 1rem; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border: 1px solid var(--color-border);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                <strong style="font-size: 0.9rem;">Filter Tickets</strong>
                <button type="button" style="background: none; border: none; font-size: 1.1rem; cursor: pointer; color: var(--color-text-muted);" (click)="toggleFilterPopover()">&times;</button>
              </div>

              <!-- Category -->
              <div class="form-group" style="margin-bottom: 0.75rem;">
                <label class="form-label" style="font-size: 0.8rem; margin-bottom: 0.25rem;">Category</label>
                <select
                  class="form-control filter-select"
                  style="width: 100%;"
                  [ngModel]="selectedCategory$ | async"
                  (ngModelChange)="onCategoryChange($event)"
                >
                  <option value="All">All Categories</option>
                  <option *ngFor="let cat of categories" [value]="cat">{{ cat }}</option>
                </select>
              </div>

              <!-- Urgency -->
              <div class="form-group" style="margin-bottom: 1rem;">
                <label class="form-label" style="font-size: 0.8rem; margin-bottom: 0.25rem;">Urgency Priority</label>
                <select
                  class="form-control filter-select"
                  style="width: 100%;"
                  [ngModel]="selectedUrgency$ | async"
                  (ngModelChange)="onUrgencyChange($event)"
                >
                  <option value="All">All Urgencies</option>
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--color-border); padding-top: 0.5rem;">
                <button type="button" class="btn btn-secondary" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;" (click)="clearAllFilters()">
                  Clear All
                </button>
                <button type="button" class="btn btn-primary" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;" (click)="toggleFilterPopover()">
                  Done
                </button>
              </div>
            </div>
          </div>
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
        <button (click)="refreshTickets()" class="btn btn-secondary" style="margin-left: auto; height: 28px; padding: 0 0.5rem;">Retry</button>
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
          <p>Try adjusting your search query or filter options.</p>
        </div>

        <table *ngIf="!(loading$ | async) && ((filteredTickets$ | async)?.length ?? 0) > 0" class="density-table">
          <thead>
            <tr>
              <th style="width: 100px;">ID</th>
              <th>Subject</th>
              <th style="width: 110px; cursor: pointer; user-select: none;" (click)="toggleSort('category')">
                Category {{ getSortIcon('category') }}
              </th>
              <th style="width: 130px; cursor: pointer; user-select: none;" (click)="toggleSort('urgency')">
                Urgency {{ getSortIcon('urgency') }}
              </th>
              <th style="width: 140px;">Status</th>
              <th style="width: 140px;">Assignee</th>
              <th style="width: 120px; cursor: pointer; user-select: none;" (click)="toggleSort('date')">
                Updated {{ getSortIcon('date') }}
              </th>
              <th style="width: 110px; text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let t of filteredTickets$ | async">
              <td class="ref-cell">
                <span class="ref-badge" [innerHTML]="t.id | highlight:(searchQuery$ | async)"></span>
              </td>
              <td>
                <a [routerLink]="['/tickets', t.id]" class="ticket-subject" [innerHTML]="t.title | highlight:(searchQuery$ | async)"></a>
                <div class="customer-subtitle">by <span [innerHTML]="t.customerName | highlight:(searchQuery$ | async)"></span></div>
              </td>
              <td>{{ t.category }}</td>
              <td>
                <span [class]="getUrgencyClass(t.urgency)">
                  <span class="heroui-chip-dot"></span>
                  {{ t.urgency }}
                </span>
              </td>
              <td>
                <span [class]="getStatusClass(t.status)">
                  <span class="heroui-chip-dot" [class.heroui-chip-dot-pulse]="t.status === 'requires_attention'"></span>
                  {{ getStatusText(t.status) }}
                </span>
              </td>
              <td class="assignee-cell">
                <ng-container *ngIf="currentUser?.role === 'manager'; else defaultAssigneeView">
                  <select
                    class="form-control select-control"
                    style="padding: 0.25rem 0.5rem; font-size: 0.85rem;"
                    [ngModel]="t.assignedTo"
                    (ngModelChange)="reassignTicket(t.id, $event)"
                  >
                    <option [value]="null">Unassigned</option>
                    <option *ngFor="let agent of availableAgents" [value]="agent.id">{{ agent.name }}</option>
                  </select>
                </ng-container>
                <ng-template #defaultAssigneeView>
                  <span *ngIf="t.assignedTo; else unassignedText" class="assignee-tag">
                    {{ t.assignedName }}
                  </span>
                  <ng-template #unassignedText>
                    <span class="unassigned-lbl">Unassigned</span>
                  </ng-template>
                </ng-template>
              </td>
              <td class="date-cell">{{ formatDate(t.updatedAt) }}</td>
              <td style="text-align: right;">
                <button
                  *ngIf="(currentUser && currentUser.role === 'manager' && t.assignedTo !== currentUser.id) || (!t.assignedTo && (!currentUser || currentUser.role !== 'manager'))"
                  (click)="claimTicket(t.id)"
                  class="btn btn-secondary claim-btn"
                >
                  Claim
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination controls -->
        <div *ngIf="(totalPages$ | async) && (totalPages$ | async)! > 1" class="pagination-controls" style="display: flex; justify-content: center; align-items: center; gap: 1.5rem; padding: 1.5rem; border-top: 1px solid var(--color-border); flex-wrap: wrap;">
          <button
            (click)="changePage(-1)"
            [disabled]="(page$ | async) === 1"
            class="btn btn-secondary"
            style="min-width: 90px;"
          >
            Previous
          </button>
          <span class="page-info" style="font-size: var(--font-size-sm); color: var(--color-text-muted);">
            Page <strong>{{ page$ | async }}</strong> of <strong>{{ totalPages$ | async }}</strong> (Total: {{ totalItems$ | async }} tickets)
          </span>
          <button
            (click)="changePage(1)"
            [disabled]="(page$ | async) === (totalPages$ | async)"
            class="btn btn-secondary"
            style="min-width: 90px;"
          >
            Next
          </button>
        </div>
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
export class DashboardComponent implements OnInit, OnDestroy {
  categories = ['Billing', 'Technical', 'Account', 'Other'];
  errorMsg: string | null = null;
  savedPresets: any[] = [];
  availableAgents = [
    { id: 'agent_1', name: 'Charlie Davis' },
    { id: 'agent_2', name: 'Diana Evans' },
    { id: 'mgr_1', name: 'Eve Foster' }
  ];

  get currentUser() {
    return this.authService.currentUserValue;
  }

  // RxJS Store Streams
  searchQuery$ = new BehaviorSubject<string>('');
  selectedCategory$ = new BehaviorSubject<string>('All');
  selectedUrgency$ = new BehaviorSubject<string>('All');
  selectedSort$ = new BehaviorSubject<string>('urgency-desc');
  activeTab$ = new BehaviorSubject<'attention' | 'mine' | 'all'>('attention');
  currentPage$ = new BehaviorSubject<number>(1);
  
  loading$!: Observable<boolean>;
  filteredTickets$!: Observable<Ticket[]>;

  // Pagination metadata streams
  page$!: Observable<number>;
  totalPages$!: Observable<number>;
  totalItems$!: Observable<number>;

  private querySubscription?: Subscription;
  private filterResetSubscription?: Subscription;

  constructor(
    private ticketService: TicketService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPresets();
    this.loadSearchHistory();
    this.loading$ = this.ticketService.loading$;

    this.page$ = this.ticketService.page$;
    this.totalPages$ = this.ticketService.totalPages$;
    this.totalItems$ = this.ticketService.totalItems$;

    // 1. Reset page to 1 on any filter changes
    this.filterResetSubscription = combineLatest([
      this.searchQuery$,
      this.selectedCategory$,
      this.selectedUrgency$,
      this.selectedSort$,
      this.activeTab$
    ]).pipe(
      debounceTime(50),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    ).subscribe(() => {
      this.currentPage$.next(1);
    });

    // 2. Fetch tickets server-side on query parameter change
    this.querySubscription = combineLatest([
      this.searchQuery$,
      this.selectedCategory$,
      this.selectedUrgency$,
      this.selectedSort$,
      this.activeTab$,
      this.currentPage$,
      this.authService.currentUser$
    ]).pipe(
      debounceTime(50),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      switchMap(([search, category, urgency, sort, tab, page, currentUser]) => {
        if (!currentUser) return [];

        const [sortField, sortOrder] = sort.split('-');

        const params: any = {
          page,
          limit: 10,
          search: search.trim() || undefined,
          category: category === 'All' ? undefined : category,
          urgency: urgency === 'All' ? undefined : urgency,
          sort: sortField,
          order: sortOrder,
          queue: tab
        };

        this.errorMsg = null;
        return this.ticketService.fetchTickets(params);
      })
    ).subscribe({
      error: (err) => {
        this.errorMsg = err.error?.message || err.message || 'Failed to load tickets.';
      }
    });

    // Bind filteredTickets$ directly to the cached tickets array
    this.filteredTickets$ = this.ticketService.tickets$;
  }

  ngOnDestroy(): void {
    if (this.querySubscription) {
      this.querySubscription.unsubscribe();
    }
    if (this.filterResetSubscription) {
      this.filterResetSubscription.unsubscribe();
    }
  }

  showFilterPopover = false;

  toggleFilterPopover(): void {
    this.showFilterPopover = !this.showFilterPopover;
  }

  get activeFilterCount(): number {
    let count = 0;
    if (this.searchQuery$.value.trim()) count++;
    if (this.selectedCategory$.value !== 'All') count++;
    if (this.selectedUrgency$.value !== 'All') count++;
    return count;
  }

  clearAllFilters(): void {
    this.searchQuery$.next('');
    this.selectedCategory$.next('All');
    this.selectedUrgency$.next('All');
  }

  toggleSort(column: 'urgency' | 'category' | 'date'): void {
    const current = this.selectedSort$.value;
    if (column === 'urgency') {
      this.selectedSort$.next(current === 'urgency-desc' ? 'urgency-asc' : 'urgency-desc');
    } else if (column === 'date') {
      this.selectedSort$.next(current === 'date-desc' ? 'date-asc' : 'date-desc');
    } else if (column === 'category') {
      this.selectedSort$.next(current === 'category-asc' ? 'category-desc' : 'category-asc');
    }
  }

  getSortIcon(column: 'urgency' | 'category' | 'date'): string {
    const current = this.selectedSort$.value;
    if (column === 'urgency') {
      if (current === 'urgency-desc') return '▼';
      if (current === 'urgency-asc') return '▲';
    } else if (column === 'date') {
      if (current === 'date-desc') return '▼';
      if (current === 'date-asc') return '▲';
    } else if (column === 'category') {
      if (current === 'category-asc') return '▲';
      if (current === 'category-desc') return '▼';
    }
    return '↕';
  }

  searchHistory: string[] = [];
  suggestions: { type: string; text: string; subtext?: string; ticketId?: string }[] = [];
  showHistoryDropdown = false;
  activeIndex = -1;

  get isSuggestionMode(): boolean {
    return this.searchQuery$.value.trim().length >= 1 && this.suggestions.length > 0;
  }

  get navItemsCount(): number {
    return this.isSuggestionMode ? this.suggestions.length : this.searchHistory.length;
  }

  loadSearchHistory(): void {
    this.ticketService.getSearchHistory().subscribe({
      next: (history) => this.searchHistory = history,
      error: () => {}
    });
  }

  saveToHistory(query: string): void {
    const trimmed = query.trim();
    if (!trimmed) return;
    this.ticketService.addSearchHistory(trimmed).subscribe({
      next: (history) => this.searchHistory = history,
      error: () => {}
    });
  }

  removeFromHistory(itemToRemove: string, event: MouseEvent): void {
    event.stopPropagation();
    this.ticketService.removeSearchHistory(itemToRemove).subscribe({
      next: (history) => this.searchHistory = history,
      error: () => {}
    });
  }

  clearSearchHistory(event: MouseEvent): void {
    event.stopPropagation();
    this.ticketService.clearSearchHistory().subscribe({
      next: (history) => this.searchHistory = history,
      error: () => {}
    });
  }

  onSearchFocus(): void {
    this.showHistoryDropdown = true;
  }

  onSearchBlur(): void {
    this.saveToHistory(this.searchQuery$.value);
    setTimeout(() => {
      this.showHistoryDropdown = false;
    }, 200);
  }

  onSearchKeyDown(event: KeyboardEvent): void {
    if (!this.showHistoryDropdown && event.key === 'ArrowDown') {
      this.showHistoryDropdown = true;
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex = this.activeIndex + 1 < this.navItemsCount ? this.activeIndex + 1 : 0;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex = this.activeIndex - 1 >= 0 ? this.activeIndex - 1 : this.navItemsCount - 1;
    } else if (event.key === 'Enter') {
      if (this.activeIndex >= 0 && this.activeIndex < this.navItemsCount) {
        event.preventDefault();
        if (this.isSuggestionMode) {
          const selected = this.suggestions[this.activeIndex];
          this.searchQuery$.next(selected.text);
          this.saveToHistory(selected.text);
        } else {
          this.searchQuery$.next(this.searchHistory[this.activeIndex]);
        }
        this.showHistoryDropdown = false;
      } else {
        this.saveToHistory(this.searchQuery$.value);
        this.showHistoryDropdown = false;
      }
    } else if (event.key === 'Escape') {
      this.showHistoryDropdown = false;
    }
  }

  selectHistoryItem(item: string): void {
    this.searchQuery$.next(item);
    this.showHistoryDropdown = false;
  }

  selectSuggestionItem(item: { type: string; text: string; subtext?: string; ticketId?: string }): void {
    this.searchQuery$.next(item.text);
    this.saveToHistory(item.text);
    this.showHistoryDropdown = false;
  }

  private suggestionTimer: any = null;

  onSearchChange(val: string): void {
    this.searchQuery$.next(val);
    if (this.suggestionTimer) clearTimeout(this.suggestionTimer);

    if (val.trim().length >= 1) {
      this.showHistoryDropdown = true;
      this.suggestionTimer = setTimeout(() => {
        this.ticketService.getSuggestions(val.trim()).subscribe({
          next: (res) => {
            this.suggestions = res;
            this.showHistoryDropdown = true;
          },
          error: () => this.suggestions = []
        });
      }, 150);
    } else {
      this.suggestions = [];
    }
    this.activeIndex = -1;
  }

  onCategoryChange(val: string): void {
    this.selectedCategory$.next(val);
  }

  onUrgencyChange(val: string): void {
    this.selectedUrgency$.next(val);
  }

  onSortChange(val: string): void {
    this.selectedSort$.next(val);
  }

  onTabChange(tab: 'attention' | 'mine' | 'all'): void {
    this.activeTab$.next(tab);
  }

  onPageChange(page: number): void {
    this.currentPage$.next(page);
  }

  changePage(delta: number): void {
    const current = this.currentPage$.value;
    const next = current + delta;
    if (next >= 1) {
      this.onPageChange(next);
    }
  }

  refreshTickets(): void {
    this.currentPage$.next(this.currentPage$.value);
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

  reassignTicket(ticketId: string, targetAgentId: any): void {
    const targetId = (!targetAgentId || targetAgentId === 'null') ? null : targetAgentId;
    this.errorMsg = null;
    this.ticketService.reassignTicket(ticketId, targetId).subscribe({
      error: (err) => {
        this.errorMsg = err.error?.message || err.message || 'Failed to reassign ticket.';
      }
    });
  }

  getUrgencyClass(urgency: 'Low' | 'Medium' | 'High' | string): string {
    switch (urgency.toLowerCase()) {
      case 'high': return 'heroui-chip heroui-chip-danger';
      case 'medium': return 'heroui-chip heroui-chip-warning';
      default: return 'heroui-chip heroui-chip-info';
    }
  }

  getStatusClass(status: TicketStatus): string {
    switch (status) {
      case 'requires_attention': return 'heroui-chip heroui-chip-danger';
      case 'under_investigation': return 'heroui-chip heroui-chip-info';
      case 'pending_customer': return 'heroui-chip heroui-chip-warning';
      case 'resolved': return 'heroui-chip heroui-chip-success';
      default: return 'heroui-chip heroui-chip-info';
    }
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
