// ====================================================================
// Expert Decision Replay Platform - Approval Workflow UI
// ====================================================================

import { api } from '../api/client.js';
import { authState } from '../auth/authState.js';
import { sectionHeader } from '../components/cards.js';
import { statusBadge, esc } from '../components/badges.js';
import { responsiveTable } from '../components/table.js';
import { ModalController } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { loadingState, emptyState } from '../components/feedback.js';

/**
 * Global Approvals Queue Page (for Reviewer, Manager, Admin)
 */
export async function renderApprovalsPage(container) {
  const isReviewerOrAbove = authState.isReviewerOrAbove();
  if (!isReviewerOrAbove) {
    container.innerHTML = `
      <div class="alert alert-danger p-4 m-3">
        <h4>Access Denied</h4>
        <p>The Approvals Queue is restricted to designated Reviewers, Managers, and Administrators.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    ${sectionHeader({
      kicker: 'GOVERNANCE WORKFLOW',
      title: 'Governance Approvals Queue',
      subtitle: 'Review incoming decision requests, audit risk evaluations, and register authorized sign-offs.',
      actions: `
        <button class="button secondary" onclick="window.renderApprovalsTable()">
          Refresh Queue
        </button>
      `
    })}

    <section class="panel">
      <div id="approvals-queue-container">
        ${loadingState('Loading pending approvals...')}
      </div>
    </section>
  `;

  window.renderApprovalsTable = async () => {
    const el = document.getElementById('approvals-queue-container');
    if (!el) return;

    try {
      const list = await api('/approvals');
      if (!list || list.length === 0) {
        el.innerHTML = emptyState({
          title: 'All caught up!',
          message: 'There are no decisions pending in the approval queue at this time.',
          icon: '✅'
        });
        return;
      }

      const rows = list.map(a => {
        const canAct = authState.isAdmin() ||
          (authState.isReviewer() && a.reviewer_id === authState.getUser()?.id) ||
          authState.isManager();

        return `
          <tr>
            <td class="fw-bold"><span class="text-muted">#${a.id}</span></td>
            <td>
              <a href="javascript:void(0)" class="fw-semibold text-dark text-decoration-none" onclick="window.navigateTo('detail', ${a.decision_id})">
                Decision #${a.decision_id} &rarr;
              </a>
            </td>
            <td><span class="badge bg-light text-dark border">Level ${a.approval_level}</span></td>
            <td><small class="text-muted font-monospace">User #${a.reviewer_id}</small></td>
            <td>${statusBadge(a.status)}</td>
            <td><small class="text-muted">${esc(a.comments || 'Awaiting sign-off')}</small></td>
            <td><small class="text-muted">${a.assigned_at ? new Date(a.assigned_at).toLocaleDateString() : '--'}</small></td>
            <td class="text-end">
              <div class="actions justify-content-end d-flex gap-1">
                <button class="button secondary btn-sm py-1 px-2" onclick="window.navigateTo('detail', ${a.decision_id})">Inspect</button>
                ${(canAct && a.status === 'Pending') ? `
                  <button class="btn btn-sm btn-success py-1 px-2" onclick="window.actOnApprovalModal(${a.id}, 'Approved', ${a.decision_id})">Approve</button>
                  <button class="btn btn-sm btn-danger py-1 px-2" onclick="window.actOnApprovalModal(${a.id}, 'Rejected', ${a.decision_id})">Reject</button>
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      }).join('');

      el.innerHTML = responsiveTable({
        headers: [
          { label: 'ID' },
          { label: 'Decision' },
          { label: 'Level' },
          { label: 'Reviewer' },
          { label: 'Status' },
          { label: 'Verdict Notes' },
          { label: 'Assigned Date' },
          { label: 'Action', className: 'text-end' }
        ],
        rowsHtml: rows,
        emptyMessage: 'No approvals in your queue.'
      });
    } catch (err) {
      el.innerHTML = `<p class="text-danger p-3">${esc(err.message)}</p>`;
    }
  };

  await window.renderApprovalsTable();
}

/**
 * Embedded Decision Details Approval Workflow Box
 */
export async function renderDecisionApprovalSection(decision, targetEl) {
  targetEl.innerHTML = loadingState('Loading governance records...');

  try {
    const approvals = await api(`/approvals?decision_id=${decision.id}`);
    const currentUser = authState.getUser();
    const isManagerOrAdmin = authState.isManagerOrAbove();
    const isReviewer = authState.isReviewer();
    const isCreator = currentUser && decision.created_by === currentUser.id;

    // Contextual Action Card based on role and current status
    let actionCardHtml = '';

    if (isManagerOrAdmin) {
      if (decision.status === 'Draft') {
        actionCardHtml = `
          <div class="p-3 bg-amber-50 border border-amber-300 rounded-3 mb-3">
            <div class="d-flex align-items-center gap-2 mb-2">
              <span class="fs-5">📌</span>
              <div class="fw-bold text-amber-950">Manager Governance Actions</div>
            </div>
            <p class="small text-amber-900 mb-3">
              This decision is currently a <b>Draft</b> created by User #${decision.created_by}. As a Manager, you can transition it into formal review, directly accept, or reject it.
            </p>
            <div class="d-flex flex-column gap-2">
              <button class="button secondary btn-sm w-100 py-2" onclick="window.transitionDecisionStatus(${decision.id}, 'Under Review')">
                <span>⏳</span> Move to Under Review
              </button>
              <div class="d-flex gap-2">
                <button class="btn btn-sm btn-success flex-fill py-2 fw-semibold" onclick="window.openManagerVerdictModal(${decision.id}, 'Approved', '${esc(decision.title)}')">
                  ✔ Accept / Approve
                </button>
                <button class="btn btn-sm btn-danger flex-fill py-2 fw-semibold" onclick="window.openManagerVerdictModal(${decision.id}, 'Rejected', '${esc(decision.title)}')">
                  ✖ Reject
                </button>
              </div>
              <button class="button secondary btn-sm w-100" onclick="window.openAssignReviewerModal(${decision.id})">
                <span>👤</span> + Assign Reviewer
              </button>
            </div>
          </div>
        `;
      } else if (decision.status === 'Under Review') {
        actionCardHtml = `
          <div class="p-3 bg-blue-50 border border-blue-300 rounded-3 mb-3">
            <div class="d-flex align-items-center gap-2 mb-2">
              <span class="fs-5">⚖️</span>
              <div class="fw-bold text-blue-950">Leadership Sign-Off Required</div>
            </div>
            <p class="small text-blue-900 mb-3">
              This decision is under formal review. Record your final management ratification or return with revisions.
            </p>
            <div class="d-flex flex-column gap-2">
              <div class="d-flex gap-2">
                <button class="btn btn-sm btn-success flex-fill py-2 fw-semibold" onclick="window.openManagerVerdictModal(${decision.id}, 'Approved', '${esc(decision.title)}')">
                  ✔ Ratify / Approve
                </button>
                <button class="btn btn-sm btn-danger flex-fill py-2 fw-semibold" onclick="window.openManagerVerdictModal(${decision.id}, 'Rejected', '${esc(decision.title)}')">
                  ✖ Reject
                </button>
              </div>
              <button class="button secondary btn-sm w-100" onclick="window.openAssignReviewerModal(${decision.id})">
                <span>👤</span> + Assign Additional Reviewer
              </button>
            </div>
          </div>
        `;
      } else if (decision.status === 'Approved') {
        actionCardHtml = `
          <div class="p-3 bg-emerald-50 border border-emerald-300 rounded-3 mb-3">
            <div class="d-flex align-items-center gap-2 mb-1">
              <span class="text-success fs-5">✔</span>
              <div class="fw-bold text-emerald-950">Decision Formally Approved</div>
            </div>
            <p class="small text-emerald-900 mb-2">
              Ratified and published to the organization repository.
            </p>
            <button class="btn btn-sm btn-outline-secondary w-100" onclick="window.transitionDecisionStatus(${decision.id}, 'Under Review', 'Reopened by Management for re-evaluation')">
              ↺ Reopen for Review
            </button>
          </div>
        `;
      } else if (decision.status === 'Rejected') {
        actionCardHtml = `
          <div class="p-3 bg-rose-50 border border-rose-300 rounded-3 mb-3">
            <div class="d-flex align-items-center gap-2 mb-1">
              <span class="text-danger fs-5">✖</span>
              <div class="fw-bold text-rose-950">Decision Rejected</div>
            </div>
            <p class="small text-rose-900 mb-2">
              Marked as rejected in governance records. You can reopen or return it to draft.
            </p>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-primary flex-fill" onclick="window.transitionDecisionStatus(${decision.id}, 'Under Review', 'Reconsidered by Manager')">
                ↺ Re-evaluate
              </button>
              <button class="btn btn-sm btn-outline-secondary flex-fill" onclick="window.transitionDecisionStatus(${decision.id}, 'Draft', 'Returned to draft by Manager')">
                Return to Draft
              </button>
            </div>
          </div>
        `;
      }
    } else if (isCreator) {
      if (decision.status === 'Draft') {
        actionCardHtml = `
          <div class="p-3 bg-light border rounded-3 mb-3">
            <div class="d-flex align-items-center gap-2 mb-2">
              <span>📝</span>
              <div class="fw-bold text-dark">Draft Decision</div>
            </div>
            <p class="small text-muted mb-3">
              Your decision draft is currently private. When your analysis and alternatives are complete, submit it for managerial review.
            </p>
            <button class="button primary btn-sm w-100 py-2" onclick="window.submitDecisionFromDetail(${decision.id})">
              🚀 Submit for Review &rarr;
            </button>
          </div>
        `;
      } else if (decision.status === 'Under Review') {
        actionCardHtml = `
          <div class="p-3 bg-amber-50 border border-amber-300 rounded-3 mb-3">
            <div class="fw-bold text-amber-950 mb-1">⏳ Under Formal Review</div>
            <p class="small text-amber-900 mb-0">
              Your decision is being evaluated by leadership and assigned reviewers. You will be notified of verdicts.
            </p>
          </div>
        `;
      } else if (decision.status === 'Approved') {
        actionCardHtml = `
          <div class="p-3 bg-emerald-50 border border-emerald-300 rounded-3 mb-3">
            <div class="fw-bold text-emerald-950 mb-1">🎉 Decision Ratified</div>
            <p class="small text-emerald-900 mb-0">
              Your decision has been officially approved and published in the repository!
            </p>
          </div>
        `;
      } else if (decision.status === 'Rejected') {
        actionCardHtml = `
          <div class="p-3 bg-rose-50 border border-rose-300 rounded-3 mb-3">
            <div class="fw-bold text-rose-950 mb-1">⚠️ Decision Returned</div>
            <p class="small text-rose-900 mb-2">
              Review feedback below and edit your draft to address feedback.
            </p>
            <button class="button secondary btn-sm w-100" onclick="window.navigateTo('edit', ${decision.id})">
              ✏️ Revise Decision
            </button>
          </div>
        `;
      }
    } else if (isReviewer) {
      if (decision.status === 'Under Review') {
        actionCardHtml = `
          <div class="p-3 bg-blue-50 border border-blue-300 rounded-3 mb-3">
            <div class="fw-bold text-blue-950 mb-1">🔍 Reviewer Assessment</div>
            <p class="small text-blue-900 mb-2">
              Provide your architectural feedback and recommendation.
            </p>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-success flex-fill py-1 fw-semibold" onclick="window.openManagerVerdictModal(${decision.id}, 'Approved', '${esc(decision.title)}')">
                Recommend Approval
              </button>
              <button class="btn btn-sm btn-danger flex-fill py-1 fw-semibold" onclick="window.openManagerVerdictModal(${decision.id}, 'Rejected', '${esc(decision.title)}')">
                Request Changes
              </button>
            </div>
          </div>
        `;
      }
    }

    // Approvals history list
    let approvalsListHtml = '';
    if (!approvals || approvals.length === 0) {
      approvalsListHtml = `
        <div class="p-3 bg-light rounded-3 text-center mb-2">
          <small class="text-muted">No individual reviewer assignments recorded yet.</small>
        </div>
      `;
    } else {
      approvalsListHtml = `
        <div class="d-flex flex-column gap-2 mb-2">
          ${approvals.map(a => {
            const isAssignedReviewer = currentUser && a.reviewer_id === currentUser.id;
            const canAct = isAssignedReviewer || isManagerOrAdmin;

            return `
              <div class="p-3 border rounded-3 bg-white shadow-sm">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <span class="fw-bold fs-6">${a.approval_level === 2 ? 'Level 2 - Leadership Sign-Off' : 'Level 1 - Architectural Review'}</span>
                  ${statusBadge(a.status)}
                </div>
                <div class="small text-muted mb-2">
                  Reviewer: <b>User #${a.reviewer_id}</b>
                  ${a.completed_at ? `· Signed off on ${new Date(a.completed_at).toLocaleDateString()}` : ''}
                </div>
                ${a.comments ? `
                  <div class="p-2 rounded bg-light small mb-2 fst-italic border-start border-2 border-primary">
                    "${esc(a.comments)}"
                  </div>
                ` : ''}
                ${(canAct && a.status === 'Pending') ? `
                  <div class="d-flex gap-2 mt-2">
                    <button class="btn btn-sm btn-success py-1 px-3" onclick="window.actOnApprovalModal(${a.id}, 'Approved', ${decision.id})">
                      Approve Level ${a.approval_level}
                    </button>
                    <button class="btn btn-sm btn-danger py-1 px-3" onclick="window.actOnApprovalModal(${a.id}, 'Rejected', ${decision.id})">
                      Reject
                    </button>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    targetEl.innerHTML = `
      <div class="mb-3">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="text-muted small fw-bold">CURRENT STATUS</span>
          ${statusBadge(decision.status)}
        </div>
        <div class="progress" style="height: 6px;">
          <div class="progress-bar ${decision.status === 'Approved' ? 'bg-success' : decision.status === 'Rejected' ? 'bg-danger' : decision.status === 'Under Review' ? 'bg-warning' : 'bg-secondary'}"
            style="width: ${decision.status === 'Approved' ? '100%' : decision.status === 'Under Review' ? '60%' : decision.status === 'Rejected' ? '100%' : '20%'};">
          </div>
        </div>
      </div>

      ${actionCardHtml}

      <div class="pt-2 border-top">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <small class="fw-bold text-muted text-uppercase" style="font-size: 0.75rem;">Formal Review Records</small>
        </div>
        ${approvalsListHtml}
      </div>
    `;
  } catch (err) {
    targetEl.innerHTML = `<p class="text-danger small">${esc(err.message)}</p>`;
  }
}

// Global modal: Quick Manager/Admin Verdict (Accept, Reject)
window.openManagerVerdictModal = function(decisionId, outcome, title) {
  const isApprove = outcome === 'Approved';
  ModalController.open({
    title: isApprove ? 'Ratify & Approve Decision' : 'Reject Decision',
    bodyHtml: `
      <form id="manager-verdict-form" class="row g-3">
        <div class="col-12">
          <div class="p-2 mb-2 rounded bg-light border">
            <span class="small text-muted d-block">Recording verdict for Decision #${decisionId}:</span>
            <b>${esc(title || '')}</b>
          </div>
          <label class="form-label fw-bold">
            ${isApprove ? 'Governance Sign-Off Comments' : 'Rejection Justification & Feedback *'}
          </label>
          <textarea name="comments" class="form-control" rows="3" ${isApprove ? '' : 'required'}
            placeholder="${isApprove ? 'Document reasons for acceptance, architectural alignment, or conditions...' : 'Explain why this decision is rejected and required revisions...'}"></textarea>
        </div>
        <div class="col-12 mt-4 text-end">
          <button type="button" class="button secondary me-2" data-bs-dismiss="modal">Cancel</button>
          <button type="submit" class="btn ${isApprove ? 'btn-success' : 'btn-danger'} px-4 py-2 fw-bold">
            Confirm ${isApprove ? 'Approval' : 'Rejection'} <span>&rarr;</span>
          </button>
        </div>
      </form>
    `,
    onShow: (bodyEl, bsModal) => {
      bodyEl.querySelector('#manager-verdict-form').onsubmit = async e => {
        e.preventDefault();
        const comments = e.target.querySelector('[name="comments"]').value.trim();
        try {
          await api(`/decisions/${decisionId}/verdict`, {
            method: 'POST',
            body: {
              status: outcome,
              comments: comments || (isApprove ? 'Approved by leadership governance' : 'Rejected by leadership')
            }
          });
          toast(`Decision #${decisionId} ${outcome.toLowerCase()} successfully!`);
          bsModal.hide();
          window.renderCurrentPage();
        } catch (err) {
          toast(err.message, 'error');
        }
      };
    }
  });
};

