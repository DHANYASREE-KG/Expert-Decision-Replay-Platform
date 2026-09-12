// ====================================================================
// Expert Decision Replay Platform - Loading, Empty, and Error States
// ====================================================================

import { esc } from './badges.js';

export function loadingState(message = 'Loading workspace...') {
  return `
    <div class="loading p-5 text-center my-4">
      <div class="spinner-border text-emerald-700 mb-3" style="width: 2.5rem; height: 2.5rem;" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="text-muted fw-medium mb-0">${esc(message)}</p>
    </div>
  `;
}

export function emptyState({
  title = 'No records found',
  message = 'There is currently no data to display for this view or filter.',
  icon = '📭',
  actionHtml = ''
} = {}) {
  return `
    <div class="empty p-5 text-center my-4 rounded-3 border bg-white shadow-sm">
      <div class="display-5 mb-2">${icon}</div>
      <h4 class="fw-bold mb-1">${esc(title)}</h4>
      <p class="text-muted mb-3 mx-auto" style="max-width: 460px;">${esc(message)}</p>
      ${actionHtml ? `<div>${actionHtml}</div>` : ''}
    </div>
  `;
}

export function errorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this section.',
  onRetry = 'window.renderCurrentPage && window.renderCurrentPage()'
} = {}) {
  return `
    <div class="error-state p-4 text-center my-4 rounded-3 border border-danger-subtle bg-danger-subtle">
      <div class="text-danger fs-3 mb-2">⚠</div>
      <h5 class="fw-bold text-danger mb-1">${esc(title)}</h5>
      <p class="text-danger-emphasis mb-3 small mx-auto" style="max-width: 500px;">${esc(message)}</p>
      ${onRetry ? `<button class="button secondary btn-sm" onclick="${onRetry}">Try Again</button>` : ''}
    </div>
  `;
}

export function inlineAlert(message, type = 'danger') {
  if (!message) return '';
  const alertClass = type === 'danger' ? 'alert-danger' : type === 'success' ? 'alert-success' : 'alert-warning';
  return `
    <div class="alert ${alertClass} d-flex align-items-center gap-2 p-2 mb-3 rounded-2" role="alert" style="font-size: 0.875rem;">
      <span>${type === 'danger' ? '✖' : type === 'success' ? '✔' : '⚠'}</span>
      <span class="flex-grow-1">${esc(message)}</span>
    </div>
  `;
}
