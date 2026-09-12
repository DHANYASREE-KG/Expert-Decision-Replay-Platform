// ====================================================================
// Expert Decision Replay Platform - Reusable Modal Controller
// ====================================================================

export class ModalController {
  static open({ title, bodyHtml, size = 'lg', onShow = null }) {
    const modalEl = document.getElementById('crud-modal');
    if (!modalEl) {
      console.error('Modal root element #crud-modal not found in DOM.');
      return null;
    }

    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const dialogEl = modalEl.querySelector('.modal-dialog');

    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = bodyHtml;

    if (dialogEl) {
      dialogEl.classList.remove('modal-sm', 'modal-lg', 'modal-xl');
      if (size === 'sm') dialogEl.classList.add('modal-sm');
      else if (size === 'xl') dialogEl.classList.add('modal-xl');
      else dialogEl.classList.add('modal-lg');
    }

    // Initialize or retrieve Bootstrap 5 Modal
    const bs = window.bootstrap || (typeof bootstrap !== 'undefined' ? bootstrap : null);
    let bsModal = null;
    if (bs && bs.Modal) {
      try {
        bsModal = bs.Modal.getInstance(modalEl);
        if (!bsModal) {
          bsModal = new bs.Modal(modalEl, { backdrop: 'static', keyboard: true });
        }
        bsModal.show();
      } catch (err) {
        console.warn('Bootstrap modal init error:', err);
      }
    }

    if (!bsModal) {
      // Direct DOM fallback
      modalEl.classList.add('show');
      modalEl.style.display = 'block';
      document.body.classList.add('modal-open');
    }

    if (typeof onShow === 'function') {
      setTimeout(() => onShow(bodyEl, bsModal), 50);
    }

    return bsModal || modalEl;
  }

  static close() {
    const modalEl = document.getElementById('crud-modal');
    if (!modalEl) return;
    const bs = window.bootstrap || (typeof bootstrap !== 'undefined' ? bootstrap : null);
    if (bs && bs.Modal) {
      try {
        const bsModal = bs.Modal.getInstance(modalEl);
        if (bsModal) bsModal.hide();
      } catch (err) {}
    }
    modalEl.classList.remove('show');
    modalEl.style.display = 'none';
    document.body.classList.remove('modal-open');
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) backdrop.remove();
  }
}
