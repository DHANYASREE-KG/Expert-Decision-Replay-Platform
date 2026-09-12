// ====================================================================
// Expert Decision Replay Platform - Decision Details Hub Page
// ====================================================================

import { api } from '../api/client.js';
import { authState } from '../auth/authState.js';
import { sectionHeader } from '../components/cards.js';
import { statusBadge, categoryBadge, esc, feasibilityPill, riskBadge } from '../components/badges.js';
import { openAddAlternativeModal, openEditAlternativeModal, deleteAlternativePrompt } from './alternatives.js';
import { openAlternativeComparisonModal } from './alternativeComparison.js';
import { renderDecisionDiscussionsSection } from './discussions.js';
import { renderDecisionApprovalSection } from './approvals.js';
import { renderDecisionTimelineSection } from './timeline.js';
import { ModalController } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { loadingState, errorState } from '../components/feedback.js';

export async function renderDecisionDetailPage(container, decisionId) {
  if (!decisionId) {
    window.navigateTo('decisions');
    return;
  }

  container.innerHTML = loadingState(`Loading decision room #${decisionId}...`);

  let decision;
  let alternatives = [];
  try {
    const [decRes, altRes] = await Promise.all([
      api(`/decisions/${decisionId}`),
      api(`/decisions/${decisionId}/alternatives`).catch(() => [])
    ]);
    decision = decRes;
    alternatives = Array.isArray(altRes) ? altRes : [];
  } catch (err) {
    container.innerHTML = errorState({
      title: 'Failed to load decision room',
      message: err.message,
      onRetry: () => renderDecisionDetailPage(container, decisionId)
    });
    return;
  }

  const currentUser = authState.getUser();
  const isAdmin = authState.isAdmin();
  const isManagerOrAdmin = authState.isManagerOrAbove();
  const isCreator = currentUser && decision.created_by === currentUser.id;
  const canEdit = isCreator || isAdmin;
  const canDelete = isAdmin || (isCreator && ['Draft', 'Rejected'].includes(decision.status));
  const canSubmit = (isCreator || isManagerOrAdmin) && ['Draft', 'Rejected'].includes(decision.status);

  // Parse structured sections out of problem_statement if present
  let cleanProblem = decision.problem_statement || '';
  let parsedObjectives = '';
  let parsedStakeholders = '';
  let parsedCriteria = '';
  let parsedRisks = '';
  let parsedAdditional = '';

  if (cleanProblem.includes('**Objectives:**')) {
    const p1 = cleanProblem.split('**Objectives:**');
    cleanProblem = p1[0].trim();
    let rest = p1[1];

    if (rest.includes('**Stakeholders:**')) {
      const p2 = rest.split('**Stakeholders:**');
      parsedObjectives = p2[0].trim();
      rest = p2[1];
    }
    if (rest.includes('**Evaluation Criteria:**')) {
      const p3 = rest.split('**Evaluation Criteria:**');
      if (!parsedObjectives) parsedObjectives = p3[0].trim();
      else parsedStakeholders = p3[0].trim();
      rest = p3[1];
    }
    if (rest.includes('**Risks:**')) {
      const p4 = rest.split('**Risks:**');
      if (!parsedCriteria) parsedCriteria = p4[0].trim();
      rest = p4[1];
    }
    if (rest.includes('**Additional Information:**')) {
      const p5 = rest.split('**Additional Information:**');
      if (!parsedRisks) parsedRisks = p5[0].trim();
      parsedAdditional = p5[1].trim();
    } else {
      if (!parsedRisks) parsedRisks = rest.trim();
    }
  }

  // Action header buttons
  const actionsHtml = `
    <button class="button secondary" onclick="window.navigateTo('decisions')">
      &larr; All Decisions
    </button>
    ${canEdit ? `
      <button class="button secondary" onclick="window.navigateTo('edit', ${decision.id})">
        Edit Decision
      </button>
    ` : ''}
    ${canSubmit ? `
      <button class="button primary" onclick="window.submitDecisionFromDetail(${decision.id})">
        Submit for Review <span>&rarr;</span>
      </button>
    ` : ''}
    ${isManagerOrAdmin && ['Draft', 'Under Review'].includes(decision.status) ? `
      <button class="btn btn-sm btn-success px-3 py-2 fw-bold" onclick="window.openManagerVerdictModal(${decision.id}, 'Approved', '${esc(decision.title)}')">
        ✔ Accept
      </button>
      <button class="btn btn-sm btn-danger px-3 py-2 fw-bold" onclick="window.openManagerVerdictModal(${decision.id}, 'Rejected', '${esc(decision.title)}')">
        ✖ Reject
      </button>
    ` : ''}
    ${canDelete ? `
      <button class="button danger" onclick="window.deleteDecisionFromDetail(${decision.id})">
        Delete
      </button>
    ` : ''}
  `;

  // Alternatives Table rows
  const altRowsHtml = alternatives.length === 0
    ? '<tr><td colspan="6" class="text-center py-4 text-muted">No alternatives recorded yet. Click "Add Alternative" to evaluate options.</td></tr>'
    : alternatives.map(a => `
      <tr>
        <td>
          <div class="fw-bold text-dark">${esc(a.name)}</div>
          <small class="text-muted d-block text-truncate" style="max-width: 240px;">${esc(a.description)}</small>
        </td>
        <td class="font-monospace fw-bold">$${Number(a.estimated_cost || 0).toLocaleString()}</td>
        <td>${feasibilityPill(a.feasibility_score)}</td>
        <td>${riskBadge(a.risk_level)}</td>
        <td class="small">
          <span class="text-success fw-bold">✔</span> ${esc(a.pros || 'N/A')}<br>
          <span class="text-danger fw-bold">✖</span> ${esc(a.cons || 'N/A')}
        </td>
        <td class="text-end">
          <div class="actions justify-content-end d-flex gap-1">
            <button class="btn btn-sm btn-outline-secondary py-0 px-2" title="Edit Alternative" onclick='window.triggerEditAlternative(${decision.id}, ${JSON.stringify(a).replace(/'/g, "&apos;")})'>
              Edit
            </button>
            <button class="btn btn-sm btn-outline-danger py-0 px-2" title="Delete Alternative" onclick="window.triggerDeleteAlternative(${decision.id}, ${a.id}, '${esc(a.name)}')">
              Delete
            </button>
          </div>
        </td>
      </tr>
    `).join('');

  const tagsList = decision.tags || [];
  const tagsHtml = `
    <div class="d-flex flex-wrap align-items-center gap-2 mt-2">
      <small class="fw-bold text-muted text-uppercase" style="font-size: 0.75rem;">Tags:</small>
      ${tagsList.length === 0 ? '<small class="text-muted fst-italic">No tags</small>' : ''}
      ${tagsList.map(t => `<span class="badge bg-teal-100 text-teal-900 border border-teal-200">${esc(t.name)}</span>`).join('')}
      ${canEdit ? `
        <button class="btn btn-sm btn-outline-teal py-0 px-2 ms-1" style="font-size: 0.75rem;" onclick="window.openAddTagModal(${decision.id})">
          + Add Tag
        </button>
      ` : ''}
    </div>
  `;

  container.innerHTML = `
    ${sectionHeader({
      kicker: `DECISION ROOM · #${decision.id}`,
      title: decision.title,
      subtitle: `Category: ${decision.category} · Created on ${new Date(decision.created_at).toLocaleDateString()} by User #${decision.created_by}`,
      actions: actionsHtml
    })}

    <div class="row g-4">
      <!-- Left Major Column: Information, Structured Analysis, Rationale, Alternatives, Discussions -->
      <div class="col-12 col-xl-8 col-lg-7 d-flex flex-column gap-4">
        
        <!-- 1. Decision Context & Information -->
        <section class="panel">
          <div class="panel-head d-flex justify-content-between align-items-center mb-3">
            <h3 class="mb-0">1. Decision Information</h3>
            <div class="d-flex align-items-center gap-2">
              ${categoryBadge(decision.category)}
              ${statusBadge(decision.status)}
            </div>
          </div>

          <div class="p-3 bg-light rounded-3 border mb-3">
            <h5 class="fs-6 fw-bold text-secondary text-uppercase mb-2" style="font-size: 0.8rem; letter-spacing: 0.5px;">Problem Statement & Background</h5>
            <p class="mb-0 text-dark" style="white-space: pre-line; line-height: 1.6;">${esc(cleanProblem)}</p>
          </div>

          ${tagsHtml}
        </section>

        <!-- 2. Structured Analysis (Objectives, Stakeholders, Criteria, Risks) -->
        <section class="panel">
          <div class="panel-head mb-3">
            <h3 class="mb-0">2. Evaluation Framework & Stakeholders</h3>
            <small class="text-muted">Key objectives, impacted parties, evaluation criteria, and identified risks.</small>
          </div>

          <div class="row g-3">
            <!-- Objectives -->
            <div class="col-md-6">
              <div class="p-3 rounded-3 border h-100 bg-white shadow-sm">
                <div class="d-flex align-items-center gap-2 mb-2">
                  <span class="text-teal-700">🎯</span>
                  <h5 class="fs-6 fw-bold text-dark mb-0">Objectives & Deliverables</h5>
                </div>
                <p class="small text-secondary mb-0" style="white-space: pre-line;">
                  ${parsedObjectives ? esc(parsedObjectives) : 'No explicit objectives defined.'}
                </p>
              </div>
            </div>

            <!-- Stakeholders -->
            <div class="col-md-6">
              <div class="p-3 rounded-3 border h-100 bg-white shadow-sm">
                <div class="d-flex align-items-center gap-2 mb-2">
                  <span class="text-teal-700">👥</span>
                  <h5 class="fs-6 fw-bold text-dark mb-0">Impacted Stakeholders</h5>
                </div>
                <div class="small text-secondary">
                  ${parsedStakeholders
                    ? `<p class="mb-0" style="white-space: pre-line;">${esc(parsedStakeholders)}</p>`
                    : '<p class="mb-0 text-muted fst-italic">No stakeholders specified.</p>'
                  }
                </div>
              </div>
            </div>

            <!-- Evaluation Criteria -->
            <div class="col-md-6">
              <div class="p-3 rounded-3 border h-100 bg-white shadow-sm">
                <div class="d-flex align-items-center gap-2 mb-2">
                  <span class="text-teal-700">📋</span>
                  <h5 class="fs-6 fw-bold text-dark mb-0">Evaluation Criteria</h5>
                </div>
                <p class="small text-secondary mb-0" style="white-space: pre-line;">
                  ${parsedCriteria ? esc(parsedCriteria) : 'Cost, feasibility, architecture alignment.'}
                </p>
              </div>
            </div>

            <!-- Identified Risks -->
            <div class="col-md-6">
              <div class="p-3 rounded-3 border h-100 bg-white shadow-sm">
                <div class="d-flex align-items-center gap-2 mb-2">
                  <span class="text-rose-600">⚠️</span>
                  <h5 class="fs-6 fw-bold text-dark mb-0">Identified Risks & Tradeoffs</h5>
                </div>
                <p class="small text-secondary mb-0" style="white-space: pre-line;">
                  ${parsedRisks ? esc(parsedRisks) : 'No critical risks identified.'}
                </p>
              </div>
            </div>

            ${parsedAdditional ? `
              <div class="col-12">
                <div class="p-3 rounded-3 border bg-light">
                  <div class="d-flex align-items-center gap-2 mb-1">
                    <span class="text-muted">🔗</span>
                    <h5 class="fs-6 fw-bold text-secondary mb-0">Additional Information & References</h5>
                  </div>
                  <p class="small text-dark mb-0" style="white-space: pre-line;">${esc(parsedAdditional)}</p>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Formal Rationale -->
          <div class="pt-3 mt-3 border-top">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h4 class="fs-6 fw-bold text-emerald-900 mb-0">Formal Decision Rationale</h4>
              ${canEdit ? `
                <button class="btn btn-sm btn-outline-teal text-emerald-700 py-0 px-2" onclick="window.promptEditRationale(${decision.id}, '${esc(decision.rationale || '')}')">
                  ✏️ Edit Rationale
                </button>
              ` : ''}
            </div>
            <div class="p-3 rounded-2 bg-emerald-50 border border-emerald-200">
              <p class="fst-italic text-emerald-950 mb-0 small" style="white-space: pre-line;">
                ${decision.rationale ? esc(decision.rationale) : 'No formal decision rationale has been recorded yet. Click "Edit Rationale" to document chosen justification.'}
              </p>
            </div>
          </div>
        </section>

        <!-- 3. Alternative Analysis & Comparison Matrix -->
        <section class="panel">
          <div class="panel-head d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div>
              <h3 class="mb-0">3. Alternative Analysis (${alternatives.length})</h3>
              <small class="text-muted">Options evaluated, financial estimates, feasibility ratings, and pros/cons.</small>
            </div>
            <div class="d-flex gap-2">
              <button class="button secondary btn-sm" onclick="window.triggerAddAlternative(${decision.id})">
                <span>＋</span> Add Alternative
              </button>
              ${alternatives.length > 0 ? `
                <button class="button primary btn-sm" onclick='window.triggerCompareAlternatives("${esc(decision.title)}", ${JSON.stringify(alternatives).replace(/'/g, "&apos;")})'>
                  <span>⚖️</span> Compare Matrix
                </button>
              ` : ''}
            </div>
          </div>

          <div class="table-responsive border rounded-3">
            <table class="table table-bordered align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th scope="col">Alternative</th>
                  <th scope="col">Est. Cost</th>
                  <th scope="col">Feasibility</th>
                  <th scope="col">Risk Level</th>
                  <th scope="col">Pros / Cons</th>
                  <th scope="col" class="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${altRowsHtml}
              </tbody>
            </table>
          </div>
        </section>

        <!-- 4. Discussions, Comments & Meeting Notes -->
        <section class="panel">
          <div class="panel-head mb-3">
            <h3 class="mb-0">4. Collaborative Debate & Meeting Notes</h3>
            <small class="text-muted">Stakeholder discussions, direct commentary, and architecture review board notes.</small>
          </div>
          <div id="discussions-container"></div>
        </section>
      </div>

      <!-- Right Column: Governance, Approvals, Version History -->
      <div class="col-12 col-xl-4 col-lg-5 d-flex flex-column gap-4">
        <!-- 5. Governance & Approval Workflow -->
        <section class="panel">
          <div class="panel-head mb-3">
            <h3 class="mb-0">5. Governance Sign-Off</h3>
            <small class="text-muted">Multi-level approval workflow.</small>
          </div>
          <div id="approvals-detail-container"></div>
        </section>

        <!-- 6. Version History & Timeline -->
        <section class="panel">
          <div class="panel-head mb-3">
            <h3 class="mb-0">6. Version Timeline</h3>
            <small class="text-muted">Traceable decision evolution.</small>
          </div>
          <div id="timeline-container"></div>
        </section>
      </div>
    </div>
  `;

  // Render child dynamic sections
  const discussionsEl = document.getElementById('discussions-container');
  if (discussionsEl) renderDecisionDiscussionsSection(decision.id, discussionsEl);

  const approvalsEl = document.getElementById('approvals-detail-container');
  if (approvalsEl) renderDecisionApprovalSection(decision, approvalsEl);

  const timelineEl = document.getElementById('timeline-container');
  if (timelineEl) renderDecisionTimelineSection(decision.id, timelineEl);
}

