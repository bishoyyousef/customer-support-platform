import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TicketService } from '../../core/services/ticket.service';
import { Ticket } from '../../core/models';
import { Observable, map } from 'rxjs';

interface AgentWorkload {
  id: string;
  name: string;
  activeCount: number;
  resolvedCount: number;
  workloadPercent: number;
}

@Component({
  selector: 'app-manager-summary',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="analytics-viewport">
      <div class="analytics-header">
        <div>
          <h2>Workload Analytics Dashboard</h2>
          <p class="subtitle">Monitor support agent resource allocation and unresolved queues.</p>
        </div>
      </div>

      <!-- Stats Grid Summary Widgets -->
      <div class="stats-grid">
        <div class="card stat-card">
          <span class="stat-lbl">Total Ticket Volume</span>
          <span class="stat-val">{{ totalTickets }}</span>
        </div>
        <div class="card stat-card">
          <span class="stat-lbl">Active Unresolved</span>
          <span class="stat-val" style="color: var(--color-danger);">{{ activeTickets }}</span>
        </div>
        <div class="card stat-card">
          <span class="stat-lbl">Unassigned Tickets</span>
          <span class="stat-val" [style.color]="unassignedTickets > 0 ? 'var(--color-warning)' : 'var(--color-text-main)'">
            {{ unassignedTickets }}
          </span>
        </div>
        <div class="card stat-card">
          <span class="stat-lbl">Resolved & Closed</span>
          <span class="stat-val" style="color: var(--color-success);">{{ resolvedTickets }}</span>
        </div>
      </div>

      <!-- Detail Panels -->
      <div class="analytics-layout">
        <!-- 1. Workload Bar Chart Card -->
        <div class="card chart-card">
          <h4>Agent Workload Allocation</h4>
          <div class="chart-content" *ngIf="agentWorkloads.length > 0; else noData">
            <div *ngFor="let agent of agentWorkloads" class="chart-row">
              <div class="agent-info-row">
                <strong>{{ agent.name }}</strong>
                <span class="active-count-tag">{{ agent.activeCount }} active tickets</span>
              </div>
              <div class="progress-bar-bg">
                <div 
                  class="progress-bar-fill" 
                  [style.width.%]="agent.workloadPercent"
                ></div>
              </div>
              <div class="chart-percentage">{{ agent.workloadPercent | number:'1.0-1' }}% of active pool</div>
            </div>
          </div>
          <ng-template #noData>
            <div class="empty-chart">No active tickets allocated to agents.</div>
          </ng-template>
        </div>

        <!-- 2. Detailed Performance Table Card -->
        <div class="card table-card">
          <h4>Agent Performance Matrix</h4>
          <table class="analytics-table">
            <thead>
              <tr>
                <th>Agent Name</th>
                <th style="width: 100px; text-align: center;">Active</th>
                <th style="width: 100px; text-align: center;">Resolved</th>
                <th style="width: 120px; text-align: right;">Total Work</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let agent of agentWorkloads">
                <td><strong>{{ agent.name }}</strong></td>
                <td style="text-align: center; color: var(--color-danger);">{{ agent.activeCount }}</td>
                <td style="text-align: center; color: var(--color-success);">{{ agent.resolvedCount }}</td>
                <td style="text-align: right; font-weight: 600;">{{ agent.activeCount + agent.resolvedCount }}</td>
              </tr>
              <tr *ngIf="agentWorkloads.length === 0">
                <td colspan="4" style="text-align: center; color: var(--color-text-muted);">
                  No agent performance data available.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .analytics-viewport {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .analytics-header {
      margin-bottom: 0.5rem;
    }
    .subtitle {
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
      margin-top: 0.125rem;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.25rem;
    }
    .stat-card {
      display: flex;
      flex-direction: column;
      padding: 1.25rem 1.5rem;
      gap: 0.25rem;
    }
    .stat-lbl {
      font-size: var(--font-size-xs);
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .stat-val {
      font-size: var(--font-size-xl);
      font-weight: 700;
      line-height: 1.2;
    }

    /* Layout panels */
    .analytics-layout {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
      gap: 1.5rem;
    }
    .chart-card h4, .table-card h4 {
      font-size: var(--font-size-base);
      font-weight: 600;
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 0.5rem;
      margin-bottom: 1.25rem;
    }
    .chart-content {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .chart-row {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .agent-info-row {
      display: flex;
      justify-content: space-between;
      font-size: var(--font-size-sm);
    }
    .active-count-tag {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
    }
    .progress-bar-bg {
      height: 12px;
      background-color: var(--color-bg-base);
      border-radius: 9999px;
      overflow: hidden;
      border: 1px solid var(--color-border);
    }
    .progress-bar-fill {
      height: 100%;
      background-color: var(--color-accent);
      border-radius: 9999px;
    }
    .chart-percentage {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      text-align: right;
    }
    .empty-chart {
      text-align: center;
      color: var(--color-text-muted);
      padding: 2rem 0;
      font-size: var(--font-size-sm);
    }

    /* Table */
    .analytics-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--font-size-sm);
    }
    .analytics-table th {
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid var(--color-border);
      color: var(--color-text-muted);
      font-weight: 600;
      font-size: var(--font-size-xs);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .analytics-table td {
      padding: 0.75rem 0.75rem;
      border-bottom: 1px solid var(--color-border);
    }
    .analytics-table tr:hover {
      background-color: #fafafa;
    }
  `]
})
export class ManagerSummaryComponent implements OnInit {
  totalTickets = 0;
  activeTickets = 0;
  unassignedTickets = 0;
  resolvedTickets = 0;
  agentWorkloads: AgentWorkload[] = [];

  constructor(private ticketService: TicketService) {}

  ngOnInit(): void {
    this.ticketService.fetchTickets().subscribe({
      next: (tickets) => {
        this.calculateMetrics(tickets);
      }
    });
  }

  private calculateMetrics(tickets: Ticket[]): void {
    this.totalTickets = tickets.length;
    this.activeTickets = tickets.filter(t => t.status !== 'resolved').length;
    this.resolvedTickets = tickets.filter(t => t.status === 'resolved').length;
    this.unassignedTickets = tickets.filter(t => !t.assignedTo).length;

    // Define agent list
    const agents = [
      { id: 'agent_1', name: 'Charlie Davis' },
      { id: 'agent_2', name: 'Diana Evans' }
    ];

    // Compute workload per agent
    const activeAssignedCount = tickets.filter(t => t.assignedTo && t.status !== 'resolved').length;

    this.agentWorkloads = agents.map(agent => {
      const activeCount = tickets.filter(t => t.assignedTo === agent.id && t.status !== 'resolved').length;
      const resolvedCount = tickets.filter(t => t.assignedTo === agent.id && t.status === 'resolved').length;
      const workloadPercent = activeAssignedCount > 0 ? (activeCount / activeAssignedCount) * 100 : 0;

      return {
        id: agent.id,
        name: agent.name,
        activeCount,
        resolvedCount,
        workloadPercent
      };
    });
  }
}
export default ManagerSummaryComponent;
