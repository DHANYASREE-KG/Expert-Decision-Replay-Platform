// ====================================================================
// Expert Decision Replay Platform - Reusable Table Component
// ====================================================================

export function responsiveTable({ headers = [], rowsHtml = '', emptyMessage = 'No items found.' }) {
  if (!rowsHtml || rowsHtml.trim() === '') {
    return `<div class="empty p-4 text-center text-muted">${emptyMessage}</div>`;
  }

  return `
    <div class="table-wrap">
      <table class="table align-middle mb-0">
        <thead>
          <tr>
            ${headers.map(h => `<th scope="col" class="${h.className || ''}">${h.label}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}
