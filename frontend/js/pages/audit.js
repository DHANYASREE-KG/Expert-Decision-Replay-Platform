// ====================================================================
// Expert Decision Replay Platform - Audit & Security Logs UI
// ====================================================================

import { api } from '../api/client.js';
import { authState } from '../auth/authState.js';
import { sectionHeader } from '../components/cards.js';
import { esc } from '../components/badges.js';
import { responsiveTable } from '../components/table.js';
import { paginationControls } from '../components/pagination.js';
import { loadingState, errorState, emptyState } from '../components/feedback.js';

let auditFilter = {
  tab: 'audit', // 'audit', 'security', 'access'
  action: '',
  entity_type: '',
  user_id: '',
  startDate: '',
  endDate: '',
  page: 1,
  pageSize: 15
};

export async function renderAuditPage(container) {
  if (!authState.isAdmin()) {
    container.innerHTML = `
      <div class="alert alert-danger p-4 m-3 rounded-3">
        <h4 class="fw-bold">⛔ Access Denied</h4>
        <p class="mb-0">System Audit & Compliance records are strictly restricted to System Administrators.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    ${sectionHeader({
      kicker: 'SECURITY & COMPLIANCE',
      title: 'Audit Trail & Access Activity',
      subtitle: 'Immutable, chronological record of organizational events, authorization decisions, and access logs.'
    })}

    <section class="panel mb-4">
      <!-- Tabs for Audit, Security, Access -->
      <ul class="nav nav-tabs mb-3" id="audit-tabs">
        <li class="nav-item">
          <button class="nav-link active fw-bold" onclick="window.switchAuditTab('audit')">General Audit Logs</button>
        </li>
        <li class="nav-item">
          <button class="nav-link fw-bold" onclick="window.switchAuditTab('security')">Security & Auth Events</button>
        </li>
        <li class="nav-item">
          <button class="nav-link fw-bold" onclick="window.switchAuditTab('access')">Resource Access Logs</button>
        </li>
      </ul>

      <!-- Toolbar Filter -->
      <div class="toolbar d-flex flex-wrap gap-2 mb-3">
        <select id="audit-action-filter" class="form-select" style="max-width: 170px;" onchange="window.filterAuditLogs()">
          <option value="">All Actions</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="APPROVE">APPROVE</option>
          <option value="REJECT">REJECT</option>
          <option value="SUBMIT">SUBMIT</option>
          <option value="LOGIN">LOGIN</option>
          <option value="LOGOUT">LOGOUT</option>
        </select>
        <select id="audit-entity-filter" class="form-select" style="max-width: 170px;" onchange="window.filterAuditLogs()">
          <option value="">All Entity Types</option>
          <option value="Decision">Decision</option>
          <option value="Alternative">Alternative</option>
          <option value="Approval">Approval</option>
          <option value="Comment">Comment</option>
          <option value="DiscussionThread">DiscussionThread</option>
          <option value="User">User</option>
        </select>
        <input id="audit-user-filter" type="number" min="1" class="form-control" style="max-width: 130px;" placeholder="User ID" oninput="window.filterAuditLogs()">
        <input id="audit-start-date" type="date" class="form-control form-control-sm" style="max-width: 150px;" title="Start Date" onchange="window.filterAuditLogs()">
        <input id="audit-end-date" type="date" class="form-control form-control-sm" style="max-width: 150px;" title="End Date" onchange="window.filterAuditLogs()">
        <button class="button secondary" onclick="window.filterAuditLogs()">Refresh Logs</button>
      </div>

      <div id="audit-results-container">
        ${loadingState('Loading compliance audit trail...')}
      </div>
    </section>
  `;

  window.switchAuditTab = tab => {
    auditFilter.tab = tab;
    auditFilter.page = 1;
    document.querySelectorAll('#audit-tabs .nav-link').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    loadAuditData();
  };

  window.filterAuditLogs = () => {
    auditFilter.action = document.getElementById('audit-action-filter')?.value || '';
    auditFilter.entity_type = document.getElementById('audit-entity-filter')?.value || '';
    auditFilter.user_id = document.getElementById('audit-user-filter')?.value.trim() || '';
    auditFilter.startDate = document.getElementById('audit-start-date')?.value || '';
    auditFilter.endDate = document.getElementById('audit-end-date')?.value || '';
    auditFilter.page = 1;
    loadAuditData();
  };

  window.changeAuditPage = page => {
    auditFilter.page = page;
    loadAuditData();
  };

  await loadAuditData();
}

async function loadAuditData() {
  const container = document.getElementById('audit-results-container');
  if (!container) return;

  container.innerHTML = loadingState('Fetching audit records...');

  const params = new URLSearchParams();
  if (auditFilter.action) params.set('action', auditFilter.action);
  if (auditFilter.entity_type) params.set('entity_type', auditFilter.entity_type);
  if (auditFilter.user_id) params.set('user_id', auditFilter.user_id);
  if (auditFilter.startDate) params.set('start_date', auditFilter.startDate);
  if (auditFilter.endDate) params.set('end_date', auditFilter.endDate);
  params.set('page', auditFilter.page);
  params.set('page_size', auditFilter.pageSize);

  let endpoint = '/audit-logs';
  if (auditFilter.tab === 'security') endpoint = '/audit-logs/security';
  else if (auditFilter.tab === 'access') endpoint = '/audit-logs/access';

  try {
    const res = await api(`${endpoint}?${params.toString()}`);
    const items = res?.items || [];
    const total = res?.total || 0;

    if (items.length === 0) {
      container.innerHTML = emptyState({
        title: 'No audit records match filters',
        message: 'There are no logged compliance events matching this query.',
        icon: '📄'
      });
      return;
    }

    let tableHtml = '';

    if (auditFilter.tab === 'audit') {
      const rows = items.map(a => `
        <tr>
          <td><span class="badge bg-dark">${esc(a.action)}</span></td>
          <td><b>${esc(a.entity_type)}</b> #${a.entity_id || '--'}</td>
          <td><span class="font-monospace text-muted">User #${a.user_id}</span></td>
          <td><small>${esc(a.description || '--')}</small></td>
          <td><small class="text-secondary font-monospace">${a.created_at ? new Date(a.created_at).toLocaleString() : '--'}</small></td>
        </tr>
      `).join('');

      tableHtml = responsiveTable({
        headers: [
          { label: 'Action' },
          { label: 'Entity' },
          { label: 'User' },
          { label: 'Description' },
          { label: 'Timestamp' }
        ],
        rowsHtml: rows
      });
    } else if (auditFilter.tab === 'security') {
      const rows = items.map(s => `
        <tr>
          <td><span class="badge ${s.event_type?.includes('FAIL') ? 'bg-danger' : 'bg-success'}">${esc(s.event_type)}</span></td>
          <td>${esc(s.email || '--')}</td>
          <td><span class="font-monospace text-muted">User #${s.user_id || '--'}</span></td>
          <td><small>${esc(s.description || '--')}</small></td>
          <td><small class="text-secondary font-monospace">${s.created_at ? new Date(s.created_at).toLocaleString() : '--'}</small></td>
        </tr>
      `).join('');

      tableHtml = responsiveTable({
        headers: [
          { label: 'Security Event' },
          { label: 'Identifier / Email' },
          { label: 'User ID' },
          { label: 'Event Summary' },
          { label: 'Timestamp' }
        ],
        rowsHtml: rows
      });
    } else {
      const rows = items.map(acc => `
        <tr>
          <td><span class="badge bg-secondary">${esc(acc.action || 'ACCESS')}</span></td>
          <td><b>${esc(acc.resource_type)}</b> #${acc.resource_id || '--'}</td>
          <td><span class="font-monospace text-muted">User #${acc.user_id}</span></td>
          <td><small class="text-secondary font-monospace">${acc.created_at ? new Date(acc.created_at).toLocaleString() : '--'}</small></td>
        </tr>
      `).join('');

      tableHtml = responsiveTable({
        headers: [
          { label: 'Action' },
          { label: 'Resource' },
          { label: 'User ID' },
          { label: 'Timestamp' }
        ],
        rowsHtml: rows
      });
    }

    const paginationHtml = paginationControls({
      page: auditFilter.page,
      pageSize: auditFilter.pageSize,
      total,
      onPageChangeFn: 'window.changeAuditPage'
    });

    container.innerHTML = `
      ${tableHtml}
      ${paginationHtml}
    `;
  } catch (err) {
    container.innerHTML = errorState({
      title: 'Audit Log Error',
      message: err.message,
      onRetry: 'window.filterAuditLogs()'
    });
  }
}
