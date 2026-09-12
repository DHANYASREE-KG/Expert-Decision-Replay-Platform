// ====================================================================
// Expert Decision Replay Platform - Reviewer Dashboard
// ====================================================================

import { api } from '../api/client.js';
import { authState } from '../auth/authState.js';
import { statCard, sectionHeader } from '../components/cards.js';
import { statusBadge, esc } from '../components/badges.js';
import { responsiveTable } from '../components/table.js';
import { ModalController } from '../components/modal.js';
import { toast } from '../components/toast.js';

export async function renderReviewerDashboard(container) {
  const user = authState.getUser();
  const firstName = user?.full_name ? user.full_name.split(' ')[0] : 'Reviewer';

  let approvals = [];
  try {
    approvals = await api(`/approvals?reviewer_id=${user.id}`);
  } catch (err) {
    console.warn('Reviewer approvals fetch failed:', err);
  }

  const pendingList = approvals.filter(a => (a.status || '').toLowerCase() === 'pending');
  const completedList = approvals.filter(a => (a.status || '').toLowerCase() !== 'pending');

  const statCardsHtml = `
    <div class="grid stats mb-4">
      ${statCard({
        title: 'Assigned Decisions',
        value: approvals.length,
        subtitle: 'Total reviews allocated to you',
        icon: '📋',
        accent: '#0f766e',
        onClick: "window.navigateTo('approvals')"
      })}
      ${statCard({
        title: 'Pending Reviews',
        value: pendingList.length,
        subtitle: 'Awaiting your evaluation and vote',
        icon: '⏳',
        accent: '#f59e0b',
        onClick: "window.navigateTo('approvals')"
      })}
      ${statCard({
        title: 'Completed Reviews',
        value: completedList.length,
        subtitle: 'Decisions reviewed and finalized',
        icon: '✔',
        accent: '#10b981',
        onClick: "window.navigateTo('approvals')"
      })}
    </div>
  `;

  // Pending reviews requiring immediate action
  const pendingRows = pendingList.map(a => `
    <tr>
      <td class="fw-bold"><span class="text-muted">#${a.id}</span></td>
      <td>
        <a href="javascript:void(0)" class="fw-semibold text-dark text-decoration-none" onclick="window.navigateTo('detail', ${a.decision_id})">
          Decision #${a.decision_id} &rarr;
        </a>
      </td>
      <td><span class="badge bg-primary-subtle text-primary border">Level ${a.approval_level}</span></td>
      <td>${statusBadge(a.status)}</td>
      <td><small class="text-muted">${a.assigned_at ? new Date(a.assigned_at).toLocaleDateString() : '--'}</small></td>
      <td class="text-end">
        <div class="actions justify-content-end d-flex gap-1">
          <button class="button secondary btn-sm py-1 px-2" onclick="window.navigateTo('detail', ${a.decision_id})">Examine</button>
          <button class="btn btn-sm btn-success py-1 px-2" onclick="window.quickApprovalVote(${a.id}, 'Approved', ${a.decision_id})">Approve</button>
          <button class="btn btn-sm btn-danger py-1 px-2" onclick="window.quickApprovalVote(${a.id}, 'Rejected', ${a.decision_id})">Reject</button>
        </div>
      </td>
    </tr>
  `).join('');

  const pendingTableHtml = responsiveTable({
    headers: [
      { label: 'Review ID' },
      { label: 'Decision' },
      { label: 'Level' },
      { label: 'Review Status' },
      { label: 'Assigned Date' },
      { label: 'Actions', className: 'text-end' }
    ],
    rowsHtml: pendingRows,
    emptyMessage: 'All assigned decisions have been evaluated. No pending reviews in your queue!'
  });

  // Recently completed reviews
  const completedRows = completedList.slice(0, 5).map(a => `
    <tr>
      <td><span class="text-muted">#${a.id}</span></td>
      <td>
        <a href="javascript:void(0)" class="fw-medium text-dark text-decoration-none" onclick="window.navigateTo('detail', ${a.decision_id})">
          Decision #${a.decision_id}
        </a>
      </td>
      <td>${statusBadge(a.status)}</td>
      <td><small class="text-muted">${esc(a.comments || 'No comments')}</small></td>
      <td><small class="text-muted">${a.completed_at ? new Date(a.completed_at).toLocaleDateString() : '--'}</small></td>
      <td class="text-end">
        <button class="button secondary btn-sm py-1 px-2" onclick="window.navigateTo('detail', ${a.decision_id})">View</button>
      </td>
    </tr>
  `).join('');

  const completedTableHtml = responsiveTable({
    headers: [
      { label: 'ID' },
      { label: 'Decision' },
      { label: 'Outcome' },
      { label: 'Review Notes' },
      { label: 'Completed' },
      { label: 'Action', className: 'text-end' }
    ],
    rowsHtml: completedRows,
    emptyMessage: 'No past completed reviews on file.'
  });

  container.innerHTML = `
    ${sectionHeader({
      kicker: 'GOVERNANCE & REVIEW',
      title: `Welcome, ${esc(firstName)}`,
      subtitle: 'Evaluate assigned organizational decisions, inspect trade-offs, and record peer review verdicts.',
      actions: `
        <button class="button primary" onclick="window.navigateTo('approvals')">
          <span>✓</span> Open Full Review Queue
        </button>
      `
    })}

    ${statCardsHtml}

    <div class="row g-4">
      <div class="col-12">
        <section class="panel">
          <div class="panel-head d-flex justify-content-between align-items-center mb-3">
            <h3 class="mb-0">Decisions Requiring Immediate Review (${pendingList.length})</h3>
            <span class="badge bg-amber-500 text-white">${pendingList.length} Action Needed</span>
          </div>
          ${pendingTableHtml}
        </section>
      </div>

      <div class="col-12">
        <section class="panel">
          <div class="panel-head mb-3">
            <h3 class="mb-0">Recently Reviewed Decisions</h3>
          </div>
          ${completedTableHtml}
        </section>
      </div>
    </div>
  `;
}

// Global Quick Action handler for Reviewer
window.quickApprovalVote = function(approvalId, outcome, decisionId) {
  ModalController.open({
    title: `Record Verdict: ${outcome}`,
    bodyHtml: `
      <form id="quick-vote-form" class="row g-3">
        <div class="col-12">
          <p class="mb-2">You are recording an official verdict of <b>${outcome}</b> for <b>Decision #${decisionId}</b>.</p>
          <label>Reviewer Comments & Feedback *</label>
          <textarea name="comments" class="form-control" rows="3" required placeholder="Explain your assessment, risk tradeoffs, and recommendations..."></textarea>
        </div>
        <div class="col-12 mt-4 text-end">
          <button type="button" class="button secondary me-2" data-bs-dismiss="modal">Cancel</button>
          <button type="submit" class="button ${outcome === 'Approved' ? 'primary' : 'danger'}">
            Confirm ${outcome} <span>&rarr;</span>
          </button>
        </div>
      </form>
    `,
    onShow: (bodyEl, bsModal) => {
      bodyEl.querySelector('#quick-vote-form').onsubmit = async e => {
        e.preventDefault();
        const comments = e.target.querySelector('[name="comments"]').value.trim();
        try {
          await api(`/approvals/${approvalId}`, {
            method: 'PATCH',
            body: { status: outcome, comments }
          });
          toast(`Review recorded: Decision #${decisionId} is ${outcome}!`);
          bsModal.hide();
          window.renderCurrentPage();
        } catch (err) {
          toast(err.message, 'error');
        }
      };
    }
  });
};
