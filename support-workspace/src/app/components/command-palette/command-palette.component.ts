import { Component, HostListener, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TicketService } from '../../core/services/ticket.service';
import { AuthService } from '../../core/services/auth.service';

interface CommandItem {
  id: string;
  group: 'Agent Actions' | 'Ticket Suggestions';
  title: string;
  subtitle?: string;
  badge?: string;
  action: () => void;
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      *ngIf="isOpen"
      class="heroui-command-backdrop"
      (click)="closeModal()"
      role="dialog"
      aria-modal="true"
    >
      <div class="heroui-command-modal" (click)="$event.stopPropagation()">
        <div class="heroui-command-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            #cmdInput
            type="text"
            class="heroui-command-input"
            placeholder="Type a command or search tickets... (Press Esc to close)"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange($event)"
            (keydown)="onInputKeyDown($event)"
          />
          <span class="heroui-kbd" style="color: var(--color-text-muted); border-color: var(--color-border); background-color: var(--color-bg-base);">ESC</span>
        </div>

        <div class="heroui-command-body">
          <!-- Quick Actions -->
          <div *ngIf="quickActions.length > 0 && !searchQuery.trim()">
            <div class="heroui-command-group-title">Agent Console Actions</div>
            <div
              *ngFor="let item of quickActions; let i = index"
              class="heroui-command-item"
              [class.active]="selectedIndex === i"
              (mousedown)="$event.preventDefault(); executeItem(item)"
              (click)="executeItem(item)"
              (mouseenter)="selectedIndex = i"
            >
              <div>
                <div style="font-weight: 600;">{{ item.title }}</div>
                <div *ngIf="item.subtitle" style="font-size: 0.75rem; color: var(--color-text-muted);">
                  {{ item.subtitle }}
                </div>
              </div>
              <span *ngIf="item.badge" class="heroui-chip heroui-chip-info">{{ item.badge }}</span>
            </div>
          </div>

          <!-- Suggestions / Results or UX Empty State -->
          <div *ngIf="searchQuery.trim() && searchResults.length === 0" style="padding: 2rem 1rem; text-align: center; color: var(--color-text-muted);">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" stroke-width="1.5" style="margin: 0 auto 0.5rem; display: block;">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
            <div style="font-weight: 600; font-size: 0.9rem; color: var(--color-text-main);">No ticket found matching "{{ searchQuery }}"</div>
            <div style="font-size: 0.75rem; margin-top: 0.25rem;">Try searching by ID (e.g. 1001), category, or customer name.</div>
          </div>

          <div *ngIf="searchQuery.trim() && searchResults.length > 0">
            <div class="heroui-command-group-title">Search Results</div>
            <div
              *ngFor="let item of searchResults; let i = index"
              class="heroui-command-item"
              [class.active]="selectedIndex === i"
              (mousedown)="$event.preventDefault(); executeItem(item)"
              (click)="executeItem(item)"
              (mouseenter)="selectedIndex = i"
            >
              <div>
                <div style="font-weight: 600;">{{ item.title }}</div>
                <div *ngIf="item.subtitle" style="font-size: 0.75rem; color: var(--color-text-muted);">
                  {{ item.subtitle }}
                </div>
              </div>
              <span *ngIf="item.badge" class="heroui-chip heroui-chip-info">{{ item.badge }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class CommandPaletteComponent implements OnInit {
  @ViewChild('cmdInput') cmdInput?: ElementRef<HTMLInputElement>;

  isOpen = false;
  searchQuery = '';
  selectedIndex = 0;
  searchResults: CommandItem[] = [];

  constructor(
    private ticketService: TicketService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {}

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.toggleModal();
    }
    if (event.key === 'Escape' && this.isOpen) {
      this.closeModal();
    }
  }

  toggleModal(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.searchQuery = '';
      this.selectedIndex = 0;
      this.searchResults = [];
      setTimeout(() => this.cmdInput?.nativeElement.focus(), 50);
    }
  }

  closeModal(): void {
    this.isOpen = false;
  }

  get currentUser() {
    return this.authService.currentUserValue;
  }

  get quickActions(): CommandItem[] {
    const actions: CommandItem[] = [
      {
        id: 'action-attention',
        group: 'Agent Actions',
        title: 'Requires Attention Queue',
        subtitle: 'Switch queue to unassigned / high priority tickets',
        badge: 'Queue',
        action: () => {
          this.router.navigate(['/dashboard'], { queryParams: { tab: 'attention' } });
          this.closeModal();
        }
      },
      {
        id: 'action-workload',
        group: 'Agent Actions',
        title: 'My Workload Queue',
        subtitle: 'Filter tickets assigned directly to your agent account',
        badge: 'Queue',
        action: () => {
          this.router.navigate(['/dashboard'], { queryParams: { tab: 'mine' } });
          this.closeModal();
        }
      },
      {
        id: 'action-all',
        group: 'Agent Actions',
        title: 'All Support Tickets',
        subtitle: 'View global platform ticket directory',
        badge: 'Queue',
        action: () => {
          this.router.navigate(['/dashboard'], { queryParams: { tab: 'all' } });
          this.closeModal();
        }
      }
    ];

    if (this.currentUser?.role === 'manager') {
      actions.push({
        id: 'action-manager',
        group: 'Agent Actions',
        title: 'Manager Analytics Summary',
        subtitle: 'View team metrics, SLA compliance, and workload distribution',
        badge: 'Manager',
        action: () => {
          this.router.navigate(['/manager']);
          this.closeModal();
        }
      });
    }

    return actions;
  }

  private debounceTimer: any = null;

  onSearchChange(val: string): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (!val.trim()) {
      this.searchResults = [];
      return;
    }

    this.debounceTimer = setTimeout(() => {
      this.ticketService.getSuggestions(val.trim()).subscribe({
        next: (res) => {
          this.searchResults = res.map((s, idx) => ({
            id: `sug-${idx}`,
            group: 'Ticket Suggestions' as const,
            title: s.text,
            subtitle: s.subtext || `Type: ${s.type}`,
            badge: s.type,
            action: () => {
              if (s.ticketId) {
                this.router.navigate(['/tickets', s.ticketId]);
              } else {
                this.router.navigate(['/dashboard']);
              }
              this.closeModal();
            }
          }));
        },
        error: () => this.searchResults = []
      });
    }, 150);
  }

  get totalItemsCount(): number {
    return this.searchQuery.trim() ? this.searchResults.length : this.quickActions.length;
  }

  onInputKeyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex = (this.selectedIndex + 1 < this.totalItemsCount) ? this.selectedIndex + 1 : 0;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex = (this.selectedIndex - 1 >= 0) ? this.selectedIndex - 1 : this.totalItemsCount - 1;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const all = this.searchQuery.trim() ? this.searchResults : this.quickActions;
      if (all[this.selectedIndex]) {
        this.executeItem(all[this.selectedIndex]);
      }
    }
  }

  executeItem(item: CommandItem): void {
    item.action();
  }
}
export default CommandPaletteComponent;
