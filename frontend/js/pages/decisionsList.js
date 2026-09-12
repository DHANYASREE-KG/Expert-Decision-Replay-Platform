// ====================================================================
// Expert Decision Replay Platform - Decision List Page
// ====================================================================

import { api } from '../api/client.js';
import { authState } from '../auth/authState.js';
import { sectionHeader } from '../components/cards.js';
import { statusBadge, categoryBadge, esc } from '../components/badges.js';
import { responsiveTable } from '../components/table.js';
import { loadingState, errorState } from '../components/feedback.js';
import { toast } from '../components/toast.js';

export async function renderDecisionsList(container, id = null, params = {}) {
  const initialStatus = params?.status || '';

  container.innerHTML = `
    ${sectionHeader({
      kicker: 'DECISION REGISTRY',
      title: 'Decisions Management',
      subtitle: 'Browse, evaluate, filter, and manage organizational architectural and strategic decisions.',
      actions: `
        <button class="button primary" onclick="window.navigateTo('create')">
          <span>＋</span> Capture Decision
        </button>
      `
    })}

    <section class="panel mb-4">
      <div class="toolbar d-flex flex-wrap gap-2 mb-3">
        <input id="dec-search" class="form-control" style="max-width: 320px;" placeholder="Search by title, rationale..." oninput="window.filterDecisions()">
        <select id="dec-status-filter" class="form-select" style="max-width: 200px;" onchange="window.filterDecisions()">
          <option value="">All Statuses</option>
          <option value="Draft" ${initialStatus === 'Draft' ? 'selected' : ''}>Draft</option>
          <option value="Under Review" ${initialStatus === 'Under Review' ? 'selected' : ''}>Under Review</option>
          <option value="Approved" ${initialStatus === 'Approved' ? 'selected' : ''}>Approved</option>
          <option value="Rejected" ${initialStatus === 'Rejected' ? 'selected' : ''}>Rejected</option>
          <option value="Archived" ${initialStatus === 'Archived' ? 'selected' : ''}>Archived</option>
        </select>
        <select id="dec-category-filter" class="form-select" style="max-width: 200px;" onchange="window.filterDecisions()">
          <option value="">All Categories</option>
          <option value="Technology">Technology</option>
          <option value="Infrastructure">Infrastructure</option>
          <option value="Security">Security</option>
          <option value="Finance">Finance</option>
          <option value="Operations">Operations</option>
        </select>
        <button class="button secondary" onclick="window.filterDecisions()">
          Refresh
        </button>
      </div>

      <div id="decisions-table-container">
        ${loadingState('Loading decisions registry...')}
      </div>
    </section>
  `;

  window.filterDecisions = () => loadDecisionsTable();
  await loadDecisionsTable();
}

let cachedDecisions = [];

async function loadDecisionsTable() {
  const container = document.getElementById('decisions-table-container');
  if (!container) return;

  const q = document.getElementById('dec-search')?.value.trim() || '';
  const status = document.getElementById('dec-status-filter')?.value || '';
  const category = document.getElementById('dec-category-filter')?.value || '';

  const params = new URLSearchParams();
  if (q) params.set('search', q);
  if (status) params.set('status', status);
  if (category) params.set('category', category);

  try {
    const list = await api(`/decisions${params.toString() ? `?${params.toString()}` : ''}`);
    cachedDecisions = Array.isArray(list) ? list : [];
    renderDecisionsTable(cachedDecisions);
  } catch (err) {
    container.innerHTML = errorState({
      title: 'Failed to load decisions',
      message: err.message,
      onRetry: 'window.filterDecisions()'
    });
  }
}

function renderDecisionsTable(decisions) {
  const container = document.getElementById('decisions-table-container');
  if (!container) return;

  const currentUser = authState.getUser();
  const isAdmin = authState.isAdmin();

  const rows = decisions.map(d => {
    const isCreator = currentUser && d.created_by === currentUser.id;
    const canEdit = isCreator || isAdmin;
    const canDelete = isAdmin || (isCreator && ['Draft', 'Rejected'].includes(d.status));
    const canSubmit = isCreator && d.status === 'Draft';

    return `
      <tr>
        <td class="fw-bold"><span class="text-muted">#${d.id}</span></td>
        <td class="title-cell">
          <a href="javascript:void(0)" class="fw-semibold text-dark text-decoration-none" onclick="window.navigateTo('detail', ${d.id})">
            ${esc(d.title)}
          </a>
          <small class="text-muted d-block text-truncate" style="max-width: 360px;">${esc(d.problem_statement || '')}</small>
        </td>
        <td>${categoryBadge(d.category)}</td>
        <td><small class="text-muted font-monospace">User #${d.created_by}</small></td>
        <td>${statusBadge(d.status)}</td>
        <td><small class="text-muted">${d.created_at ? new Date(d.created_at).toLocaleDateString() : '--'}</small></td>
        <td><small class="text-muted">${d.updated_at ? new Date(d.updated_at).toLocaleDateString() : '--'}</small></td>
        <td class="text-end">
          <div class="actions justify-content-end d-flex gap-1">
            <button class="button secondary btn-sm py-1 px-2" title="View Full Details" onclick="window.navigateTo('detail', ${d.id})">
              View
            </button>
            ${canEdit ? `
              <button class="button secondary btn-sm py-1 px-2" title="Edit Decision" onclick="window.navigateTo('edit', ${d.id})">
                Edit
              </button>
            ` : ''}
            ${canSubmit ? `
              <button class="btn btn-sm btn-outline-success py-1 px-2" title="Submit for Review" onclick="window.submitDecisionPrompt(${d.id}, '${esc(d.title)}')">
                Submit
              </button>
            ` : ''}
            ${canDelete ? `
              <button class="button danger btn-sm py-1 px-2" title="Delete Decision" onclick="window.deleteDecisionPrompt(${d.id}, '${esc(d.title)}')">
                Delete
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = responsiveTable({
    headers: [
      { label: 'ID' },
      { label: 'Decision Title' },
      { label: 'Category' },
      { label: 'Created By' },
      { label: 'Status' },
      { label: 'Created Date' },
      { label: 'Last Updated' },
      { label: 'Actions', className: 'text-end' }
    ],
    rowsHtml: rows,
    emptyMessage: 'No decisions match your search filters.'
  });
}

// Global action handlers for decisions list
window.deleteDecisionPrompt = async function(id, title) {
  if (confirm(`Are you sure you want to delete decision "${title}" (#${id})? This will delete all associated alternatives, comments, and approvals.`)) {
    try {
      await api(`/decisions/${id}`, { method: 'DELETE' });
      toast(`Decision #${id} deleted successfully.`);
      await loadDecisionsTable();
    } catch (err) {
      toast(err.message, 'error');
    }
  }
};

window.submitDecisionPrompt = async function(id, title) {
  if (confirm(`Submit "${title}" for formal peer & management review?`)) {
    try {
      await api(`/decisions/${id}/submit`, { method: 'POST' });
      toast(`Decision #${id} submitted for review!`);
      await loadDecisionsTable();
    } catch (err) {
      toast(err.message, 'error');
    }
  }
};
