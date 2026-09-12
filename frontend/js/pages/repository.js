// ====================================================================
// Expert Decision Replay Platform - Knowledge Repository & Search UI
// ====================================================================

import { api } from '../api/client.js';
import { sectionHeader } from '../components/cards.js';
import { statusBadge, categoryBadge, esc } from '../components/badges.js';
import { responsiveTable } from '../components/table.js';
import { paginationControls } from '../components/pagination.js';
import { loadingState, errorState, emptyState } from '../components/feedback.js';

let repoState = {
  q: '',
  category: '',
  tag: '',
  status: '',
  startDate: '',
  endDate: '',
  page: 1,
  pageSize: 10,
  sort: 'created_at',
  order: 'desc'
};

export async function renderRepositoryPage(container) {
  let availableTags = [];
  try {
    const tagsRes = await api('/tags').catch(() => []);
    if (Array.isArray(tagsRes)) availableTags = tagsRes;
  } catch {}

  container.innerHTML = `
    ${sectionHeader({
      kicker: 'ORGANIZATIONAL MEMORY',
      title: 'Knowledge Repository & Search',
      subtitle: 'Search historical decisions, learn from past architectural reasoning, and avoid recurring enterprise pitfalls.'
    })}

    <section class="panel mb-4">
      <div class="row g-2 mb-3">
        <!-- Search Keyword -->
        <div class="col-md-4">
          <label class="small text-muted fw-bold">Search Keywords</label>
          <div class="input-group">
            <span class="input-group-text bg-white">⌕</span>
            <input id="repo-search-input" class="form-control" placeholder="Search by title, rationale, problem..."
              value="${esc(repoState.q)}" onkeyup="if(event.key==='Enter')window.executeRepoQuery()">
          </div>
        </div>

        <!-- Category -->
        <div class="col-md-2">
          <label class="small text-muted fw-bold">Category</label>
          <select id="repo-category-select" class="form-select" onchange="window.executeRepoQuery()">
            <option value="">All Categories</option>
            ${['Technology', 'Infrastructure', 'Security', 'Finance', 'Operations', 'Product'].map(c => `
              <option value="${c}" ${repoState.category === c ? 'selected' : ''}>${c}</option>
            `).join('')}
          </select>
        </div>

        <!-- Status -->
        <div class="col-md-2">
          <label class="small text-muted fw-bold">Status</label>
          <select id="repo-status-select" class="form-select" onchange="window.executeRepoQuery()">
            <option value="">All Statuses</option>
            <option value="Approved" ${repoState.status === 'Approved' ? 'selected' : ''}>Approved</option>
            <option value="Under Review" ${repoState.status === 'Under Review' ? 'selected' : ''}>Under Review</option>
            <option value="Draft" ${repoState.status === 'Draft' ? 'selected' : ''}>Draft</option>
            <option value="Rejected" ${repoState.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
          </select>
        </div>

        <!-- Tag Filter -->
        <div class="col-md-2">
          <label class="small text-muted fw-bold">Tag</label>
          <select id="repo-tag-select" class="form-select" onchange="window.executeRepoQuery()">
            <option value="">All Tags</option>
            ${availableTags.map(t => `
              <option value="${esc(t.name)}" ${repoState.tag === t.name ? 'selected' : ''}>${esc(t.name)}</option>
            `).join('')}
          </select>
        </div>

        <!-- Search Action Button -->
        <div class="col-md-2 d-flex align-items-end">
          <button class="button primary w-100" onclick="window.executeRepoQuery()">
            Apply Search
          </button>
        </div>

        <!-- Date Range Filter Row -->
        <div class="col-md-4 mt-2">
          <label class="small text-muted fw-bold">Created On or After</label>
          <input type="date" id="repo-start-date" class="form-control form-control-sm"
            value="${repoState.startDate}" onchange="window.executeRepoQuery()">
        </div>
        <div class="col-md-4 mt-2">
          <label class="small text-muted fw-bold">Created On or Before</label>
          <input type="date" id="repo-end-date" class="form-control form-control-sm"
            value="${repoState.endDate}" onchange="window.executeRepoQuery()">
        </div>
        <div class="col-md-4 mt-2 d-flex align-items-end">
          <button class="button secondary btn-sm w-100" onclick="window.clearRepoFilters()">
            Clear Filters
          </button>
        </div>
      </div>

      <div id="repo-results-container">
        ${loadingState('Querying knowledge base...')}
      </div>
    </section>
  `;

  window.executeRepoQuery = (page = 1) => {
    repoState.q = document.getElementById('repo-search-input')?.value.trim() || '';
    repoState.category = document.getElementById('repo-category-select')?.value || '';
    repoState.status = document.getElementById('repo-status-select')?.value || '';
    repoState.tag = document.getElementById('repo-tag-select')?.value || '';
    repoState.startDate = document.getElementById('repo-start-date')?.value || '';
    repoState.endDate = document.getElementById('repo-end-date')?.value || '';
    repoState.page = page;
    loadRepoResults();
  };

  window.clearRepoFilters = () => {
    repoState.q = '';
    repoState.category = '';
    repoState.status = '';
    repoState.tag = '';
    repoState.startDate = '';
    repoState.endDate = '';
    repoState.page = 1;
    renderRepositoryPage(container);
  };

  window.changeRepoPage = page => {
    window.executeRepoQuery(page);
  };

  await loadRepoResults();
}

