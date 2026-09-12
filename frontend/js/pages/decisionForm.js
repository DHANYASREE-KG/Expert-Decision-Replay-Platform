// ====================================================================
// Expert Decision Replay Platform - Create & Edit Decision Page
// ====================================================================

import { api } from '../api/client.js';
import { sectionHeader } from '../components/cards.js';
import { FormValidator } from '../forms/validator.js';
import { toast } from '../components/toast.js';
import { loadingState, errorState } from '../components/feedback.js';
import { esc } from '../components/badges.js';

export async function renderDecisionForm(container, decisionId = null) {
  const isEditing = !!decisionId;
  let existing = null;
  let availableTags = [];

  container.innerHTML = loadingState(isEditing ? `Loading decision #${decisionId}...` : 'Preparing decision workspace...');

  try {
    const [decRes, tagsRes] = await Promise.all([
      isEditing ? api(`/decisions/${decisionId}`) : Promise.resolve(null),
      api('/tags').catch(() => [])
    ]);
    existing = decRes;
    availableTags = Array.isArray(tagsRes) ? tagsRes : [];
  } catch (err) {
    container.innerHTML = errorState({
      title: isEditing ? 'Could not load decision for editing' : 'Workspace Initialization Error',
      message: err.message,
      onRetry: () => renderDecisionForm(container, decisionId)
    });
    return;
  }

  // Parse structured sections from problem_statement if present
  let cleanProblem = existing?.problem_statement || '';
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

  const existingTagIds = new Set((existing?.tags || []).map(t => t.id));
  const categories = ['Technology', 'Infrastructure', 'Security', 'Finance', 'Operations', 'Product'];

  container.innerHTML = `
    ${sectionHeader({
      kicker: 'DECISION REGISTRY',
      title: isEditing ? `Edit Decision #${existing.id}` : 'Capture New Strategic Decision',
      subtitle: isEditing
        ? 'Update decision context, rationale, and evaluation framework.'
        : 'Document organizational challenges, constraints, stakeholders, and success criteria for team replay.',
      actions: `
        <button class="button secondary" onclick="window.navigateTo('${isEditing ? 'detail' : 'decisions'}', ${decisionId || 'null'})">
          &larr; Back
        </button>
      `
    })}

    <section class="panel">
      <form id="decision-master-form" class="row g-3">
        <div id="form-error-banner" class="col-12 alert alert-danger hidden" role="alert"></div>

        <!-- Title -->
        <div class="col-md-8">
          <label class="form-label fw-bold">Decision Title *</label>
          <input name="title" class="form-control" required maxlength="250"
            value="${esc(existing?.title || '')}"
            placeholder="e.g. Adopt Apache Kafka for Real-time Event Ingestion">
          <small class="text-muted">Concise summary of the architectural or business decision.</small>
        </div>

        <!-- Category -->
        <div class="col-md-4">
          <label class="form-label fw-bold">Category *</label>
          <select name="category" class="form-select" required>
            <option value="">Choose category...</option>
            ${categories.map(c => `
              <option value="${c}" ${existing?.category === c ? 'selected' : ''}>${c}</option>
            `).join('')}
          </select>
        </div>

        <!-- Problem Statement -->
        <div class="col-12">
          <label class="form-label fw-bold">Problem Statement & Background *</label>
          <textarea name="problem_statement" class="form-control" rows="4" required
            placeholder="What challenge does the organization face? Detail context, legacy limitations, and why action is required...">${esc(cleanProblem)}</textarea>
        </div>

        <!-- Objectives & Goals -->
        <div class="col-md-6">
          <label class="form-label fw-bold">Objectives & Success Criteria</label>
          <textarea name="objectives" class="form-control" rows="3"
            placeholder="Key deliverables, latency targets, throughput goals, SLA metrics...">${esc(parsedObjectives)}</textarea>
          <small class="text-muted">Specific measurable goals this decision satisfies.</small>
        </div>

        <!-- Stakeholders -->
        <div class="col-md-6">
          <label class="form-label fw-bold">Impacted Stakeholders</label>
          <textarea name="stakeholders" class="form-control" rows="3"
            placeholder="e.g. Core Platform Team, DevOps, Security Council, Financial Controllers...">${esc(parsedStakeholders)}</textarea>
          <small class="text-muted">Teams, leaders, or departments impacted by this decision.</small>
        </div>

        <!-- Evaluation Criteria & Risks -->
        <div class="col-md-6">
          <label class="form-label fw-bold">Evaluation Criteria</label>
          <input name="evaluation_criteria" class="form-control"
            value="${esc(parsedCriteria)}"
            placeholder="e.g. Cost, Scalability, Feasibility, Maintenance Overhead">
        </div>

        <div class="col-md-6">
          <label class="form-label fw-bold">Identified Risks & Tradeoffs</label>
          <input name="risks" class="form-control"
            value="${esc(parsedRisks)}"
            placeholder="e.g. Migration downtime, vendor lock-in, training curve">
        </div>

        <!-- Tags Selector -->
        <div class="col-12">
          <label class="form-label fw-bold">Categorization Tags</label>
          <div class="d-flex flex-wrap gap-2 align-items-center mb-2" id="tag-checkboxes">
            ${availableTags.map(t => `
              <label class="badge bg-light text-dark border p-2 d-flex align-items-center gap-1 cursor-pointer">
                <input type="checkbox" name="tag_ids" value="${t.id}" ${existingTagIds.has(t.id) ? 'checked' : ''}>
                <span>${esc(t.name)}</span>
              </label>
            `).join('')}
            ${availableTags.length === 0 ? '<small class="text-muted fst-italic">No tags created yet. Create a tag below.</small>' : ''}
          </div>
          <div class="input-group" style="max-width: 320px;">
            <input type="text" id="new-tag-input" class="form-control form-control-sm" placeholder="Add new tag...">
            <button type="button" class="button secondary btn-sm" onclick="window.addNewTagFromForm()">Create Tag</button>
          </div>
        </div>

        <!-- Additional Information -->
        <div class="col-12">
          <label class="form-label fw-bold">Additional Information & References</label>
          <textarea name="additional_info" class="form-control" rows="2"
            placeholder="Any architecture RFC links, documentation URLs, benchmark artifacts, or external constraints...">${esc(parsedAdditional)}</textarea>
        </div>

        <!-- Decision Rationale -->
        <div class="col-12">
          <label class="form-label fw-bold">Formal Decision Rationale</label>
          <textarea name="rationale" class="form-control" rows="3"
            placeholder="Explain why the chosen approach was preferred over alternatives (can also be finalized later during review)...">${esc(existing?.rationale || '')}</textarea>
        </div>

        <!-- Action Buttons -->
        <div class="col-12 mt-4 pt-3 border-top d-flex justify-content-end gap-2">
          <button type="button" class="button secondary" onclick="window.navigateTo('${isEditing ? 'detail' : 'decisions'}', ${decisionId || 'null'})">
            Cancel
          </button>
          <button type="submit" class="button primary" id="save-decision-btn">
            ${isEditing ? 'Save Decision Updates' : 'Publish Decision'} <span>&rarr;</span>
          </button>
        </div>
      </form>
    </section>
  `;

  // Dynamic tag creator inside the form
  window.addNewTagFromForm = async () => {
    const input = document.getElementById('new-tag-input');
    const tagName = (input?.value || '').trim();
    if (!tagName) return;

    try {
      const newTag = await api('/tags', {
        method: 'POST',
        body: { name: tagName }
      });
      toast(`Tag "${newTag.name}" created!`);
      const containerEl = document.getElementById('tag-checkboxes');
      if (containerEl) {
        const label = document.createElement('label');
        label.className = 'badge bg-teal-50 text-teal-900 border border-teal-300 p-2 d-flex align-items-center gap-1 cursor-pointer';
        label.innerHTML = `
          <input type="checkbox" name="tag_ids" value="${newTag.id}" checked>
          <span>${esc(newTag.name)}</span>
        `;
        containerEl.appendChild(label);
      }
      if (input) input.value = '';
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const form = document.getElementById('decision-master-form');
  const errorBanner = document.getElementById('form-error-banner');

  form.onsubmit = async e => {
    e.preventDefault();
    if (errorBanner) errorBanner.classList.add('hidden');

    const formData = new FormData(form);
    const selectedTagIds = formData.getAll('tag_ids').map(v => parseInt(v, 10)).filter(Boolean);
    const raw = Object.fromEntries(formData);

    // Frontend Validation
    const rules = {
      title: [v => FormValidator.validateRequired(v, 'Title'), v => FormValidator.validateTextLength(v, 5, 250, 'Title')],
      category: [v => FormValidator.validateRequired(v, 'Category')],
      problem_statement: [v => FormValidator.validateRequired(v, 'Problem Statement'), v => FormValidator.validateTextLength(v, 10, 5000, 'Problem Statement')]
    };

    const valResult = FormValidator.validate(raw, rules);
    if (!valResult.isValid) {
      const msg = Object.values(valResult.errors).join('; ');
      if (errorBanner) {
        errorBanner.textContent = msg;
        errorBanner.classList.remove('hidden');
      }
      return;
    }

    // Compose formatted problem statement keeping structured sections
    let composedProblemStatement = raw.problem_statement.trim();
    if (raw.objectives?.trim()) {
      composedProblemStatement += `\n\n**Objectives:**\n${raw.objectives.trim()}`;
    }
    if (raw.stakeholders?.trim()) {
      composedProblemStatement += `\n\n**Stakeholders:**\n${raw.stakeholders.trim()}`;
    }
    if (raw.evaluation_criteria?.trim()) {
      composedProblemStatement += `\n\n**Evaluation Criteria:**\n${raw.evaluation_criteria.trim()}`;
    }
    if (raw.risks?.trim()) {
      composedProblemStatement += `\n\n**Risks:**\n${raw.risks.trim()}`;
    }
    if (raw.additional_info?.trim()) {
      composedProblemStatement += `\n\n**Additional Information:**\n${raw.additional_info.trim()}`;
    }

    const payload = {
      title: raw.title.trim(),
      category: raw.category,
      problem_statement: composedProblemStatement,
      rationale: raw.rationale ? raw.rationale.trim() : null
    };

    const submitBtn = document.getElementById('save-decision-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Submitting...';
    }

    try {
      let saved;
      if (isEditing) {
        saved = await api(`/decisions/${decisionId}`, {
          method: 'PUT',
          body: payload
        });
        toast(`Decision #${saved.id} updated successfully!`);
      } else {
        saved = await api('/decisions', {
          method: 'POST',
          body: payload
        });
        toast(`Decision #${saved.id} created successfully!`);
      }

      // Assign selected tags if any
      if (selectedTagIds.length > 0) {
        await api(`/decisions/${saved.id}/tags`, {
          method: 'POST',
          body: { tag_ids: selectedTagIds }
        }).catch(err => console.warn('Could not assign tags:', err));
      }

      window.navigateTo('detail', saved.id);
    } catch (err) {
      if (errorBanner) {
        errorBanner.textContent = err.message;
        errorBanner.classList.remove('hidden');
      } else {
        toast(err.message, 'error');
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `${isEditing ? 'Save Decision Updates' : 'Publish Decision'} <span>&rarr;</span>`;
      }
    }
  };
}