// Global helper: Transition Decision Status (e.g. Move to Under Review, Return to Draft)
window.transitionDecisionStatus = async function(decisionId, newStatus, reason = '') {
  try {
    await api(`/decisions/${decisionId}/verdict`, {
      method: 'POST',
      body: {
        status: newStatus,
        comments: reason || `Decision status moved to ${newStatus}`
      }
    });
    toast(`Decision #${decisionId} status changed to ${newStatus}!`);
    window.renderCurrentPage();
  } catch (err) {
    toast(err.message, 'error');
  }
};

// Global modal: Assign Reviewer (Managers and Admins)
window.openAssignReviewerModal = function(decisionId) {
  ModalController.open({
    title: 'Assign Governance Reviewer',
    bodyHtml: `
      <form id="assign-rev-modal-form" class="row g-3">
        <div class="col-12">
          <label class="form-label fw-bold">Reviewer User ID *</label>
          <input name="reviewer_id" type="number" min="1" class="form-control" required placeholder="e.g. 3">
          <small class="text-muted">Enter the user ID of a registered Reviewer, Manager, or Administrator.</small>
        </div>
        <div class="col-12">
          <label class="form-label fw-bold">Approval Level *</label>
          <select name="approval_level" class="form-select" required>
            <option value="1">Level 1 - Architectural / Peer Review</option>
            <option value="2">Level 2 - Final Leadership Sign-Off</option>
          </select>
        </div>
        <div class="col-12 mt-4 text-end">
          <button type="button" class="button secondary me-2" data-bs-dismiss="modal">Cancel</button>
          <button type="submit" class="button primary">Assign Reviewer <span>&rarr;</span></button>
        </div>
      </form>
    `,
    onShow: (bodyEl, bsModal) => {
      bodyEl.querySelector('#assign-rev-modal-form').onsubmit = async e => {
        e.preventDefault();
        const raw = Object.fromEntries(new FormData(e.target));
        try {
          await api('/approvals', {
            method: 'POST',
            body: {
              decision_id: decisionId,
              reviewer_id: parseInt(raw.reviewer_id, 10),
              approval_level: parseInt(raw.approval_level, 10),
              status: 'Pending'
            }
          });
          toast('Reviewer assigned successfully!');
          bsModal.hide();
          window.renderCurrentPage();
        } catch (err) {
          toast(err.message, 'error');
        }
      };
    }
  });
};