// Global action triggers for Decision Detail
window.submitDecisionFromDetail = async function(id) {
  if (confirm('Submit this decision for formal peer and management review?')) {
    try {
      await api(`/decisions/${id}/submit`, { method: 'POST' });
      toast('Decision submitted for review!');
      renderDecisionDetailPage(document.getElementById('content'), id);
    } catch (err) {
      toast(err.message, 'error');
    }
  }
};

window.openManagerVerdictModal = function(decisionId, outcome, title = '') {
  const isApprove = outcome === 'Approved';
  const defaultComment = isApprove ? 'Formally approved by leadership governance' : 'Rejected by leadership governance';

  try {
    ModalController.open({
      title: isApprove ? 'Ratify & Approve Decision' : 'Reject Decision',
      bodyHtml: `
        <form id="detail-manager-verdict-form" class="row g-3">
          <div class="col-12">
            <div class="p-3 mb-2 rounded bg-light border">
              <span class="small text-muted d-block">Recording governance verdict for Decision #${decisionId}:</span>
              <div class="fw-bold fs-6 text-dark mt-1">${esc(title || 'Decision #' + decisionId)}</div>
            </div>
            <label class="form-label fw-bold">
              ${isApprove ? 'Approval Notes & Governance Comments (Optional)' : 'Rejection Reason & Required Changes *'}
            </label>
            <textarea name="comments" class="form-control" rows="3" ${isApprove ? '' : 'required'}
              placeholder="${isApprove ? 'Document justification, architectural alignment, or implementation constraints...' : 'Explain why this decision cannot be ratified in its current state...'}"></textarea>
          </div>
          <div class="col-12 mt-4 text-end">
            <button type="button" class="button secondary me-2" onclick="ModalController.close()">Cancel</button>
            <button type="submit" class="btn ${isApprove ? 'btn-success' : 'btn-danger'} px-4 py-2 fw-bold">
              Confirm ${isApprove ? 'Approval' : 'Rejection'} <span>&rarr;</span>
            </button>
          </div>
        </form>
      `,
      onShow: (bodyEl) => {
        const form = bodyEl.querySelector('#detail-manager-verdict-form');
        if (!form) return;
        form.onsubmit = async e => {
          e.preventDefault();
          const comments = (form.querySelector('[name="comments"]')?.value || '').trim();
          try {
            await api(`/decisions/${decisionId}/verdict`, {
              method: 'POST',
              body: {
                status: outcome,
                comments: comments || defaultComment
              }
            });
            toast(`Decision #${decisionId} ${outcome.toLowerCase()} successfully!`);
            ModalController.close();
            if (window.renderCurrentPage) window.renderCurrentPage();
            else renderDecisionDetailPage(document.getElementById('content'), decisionId);
          } catch (err) {
            toast(err.message, 'error');
          }
        };
      }
    });
  } catch (err) {
    console.warn('Modal open error, prompting directly:', err);
    const reason = prompt(`${outcome} Decision #${decisionId}?\nEnter comments:`, defaultComment);
    if (reason !== null) {
      api(`/decisions/${decisionId}/verdict`, {
        method: 'POST',
        body: { status: outcome, comments: reason || defaultComment }
      }).then(() => {
        toast(`Decision #${decisionId} ${outcome.toLowerCase()} successfully!`);
        if (window.renderCurrentPage) window.renderCurrentPage();
        else renderDecisionDetailPage(document.getElementById('content'), decisionId);
      }).catch(e => toast(e.message, 'error'));
    }
  }
};

