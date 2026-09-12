// ====================================================================
// Expert Decision Replay Platform - User Management UI (Admin Only)
// ====================================================================

import { api } from '../api/client.js';
import { authState } from '../auth/authState.js';
import { sectionHeader } from '../components/cards.js';
import { roleBadge, esc } from '../components/badges.js';
import { responsiveTable } from '../components/table.js';
import { ModalController } from '../components/modal.js';
import { FormValidator } from '../forms/validator.js';
import { toast } from '../components/toast.js';
import { loadingState, errorState } from '../components/feedback.js';

let cachedUsers = [];

export async function renderUserManagementPage(container) {
  if (!authState.isAdmin()) {
    container.innerHTML = `
      <div class="alert alert-danger p-4 m-3 rounded-3">
        <h4 class="fw-bold">⛔ Access Denied</h4>
        <p class="mb-0">User Account & Role Management is strictly restricted to System Administrators.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    ${sectionHeader({
      kicker: 'ORGANIZATIONAL GOVERNANCE',
      title: 'User & Role Directory',
      subtitle: 'Create, update, inspect, and remove platform accounts and govern role permissions.',
      actions: `
        <button class="button primary" onclick="window.openAddUserModal()">
          <span>＋</span> Add New User
        </button>
      `
    })}

    <section class="panel mb-4">
      <div class="toolbar d-flex flex-wrap gap-2 mb-3">
        <input id="user-mgmt-search" class="form-control" style="max-width: 320px;" placeholder="Search by name, email, department..." oninput="window.filterUsersTable()">
        <select id="user-mgmt-role" class="form-select" style="max-width: 200px;" onchange="window.filterUsersTable()">
          <option value="">All Roles</option>
          <option value="Employee">Employee</option>
          <option value="Reviewer">Reviewer</option>
          <option value="Manager">Manager</option>
          <option value="Administrator">Administrator</option>
        </select>
        <button class="button secondary" onclick="window.refreshUserDirectory()">
          Refresh
        </button>
      </div>

      <div id="users-table-container">
        ${loadingState('Loading user directory...')}
      </div>
    </section>
  `;

  window.filterUsersTable = () => {
    const q = (document.getElementById('user-mgmt-search')?.value || '').toLowerCase();
    const role = document.getElementById('user-mgmt-role')?.value || '';

    const filtered = cachedUsers.filter(u => {
      const matchesQ = !q ||
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.department || '').toLowerCase().includes(q) ||
        (u.employee_id || '').toLowerCase().includes(q);
      const matchesRole = !role || u.role === role;
      return matchesQ && matchesRole;
    });

    renderUsersTable(filtered);
  };

  window.refreshUserDirectory = () => loadUsersDirectory();

  await loadUsersDirectory();
}

async function loadUsersDirectory() {
  const container = document.getElementById('users-table-container');
  if (!container) return;

  container.innerHTML = loadingState('Fetching organizational directory...');

  try {
    const list = await api('/users');
    cachedUsers = Array.isArray(list) ? list : [];
    renderUsersTable(cachedUsers);
  } catch (err) {
    container.innerHTML = errorState({
      title: 'Directory Load Error',
      message: err.message,
      onRetry: 'window.refreshUserDirectory()'
    });
  }
}

