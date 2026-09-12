// ====================================================================
// Expert Decision Replay Platform - Discussions & Collaboration UI
// ====================================================================

import { api } from '../api/client.js';
import { authState } from '../auth/authState.js';
import { sectionHeader } from '../components/cards.js';
import { ModalController } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { esc } from '../components/badges.js';
import { emptyState, loadingState } from '../components/feedback.js';

/**
 * General view: Browse all discussions across organizational decisions
 */
export async function renderGeneralDiscussions(container) {
  container.innerHTML = `
    ${sectionHeader({
      kicker: 'COLLABORATION & DEBATE',
      title: 'Discussions & Meeting Notes',
      subtitle: 'Review cross-functional architectural debate, stakeholder feedback, and rationale logs.',
      actions: `
        <button class="button secondary" onclick="window.navigateTo('decisions')">
          <span>◎</span> Select Decision Room
        </button>
      `
    })}

    <section class="panel">
      <div id="general-discussions-list">
        ${loadingState('Loading discussion threads across active decisions...')}
      </div>
    </section>
  `;

  const listContainer = document.getElementById('general-discussions-list');
  try {
    const decisions = await api('/decisions');
    if (!decisions || decisions.length === 0) {
      listContainer.innerHTML = emptyState({
        title: 'No decisions found',
        message: 'Discussions are anchored to decisions. Create a decision to start a discussion thread.',
        icon: '💬',
        actionHtml: '<button class="button primary" onclick="window.navigateTo(\'create\')">Create Decision</button>'
      });
      return;
    }

    listContainer.innerHTML = `
      <div class="d-flex flex-column gap-3">
        ${decisions.map(d => `
          <div class="p-3 border rounded-3 bg-white shadow-sm d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <div class="d-flex align-items-center gap-2 mb-1">
                <span class="badge bg-light text-dark border">#${d.id}</span>
                <h4 class="fs-6 fw-bold mb-0">${esc(d.title)}</h4>
                <span class="status status-${(d.status || 'draft').toLowerCase().replace(/\s+/g, '-')}">${esc(d.status)}</span>
              </div>
              <p class="small text-muted mb-0 text-truncate" style="max-width: 600px;">
                ${esc(d.problem_statement || '')}
              </p>
            </div>
            <button class="button secondary btn-sm py-1 px-3" onclick="window.navigateTo('detail', ${d.id})">
              Open Decision Discussion &rarr;
            </button>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    listContainer.innerHTML = `<p class="text-danger p-3">${esc(err.message)}</p>`;
  }
}

/**
 * Embedded Decision Discussions component: renders direct comments, threads, and meeting notes
 */
