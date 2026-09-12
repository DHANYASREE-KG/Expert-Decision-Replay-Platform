// ====================================================================
// Expert Decision Replay Platform - Alternatives Management
// ====================================================================

import { api } from '../api/client.js';
import { ModalController } from '../components/modal.js';
import { FormValidator } from '../forms/validator.js';
import { toast } from '../components/toast.js';
import { esc, riskBadge, feasibilityPill } from '../components/badges.js';

export function openAddAlternativeModal(decisionId, onComplete = null) {
  ModalController.open({
    title: 'Add Alternative Evaluation',
    bodyHtml: `
      <form id="alt-modal-form" class="row g-3">
        <div id="alt-modal-err" class="col-12 alert alert-danger hidden"></div>

        <div class="col-md-8">
          <label class="form-label fw-bold">Alternative Name *</label>
          <input name="name" class="form-control" required placeholder="e.g. AWS DynamoDB Serverless">
        </div>

        <div class="col-md-4">
          <label class="form-label fw-bold">Estimated Cost ($) *</label>
          <input name="estimated_cost" type="number" step="0.01" min="0" class="form-control" required placeholder="12500">
        </div>

        <div class="col-md-6">
          <label class="form-label fw-bold">Feasibility Score (1 - 5) *</label>
          <select name="feasibility_score" class="form-select" required>
            <option value="5">5 - Highly Feasible / Turnkey</option>
            <option value="4">4 - High Feasibility / Minor Overhead</option>
            <option value="3" selected>3 - Moderate / Balanced Complexity</option>
            <option value="2">2 - Challenging / High Effort</option>
            <option value="1">1 - Very Difficult / Major Obstacles</option>
          </select>
          <small class="text-muted">1 (Low) to 5 (High) implementation viability</small>
        </div>

        <div class="col-md-6">
          <label class="form-label fw-bold">Risk Level *</label>
          <select name="risk_level" class="form-select" required>
            <option value="Low">Low - Minimal operational risk</option>
            <option value="Medium" selected>Medium - Manageable operational risk</option>
            <option value="High">High - Significant operational risk</option>
            <option value="Critical">Critical - High impact failure risk</option>
          </select>
        </div>

        <div class="col-12">
          <label class="form-label fw-bold">Detailed Technical Description *</label>
          <textarea name="description" class="form-control" rows="2" required placeholder="Architecture details, deployment model, integration requirements..."></textarea>
        </div>

        <div class="col-md-6">
          <label class="form-label fw-bold text-success">✔ Pros (Strengths & Benefits) *</label>
          <textarea name="pros" class="form-control" rows="3" required placeholder="Low operational overhead, automatic scaling, built-in HA..."></textarea>
        </div>

        <div class="col-md-6">
          <label class="form-label fw-bold text-danger">✖ Cons (Weaknesses & Costs) *</label>
          <textarea name="cons" class="form-control" rows="3" required placeholder="Proprietary API lock-in, unbounded burst costs, latency variation..."></textarea>
        </div>

        <div class="col-12 mt-4 pt-2 border-top text-end">
          <button type="button" class="button secondary me-2" data-bs-dismiss="modal">Cancel</button>
          <button type="submit" class="button primary">Save Alternative <span>&rarr;</span></button>
        </div>
      </form>
    `,
    onShow: (bodyEl, bsModal) => {
      const form = bodyEl.querySelector('#alt-modal-form');
      const errEl = bodyEl.querySelector('#alt-modal-err');

      form.onsubmit = async e => {
        e.preventDefault();
        errEl.classList.add('hidden');
        const raw = Object.fromEntries(new FormData(form));

        // Validation
        const rules = {
          name: [v => FormValidator.validateRequired(v, 'Alternative Name')],
          estimated_cost: [v => FormValidator.validateCost(v)],
          feasibility_score: [v => FormValidator.validateFeasibilityScore(v)],
          description: [v => FormValidator.validateRequired(v, 'Description')],
          pros: [v => FormValidator.validateRequired(v, 'Pros')],
          cons: [v => FormValidator.validateRequired(v, 'Cons')]
        };

        const val = FormValidator.validate(raw, rules);
        if (!val.isValid) {
          errEl.textContent = Object.values(val.errors).join('; ');
          errEl.classList.remove('hidden');
          return;
        }

        const payload = {
          name: raw.name.trim(),
          description: raw.description.trim(),
          pros: raw.pros.trim(),
          cons: raw.cons.trim(),
          estimated_cost: parseFloat(raw.estimated_cost),
          feasibility_score: parseInt(raw.feasibility_score, 10),
          risk_level: raw.risk_level
        };

        try {
          await api(`/decisions/${decisionId}/alternatives`, {
            method: 'POST',
            body: payload
          });
          toast('Alternative added successfully!');
          bsModal.hide();
          if (onComplete) onComplete();
          else if (window.renderCurrentPage) window.renderCurrentPage();
        } catch (err) {
          errEl.textContent = err.message;
          errEl.classList.remove('hidden');
        }
      };
    }
  });
}

