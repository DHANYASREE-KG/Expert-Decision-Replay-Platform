// ====================================================================
// Expert Decision Replay Platform - Manager Dashboard
// ====================================================================

import { api } from '../api/client.js';
import { authState } from '../auth/authState.js';
import { statCard, sectionHeader } from '../components/cards.js';
import { statusBadge, categoryBadge, esc } from '../components/badges.js';
import { responsiveTable } from '../components/table.js';

export async function renderManagerDashboard(container) {
  const user = authState.getUser();
  const firstName = user?.full_name ? user.full_name.split(' ')[0] : 'Manager';

  let dashData = {
    team_decisions: 0,
    pending_approvals: 0,
    approved_decisions: 0,
    rejected_decisions: 0
  };
  let teamDecisions = [];
  let stats = {};

  try {
    const [managerRes, teamDecRes, statsRes] = await Promise.all([
      api('/dashboard/manager').catch(() => ({})),
      api('/dashboard/manager/team-decisions').catch(() => []),
      api('/dashboard/manager/statistics').catch(() => ({}))
    ]);
    if (managerRes) dashData = { ...dashData, ...managerRes };
    if (Array.isArray(teamDecRes)) teamDecisions = teamDecRes;
    if (statsRes) stats = statsRes;
  } catch (err) {
    console.warn('Manager dashboard load error:', err);
  }

  const statCardsHtml = `
    <div class="grid stats mb-4">
      ${statCard({
        title: 'Team Decisions',
        value: dashData.team_decisions ?? 0,
        subtitle: 'Decisions initiated across your teams',
        icon: '👥',
        accent: '#0f766e',
        onClick: "window.navigateTo('decisions')"
      })}
      ${statCard({
        title: 'Pending Approvals',
        value: dashData.pending_approvals ?? 0,
        subtitle: 'Decisions awaiting leadership sign-off',
        icon: '⏳',
        accent: '#f59e0b',
        onClick: "window.navigateTo('approvals')"
      })}
      ${statCard({
        title: 'Approved Decisions',
        value: dashData.approved_decisions ?? 0,
        subtitle: 'Successfully ratified by governance',
        icon: '✔',
        accent: '#10b981',
        onClick: "window.navigateTo('decisions')"
      })}
      ${statCard({
        title: 'Rejected Decisions',
        value: dashData.rejected_decisions ?? 0,
        subtitle: 'Returned for revision or rejected',
        icon: '✖',
        accent: '#f43f5e',
        onClick: "window.navigateTo('decisions')"
      })}
    </div>
  `;

  // Team decisions rows
  const decisionRows = teamDecisions.slice(0, 8).map(d => `
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
        <button class="button secondary btn-sm py-1 px-2" onclick="window.navigateTo('detail', ${d.id})">Inspect</button>
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
      { label: 'Actions', className: 'text-end' }
    ],
    rowsHtml: decisionRows,
    emptyMessage: 'No team decisions currently recorded.'
  });

  // Category Breakdown / Stats Display
  const categoryBreakdown = stats.categories || stats.category_counts || {
    Technology: 0,
    Infrastructure: 0,
    Security: 0,
    Finance: 0,
    Operations: 0
  };

  const categoryStatsHtml = Object.entries(categoryBreakdown).map(([cat, count]) => `
    <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
      <span class="fw-medium">${esc(cat)}</span>
      <span class="badge bg-secondary-subtle text-secondary-emphasis fw-bold px-2 py-1">${count}</span>
    </div>
  `).join('');

  container.innerHTML = `
    ${sectionHeader({
      kicker: 'LEADERSHIP WORKSPACE',
      title: `Welcome, ${esc(firstName)}`,
      subtitle: 'Monitor organizational initiatives, oversee departmental approvals, and analyze team decision velocity.',
      actions: `
        <button class="button primary" onclick="window.navigateTo('reports')">
          <span>▥</span> View Detailed Reports
        </button>
        <button class="button secondary" onclick="window.navigateTo('approvals')">
          <span>✓</span> Pending Sign-Offs
        </button>
      `
    })}

    ${statCardsHtml}

    <div class="row g-4">
      <div class="col-lg-8">
        <section class="panel">
          <div class="panel-head d-flex justify-content-between align-items-center mb-3">
            <h3 class="mb-0">Team Decision Oversight</h3>
            <button class="text-button text-emerald-700" onclick="window.navigateTo('decisions')">Browse All &rarr;</button>
          </div>
          ${decisionsTableHtml}
        </section>
      </div>

      <div class="col-lg-4">
        <section class="panel">
          <div class="panel-head mb-3">
            <h3 class="mb-0">Decision Category Distribution</h3>
          </div>
          <div class="mb-3">
            ${categoryStatsHtml}
          </div>
          <div class="p-3 bg-light rounded-3 border">
            <small class="text-muted d-block fw-semibold mb-1">GOVERNANCE PROTOCOL</small>
            <p class="small text-secondary mb-0">
              Managers have Level 2 final sign-off authority. Approving Level 2 ratifies the decision into active organizational knowledge.
            </p>
          </div>
        </section>
      </div>
    </div>
  `;
}
