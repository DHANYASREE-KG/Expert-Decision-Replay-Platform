// ====================================================================
// Expert Decision Replay Platform - Administrator Dashboard
// ====================================================================

import { api } from '../api/client.js';
import { authState } from '../auth/authState.js';
import { statCard, sectionHeader } from '../components/cards.js';
import { esc } from '../components/badges.js';
import { responsiveTable } from '../components/table.js';

export async function renderAdminDashboard(container) {
  let adminData = {
    total_users: 0,
    total_decisions: 0,
    active_users: 0,
    pending_approvals: 0,
    approval_statistics: { approved: 0, rejected: 0, pending: 0 }
  };
  let auditLogs = [];

  try {
    const [adminRes, auditRes] = await Promise.all([
      api('/dashboard/admin').catch(() => ({})),
      api('/audit-logs?page=1&page_size=6').catch(() => ({ items: [] }))
    ]);
    if (adminRes) adminData = { ...adminData, ...adminRes };
    if (auditRes?.items) auditLogs = auditRes.items;
  } catch (err) {
    console.warn('Admin dashboard fetch error:', err);
  }

  const statCardsHtml = `
    <div class="grid stats mb-4">
      ${statCard({
        title: 'Total Users',
        value: adminData.total_users ?? 0,
        subtitle: 'Registered enterprise accounts',
        icon: '👥',
        accent: '#0f766e',
        onClick: "window.navigateTo('users')"
      })}
      ${statCard({
        title: 'Total Decisions',
        value: adminData.total_decisions ?? 0,
        subtitle: 'Decisions captured across company',
        icon: '◎',
        accent: '#6366f1',
        onClick: "window.navigateTo('decisions')"
      })}
      ${statCard({
        title: 'Active Accounts',
        value: adminData.active_users ?? adminData.total_users ?? 0,
        subtitle: 'Active participants',
        icon: '⚡',
        accent: '#10b981',
        onClick: "window.navigateTo('users')"
      })}
      ${statCard({
        title: 'Pending Approvals',
        value: adminData.pending_approvals ?? 0,
        subtitle: 'Awaiting governance review',
        icon: '⏳',
        accent: '#f59e0b',
        onClick: "window.navigateTo('approvals')"
      })}
    </div>
  `;

  // Recent Audit Records
  const auditRows = auditLogs.map(a => `
    <tr>
      <td><span class="badge bg-dark">${esc(a.action)}</span></td>
      <td><b>${esc(a.entity_type || '--')}</b> #${a.entity_id || '--'}</td>
      <td><span class="font-monospace text-muted">User #${a.user_id}</span></td>
      <td class="text-truncate" style="max-width: 280px;"><small>${esc(a.description || '--')}</small></td>
      <td><small class="text-secondary">${a.created_at ? new Date(a.created_at).toLocaleString() : '--'}</small></td>
    </tr>
  `).join('');

  const auditTableHtml = responsiveTable({
    headers: [
      { label: 'Action' },
      { label: 'Target Entity' },
      { label: 'Initiator' },
      { label: 'Event Summary' },
      { label: 'Timestamp' }
    ],
    rowsHtml: auditRows,
    emptyMessage: 'No audit records on file.'
  });

  const appStats = adminData.approval_statistics || {};

  container.innerHTML = `
    ${sectionHeader({
      kicker: 'SYSTEM ADMINISTRATION',
      title: 'Platform Control Center',
      subtitle: 'Complete enterprise oversight: user governance, security logs, compliance trails, and system statistics.',
      actions: `
        <button class="button primary" onclick="window.navigateTo('users')">
          <span>👥</span> Manage Users
        </button>
        <button class="button secondary" onclick="window.navigateTo('audit')">
          <span>◌</span> View Audit Logs
        </button>
        <button class="button secondary" onclick="window.navigateTo('reports')">
          <span>▥</span> Generate Reports
        </button>
      `
    })}

    ${statCardsHtml}

    <div class="row g-4">
      <div class="col-lg-8">
        <section class="panel">
          <div class="panel-head d-flex justify-content-between align-items-center mb-3">
            <h3 class="mb-0">Recent Audit & Security Logs</h3>
            <button class="text-button text-emerald-700" onclick="window.navigateTo('audit')">Full Audit Trail &rarr;</button>
          </div>
          ${auditTableHtml}
        </section>
      </div>

      <div class="col-lg-4">
        <section class="panel">
          <div class="panel-head mb-3">
            <h3 class="mb-0">Approval Ratio Statistics</h3>
          </div>
          <div class="p-3 bg-light rounded-3 border mb-3">
            <div class="d-flex justify-content-between mb-2">
              <span class="text-success fw-bold">Approved</span>
              <span class="fw-bold">${appStats.approved ?? 0}</span>
            </div>
            <div class="d-flex justify-content-between mb-2">
              <span class="text-danger fw-bold">Rejected</span>
              <span class="fw-bold">${appStats.rejected ?? 0}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span class="text-warning fw-bold">Pending</span>
              <span class="fw-bold">${appStats.pending ?? adminData.pending_approvals ?? 0}</span>
            </div>
          </div>
          <div class="p-3 bg-light rounded-3 border">
            <h4 class="fs-6 fw-bold mb-2">Administrator Protocol</h4>
            <p class="small text-muted mb-0">
              Only Administrators have rights to manage user accounts, assign elevated roles, and view comprehensive compliance audit records.
            </p>
          </div>
        </section>
      </div>
    </div>
  `;
}