async function loadRepoResults() {
  const container = document.getElementById('repo-results-container');
  if (!container) return;

  container.innerHTML = loadingState('Querying repository...');

  const params = new URLSearchParams();
  if (repoState.q) params.set('q', repoState.q);
  if (repoState.category) params.set('category', repoState.category);
  if (repoState.status) params.set('status', repoState.status);
  if (repoState.tag) params.set('tag', repoState.tag);
  if (repoState.startDate) params.set('start_date', repoState.startDate);
  if (repoState.endDate) params.set('end_date', repoState.endDate);
  params.set('page', repoState.page);
  params.set('page_size', repoState.pageSize);
  params.set('sort', repoState.sort);
  params.set('order', repoState.order);

  try {
    const res = await api(`/decisions/search?${params.toString()}`);
    const items = res?.items || [];
    const total = res?.total || 0;

    if (items.length === 0) {
      container.innerHTML = emptyState({
        title: 'No decisions found',
        message: 'Try adjusting your search terms, changing the category/tag, or clearing the date/status filter.',
        icon: '🔍'
      });
      return;
    }

    const rows = items.map(d => `
      <tr>
        <td class="fw-bold"><span class="text-muted">#${d.id}</span></td>
        <td class="title-cell">
          <a href="javascript:void(0)" class="fw-semibold text-dark text-decoration-none" onclick="window.navigateTo('detail', ${d.id})">
            ${esc(d.title)}
          </a>
        </td>
        <td>${categoryBadge(d.category)}</td>
        <td>${statusBadge(d.status)}</td>
        <td><small class="text-muted">${d.created_at ? new Date(d.created_at).toLocaleDateString() : '--'}</small></td>
        <td class="text-end">
          <button class="button secondary btn-sm py-1 px-3" onclick="window.navigateTo('detail', ${d.id})">
            Inspect Decision &rarr;
          </button>
        </td>
      </tr>
    `).join('');

    const tableHtml = responsiveTable({
      headers: [
        { label: 'ID' },
        { label: 'Decision Title' },
        { label: 'Category' },
        { label: 'Status' },
        { label: 'Date Decided' },
        { label: 'Replay Action', className: 'text-end' }
      ],
      rowsHtml: rows
    });

    const paginationHtml = paginationControls({
      page: repoState.page,
      pageSize: repoState.pageSize,
      total,
      onPageChangeFn: 'window.changeRepoPage'
    });

    container.innerHTML = `
      ${tableHtml}
      ${paginationHtml}
    `;
  } catch (err) {
    container.innerHTML = errorState({
      title: 'Search Error',
      message: err.message,
      onRetry: 'window.executeRepoQuery()'
    });
  }
}