function renderUsersTable(users) {
  const container = document.getElementById('users-table-container');
  if (!container) return;

  const rows = users.map(u => `
    <tr>
      <td class="fw-bold"><span class="text-muted">#${u.id}</span></td>
      <td class="title-cell">
        <span class="fw-semibold text-dark">${esc(u.full_name)}</span>
        <small class="text-muted d-block">${esc(u.email)}</small>
      </td>
      <td>${roleBadge(u.role)}</td>
      <td><span class="font-monospace">${esc(u.employee_id || '--')}</span></td>
      <td>
        <span class="fw-medium">${esc(u.department || '--')}</span>
        <small class="text-muted d-block">${esc(u.designation || '')}</small>
      </td>
      <td><small class="text-muted">${esc(u.phone_number || '--')}</small></td>
      <td class="text-end">
        <div class="actions justify-content-end d-flex gap-1">
          <button class="button secondary btn-sm py-1 px-2" title="View Profile" onclick="window.openViewUserModal(${u.id})">View</button>
          <button class="button secondary btn-sm py-1 px-2" title="Edit User" onclick="window.openEditUserModal(${u.id})">Edit</button>
          <button class="button danger btn-sm py-1 px-2" title="Delete User" onclick="window.deleteUserPrompt(${u.id}, '${esc(u.full_name)}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');

  container.innerHTML = responsiveTable({
    headers: [
      { label: 'ID' },
      { label: 'Name & Email' },
      { label: 'Role' },
      { label: 'Employee ID' },
      { label: 'Department' },
      { label: 'Phone' },
      { label: 'Actions', className: 'text-end' }
    ],
    rowsHtml: rows,
    emptyMessage: 'No users match the search criteria.'
  });
}

// Modal: Add User
window.openAddUserModal = function() {
  ModalController.open({
    title: 'Create Platform Account',
    bodyHtml: `
      <form id="add-user-modal-form" class="row g-3">
        <div id="add-user-modal-err" class="col-12 alert alert-danger hidden"></div>

        <div class="col-md-6">
          <label class="form-label fw-bold">Full Name *</label>
          <input name="full_name" class="form-control" required placeholder="Alice Vance">
        </div>

        <div class="col-md-6">
          <label class="form-label fw-bold">Work Email *</label>
          <input name="email" type="email" class="form-control" required placeholder="alice@company.com">
        </div>

        <div class="col-md-6">
          <label class="form-label fw-bold">System Role *</label>
          <select name="role" class="form-select" required>
            <option value="Employee">Employee (Decision Maker)</option>
            <option value="Reviewer">Reviewer (Technical Evaluator)</option>
            <option value="Manager">Manager (Leadership Approver)</option>
            <option value="Administrator">Administrator (System Admin)</option>
          </select>
        </div>

        <div class="col-md-6">
          <label class="form-label fw-bold">Employee ID</label>
          <input name="employee_id" class="form-control" placeholder="EMP-204">
        </div>

        <div class="col-md-6">
          <label class="form-label fw-bold">Department</label>
          <input name="department" class="form-control" placeholder="Core Infrastructure">
        </div>

        <div class="col-md-6">
          <label class="form-label fw-bold">Designation</label>
          <input name="designation" class="form-control" placeholder="Staff Systems Architect">
        </div>

        <div class="col-md-6">
          <label class="form-label fw-bold">Phone Number</label>
          <input name="phone_number" class="form-control" placeholder="+1-555-0182">
        </div>

        <div class="col-md-6">
          <label class="form-label fw-bold">Temporary Password *</label>
          <input name="password" type="password" minlength="6" class="form-control" required value="Pass1234">
        </div>

        <div class="col-12 mt-4 text-end">
          <button type="button" class="button secondary me-2" data-bs-dismiss="modal">Cancel</button>
          <button type="submit" class="button primary">Create Account <span>&rarr;</span></button>
        </div>
      </form>
    `,
    onShow: (bodyEl, bsModal) => {
      const form = bodyEl.querySelector('#add-user-modal-form');
      const errEl = bodyEl.querySelector('#add-user-modal-err');

      form.onsubmit = async e => {
        e.preventDefault();
        errEl.classList.add('hidden');
        const raw = Object.fromEntries(new FormData(form));

        const rules = {
          full_name: [v => FormValidator.validateRequired(v, 'Full Name')],
          email: [v => FormValidator.validateEmail(v)],
          password: [v => FormValidator.validatePassword(v, 6)]
        };

        const val = FormValidator.validate(raw, rules);
        if (!val.isValid) {
          errEl.textContent = Object.values(val.errors).join('; ');
          errEl.classList.remove('hidden');
          return;
        }

        try {
          const created = await api('/users', {
            method: 'POST',
            body: raw
          });
          toast(`User ${created.full_name} created successfully!`);
          bsModal.hide();
          loadUsersDirectory();
        } catch (err) {
          errEl.textContent = err.message;
          errEl.classList.remove('hidden');
        }
      };
    }
  });
};

// Modal: Edit User
window.openEditUserModal = async function(userId) {
  try {
    const u = await api(`/users/${userId}`);
    ModalController.open({
      title: `Edit User: ${u.full_name}`,
      bodyHtml: `
        <form id="edit-user-modal-form" class="row g-3">
          <div id="edit-user-modal-err" class="col-12 alert alert-danger hidden"></div>

          <div class="col-md-6">
            <label class="form-label fw-bold">Full Name *</label>
            <input name="full_name" class="form-control" required value="${esc(u.full_name)}">
          </div>

          <div class="col-md-6">
            <label class="form-label fw-bold">Email *</label>
            <input name="email" type="email" class="form-control" required value="${esc(u.email)}">
          </div>

          <div class="col-md-6">
            <label class="form-label fw-bold">Role *</label>
            <select name="role" class="form-select" required>
              ${['Employee', 'Reviewer', 'Manager', 'Administrator'].map(r => `
                <option value="${r}" ${u.role === r ? 'selected' : ''}>${r}</option>
              `).join('')}
            </select>
          </div>

          <div class="col-md-6">
            <label class="form-label fw-bold">Employee ID</label>
            <input name="employee_id" class="form-control" value="${esc(u.employee_id || '')}">
          </div>

          <div class="col-md-6">
            <label class="form-label fw-bold">Department</label>
            <input name="department" class="form-control" value="${esc(u.department || '')}">
          </div>

          <div class="col-md-6">
            <label class="form-label fw-bold">Designation</label>
            <input name="designation" class="form-control" value="${esc(u.designation || '')}">
          </div>

          <div class="col-md-6">
            <label class="form-label fw-bold">Phone Number</label>
            <input name="phone_number" class="form-control" value="${esc(u.phone_number || '')}">
          </div>

          <div class="col-md-6">
            <label class="form-label fw-bold">Reset Password (leave blank to retain)</label>
            <input name="password" type="password" minlength="6" class="form-control" placeholder="Optional new password">
          </div>

          <div class="col-12 mt-4 text-end">
            <button type="button" class="button secondary me-2" data-bs-dismiss="modal">Cancel</button>
            <button type="submit" class="button primary">Save Changes <span>&rarr;</span></button>
          </div>
        </form>
      `,
      onShow: (bodyEl, bsModal) => {
        const form = bodyEl.querySelector('#edit-user-modal-form');
        const errEl = bodyEl.querySelector('#edit-user-modal-err');

        form.onsubmit = async e => {
          e.preventDefault();
          errEl.classList.add('hidden');
          const raw = Object.fromEntries(new FormData(form));
          if (!raw.password) delete raw.password;

          try {
            const updated = await api(`/users/${userId}`, {
              method: 'PUT',
              body: raw
            });
            toast(`User ${updated.full_name} updated successfully!`);
            bsModal.hide();
            loadUsersDirectory();
          } catch (err) {
            errEl.textContent = err.message;
            errEl.classList.remove('hidden');
          }
        };
      }
    });
  } catch (err) {
    toast(err.message, 'error');
  }
};

// Modal: View User Profile
window.openViewUserModal = async function(userId) {
  try {
    const u = await api(`/users/${userId}`);
    ModalController.open({
      title: `User Profile: ${u.full_name}`,
      bodyHtml: `
        <div class="p-2">
          <div class="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom">
            <div class="rounded-circle bg-teal-800 text-white d-flex align-items-center justify-content-center fw-bold fs-4" style="width: 56px; height: 56px;">
              ${esc((u.full_name || 'U').charAt(0).toUpperCase())}
            </div>
            <div>
              <h4 class="mb-1">${esc(u.full_name)}</h4>
              ${roleBadge(u.role)}
            </div>
          </div>

          <div class="row g-3">
            <div class="col-sm-6">
              <small class="text-muted d-block fw-bold">Database ID</small>
              <span class="font-monospace">#${u.id}</span>
            </div>
            <div class="col-sm-6">
              <small class="text-muted d-block fw-bold">Employee ID</small>
              <span class="font-monospace">${esc(u.employee_id || 'Not Assigned')}</span>
            </div>
            <div class="col-sm-6">
              <small class="text-muted d-block fw-bold">Email Address</small>
              <span>${esc(u.email)}</span>
            </div>
            <div class="col-sm-6">
              <small class="text-muted d-block fw-bold">Phone Number</small>
              <span>${esc(u.phone_number || 'Not Provided')}</span>
            </div>
            <div class="col-sm-6">
              <small class="text-muted d-block fw-bold">Department</small>
              <span>${esc(u.department || 'General')}</span>
            </div>
            <div class="col-sm-6">
              <small class="text-muted d-block fw-bold">Designation</small>
              <span>${esc(u.designation || 'Staff')}</span>
            </div>
          </div>

          <div class="mt-4 pt-3 border-top text-end">
            <button type="button" class="button secondary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      `
    });
  } catch (err) {
    toast(err.message, 'error');
  }
};

// Delete User Prompt
window.deleteUserPrompt = async function(userId, name) {
  if (confirm(`Are you sure you want to permanently delete user "${name}" (#${userId})? This operation cannot be undone.`)) {
    try {
      await api(`/users/${userId}`, { method: 'DELETE' });
      toast(`User "${name}" deleted.`);
      loadUsersDirectory();
    } catch (err) {
      toast(err.message, 'error');
    }
  }
};