window.deleteDecisionFromDetail = async function(id) {
  if (confirm('Are you sure you want to delete this decision? This operation cannot be undone.')) {
    try {
      await api(`/decisions/${id}`, { method: 'DELETE' });
      toast('Decision deleted successfully.');
      window.navigateTo('decisions');
    } catch (err) {
      toast(err.message, 'error');
    }
  }
};

window.promptEditRationale = async function(id, currentVal) {
  const newVal = prompt('Enter or update the formal decision rationale:', currentVal);
  if (newVal !== null) {
    try {
      await api(`/decisions/${id}/rationale`, {
        method: 'PUT',
        body: { rationale: newVal.trim() }
      });
      toast('Rationale updated!');
      renderDecisionDetailPage(document.getElementById('content'), id);
    } catch (err) {
      toast(err.message, 'error');
    }
  }
};

window.openAddTagModal = async function(decisionId) {
  try {
    const allTags = await api('/tags').catch(() => []);
    ModalController.open({
      title: 'Assign Tags to Decision',
      bodyHtml: `
        <form id="assign-tag-form" class="row g-3">
          <div class="col-12">
            <label class="form-label fw-bold">Select Existing Tag *</label>
            <select name="tag_id" class="form-select" required>
              <option value="">Choose tag...</option>
              ${allTags.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}
            </select>
          </div>
          <div class="col-12 text-muted small text-center">- OR -</div>
          <div class="col-12">
            <label class="form-label fw-bold">Create New Tag</label>
            <input name="new_tag_name" class="form-control" placeholder="e.g. Microservices, Cloud">
          </div>
          <div class="col-12 mt-4 text-end">
            <button type="button" class="button secondary me-2" data-bs-dismiss="modal">Cancel</button>
            <button type="submit" class="button primary">Attach Tag <span>&rarr;</span></button>
          </div>
        </form>
      `,
      onShow: (bodyEl, bsModal) => {
        bodyEl.querySelector('#assign-tag-form').onsubmit = async e => {
          e.preventDefault();
          const raw = Object.fromEntries(new FormData(e.target));
          let tagId = raw.tag_id ? parseInt(raw.tag_id, 10) : null;

          try {
            if (raw.new_tag_name && raw.new_tag_name.trim()) {
              const created = await api('/tags', {
                method: 'POST',
                body: { name: raw.new_tag_name.trim() }
              });
              tagId = created.id;
            }

            if (!tagId) {
              toast('Please select or create a tag.', 'error');
              return;
            }

            await api(`/decisions/${decisionId}/tags`, {
              method: 'POST',
              body: { tag_ids: [tagId] }
            });
            toast('Tag attached to decision!');
            bsModal.hide();
            renderDecisionDetailPage(document.getElementById('content'), decisionId);
          } catch (err) {
            toast(err.message, 'error');
          }
        };
      }
    });
  } catch (err) {
    toast(err.message, 'error');
  }
};

window.triggerAddAlternative = function(decisionId) {
  openAddAlternativeModal(decisionId, () => {
    renderDecisionDetailPage(document.getElementById('content'), decisionId);
  });
};

window.triggerEditAlternative = function(decisionId, alt) {
  openEditAlternativeModal(decisionId, alt, () => {
    renderDecisionDetailPage(document.getElementById('content'), decisionId);
  });
};

window.triggerDeleteAlternative = function(decisionId, altId, altName) {
  deleteAlternativePrompt(decisionId, altId, altName, () => {
    renderDecisionDetailPage(document.getElementById('content'), decisionId);
  });
};

window.triggerCompareAlternatives = function(title, alternatives) {
  openAlternativeComparisonModal(title, alternatives);
};
