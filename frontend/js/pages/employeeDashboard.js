// ====================================================================
// Expert Decision Replay Platform - Employee Dashboard
// ====================================================================

import { api } from '../api/client.js';
import { authState } from '../auth/authState.js';
import { statCard, sectionHeader } from '../components/cards.js';
import { statusBadge, categoryBadge, esc } from '../components/badges.js';
import { responsiveTable } from '../components/table.js';
import { emptyState } from '../components/feedback.js';

export async function renderEmployeeDashboard(container) {
  const user = authState.getUser();
  const firstName = user?.full_name ? user.full_name.split(' ')[0] : 'Colleague';

  let stats = {
    total_decisions: 0,
    draft_decisions: 0,
    under_review: 0,
    approved_decisions: 0,
    recent_decisions: []
  };
  let activities = [];

  try {
    const [dashData, actData] = await Promise.all([
      api('/dashboard/employee'),
      api('/dashboard/employee/recent-activities').catch(() => [])
    ]);
    if (dashData) stats = { ...stats, ...dashData };
    if (!stats.recent_decisions || stats.recent_decisions.length === 0) {
      const decs = await api('/dashboard/employee/decisions').catch(() => []);
      if (Array.isArray(decs)) stats.recent_decisions = decs;
    }
    if (Array.isArray(actData)) activities = actData;
  } catch (err) {
    console.warn('Employee dashboard fetch error:', err);
  }

  const statCardsHtml = `
    <div class="grid stats mb-4">
      ${statCard({
        title: 'My Decisions',
        value: stats.total_decisions ?? 0,
        subtitle: 'All decisions created by you',
        icon: '📁',
        accent: '#0f766e',
        onClick: "window.navigateTo('decisions')"
      })}
      ${statCard({
        title: 'Draft Decisions',
        value: stats.draft_decisions ?? 0,
        subtitle: 'Work in progress',
        icon: '📝',
        accent: '#f59e0b',
        onClick: "window.navigateTo('decisions', null, { status: 'Draft' })"
      })}
      ${statCard({
        title: 'Decisions Under Review',
        value: stats.under_review ?? 0,
        subtitle: 'Awaiting governance approval',
        icon: '⏳',
        accent: '#6366f1',
        onClick: "window.navigateTo('decisions', null, { status: 'Under Review' })"
      })}
      ${statCard({
        title: 'Approved Decisions',
        value: stats.approved_decisions ?? 0,
        subtitle: 'Ratified organizational choices',
        icon: '✔',
        accent: '#10b981',
        onClick: "window.navigateTo('decisions', null, { status: 'Approved' })"
      })}
    </div>
  `;

  // Recent Decisions table rows
  const recentDecisions = stats.recent_decisions || [];
  const decisionRows = recentDecisions.slice(0, 6).map(d => `
    <tr>
      <td class="fw-bold"><span class="text-muted">#${d.id}</span></td>
      <td class="title-cell">
        <a href="javascript:void(0)" class="fw-semibold text-dark text-decoration-none" onclick="window.navigateTo('detail', ${d.id})">
          ${esc(d.title)}
        </a>
        <small class="text-muted d-block text-truncate" style="max-width: 320px;">${esc(d.problem_statement || '')}</small>
      </td>
      <td>${categoryBadge(d.category)}</td>
      <td>${statusBadge(d.status)}</td>
      <td><small class="text-muted">${d.created_at ? new Date(d.created_at).toLocaleDateString() : '--'}</small></td>
      <td class="text-end">
        <button class="button secondary btn-sm py-1 px-2" onclick="window.navigateTo('detail', ${d.id})">Open</button>
      </td>
    </tr>
  `).join('');

  const decisionsTableHtml = responsiveTable({
    headers: [
      { label: 'ID' },
      { label: 'Decision Title' },
      { label: 'Category' },
      { label: 'Status' },
      { label: 'Created' },
      { label: 'Action', className: 'text-end' }
    ],
    rowsHtml: decisionRows,
    emptyMessage: 'You have not recorded any decisions yet. Create your first decision above!'
  });

  // Recent Activities timeline
  const activitiesHtml = activities.length === 0
    ? '<p class="text-muted small p-3 mb-0">No recent activity logged for your account.</p>'
    : `
      <div class="timeline p-3">
        ${activities.slice(0, 6).map(a => `
          <div class="timeline-item">
            <b>${esc(a.action || 'Activity')}</b>
            <p class="small text-muted mb-1">${esc(a.description || '')}</p>
            <small class="text-secondary font-monospace">${a.created_at ? new Date(a.created_at).toLocaleString() : ''}</small>
          </div>
        `).join('')}
      </div>
    `;

  container.innerHTML = `
    ${sectionHeader({
      kicker: 'EMPLOYEE WORKSPACE',
      title: `Welcome, ${esc(firstName)}`,
      subtitle: 'Monitor your captured decisions, track review statuses, and review recent team actions.',
      actions: `
        <button class="button primary" onclick="window.navigateTo('create')">
          <span>＋</span> New Decision
        </button>
        <button class="button secondary" onclick="window.navigateTo('repository')">
          <span>⌕</span> Browse Repository
        </button>
      `
    })}

    ${statCardsHtml}

    <div class="grid two-col gap-4">
      <section class="panel">
        <div class="panel-head d-flex justify-content-between align-items-center mb-3">
          <h3 class="mb-0">Recently Created Decisions</h3>
          <button class="text-button text-emerald-700" onclick="window.navigateTo('decisions')">View All &rarr;</button>
        </div>
        ${decisionsTableHtml}
      </section>

      <section class="panel">
        <div class="panel-head mb-3">
          <h3 class="mb-0">Recent Activities</h3>
        </div>
        ${activitiesHtml}
      </section>
    </div>
  `;
}
