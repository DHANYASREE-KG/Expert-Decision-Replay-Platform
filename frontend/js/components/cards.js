// ====================================================================
// Expert Decision Replay Platform - Reusable Metric & Action Cards
// ====================================================================

import { esc } from './badges.js';

export function statCard({ title, value, subtitle = '', icon = '', accent = '#0f766e', onClick = null }) {
  const clickableClass = onClick ? 'cursor-pointer' : '';
  const clickAttr = onClick ? `onclick="${onClick}" style="cursor: pointer;"` : '';

  return `
    <div class="stat-card ${clickableClass}" ${clickAttr}>
      <div class="d-flex justify-content-between align-items-center mb-1">
        <small class="text-muted fw-bold text-uppercase" style="letter-spacing: 0.5px; font-size: 0.75rem;">${esc(title)}</small>
        ${icon ? `<span class="fs-5 opacity-75">${icon}</span>` : ''}
      </div>
      <div class="stat-value my-1">${esc(value)}</div>
      ${subtitle ? `<small class="text-muted d-block mt-1">${esc(subtitle)}</small>` : ''}
      <div class="stat-accent" style="background: ${accent};"></div>
    </div>
  `;
}

export function sectionHeader({ kicker = '', title, subtitle = '', actions = '' }) {
  return `
    <div class="page-intro mb-4 d-flex flex-wrap justify-content-between align-items-center gap-3">
      <div>
        ${kicker ? `<p class="eyebrow mb-1">${esc(kicker)}</p>` : ''}
        <h2 class="mb-1">${esc(title)}</h2>
        ${subtitle ? `<p class="muted mb-0">${esc(subtitle)}</p>` : ''}
      </div>
      ${actions ? `<div class="actions d-flex align-items-center gap-2">${actions}</div>` : ''}
    </div>
  `;
}
