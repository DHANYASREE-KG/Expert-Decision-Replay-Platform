// ====================================================================
// Expert Decision Replay Platform - Reports & PDF/Excel Export UI
// ====================================================================

import { api, triggerFileDownload } from '../api/client.js';
import { authState } from '../auth/authState.js';
import { sectionHeader } from '../components/cards.js';
import { toast } from '../components/toast.js';
import { esc } from '../components/badges.js';
import { responsiveTable } from '../components/table.js';
import { loadingState, errorState } from '../components/feedback.js';

let reportState = {
  type: 'decisions', // 'decisions', 'approvals', 'teams', 'audit'
  category: '',
  status: '',
  department: '',
  startDate: '',
  endDate: ''
};

export async function renderReportsPage(container) {
  const isManagerOrAdmin = authState.isManagerOrAbove();
  if (!isManagerOrAdmin) {
    container.innerHTML = `
      <div class="alert alert-danger p-4 m-3 rounded-3">
        <h4 class="fw-bold">⛔ Access Denied</h4>
        <p class="mb-0">Strategic analytics and reports are restricted to Managers and Administrators.</p>
      </div>
    `;
    return;
  }

  const isAdmin = authState.isAdmin();

  container.innerHTML = `
    ${sectionHeader({
      kicker: 'ANALYTICS & INTELLIGENCE',
      title: 'Organizational Reports & Document Export',
      subtitle: 'Analyze decision throughput, review metrics, team productivity, and export publication-ready PDF and Excel spreadsheets.'
    })}

    <!-- Report Type Selector Cards -->
    <div class="grid stats mb-4">
      <div class="stat-card cursor-pointer ${reportState.type === 'decisions' ? 'border border-2 border-teal-600 shadow' : ''}"
        onclick="window.selectReportType('decisions')">
        <div class="d-flex justify-content-between">
          <small class="fw-bold text-uppercase">1. Decisions Report</small>
          <span>◎</span>
        </div>
        <div class="stat-value fs-4 my-2">Decisions</div>
        <small class="text-muted d-block">Categorization, status & volume</small>
      </div>

      <div class="stat-card cursor-pointer ${reportState.type === 'approvals' ? 'border border-2 border-teal-600 shadow' : ''}"
        onclick="window.selectReportType('approvals')">
        <div class="d-flex justify-content-between">
          <small class="fw-bold text-uppercase">2. Approval Governance</small>
          <span>✓</span>
        </div>
        <div class="stat-value fs-4 my-2">Approvals</div>
        <small class="text-muted d-block">Turnaround, approvals & rejections</small>
      </div>

      <div class="stat-card cursor-pointer ${reportState.type === 'teams' ? 'border border-2 border-teal-600 shadow' : ''}"
        onclick="window.selectReportType('teams')">
        <div class="d-flex justify-content-between">
          <small class="fw-bold text-uppercase">3. Team Productivity</small>
          <span>👥</span>
        </div>
        <div class="stat-value fs-4 my-2">Teams</div>
        <small class="text-muted d-block">Departmental velocity & throughput</small>
      </div>

      ${isAdmin ? `
        <div class="stat-card cursor-pointer ${reportState.type === 'audit' ? 'border border-2 border-teal-600 shadow' : ''}"
          onclick="window.selectReportType('audit')">
          <div class="d-flex justify-content-between">
            <small class="fw-bold text-uppercase">4. Compliance Audit</small>
            <span>◌</span>
          </div>
          <div class="stat-value fs-4 my-2">Audit</div>
          <small class="text-muted d-block">Security trails & data operations</small>
        </div>
      ` : ''}
    </div>

    <!-- Active Report Filter & Export Bar -->
    <section class="panel mb-4">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3 pb-3 border-bottom">
        <div>
          <h3 id="report-view-title" class="mb-1 text-capitalize">${reportState.type} Report</h3>
          <p class="text-muted small mb-0">Apply filters below and preview dataset, or export full report.</p>
        </div>
        <div class="d-flex gap-2">
          <button class="button secondary" onclick="window.exportCurrentReport('pdf')">
            <span>📄</span> Export PDF
          </button>
          <button class="button secondary" onclick="window.exportCurrentReport('excel')">
            <span>📊</span> Export Excel (.xlsx)
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="row g-2 mb-3">
        <div class="col-md-3">
          <label class="small text-muted fw-bold">Date Range (Start)</label>
          <input type="date" id="rep-start-date" class="form-control form-control-sm" onchange="window.filterReports()">
        </div>
        <div class="col-md-3">
          <label class="small text-muted fw-bold">Date Range (End)</label>
          <input type="date" id="rep-end-date" class="form-control form-control-sm" onchange="window.filterReports()">
        </div>
        <div class="col-md-3" id="rep-extra-filter-col">
          <!-- Extra dynamic filter per report type -->
        </div>
        <div class="col-md-3 d-flex align-items-end">
          <button class="button secondary btn-sm w-100" onclick="window.filterReports()">Apply Filter</button>
        </div>
      </div>

      <div id="report-data-container">
        ${loadingState('Compiling strategic report data...')}
      </div>
    </section>
  `;

  window.selectReportType = type => {
    reportState.type = type;
    renderReportsPage(container);
  };

  window.filterReports = () => {
    reportState.startDate = document.getElementById('rep-start-date')?.value || '';
    reportState.endDate = document.getElementById('rep-end-date')?.value || '';
    const extraFilter = document.getElementById('rep-extra-filter')?.value || '';

    if (reportState.type === 'decisions') reportState.category = extraFilter;
    else if (reportState.type === 'teams') reportState.department = extraFilter;
    else if (reportState.type === 'approvals') reportState.status = extraFilter;

    loadReportPreview();
  };

  window.exportCurrentReport = async format => {
    const kind = reportState.type;
    const params = new URLSearchParams();
    if (reportState.startDate) params.set('start_date', reportState.startDate);
    if (reportState.endDate) params.set('end_date', reportState.endDate);
    if (reportState.category && kind === 'decisions') params.set('category', reportState.category);
    if (reportState.status && (kind === 'decisions' || kind === 'approvals')) params.set('status', reportState.status);
    if (reportState.department && kind === 'teams') params.set('department', reportState.department);

    try {
      toast(`Generating ${kind} report in ${format.toUpperCase()} format...`);
      const blob = await api(`/reports/${kind}/export/${format}${params.toString() ? `?${params.toString()}` : ''}`);
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      const filename = `${kind}_report_${new Date().toISOString().split('T')[0]}.${ext}`;
      triggerFileDownload(blob, filename);
      toast(`${kind} report downloaded successfully!`);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  setupDynamicFilters();
  await loadReportPreview();
}

function setupDynamicFilters() {
  const col = document.getElementById('rep-extra-filter-col');
  if (!col) return;

  if (reportState.type === 'decisions') {
    col.innerHTML = `
      <label class="small text-muted fw-bold">Category</label>
      <select id="rep-extra-filter" class="form-select form-select-sm" onchange="window.filterReports()">
        <option value="">All Categories</option>
        ${['Technology', 'Infrastructure', 'Security', 'Finance', 'Operations', 'Product'].map(c => `
          <option value="${c}">${c}</option>
        `).join('')}
      </select>
    `;
  } else if (reportState.type === 'approvals') {
    col.innerHTML = `
      <label class="small text-muted fw-bold">Approval Status</label>
      <select id="rep-extra-filter" class="form-select form-select-sm" onchange="window.filterReports()">
        <option value="">All Statuses</option>
        <option value="Approved">Approved</option>
        <option value="Under Review">Under Review</option>
        <option value="Rejected">Rejected</option>
      </select>
    `;
  } else if (reportState.type === 'teams') {
    col.innerHTML = `
      <label class="small text-muted fw-bold">Department</label>
      <input id="rep-extra-filter" class="form-control form-control-sm" placeholder="e.g. Engineering" oninput="window.filterReports()">
    `;
  } else {
    col.innerHTML = '';
  }
}

async function loadReportPreview() {
  const container = document.getElementById('report-data-container');
  if (!container) return;

  container.innerHTML = loadingState(`Compiling ${reportState.type} report preview...`);

  const params = new URLSearchParams();
  if (reportState.startDate) params.set('start_date', reportState.startDate);
  if (reportState.endDate) params.set('end_date', reportState.endDate);
  if (reportState.category && reportState.type === 'decisions') params.set('category', reportState.category);
  if (reportState.status && reportState.type === 'decisions') params.set('status', reportState.status);
  if (reportState.department && reportState.type === 'teams') params.set('department', reportState.department);
  params.set('page', '1');
  params.set('page_size', '20');

  try {
    const data = await api(`/reports/${reportState.type}?${params.toString()}`);
    const items = data?.items || [];
    const summary = data?.summary || {};

    // Render Summary Metric Strip if summary exists
    let summaryHtml = '';
    if (Object.keys(summary).length > 0) {
      summaryHtml = `
        <div class="row g-2 mb-3">
          ${Object.entries(summary).map(([k, v]) => `
            <div class="col-sm-3">
              <div class="p-2 border rounded bg-light">
                <small class="text-muted text-uppercase" style="font-size: 0.7rem;">${esc(k.replace(/_/g, ' '))}</small>
                <div class="fw-bold fs-5 text-dark">${esc(v)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    let rowsHtml = '';
    let headers = [];

    if (reportState.type === 'decisions') {
      headers = [
        { label: 'ID' },
        { label: 'Title' },
        { label: 'Category' },
        { label: 'Status' },
        { label: 'Created By' },
        { label: 'Alternatives' },
        { label: 'Date' }
      ];
      rowsHtml = items.map(d => `
        <tr>
          <td>#${d.id}</td>
          <td class="fw-medium">${esc(d.title)}</td>
          <td>${esc(d.category)}</td>
          <td><span class="status status-${(d.status || 'draft').toLowerCase().replace(/\s+/g, '-')}">${esc(d.status)}</span></td>
          <td>User #${d.created_by}</td>
          <td><span class="badge bg-light text-dark border">${d.alternatives_count ?? 0}</span></td>
          <td><small class="text-muted">${d.created_at ? new Date(d.created_at).toLocaleDateString() : '--'}</small></td>
        </tr>
      `).join('');
    } else if (reportState.type === 'approvals') {
      headers = [
        { label: 'Decision ID' },
        { label: 'Decision Title' },
        { label: 'Status' },
        { label: 'Author ID' },
        { label: 'Date' }
      ];
      rowsHtml = items.map(a => `
        <tr>
          <td>Decision #${a.decision_id}</td>
          <td class="fw-medium">${esc(a.decision_title)}</td>
          <td><span class="status status-${(a.status || 'draft').toLowerCase().replace(/\s+/g, '-')}">${esc(a.status)}</span></td>
          <td>User #${a.created_by}</td>
          <td><small class="text-muted">${a.created_at ? new Date(a.created_at).toLocaleDateString() : '--'}</small></td>
        </tr>
      `).join('');
    } else if (reportState.type === 'teams') {
      headers = [
        { label: 'Department' },
        { label: 'Members' },
        { label: 'Total' },
        { label: 'Approved' },
        { label: 'Rejected' },
        { label: 'Pending' }
      ];
      rowsHtml = items.map(t => `
        <tr>
          <td class="fw-bold">${esc(t.department || 'General')}</td>
          <td>${t.member_count ?? 0}</td>
          <td class="fw-bold">${t.total_decisions ?? 0}</td>
          <td><span class="text-success fw-bold">${t.approved_decisions ?? 0}</span></td>
          <td><span class="text-danger fw-bold">${t.rejected_decisions ?? 0}</span></td>
          <td><span class="text-warning fw-bold">${t.pending_decisions ?? 0}</span></td>
        </tr>
      `).join('');
    } else {
      headers = [
        { label: 'ID' },
        { label: 'User ID' },
        { label: 'Action' },
        { label: 'Entity Type' },
        { label: 'Details' },
        { label: 'Timestamp' }
      ];
      rowsHtml = items.map(au => `
        <tr>
          <td>#${au.id}</td>
          <td>User #${au.user_id}</td>
          <td><span class="badge bg-dark">${esc(au.action)}</span></td>
          <td>${esc(au.entity_type)}</td>
          <td><small>${esc(au.description)}</small></td>
          <td><small class="text-muted">${au.created_at ? new Date(au.created_at).toLocaleString() : '--'}</small></td>
        </tr>
      `).join('');
    }

    container.innerHTML = `
      ${summaryHtml}
      ${responsiveTable({
        headers,
        rowsHtml,
        emptyMessage: 'No records found for the selected report filters.'
      })}
    `;
  } catch (err) {
    container.innerHTML = errorState({
      title: 'Report Compilation Failed',
      message: err.message,
      onRetry: 'window.filterReports()'
    });
  }
}
