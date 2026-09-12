// ====================================================================
// Expert Decision Replay Platform - Version History & Timeline UI
// ====================================================================

import { api } from '../api/client.js';
import { esc } from '../components/badges.js';
import { loadingState } from '../components/feedback.js';

export async function renderDecisionTimelineSection(decisionId, targetEl) {
  targetEl.innerHTML = loadingState('Loading audit timeline & version history...');

  try {
    const res = await api(`/decisions/${decisionId}/history`);
    const history = res?.history || [];

    if (!history || history.length === 0) {
      targetEl.innerHTML = '<p class="text-muted small p-3">No change history recorded yet.</p>';
      return;
    }

    targetEl.innerHTML = `
      <div class="version-timeline-flow d-flex flex-column gap-2 p-2">
        ${history.map((h, idx) => {
          let badgeClass = 'bg-secondary';
          if (h.event.includes('Created')) badgeClass = 'bg-primary';
          else if (h.event.includes('Alternative')) badgeClass = 'bg-teal-700 text-white';
          else if (h.event.includes('Approved')) badgeClass = 'bg-success text-white';
          else if (h.event.includes('Rejected')) badgeClass = 'bg-danger text-white';
          else if (h.event.includes('Submitted') || h.event.includes('Review')) badgeClass = 'bg-warning text-dark';
          else if (h.event.includes('Discussion') || h.event.includes('Comment')) badgeClass = 'bg-info text-dark';

          const isLast = idx === history.length - 1;

          return `
            <div class="version-node p-3 rounded-3 border bg-white shadow-sm position-relative">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="badge ${badgeClass} fw-bold">
                  Version ${h.version_number || idx + 1} – ${esc(h.event)}
                </span>
                <small class="text-muted font-monospace" style="font-size: 0.75rem;">
                  ${h.timestamp ? new Date(h.timestamp).toLocaleString() : ''}
                </small>
              </div>

              <div class="d-flex justify-content-between align-items-center mb-1">
                <small class="text-dark fw-semibold">
                  Changed by: <span class="text-teal-800">${esc(h.changed_by || 'Author')}</span>
                </small>
                ${h.action ? `<span class="badge bg-light text-secondary border" style="font-size: 0.7rem;">${esc(h.action)}</span>` : ''}
              </div>

              <p class="small text-secondary mb-0 mt-1">${esc(h.description)}</p>
            </div>

            ${!isLast ? `
              <div class="text-center text-teal-600 fw-bold my-1" style="font-size: 1.25rem; line-height: 1;">
                ↓
              </div>
            ` : ''}
          `;
        }).join('')}
      </div>
    `;
  } catch (err) {
    targetEl.innerHTML = `<p class="text-danger small">${esc(err.message)}</p>`;
  }
}