// Global modal: Act on approval
window.actOnApprovalModal = function(approvalId, outcome, decisionId) {
  ModalController.open({
    title: `Record Verdict: ${outcome}`,
    bodyHtml: `
      <form id="verdict-modal-form" class="row g-3">
        <div class="col-12">
          <p class="mb-2">You are recording official verdict <b>${outcome}</b> for <b>Decision #${decisionId}</b>.</p>
          <label class="form-label fw-bold">Review Feedback & Verdict Notes *</label>
          <textarea name="comments" class="form-control" rows="3" required placeholder="Explain justification, constraints, or reasons for rejection..."></textarea>
        </div>
        <div class="col-12 mt-4 text-end">
          <button type="button" class="button secondary me-2" data-bs-dismiss="modal">Cancel</button>
          <button type="submit" class="btn ${outcome === 'Approved' ? 'btn-success' : 'btn-danger'}">
            Submit ${outcome} <span>&rarr;</span>
          </button>
        </div>
      </form>
    `,
    onShow: (bodyEl, bsModal) => {
      bodyEl.querySelector('#verdict-modal-form').onsubmit = async e => {
        e.preventDefault();
        const comments = e.target.querySelector('[name="comments"]').value.trim();
        try {
          await api(`/approvals/${approvalId}`, {
            method: 'PATCH',
            body: { status: outcome, comments }
          });
          toast(`Review recorded as ${outcome}!`);
          bsModal.hide();
          window.renderCurrentPage();
        } catch (err) {
          toast(err.message, 'error');
        }
      };
    }
  });
};
