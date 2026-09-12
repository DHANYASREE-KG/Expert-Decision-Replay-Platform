// ====================================================================
// Expert Decision Replay Platform - Alternative Comparison Matrix
// ====================================================================

import { ModalController } from '../components/modal.js';
import { esc, riskBadge, feasibilityPill } from '../components/badges.js';

export function openAlternativeComparisonModal(decisionTitle, alternatives = []) {
  if (!alternatives || alternatives.length === 0) {
    alert('No alternatives are available to compare for this decision.');
    return;
  }

  const columnsHtml = alternatives.map(a => `
    <th scope="col" style="min-width: 220px; vertical-align: top;" class="bg-light">
      <div class="fw-bold fs-6 text-dark">${esc(a.name)}</div>
      <small class="text-muted d-block text-truncate" style="max-width: 200px;">${esc(a.description)}</small>
    </th>
  `).join('');

  const costRowHtml = alternatives.map(a => `
    <td class="font-monospace fw-bold text-dark fs-6">
      $${Number(a.estimated_cost || 0).toLocaleString()}
    </td>
  `).join('');

  const feasibilityRowHtml = alternatives.map(a => `
    <td>
      ${feasibilityPill(a.feasibility_score)}
    </td>
  `).join('');

  const riskRowHtml = alternatives.map(a => `
    <td>
      ${riskBadge(a.risk_level)}
    </td>
  `).join('');

  const prosRowHtml = alternatives.map(a => `
    <td class="bg-emerald-50 bg-opacity-25" style="vertical-align: top;">
      <div class="small text-emerald-800" style="white-space: pre-line;">${esc(a.pros || 'None specified')}</div>
    </td>
  `).join('');

  const consRowHtml = alternatives.map(a => `
    <td class="bg-rose-50 bg-opacity-25" style="vertical-align: top;">
      <div class="small text-rose-800" style="white-space: pre-line;">${esc(a.cons || 'None specified')}</div>
    </td>
  `).join('');

  ModalController.open({
    title: `Comparative Tradeoff Matrix: ${decisionTitle}`,
    size: 'xl',
    bodyHtml: `
      <div class="comparison-matrix-wrapper">
        <p class="text-muted small mb-3">
          Side-by-side evaluation of financial, feasibility, operational risk, and tactical pros/cons.
        </p>
        <div class="table-responsive border rounded-3">
          <table class="table table-bordered mb-0 align-middle">
            <thead>
              <tr>
                <th scope="col" style="width: 140px; background: #fafaf7;" class="fw-bold text-uppercase text-secondary small">Evaluation Criteria</th>
                ${columnsHtml}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="fw-bold bg-light text-secondary small text-uppercase">Estimated Cost</td>
                ${costRowHtml}
              </tr>
              <tr>
                <td class="fw-bold bg-light text-secondary small text-uppercase">Feasibility (1-5)</td>
                ${feasibilityRowHtml}
              </tr>
              <tr>
                <td class="fw-bold bg-light text-secondary small text-uppercase">Risk Profile</td>
                ${riskRowHtml}
              </tr>
              <tr>
                <td class="fw-bold bg-light text-secondary small text-uppercase">Pros & Strengths</td>
                ${prosRowHtml}
              </tr>
              <tr>
                <td class="fw-bold bg-light text-secondary small text-uppercase">Cons & Drawbacks</td>
                ${consRowHtml}
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-4 text-end">
          <button type="button" class="button secondary" data-bs-dismiss="modal">Close Matrix</button>
        </div>
      </div>
    `
  });
}