export async function renderDecisionDiscussionsSection(decisionId, targetEl) {
  targetEl.innerHTML = loadingState('Loading debate threads, comments and notes...');

  try {
    const [threads, comments, notes] = await Promise.all([
      api(`/decisions/${decisionId}/threads`).catch(() => []),
      api(`/decisions/${decisionId}/comments`).catch(() => []),
      api(`/decisions/${decisionId}/meeting-notes`).catch(() => [])
    ]);

    const hasThreads = threads && threads.length > 0;
    const hasNotes = notes && notes.length > 0;
    const directComments = (comments || []).filter(c => !c.thread_id);

    let notesHtml = '';
    if (hasNotes) {
      notesHtml = `
        <div class="mb-4">
          <h5 class="fs-6 fw-bold text-secondary text-uppercase mb-2" style="letter-spacing: 0.5px; font-size: 0.8rem;">Architecture Review Meeting Notes</h5>
          <div class="d-flex flex-column gap-2">
            ${notes.map(n => `
              <div class="p-3 rounded-2 bg-amber-50 border border-amber-200 shadow-sm">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <span class="fw-bold text-amber-900">${esc(n.title)}</span>
                  <small class="text-amber-700 font-monospace">${n.meeting_date || ''}</small>
                </div>
                <p class="small text-amber-950 mb-0" style="white-space: pre-line;">${esc(n.content)}</p>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Direct Comments section
    const directCommentsHtml = `
      <div class="mb-4">
        <h5 class="fs-6 fw-bold text-secondary text-uppercase mb-2" style="letter-spacing: 0.5px; font-size: 0.8rem;">
          Direct Comments (${directComments.length})
        </h5>
        <div class="d-flex flex-column gap-2 mb-3">
          ${directComments.length === 0 ? '<p class="small text-muted fst-italic mb-0">No direct comments yet on this decision.</p>' : ''}
          ${directComments.map(c => `
            <div class="p-2 px-3 rounded-2 bg-light border">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="fw-bold small text-dark">User #${c.user_id}</span>
                <small class="text-muted font-monospace" style="font-size: 0.75rem;">
                  ${c.created_at ? new Date(c.created_at).toLocaleString() : ''}
                </small>
              </div>
              <p class="small text-secondary mb-0" style="white-space: pre-line;">${esc(c.content)}</p>
            </div>
          `).join('')}
        </div>

        <form class="d-flex gap-2" onsubmit="window.submitDecisionDirectComment(event, ${decisionId})">
          <input name="direct_comment" class="form-control form-control-sm" required placeholder="Add a comment or question regarding this decision...">
          <button type="submit" class="button primary btn-sm py-1 px-3">Post Comment</button>
        </form>
      </div>
    `;

    // Threaded discussions
    const threadsHtml = (threads || []).map(t => {
      const threadComments = (comments || []).filter(c => c.thread_id === t.id);
      return `
        <div class="thread-card p-3 rounded-3 border bg-white shadow-sm mb-3">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <div class="d-flex align-items-center gap-2">
              <span class="badge bg-teal-100 text-teal-800 fw-bold">Debate Topic</span>
              <h5 class="fs-6 fw-bold mb-0 text-dark">${esc(t.title)}</h5>
            </div>
            <small class="text-muted font-monospace">Author #${t.created_by}</small>
          </div>
          <p class="text-secondary small mb-3">${esc(t.description || '')}</p>

          <!-- Nested Replies -->
          <div class="thread-replies ps-3 border-start border-2 border-teal-200 d-flex flex-column gap-2 mb-3">
            ${threadComments.length === 0 ? '<small class="text-muted fst-italic">No replies yet. Be the first to weigh in!</small>' : ''}
            ${threadComments.map(c => `
              <div class="p-2 rounded bg-light border-0">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <span class="fw-bold small text-dark">Colleague #${c.user_id}</span>
                  <small class="text-muted font-monospace" style="font-size: 0.75rem;">
                    ${c.created_at ? new Date(c.created_at).toLocaleString() : ''}
                  </small>
                </div>
                <div class="small text-dark">${esc(c.content)}</div>
              </div>
            `).join('')}
          </div>

          <!-- Quick Reply Composer -->
          <form class="d-flex gap-2" onsubmit="window.submitThreadReply(event, ${decisionId}, ${t.id})">
            <input name="reply_content" class="form-control form-control-sm" required placeholder="Reply to this topic thread...">
            <button type="submit" class="button secondary btn-sm py-1 px-3">Reply</button>
          </form>
        </div>
      `;
    }).join('');

    targetEl.innerHTML = `
      ${notesHtml}
      ${directCommentsHtml}
      <div class="pt-3 border-top">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h5 class="fs-6 fw-bold text-secondary text-uppercase mb-0" style="letter-spacing: 0.5px; font-size: 0.8rem;">
            Discussion Threads (${threads?.length || 0})
          </h5>
          <div class="d-flex gap-2">
            <button class="button secondary btn-sm py-1 px-2" onclick="window.openCreateThreadModal(${decisionId})">Start Thread +</button>
            <button class="button secondary btn-sm py-1 px-2" onclick="window.openCreateNoteModal(${decisionId})">Add Meeting Note +</button>
          </div>
        </div>
        ${(threads && threads.length > 0) ? threadsHtml : '<p class="text-muted small fst-italic mb-0">No active discussion threads yet.</p>'}
      </div>
    `;
  } catch (err) {
    targetEl.innerHTML = `<p class="text-danger small">${esc(err.message)}</p>`;
  }
}

// Global modal triggers for Discussions
window.submitDecisionDirectComment = async function(e, decisionId) {
  e.preventDefault();
  const input = e.target.querySelector('[name="direct_comment"]');
  const content = input?.value.trim();
  if (!content) return;

  try {
    await api(`/decisions/${decisionId}/comments`, {
      method: 'POST',
      body: { content }
    });
    input.value = '';
    toast('Comment posted!');
    const targetEl = document.getElementById('discussions-container');
    if (targetEl) renderDecisionDiscussionsSection(decisionId, targetEl);
  } catch (err) {
    toast(err.message, 'error');
  }
};

window.openCreateThreadModal = function(decisionId) {
  ModalController.open({
    title: 'Start Discussion Thread',
    bodyHtml: `
      <form id="new-thread-form" class="row g-3">
        <div class="col-12">
          <label class="form-label fw-bold">Thread Topic *</label>
          <input name="title" class="form-control" required placeholder="e.g. Scalability Benchmarks on AWS vs GCP">
        </div>
        <div class="col-12">
          <label class="form-label fw-bold">Initial Context & Prompt *</label>
          <textarea name="description" class="form-control" rows="3" required placeholder="Outline the debate topic, key questions, or considerations for the team..."></textarea>
        </div>
        <div class="col-12 mt-4 text-end">
          <button type="button" class="button secondary me-2" data-bs-dismiss="modal">Cancel</button>
          <button type="submit" class="button primary">Publish Thread <span>&rarr;</span></button>
        </div>
      </form>
    `,
    onShow: (bodyEl, bsModal) => {
      bodyEl.querySelector('#new-thread-form').onsubmit = async e => {
        e.preventDefault();
        const raw = Object.fromEntries(new FormData(e.target));
        try {
          await api(`/decisions/${decisionId}/threads`, {
            method: 'POST',
            body: raw
          });
          toast('Discussion thread created!');
          bsModal.hide();
          const targetEl = document.getElementById('discussions-container');
          if (targetEl) renderDecisionDiscussionsSection(decisionId, targetEl);
        } catch (err) {
          toast(err.message, 'error');
        }
      };
    }
  });
};

window.openCreateNoteModal = function(decisionId) {
  ModalController.open({
    title: 'Record Architecture Review Meeting Notes',
    bodyHtml: `
      <form id="new-note-form" class="row g-3">
        <div class="col-md-8">
          <label class="form-label fw-bold">Meeting Title *</label>
          <input name="title" class="form-control" required placeholder="e.g. Architecture Review Board Meeting #14">
        </div>
        <div class="col-md-4">
          <label class="form-label fw-bold">Meeting Date *</label>
          <input name="meeting_date" type="date" class="form-control" required value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="col-12">
          <label class="form-label fw-bold">Summary Notes & Attendees *</label>
          <textarea name="content" class="form-control" rows="4" required placeholder="Summary of discussions, consensus reached, open action items..."></textarea>
        </div>
        <div class="col-12 mt-4 text-end">
          <button type="button" class="button secondary me-2" data-bs-dismiss="modal">Cancel</button>
          <button type="submit" class="button primary">Save Meeting Notes <span>&rarr;</span></button>
        </div>
      </form>
    `,
    onShow: (bodyEl, bsModal) => {
      bodyEl.querySelector('#new-note-form').onsubmit = async e => {
        e.preventDefault();
        const raw = Object.fromEntries(new FormData(e.target));
        try {
          await api(`/decisions/${decisionId}/meeting-notes`, {
            method: 'POST',
            body: raw
          });
          toast('Meeting note recorded!');
          bsModal.hide();
          const targetEl = document.getElementById('discussions-container');
          if (targetEl) renderDecisionDiscussionsSection(decisionId, targetEl);
        } catch (err) {
          toast(err.message, 'error');
        }
      };
    }
  });
};

window.submitThreadReply = async function(e, decisionId, threadId) {
  e.preventDefault();
  const input = e.target.querySelector('[name="reply_content"]');
  const content = input?.value.trim();
  if (!content) return;

  try {
    await api(`/threads/${threadId}/comments`, {
      method: 'POST',
      body: { content }
    });
    input.value = '';
    toast('Reply posted!');
    const targetEl = document.getElementById('discussions-container');
    if (targetEl) renderDecisionDiscussionsSection(decisionId, targetEl);
  } catch (err) {
    toast(err.message, 'error');
  }
};
