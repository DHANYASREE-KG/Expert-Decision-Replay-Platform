// ====================================================================
// Expert Decision Replay Platform - Common Application Layout
// ====================================================================

import { authState } from '../auth/authState.js';
import { roleBadge, esc } from '../components/badges.js';

import { ModalController } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { api } from '../api/client.js';

export class AppLayout {
  static getNavItemsForRole() {
    const role = authState.getRoleNormalized();
    const isAdmin = authState.isAdmin();
    const isManager = authState.isManager();
    const isReviewer = authState.isReviewer();

    // Default Employee view items
    if (role === 'employee') {
      return [
        { id: 'dashboard', icon: '◫', label: 'Employee Dashboard', kicker: 'OVERVIEW' },
        { id: 'decisions', icon: '◎', label: 'My Decisions', kicker: 'DECISION ROOM' },
        { id: 'create', icon: '＋', label: 'Create Decision', kicker: 'DECISION ROOM' },
        { id: 'repository', icon: '⌕', label: 'Knowledge Repository', kicker: 'KNOWLEDGE BASE' },
        { id: 'discussions', icon: '☷', label: 'Discussions', kicker: 'COLLABORATION' },
        { id: 'profile', icon: '👤', label: 'My Profile', kicker: 'ACCOUNT' },
      ];
    }

    // Reviewer view items
    if (isReviewer) {
      return [
        { id: 'dashboard', icon: '◫', label: 'Reviewer Dashboard', kicker: 'GOVERNANCE' },
        { id: 'approvals', icon: '✓', label: 'Assigned Reviews', kicker: 'GOVERNANCE' },
        { id: 'decisions', icon: '◎', label: 'Decisions Registry', kicker: 'DECISION ROOM' },
        { id: 'create', icon: '＋', label: 'Create Decision', kicker: 'DECISION ROOM' },
        { id: 'repository', icon: '⌕', label: 'Knowledge Repository', kicker: 'KNOWLEDGE BASE' },
        { id: 'discussions', icon: '☷', label: 'Discussions', kicker: 'COLLABORATION' },
        { id: 'profile', icon: '👤', label: 'My Profile', kicker: 'ACCOUNT' },
      ];
    }

    // Manager view items
    if (isManager) {
      return [
        { id: 'dashboard', icon: '◫', label: 'Manager Dashboard', kicker: 'MANAGEMENT' },
        { id: 'decisions', icon: '◎', label: 'Team Decisions', kicker: 'DECISION ROOM' },
        { id: 'approvals', icon: '✓', label: 'Pending Approvals', kicker: 'GOVERNANCE' },
        { id: 'reports', icon: '▥', label: 'Reports & Export', kicker: 'INSIGHTS' },
        { id: 'create', icon: '＋', label: 'Create Decision', kicker: 'DECISION ROOM' },
        { id: 'repository', icon: '⌕', label: 'Knowledge Repository', kicker: 'KNOWLEDGE BASE' },
        { id: 'discussions', icon: '☷', label: 'Discussions', kicker: 'COLLABORATION' },
        { id: 'profile', icon: '👤', label: 'My Profile', kicker: 'ACCOUNT' },
      ];
    }

    // Administrator view items
    if (isAdmin) {
      return [
        { id: 'dashboard', icon: '◫', label: 'Admin Dashboard', kicker: 'SYSTEM CONTROL' },
        { id: 'users', icon: '👥', label: 'User Management', kicker: 'ORGANIZATION' },
        { id: 'decisions', icon: '◎', label: 'Decisions Registry', kicker: 'DECISION ROOM' },
        { id: 'approvals', icon: '✓', label: 'Approvals Queue', kicker: 'GOVERNANCE' },
        { id: 'reports', icon: '▥', label: 'Reports & Export', kicker: 'INSIGHTS' },
        { id: 'audit', icon: '◌', label: 'Audit & System Activity', kicker: 'COMPLIANCE' },
        { id: 'repository', icon: '⌕', label: 'Knowledge Repository', kicker: 'KNOWLEDGE BASE' },
        { id: 'discussions', icon: '☷', label: 'Discussions', kicker: 'COLLABORATION' },
        { id: 'profile', icon: '👤', label: 'My Profile', kicker: 'ACCOUNT' },
      ];
    }

    // Fallback
    return [
      { id: 'dashboard', icon: '◫', label: 'Dashboard', kicker: 'OVERVIEW' },
      { id: 'decisions', icon: '◎', label: 'Decisions', kicker: 'DECISION ROOM' },
      { id: 'repository', icon: '⌕', label: 'Knowledge Repository', kicker: 'KNOWLEDGE BASE' },
      { id: 'profile', icon: '👤', label: 'My Profile', kicker: 'ACCOUNT' },
    ];
  }

