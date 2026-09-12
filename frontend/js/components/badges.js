// ====================================================================
// Expert Decision Replay Platform - Badges & Pill Helpers
// ====================================================================

export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
}[c]));

export function statusBadge(status) {
  const s = String(status || 'Draft').trim();
  const slug = s.toLowerCase().replace(/\s+/g, '-');
  return `<span class="status status-${esc(slug)}">${esc(s)}</span>`;
}

export function roleBadge(role) {
  const r = String(role || 'Employee').trim();
  const slug = r.toLowerCase().replace(/\s+/g, '-');
  return `<span class="role-badge role-${esc(slug)}">${esc(r)}</span>`;
}

export function riskBadge(risk) {
  const r = String(risk || 'Medium').trim();
  let bgClass = 'bg-warning text-dark';
  if (r === 'Low') bgClass = 'bg-success text-white';
  else if (r === 'High') bgClass = 'bg-orange-600 text-white';
  else if (r === 'Critical') bgClass = 'bg-danger text-white';

  return `<span class="badge ${bgClass} fw-semibold px-2 py-1">${esc(r)}</span>`;
}

export function feasibilityPill(score) {
  const num = Math.max(1, Math.min(5, parseInt(score, 10) || 3));
  let colorClass = 'text-emerald-700 bg-emerald-50 border-emerald-300';
  if (num <= 2) colorClass = 'text-rose-700 bg-rose-50 border-rose-300';
  else if (num === 3) colorClass = 'text-amber-700 bg-amber-50 border-amber-300';

  const dots = '●'.repeat(num) + '○'.repeat(5 - num);
  return `
    <span class="badge border ${colorClass} px-2 py-1 fw-bold font-monospace" title="Feasibility Score: ${num}/5">
      ${num}/5 <small style="letter-spacing: -1px;">${dots}</small>
    </span>
  `;
}

export function categoryBadge(category) {
  const cat = String(category || 'General').trim();
  return `<span class="badge bg-light text-dark border px-2 py-1">${esc(cat)}</span>`;
}