export function openEditAlternativeModal(decisionId, alt, onComplete = null) {
  ModalController.open({
    title: `Edit Alternative: ${alt.name}`,
    bodyHtml: `
      <form id="alt-edit-form" class="row g-3">
        <div id="alt-edit-err" class="col-12 alert alert-danger hidden"></div>

        <div class="col-md-8">
          <label class="form-label fw-bold">Alternative Name *</label>
          <input name="name" class="form-control" required value="${esc(alt.name)}">
        </div>

        <div class="col-md-4">
          <label class="form-label fw-bold">Estimated Cost ($) *</label>
          <input name="estimated_cost" type="number" step="0.01" min="0" class="form-control" required value="${alt.estimated_cost}">
        </div>

        <div class="col-md-6">
          <label class="form-label fw-bold">Feasibility Score (1 - 5) *</label>
          <select name="feasibility_score" class="form-select" required>
            ${[5, 4, 3, 2, 1].map(s => `
              <option value="${s}" ${alt.feasibility_score === s ? 'selected' : ''}>${s}</option>
            `).join('')}
          </select>
        </div>

        <div class="col-md-6">
          <label class="form-label fw-bold">Risk Level *</label>
          <select name="risk_level" class="form-select" required>
            ${['Low', 'Medium', 'High', 'Critical'].map(r => `
              <option value="${r}" ${alt.risk_level === r ? 'selected' : ''}>${r}</option>
            `).join('')}
          </select>
        </div>

        <div class="col-12">
          <label class="form-label fw-bold">Description *</label>
          <textarea name="description" class="form-control" rows="2" required>${esc(alt.description)}</textarea>
        </div>

        <div class="col-md-6">
          <label class="form-label fw-bold text-success">✔ Pros *</label>
          <textarea name="pros" class="form-control" rows="3" required>${esc(alt.pros)}</textarea>
        </div>

        <div class="col-md-6">
          <label class="form-label fw-bold text-danger">✖ Cons *</label>
          <textarea name="cons" class="form-control" rows="3" required>${esc(alt.cons)}</textarea>
        </div>

        <div class="col-12 mt-4 pt-2 border-top text-end">
          <button type="button" class="button secondary me-2" data-bs-dismiss="modal">Cancel</button>
          <button type="submit" class="button primary">Save Changes <span>&rarr;</span></button>
        </div>
      </form>
    `,
    onShow: (bodyEl, bsModal) => {
      const form = bodyEl.querySelector('#alt-edit-form');
      const errEl = bodyEl.querySelector('#alt-edit-err');

      form.onsubmit = async e => {
        e.preventDefault();
        errEl.classList.add('hidden');
        const raw = Object.fromEntries(new FormData(form));

        const payload = {
          name: raw.name.trim(),
          description: raw.description.trim(),
          pros: raw.pros.trim(),
          cons: raw.cons.trim(),
          estimated_cost: parseFloat(raw.estimated_cost),
          feasibility_score: parseInt(raw.feasibility_score, 10),
          risk_level: raw.risk_level
        };

        try {
          await api(`/decisions/${decisionId}/alternatives/${alt.id}`, {
            method: 'PUT',
            body: payload
          });
          toast('Alternative updated successfully!');
          bsModal.hide();
          if (onComplete) onComplete();
          else if (window.renderCurrentPage) window.renderCurrentPage();
        } catch (err) {
          errEl.textContent = err.message;
          errEl.classList.remove('hidden');
        }
      };
    }
  });
}

export async function deleteAlternativePrompt(decisionId, altId, altName, onComplete = null) {
  if (confirm(`Are you sure you want to remove alternative "${altName}"?`)) {
    try {
      await api(`/decisions/${decisionId}/alternatives/${altId}`, {
        method: 'DELETE'
      });
      toast(`Alternative "${altName}" deleted.`);
      if (onComplete) onComplete();
      else if (window.renderCurrentPage) window.renderCurrentPage();
    } catch (err) {
      toast(err.message, 'error');
    }
  }
}
