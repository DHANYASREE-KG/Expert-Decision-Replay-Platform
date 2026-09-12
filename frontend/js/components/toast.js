// ====================================================================
// Expert Decision Replay Platform - Reusable Toast Notifications
// ====================================================================

export function toast(message, type = 'success', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
  }

  const isError = type === 'error' || type === true;
  const isWarning = type === 'warning';
  const isInfo = type === 'info';

  let bgClass = 'bg-teal-700 text-white';
  let icon = '✔';
  if (isError) {
    bgClass = 'bg-rose-700 text-white';
    icon = '✖';
  } else if (isWarning) {
    bgClass = 'bg-amber-600 text-white';
    icon = '⚠';
  } else if (isInfo) {
    bgClass = 'bg-sky-700 text-white';
    icon = 'ℹ';
  }

  const el = document.createElement('div');
  el.className = `toast-message d-flex align-items-center gap-2 px-3 py-2 rounded-3 shadow-lg ${bgClass}`;
  el.style.marginBottom = '8px';
  el.style.fontSize = '0.9rem';
  el.style.fontWeight = '500';
  el.style.transition = 'all 0.25s ease';
  el.style.opacity = '0';
  el.style.transform = 'translateY(12px)';

  el.innerHTML = `
    <span style="font-weight: 700; font-size: 1rem;">${icon}</span>
    <span class="flex-grow-1">${String(message)}</span>
    <button type="button" class="btn-close btn-close-white ms-2" style="font-size: 0.65rem;" aria-label="Close"></button>
  `;

  container.appendChild(el);

  // Animate entry
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });

  const dismiss = () => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(12px)';
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 250);
  };

  el.querySelector('.btn-close').onclick = dismiss;
  setTimeout(dismiss, duration);
}