  static renderSidebar(activeView = 'dashboard') {
    const navEl = document.getElementById('nav');
    if (!navEl) return;

    const items = this.getNavItemsForRole();
    navEl.innerHTML = items.map(item => `
      <button class="nav-item ${activeView === item.id ? 'active' : ''}" data-view="${item.id}" id="nav-btn-${item.id}">
        <span class="nav-icon" aria-hidden="true">${item.icon}</span>
        <span class="nav-label">${esc(item.label)}</span>
      </button>
    `).join('');

    navEl.querySelectorAll('.nav-item').forEach(btn => {
      btn.onclick = () => {
        const targetView = btn.dataset.view;
        if (targetView === 'profile') {
          AppLayout.openProfileModal();
        } else if (window.navigateTo) {
          window.navigateTo(targetView);
        }
      };
    });
  }

  static renderProfile() {
    const user = authState.getUser();
    if (!user) return;

    const userChipEl = document.getElementById('user-chip');
    if (userChipEl) {
      const initial = (user.full_name || 'U').charAt(0).toUpperCase();
      userChipEl.style.cursor = 'pointer';
      userChipEl.title = 'Click to view your profile';
      userChipEl.innerHTML = `
        <div class="d-flex align-items-center gap-2">
          <div class="rounded-circle bg-teal-800 text-white d-flex align-items-center justify-content-center fw-bold shadow-sm" style="width: 32px; height: 32px; font-size: 0.85rem;">
            ${esc(initial)}
          </div>
          <div class="user-chip-text" style="overflow: hidden;">
            <div class="fw-bold text-truncate" style="max-width: 140px;">${esc(user.full_name)}</div>
            <small class="text-muted d-block text-truncate" style="max-width: 140px;">${esc(user.email)}</small>
          </div>
        </div>
      `;
      userChipEl.onclick = () => AppLayout.openProfileModal();
    }

    const roleBadgeEl = document.getElementById('role-badge');
    if (roleBadgeEl) {
      roleBadgeEl.innerHTML = roleBadge(user.role);
    }
  }

  static openProfileModal() {
    const user = authState.getUser();
    if (!user) return;

    ModalController.open({
      title: `My Profile - ${user.full_name}`,
      bodyHtml: `
        <div class="user-profile-modal-content">
          <div class="d-flex align-items-center gap-3 p-3 bg-light rounded-3 mb-4 border">
            <div class="rounded-circle bg-teal-800 text-white d-flex align-items-center justify-content-center fw-bold fs-3 shadow" style="width: 60px; height: 60px;">
              ${esc((user.full_name || 'U').charAt(0).toUpperCase())}
            </div>
            <div>
              <h4 class="mb-1 text-dark fw-bold">${esc(user.full_name)}</h4>
              <div class="d-flex gap-2 align-items-center">
                ${roleBadge(user.role)}
                <span class="badge bg-secondary-subtle text-secondary-emphasis font-monospace">User #${user.id}</span>
              </div>
            </div>
          </div>

          <form id="profile-edit-form" class="row g-3">
            <div class="col-md-6">
              <label class="form-label fw-bold">Full Name</label>
              <input name="full_name" class="form-control" required value="${esc(user.full_name || '')}">
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold">Work Email</label>
              <input name="email" type="email" class="form-control" required value="${esc(user.email || '')}" readonly style="background:#f8f9fa;">
              <small class="text-muted">Managed by organizational authentication</small>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold">Employee ID</label>
              <input name="employee_id" class="form-control" value="${esc(user.employee_id || '')}" placeholder="EMP-101">
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold">Department</label>
              <input name="department" class="form-control" value="${esc(user.department || '')}" placeholder="Engineering / Architecture">
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold">Designation</label>
              <input name="designation" class="form-control" value="${esc(user.designation || '')}" placeholder="Senior Systems Architect">
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold">Phone Number</label>
              <input name="phone_number" class="form-control" value="${esc(user.phone_number || '')}" placeholder="+1-555-0199">
            </div>
            <div class="col-12 mt-4 pt-3 border-top text-end">
              <button type="button" class="button secondary me-2" data-bs-dismiss="modal">Close</button>
              <button type="submit" class="button primary">Save Profile Changes <span>&rarr;</span></button>
            </div>
          </form>
        </div>
      `,
      onShow: (bodyEl, bsModal) => {
        const form = bodyEl.querySelector('#profile-edit-form');
        form.onsubmit = async e => {
          e.preventDefault();
          const raw = Object.fromEntries(new FormData(form));
          try {
            const updated = await api(`/users/${user.id}`, {
              method: 'PUT',
              body: raw
            });
            Object.assign(user, updated);
            toast('Profile updated successfully!');
            AppLayout.renderProfile();
            bsModal.hide();
          } catch (err) {
            toast(err.message, 'error');
          }
        };
      }
    });
  }

  static updateHeader(kicker, title) {
    const kickerEl = document.getElementById('section-kicker');
    const titleEl = document.getElementById('page-title');
    if (kickerEl) kickerEl.textContent = kicker.toUpperCase();
    if (titleEl) titleEl.textContent = title;
  }
}
