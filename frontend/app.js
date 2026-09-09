// ====================================================================
// Expert Decision Replay Platform - Pure Vanilla JavaScript Client
// ====================================================================

const state = {
  token: localStorage.getItem('dr_token'),
  user: null,
  view: 'dashboard',
  decisionId: null
};

// DOM helper
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// HTML escaping helper
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
}[c]));

// Toast notification helper
function toast(message, isError = false) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.style.background = isError ? '#be123c' : '#0f766e';
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3200);
}

// Centralized API Request Wrapper
async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (state.token) {
    headers.set('Authorization', `Bearer ${state.token}`);
  }
  if (options.body && !(options.body instanceof FormData) && !(options.body instanceof URLSearchParams)) {
    headers.set('Content-Type', 'application/json');
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(path, { ...options, headers });

  if (response.status === 401) {
    let detail = 'Authentication failed. Please check your credentials.';
    try {
      const data = await response.json();
      detail = data.detail || detail;
    } catch {}
    // Only log out if user had an active session and is accessing an internal protected route
    if (state.token && !path.includes('/auth/login') && !path.includes('/users/login')) {
      logout(false);
      detail = 'Your session has expired. Please sign in again.';
    }
    throw new Error(detail);
  }

  if (response.status === 403) {
    let detail = 'Access denied: You do not have permission for this action.';
    try {
      const data = await response.json();
      detail = data.detail || detail;
    } catch {}
    throw new Error(detail);
  }

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;
    try {
      const data = await response.json();
      detail = data.detail || detail;
    } catch {}
    throw new Error(detail);
  }

  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('json') ? response.json() : response.blob();
}

// Logout
function logout(notify = true) {
  state.token = null;
  state.user = null;
  localStorage.removeItem('dr_token');
  $('#app-shell').classList.add('hidden');
  $('#auth-screen').classList.remove('hidden');
  if (notify) toast('You have signed out.');
}

// Toggle Auth Screen (Login vs Register)
function setAuth(mode) {
  const isRegister = mode === 'register';
  $('#login-form').classList.toggle('hidden', isRegister);
  $('#register-form').classList.toggle('hidden', !isRegister);
  $('#auth-copy h2').textContent = isRegister ? 'Create an account' : 'Sign in to your account';
  $('#auth-copy .muted').textContent = isRegister ? 'Join your team and track decision rationale.' : 'Access your organizational decision registry.';
  $('#auth-toggle').textContent = isRegister ? 'Already have an account? Sign in' : 'Need an account? Register new user';
}

// App Bootstrapper
async function boot() {
  if (!state.token) {
    $('#auth-screen').classList.remove('hidden');
    $('#app-shell').classList.add('hidden');
    return;
  }
  try {
    const payload = JSON.parse(atob(state.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    const userId = payload.sub;
    state.user = await api(`/users/${userId}`);
    showApp();
  } catch (err) {
    console.error('Session bootstrap failed:', err);
    logout(false);
  }
}

// Display Main Application
function showApp() {
  $('#auth-screen').classList.add('hidden');
  $('#app-shell').classList.remove('hidden');

  $('#user-chip').innerHTML = `${esc(state.user.full_name)}<small>${esc(state.user.email)}</small>`;
  const roleBadge = $('#role-badge');
  roleBadge.textContent = state.user.role || 'Employee';
  roleBadge.className = `role-badge role-${(state.user.role || 'employee').toLowerCase()}`;

  renderNav();
  navigate('dashboard');
}

// Render Sidebar Navigation
// Render Sidebar Navigation with Strict RBAC
function renderNav() {
  const role = (state.user?.role || 'Employee').toLowerCase();
  const isAdmin = ['administrator', 'admin'].includes(role);
  const isManagerOrAdmin = ['manager', 'administrator', 'admin'].includes(role);
  const isReviewerOrAbove = ['reviewer', 'manager', 'administrator', 'admin'].includes(role);

  const items = [
    ['dashboard', '◫', 'Dashboard'],
  ];

  // User Management is strictly for Administrators
  if (isAdmin) {
    items.push(['users', '👥', 'User Management']);
  }

  items.push(
    ['decisions', '◎', 'Decisions'],
    ['create', '＋', 'Create Decision'],
    ['repository', '⌕', 'Knowledge Repository'],
    ['discussions', '☷', 'Discussions']
  );

  if (isReviewerOrAbove) {
    items.push(['approvals', '✓', 'Approvals Queue']);
  }
  if (isManagerOrAdmin) {
    items.push(['reports', '▥', 'Reports']);
  }
  if (isAdmin) {
    items.push(['audit', '◌', 'Audit Activity']);
  }

  $('#nav').innerHTML = items.map(i => `
    <button class="nav-item ${state.view === i[0] ? 'active' : ''}" data-view="${i[0]}">
      <span class="nav-icon">${i[1]}</span>${i[2]}
    </button>
  `).join('');

  $$('#nav .nav-item').forEach(btn => {
    btn.onclick = () => navigate(btn.dataset.view);
  });
}

// Navigation Dispatcher with Strict RBAC Route Guards
function navigate(view, id = null) {
  const role = (state.user?.role || 'Employee').toLowerCase();
  const isAdmin = ['administrator', 'admin'].includes(role);
  const isManagerOrAdmin = ['manager', 'administrator', 'admin'].includes(role);
  const isReviewerOrAbove = ['reviewer', 'manager', 'administrator', 'admin'].includes(role);

  // RBAC Access Guarding
  if ((view === 'users' || view === 'audit') && !isAdmin) {
    toast(`Access Denied: Administrator role required for ${view === 'users' ? 'User Management' : 'Audit Activity'}.`, true);
    if (state.view !== 'dashboard') navigate('dashboard');
    return;
  }
  if (view === 'reports' && !isManagerOrAdmin) {
    toast('Access Denied: Manager or Administrator role required for Reports.', true);
    if (state.view !== 'dashboard') navigate('dashboard');
    return;
  }
  if (view === 'approvals' && !isReviewerOrAbove) {
    toast('Access Denied: Reviewer, Manager, or Administrator role required for Approvals.', true);
    if (state.view !== 'dashboard') navigate('dashboard');
    return;
  }

  state.view = view;
  state.decisionId = id;

  $$('#nav .nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.view === view);
  });

  const titles = {
    dashboard: ['OVERVIEW', 'Dashboard'],
    users: ['ORGANIZATION', 'User Management'],
    decisions: ['DECISION ROOM', 'Decisions'],
    create: ['DECISION ROOM', 'Create Decision'],
    repository: ['KNOWLEDGE BASE', 'Knowledge Repository'],
    discussions: ['COLLABORATION', 'Discussions & Debates'],
    approvals: ['GOVERNANCE', 'Approval Queue'],
    reports: ['INSIGHTS', 'Reports & Export'],
    audit: ['COMPLIANCE', 'Audit & Security Activity'],
    detail: ['DECISION ROOM', 'Decision Details']
  };

  const titleMeta = titles[view] || titles.detail;
  $('#section-kicker').textContent = titleMeta[0];
  $('#page-title').textContent = titleMeta[1];

  render();
  $('.sidebar')?.classList.remove('open');
}

// Page Shell Helper
function shell(title, subtitle, action = '') {
  return `
    <div class="page-intro">
      <div>
        <h2>${title}</h2>
        <p>${subtitle}</p>
      </div>
      ${action}
    </div>
  `;
}

// View Renderer
async function render() {
  const c = $('#content');
  c.innerHTML = '<div class="loading"><div class="spinner-border text-emerald-600 mb-2"></div><br>Loading workspace...</div>';

  try {
    switch (state.view) {
      case 'dashboard': return await renderDashboard(c);
      case 'users': return await renderUserManagement(c);
      case 'decisions': return await renderDecisions(c);
      case 'create': return renderDecisionEditor(c);
      case 'detail': return await renderDecisionDetail(c);
      case 'repository': return await renderRepository(c);
      case 'discussions': return await renderDiscussions(c);
      case 'approvals': return await renderApprovals(c);
      case 'reports': return renderReports(c);
      case 'audit': return await renderAudit(c);
      default: return await renderDashboard(c);
    }
  } catch (err) {
    c.innerHTML = `
      <div class="error-state">
        <p class="fw-bold mb-2">${esc(err.message)}</p>
        <button class="button secondary" onclick="render()">Try Again</button>
      </div>
    `;
  }
}

// ====================================================================
// MODULE 1: DASHBOARD
// ====================================================================
async function renderDashboard(c) {
  let stats = {};
  const role = (state.user?.role || 'Employee').toLowerCase();

  try {
    if (role === 'administrator' || role === 'admin') {
      stats = await api('/dashboard/admin');
    } else if (role === 'manager') {
      stats = await api('/dashboard/manager');
    } else {
      stats = await api('/dashboard/employee');
    }
  } catch (e) {
    console.warn('Dashboard stats fallback:', e);
  }

  const cards = [
    ['Total Decisions', stats.total_decisions ?? stats.team_decisions ?? 0],
    ['Under Review', stats.under_review ?? 0],
    ['Approved', stats.approved_decisions ?? 0],
    ['Pending Approvals', stats.pending_approvals ?? stats.pending_reviews ?? 0],
  ];

  c.innerHTML = shell(
    `Welcome back, ${esc(state.user.full_name.split(' ')[0])}`,
    'High-level overview of decision workflows, team governance, and activity.',
    `<button class="button primary" onclick="navigate('create')">New Decision <span>+</span></button>`
  ) + `
    <div class="grid stats">
      ${cards.map(x => `
        <div class="stat-card">
          <small>${x[0]}</small>
          <div class="stat-value">${x[1]}</div>
          <div class="stat-accent"></div>
        </div>
      `).join('')}
    </div>

    <div class="grid two-col">
      <section class="panel">
        <div class="panel-head">
          <h3>Recent Organizational Decisions</h3>
          <button class="text-button" onclick="navigate('decisions')">View All &rarr;</button>
        </div>
        <div id="dash-decision-list" class="loading">Loading decisions...</div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h3>Workflow Guidance</h3>
        </div>
        <div class="timeline">
          <div class="timeline-item">
            <b>1. Record Context & Problem</b><br>
            <small>Create draft decisions clearly outlining challenges and constraints.</small>
          </div>
          <div class="timeline-item">
            <b>2. Add & Compare Alternatives</b><br>
            <small>Evaluate cost, feasibility score (1-5), and risk levels.</small>
          </div>
          <div class="timeline-item">
            <b>3. Collaborate & Approve</b><br>
            <small>Submit for reviewer and manager sign-off with permanent audit logs.</small>
          </div>
        </div>
      </section>
    </div>
  `;

  try {
    const list = await api('/decisions');
    const el = $('#dash-decision-list');
    if (!list || list.length === 0) {
      el.outerHTML = '<div class="empty">No decisions found. Create the first decision above.</div>';
    } else {
      el.outerHTML = `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${list.slice(0, 5).map(d => `
                <tr>
                  <td class="title-cell">
                    ${esc(d.title)}
                    <small>${esc(d.category)} · ${new Date(d.created_at).toLocaleDateString()}</small>
                  </td>
                  <td><span class="status status-${(d.status || 'draft').toLowerCase().replace(/\s+/g, '-')}">${esc(d.status)}</span></td>
                  <td>
                    <button class="button secondary btn-sm py-1 px-2" onclick="navigate('detail', ${d.id})">Open</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  } catch (err) {
    $('#dash-decision-list').innerHTML = `<p class="text-danger">${esc(err.message)}</p>`;
  }
}

// ====================================================================
// MODULE 2: USER MANAGEMENT (FULL CRUD IMPLEMENTATION)
// ====================================================================
async function renderUserManagement(c) {
  const role = (state.user?.role || 'Employee').toLowerCase();
  if (!['administrator', 'admin'].includes(role)) {
    c.innerHTML = `
      <div class="alert alert-danger m-4 p-4 rounded-xl border border-red-300 bg-red-50">
        <h3 class="fw-bold text-red-800 fs-5 mb-2">⛔ Access Denied</h3>
        <p class="text-red-700 mb-3">User Management is strictly restricted to System Administrators. Your current role is <b>${esc(state.user?.role || 'Unknown')}</b>.</p>
        <button class="button secondary" onclick="navigate('dashboard')">&larr; Return to Dashboard</button>
      </div>
    `;
    return;
  }

  c.innerHTML = shell(
    'User Management',
    'Perform complete CRUD operations: Create, Read, Update, and Delete organizational users.',
    `<button class="button primary" onclick="openAddUserModal()">Add New User <span>+</span></button>`
  ) + `
    <section class="panel">
      <div class="toolbar">
        <input id="user-search" placeholder="Search by name, email, department..." oninput="filterUserTable()">
        <select id="user-role-filter" onchange="filterUserTable()">
          <option value="">All Roles</option>
          <option value="Employee">Employee</option>
          <option value="Reviewer">Reviewer</option>
          <option value="Manager">Manager</option>
          <option value="Administrator">Administrator</option>
        </select>
        <button class="button secondary" onclick="loadUsersTable()">Refresh Directory</button>
      </div>
      <div id="users-table-container" class="loading">Loading directory...</div>
    </section>
  `;

  await loadUsersTable();
}

let cachedUsers = [];

async function loadUsersTable() {
  const container = $('#users-table-container');
  container.innerHTML = '<div class="loading">Loading users...</div>';
  try {
    cachedUsers = await api('/users');
    renderUsersList(cachedUsers);
  } catch (e) {
    container.innerHTML = `<div class="error-state">${esc(e.message)}</div>`;
  }
}

function filterUserTable() {
  const q = ($('#user-search')?.value || '').toLowerCase();
  const role = $('#user-role-filter')?.value || '';

  const filtered = cachedUsers.filter(u => {
    const matchesQ = !q || 
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.department || '').toLowerCase().includes(q) ||
      (u.employee_id || '').toLowerCase().includes(q);
    const matchesRole = !role || u.role === role;
    return matchesQ && matchesRole;
  });

  renderUsersList(filtered);
}

function renderUsersList(users) {
  const container = $('#users-table-container');
  if (!users || users.length === 0) {
    container.innerHTML = '<div class="empty">No users found matching filter criteria.</div>';
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name & Email</th>
            <th>Role</th>
            <th>Employee ID</th>
            <th>Department / Designation</th>
            <th>Phone</th>
            <th class="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => `
            <tr>
              <td><span class="text-muted fw-bold">#${u.id}</span></td>
              <td class="title-cell">
                ${esc(u.full_name)}
                <small>${esc(u.email)}</small>
              </td>
              <td>
                <span class="role-badge role-${(u.role || 'employee').toLowerCase()}">
                  ${esc(u.role)}
                </span>
              </td>
              <td>${esc(u.employee_id || '--')}</td>
              <td>
                ${esc(u.department || '--')}
                <small class="text-muted d-block">${esc(u.designation || '')}</small>
              </td>
              <td>${esc(u.phone_number || '--')}</td>
              <td class="text-end">
                <div class="actions justify-content-end">
                  <button class="button secondary btn-sm py-1 px-2" onclick="openViewUserModal(${u.id})">View</button>
                  <button class="button secondary btn-sm py-1 px-2" onclick="openEditUserModal(${u.id})">Edit</button>
                  <button class="button danger btn-sm py-1 px-2" onclick="deleteUserPrompt(${u.id}, '${esc(u.full_name)}')">Delete</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Modal Form: Add User
window.openAddUserModal = function() {
  $('#modal-title').textContent = 'Create New User';
  $('#modal-body').innerHTML = `
    <form id="add-user-modal-form" class="row g-3">
      <div class="col-md-6">
        <label>Full Name *</label>
        <input name="full_name" class="form-control" required placeholder="e.g. John Doe">
      </div>
      <div class="col-md-6">
        <label>Work Email *</label>
        <input name="email" type="email" class="form-control" required placeholder="john@company.com">
      </div>
      <div class="col-md-6">
        <label>Role *</label>
        <select name="role" class="form-select" required>
          <option value="Employee">Employee</option>
          <option value="Reviewer">Reviewer</option>
          <option value="Manager">Manager</option>
          <option value="Administrator">Administrator</option>
        </select>
      </div>
      <div class="col-md-6">
        <label>Employee ID</label>
        <input name="employee_id" class="form-control" placeholder="EMP-101">
      </div>
      <div class="col-md-6">
        <label>Department</label>
        <input name="department" class="form-control" placeholder="Engineering">
      </div>
      <div class="col-md-6">
        <label>Designation</label>
        <input name="designation" class="form-control" placeholder="Senior Specialist">
      </div>
      <div class="col-md-6">
        <label>Phone Number</label>
        <input name="phone_number" class="form-control" placeholder="+1-555-0123">
      </div>
      <div class="col-md-6">
        <label>Initial Password (min 6 chars) *</label>
        <input name="password" type="password" class="form-control" minlength="6" required value="Pass1234">
      </div>
      <div class="col-12 mt-4 text-end">
        <button type="button" class="button secondary me-2" data-bs-dismiss="modal">Cancel</button>
        <button type="submit" class="button primary">Create User <span>&rarr;</span></button>
      </div>
    </form>
  `;

  const modalEl = document.getElementById('crud-modal');
  const bsModal = new bootstrap.Modal(modalEl);
  bsModal.show();

  $('#add-user-modal-form').onsubmit = async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      const created = await api('/users', { method: 'POST', body: data });
      toast(`User ${created.full_name} created successfully!`);
      bsModal.hide();
      await loadUsersTable();
    } catch (err) {
      toast(err.message, true);
    }
  };
};

// Modal Form: Edit User
window.openEditUserModal = async function(userId) {
  try {
    const u = await api(`/users/${userId}`);
    $('#modal-title').textContent = `Edit User: ${u.full_name}`;
    $('#modal-body').innerHTML = `
      <form id="edit-user-modal-form" class="row g-3">
        <div class="col-md-6">
          <label>Full Name *</label>
          <input name="full_name" class="form-control" required value="${esc(u.full_name)}">
        </div>
        <div class="col-md-6">
          <label>Email *</label>
          <input name="email" type="email" class="form-control" required value="${esc(u.email)}">
        </div>
        <div class="col-md-6">
          <label>Role *</label>
          <select name="role" class="form-select" required>
            ${['Employee', 'Reviewer', 'Manager', 'Administrator'].map(r => `
              <option value="${r}" ${u.role === r ? 'selected' : ''}>${r}</option>
            `).join('')}
          </select>
        </div>
        <div class="col-md-6">
          <label>Employee ID</label>
          <input name="employee_id" class="form-control" value="${esc(u.employee_id || '')}">
        </div>
        <div class="col-md-6">
          <label>Department</label>
          <input name="department" class="form-control" value="${esc(u.department || '')}">
        </div>
        <div class="col-md-6">
          <label>Designation</label>
          <input name="designation" class="form-control" value="${esc(u.designation || '')}">
        </div>
        <div class="col-md-6">
          <label>Phone Number</label>
          <input name="phone_number" class="form-control" value="${esc(u.phone_number || '')}">
        </div>
        <div class="col-md-6">
          <label>Update Password (leave blank to keep)</label>
          <input name="password" type="password" class="form-control" minlength="6" placeholder="Optional new password">
        </div>
        <div class="col-12 mt-4 text-end">
          <button type="button" class="button secondary me-2" data-bs-dismiss="modal">Cancel</button>
          <button type="submit" class="button primary">Save Changes <span>&rarr;</span></button>
        </div>
      </form>
    `;

    const modalEl = document.getElementById('crud-modal');
    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();

    $('#edit-user-modal-form').onsubmit = async e => {
      e.preventDefault();
      const raw = Object.fromEntries(new FormData(e.target));
      if (!raw.password) delete raw.password; // do not overwrite password if blank
      try {
        const updated = await api(`/users/${userId}`, { method: 'PUT', body: raw });
        toast(`User ${updated.full_name} updated successfully!`);
        bsModal.hide();
        await loadUsersTable();
      } catch (err) {
        toast(err.message, true);
      }
    };
  } catch (e) {
    toast(e.message, true);
  }
};

// Modal: View User Details
window.openViewUserModal = async function(userId) {
  try {
    const u = await api(`/users/${userId}`);
    $('#modal-title').textContent = `User Profile: ${u.full_name}`;
    $('#modal-body').innerHTML = `
      <div class="p-2">
        <div class="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom">
          <div class="rounded-circle bg-teal-100 text-teal-800 d-flex align-items-center justify-content-center fw-bold fs-4" style="width: 56px; height: 56px;">
            ${esc(u.full_name.charAt(0).toUpperCase())}
          </div>
          <div>
            <h4 class="mb-1">${esc(u.full_name)}</h4>
            <span class="role-badge role-${(u.role || 'employee').toLowerCase()}">${esc(u.role)}</span>
          </div>
        </div>

        <div class="row g-3">
          <div class="col-sm-6">
            <small class="text-muted d-block fw-bold">Database ID</small>
            <span>#${u.id}</span>
          </div>
          <div class="col-sm-6">
            <small class="text-muted d-block fw-bold">Employee ID</small>
            <span>${esc(u.employee_id || 'Not Assigned')}</span>
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
    `;

    const modalEl = document.getElementById('crud-modal');
    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
  } catch (e) {
    toast(e.message, true);
  }
};

// Delete User Prompt
window.deleteUserPrompt = async function(userId, name) {
  if (confirm(`Are you sure you want to delete user "${name}" (ID: ${userId})? This operation cannot be undone.`)) {
    try {
      await api(`/users/${userId}`, { method: 'DELETE' });
      toast(`User "${name}" deleted successfully.`);
      await loadUsersTable();
    } catch (err) {
      toast(err.message, true);
    }
  }
};

// ====================================================================
// MODULE 3: DECISIONS & CREATION
// ====================================================================
async function renderDecisions(c) {
  c.innerHTML = shell(
    'Decisions Registry',
    'Browse, filter, and review corporate architectural and strategic decisions.',
    `<button class="button primary" onclick="navigate('create')">New Decision <span>+</span></button>`
  ) + `
    <section class="panel">
      <div class="toolbar">
        <input id="dec-search" placeholder="Search title or problem..." oninput="loadDecisionTable()">
        <select id="dec-status-filter" onchange="loadDecisionTable()">
          <option value="">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Under Review">Under Review</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Archived">Archived</option>
        </select>
        <select id="dec-category-filter" onchange="loadDecisionTable()">
          <option value="">All Categories</option>
          <option value="Technology">Technology</option>
          <option value="Infrastructure">Infrastructure</option>
          <option value="Security">Security</option>
          <option value="Finance">Finance</option>
          <option value="Operations">Operations</option>
        </select>
        <button class="button secondary" onclick="loadDecisionTable()">Refresh</button>
      </div>
      <div id="decision-table-container" class="loading">Loading decisions...</div>
    </section>
  `;

  await loadDecisionTable();
}

async function loadDecisionTable() {
  const container = $('#decision-table-container');
  const q = $('#dec-search')?.value || '';
  const status = $('#dec-status-filter')?.value || '';
  const category = $('#dec-category-filter')?.value || '';

  const params = new URLSearchParams();
  if (q) params.set('search', q);
  if (status) params.set('status', status);
  if (category) params.set('category', category);

  try {
    const list = await api('/decisions' + (params.toString() ? `?${params.toString()}` : ''));
    if (!list || list.length === 0) {
      container.innerHTML = '<div class="empty">No decisions found for these filters.</div>';
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Decision</th>
              <th>Category</th>
              <th>Status</th>
              <th>Created</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(d => `
              <tr>
                <td><span class="text-muted fw-bold">#${d.id}</span></td>
                <td class="title-cell">
                  ${esc(d.title)}
                  <small class="text-truncate" style="max-width: 380px;">${esc(d.problem_statement)}</small>
                </td>
                <td><span class="badge bg-light text-dark border">${esc(d.category)}</span></td>
                <td>
                  <span class="status status-${(d.status || 'draft').toLowerCase().replace(/\s+/g, '-')}">
                    ${esc(d.status)}
                  </span>
                </td>
                <td>${new Date(d.created_at).toLocaleDateString()}</td>
                <td class="text-end">
                  <div class="actions justify-content-end">
                    <button class="button secondary btn-sm py-1 px-2" onclick="navigate('detail', ${d.id})">Open</button>
                    <button class="button secondary btn-sm py-1 px-2" onclick="openEditDecisionModal(${d.id})">Edit</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<div class="error-state">${esc(e.message)}</div>`;
  }
}

// Create Decision View
function renderDecisionEditor(c, existing = null) {
  c.innerHTML = shell(
    existing ? 'Edit Decision' : 'Capture New Decision',
    'Document strategic decision context, evaluate alternatives, and initiate review workflows.'
  ) + `
    <section class="panel">
      <form id="decision-form" class="row g-3">
        <div class="col-md-8">
          <label>Decision Title *</label>
          <input name="title" class="form-control" required maxlength="250" value="${esc(existing?.title || '')}" placeholder="What are we deciding? (e.g. Migrate Primary Datastore to PostgreSQL)">
        </div>
        <div class="col-md-4">
          <label>Category *</label>
          <select name="category" class="form-select" required>
            <option value="">Select Category</option>
            ${['Technology', 'Infrastructure', 'Security', 'Finance', 'Operations', 'Product'].map(cat => `
              <option value="${cat}" ${existing?.category === cat ? 'selected' : ''}>${cat}</option>
            `).join('')}
          </select>
        </div>
        <div class="col-12">
          <label>Problem Statement & Objectives *</label>
          <textarea name="problem_statement" class="form-control" required rows="5" placeholder="Detail the current problem, context, constraints, and success criteria...">${esc(existing?.problem_statement || '')}</textarea>
        </div>
        <div class="col-12 mt-4 text-end">
          <button type="button" class="button secondary me-2" onclick="navigate('decisions')">Cancel</button>
          <button type="submit" class="button primary">${existing ? 'Save Changes' : 'Create Decision'} <span>&rarr;</span></button>
        </div>
      </form>
    </section>
  `;

  $('#decision-form').onsubmit = async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      const result = await api(existing ? `/decisions/${existing.id}` : '/decisions', {
        method: existing ? 'PUT' : 'POST',
        body: data
      });
      toast(existing ? 'Decision updated!' : 'Decision created!');
      navigate('detail', result.id);
    } catch (err) {
      toast(err.message, true);
    }
  };
}

window.openEditDecisionModal = async function(id) {
  try {
    const dec = await api(`/decisions/${id}`);
    renderDecisionEditor($('#content'), dec);
  } catch (e) {
    toast(e.message, true);
  }
};

// ====================================================================
// MODULE 4: DECISION DETAIL & ALTERNATIVES & COLLABORATION
// ====================================================================
async function renderDecisionDetail(c) {
  if (!state.decisionId) return navigate('decisions');

  const d = await api(`/decisions/${state.decisionId}`);
  const role = (state.user?.role || 'Employee').toLowerCase();

  c.innerHTML = shell(
    esc(d.title),
    `<span class="badge bg-light text-dark border me-2">${esc(d.category)}</span> Created ${new Date(d.created_at).toLocaleDateString()}`,
    `<div class="actions">
      <button class="button secondary" onclick="openEditDecisionModal(${d.id})">Edit</button>
      ${d.status === 'Draft' ? `<button class="button primary" onclick="submitDecisionForReview(${d.id})">Submit for Review <span>&rarr;</span></button>` : ''}
    </div>`
  ) + `
    <div class="detail-grid">
      <!-- Left Column: Context, Alternatives, Rationale, Discussions -->
      <div class="d-flex flex-column gap-4">
        <!-- Context Card -->
        <section class="panel">
          <div class="panel-head">
            <h3>Decision Context</h3>
            <span class="status status-${(d.status || 'draft').toLowerCase().replace(/\s+/g, '-')}">${esc(d.status)}</span>
          </div>
          <p class="detail-copy">${esc(d.problem_statement)}</p>
          
          <div class="mt-4 pt-3 border-top">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h4 class="fs-6 fw-bold mb-0">Decision Rationale</h4>
              <button class="btn btn-sm btn-outline-teal text-emerald-700" onclick="editRationalePrompt(${d.id}, '${esc(d.rationale || '')}')">✏️ Edit Rationale</button>
            </div>
            <p class="text-muted fst-italic mb-0">
              ${d.rationale ? esc(d.rationale) : 'No final decision rationale recorded yet.'}
            </p>
          </div>
        </section>

        <!-- Alternatives Section -->
        <section class="panel">
          <div class="panel-head">
            <h3>Alternative Analysis (${d.alternatives?.length || 0})</h3>
            <button class="button secondary btn-sm" onclick="openAddAlternativeModal(${d.id})">Add Alternative +</button>
          </div>
          <div id="alternatives-container" class="loading">Loading alternatives...</div>
        </section>

        <!-- Discussion & Collaboration -->
        <section class="panel">
          <div class="panel-head">
            <h3>Discussions & Notes</h3>
            <button class="button secondary btn-sm" onclick="openAddThreadModal(${d.id})">New Thread +</button>
          </div>
          <div id="discussions-container" class="loading">Loading discussions...</div>
        </section>
      </div>

      <!-- Right Column: Governance, Approvals, Version History -->
      <div class="d-flex flex-column gap-4">
        <!-- Governance & Approval Actions -->
        <section class="panel">
          <div class="panel-head">
            <h3>Governance & Approval</h3>
          </div>
          <div id="approvals-detail-container" class="loading">Loading approvals...</div>
        </section>

        <!-- Version History & Timeline -->
        <section class="panel">
          <div class="panel-head">
            <h3>Version Timeline</h3>
          </div>
          <div id="timeline-container" class="loading">Loading timeline...</div>
        </section>
      </div>
    </div>
  `;

  loadAlternatives(d.id);
  loadDiscussions(d.id);
  loadDecisionApprovals(d.id);
  loadTimeline(d.id);
}

// Load Alternatives & Side-by-Side Comparison
async function loadAlternatives(decisionId) {
  const container = $('#alternatives-container');
  try {
    const list = await api(`/decisions/${decisionId}/alternatives`);
    if (!list || list.length === 0) {
      container.innerHTML = '<div class="empty">No alternatives evaluated yet. Add options using the button above.</div>';
      return;
    }

    container.innerHTML = `
      <div class="table-wrap mb-3">
        <table class="table-bordered">
          <thead>
            <tr>
              <th>Alternative</th>
              <th>Estimated Cost</th>
              <th>Feasibility (1-5)</th>
              <th>Risk Level</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(a => `
              <tr>
                <td class="fw-bold">
                  ${esc(a.name)}
                  <small class="text-muted d-block">${esc(a.description)}</small>
                  <div class="mt-1 small">
                    <span class="text-success">✔ ${esc(a.pros || 'N/A')}</span><br>
                    <span class="text-danger">✖ ${esc(a.cons || 'N/A')}</span>
                  </div>
                </td>
                <td>$${Number(a.estimated_cost || 0).toLocaleString()}</td>
                <td>
                  <span class="badge bg-teal-100 text-teal-800 fw-bold fs-6">
                    ${a.feasibility_score} / 5
                  </span>
                </td>
                <td>
                  <span class="badge ${a.risk_level === 'Low' ? 'bg-success' : a.risk_level === 'Medium' ? 'bg-warning text-dark' : 'bg-danger'}">
                    ${esc(a.risk_level)}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<p class="text-danger">${esc(e.message)}</p>`;
  }
}

// Add Alternative Modal
window.openAddAlternativeModal = function(decisionId) {
  $('#modal-title').textContent = 'Add Alternative Option';
  $('#modal-body').innerHTML = `
    <form id="add-alt-form" class="row g-3">
      <div class="col-md-8">
        <label>Alternative Name *</label>
        <input name="name" class="form-control" required placeholder="e.g. PostgreSQL 16 Enterprise">
      </div>
      <div class="col-md-4">
        <label>Estimated Cost ($) *</label>
        <input name="estimated_cost" type="number" step="0.01" class="form-control" required placeholder="5000">
      </div>
      <div class="col-md-6">
        <label>Feasibility Score (1 to 5) *</label>
        <select name="feasibility_score" class="form-select" required>
          <option value="5">5 - Highly Feasible</option>
          <option value="4">4 - Good</option>
          <option value="3" selected>3 - Moderate</option>
          <option value="2">2 - Difficult</option>
          <option value="1">1 - Very Difficult</option>
        </select>
      </div>
      <div class="col-md-6">
        <label>Risk Level *</label>
        <select name="risk_level" class="form-select" required>
          <option value="Low">Low</option>
          <option value="Medium" selected>Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
      </div>
      <div class="col-12">
        <label>Description *</label>
        <textarea name="description" class="form-control" rows="2" required placeholder="Evaluation details..."></textarea>
      </div>
      <div class="col-md-6">
        <label>Pros (Advantages) *</label>
        <textarea name="pros" class="form-control" rows="2" required placeholder="Key strengths..."></textarea>
      </div>
      <div class="col-md-6">
        <label>Cons (Disadvantages) *</label>
        <textarea name="cons" class="form-control" rows="2" required placeholder="Drawbacks, risks, dependencies..."></textarea>
      </div>
      <div class="col-12 mt-4 text-end">
        <button type="button" class="button secondary me-2" data-bs-dismiss="modal">Cancel</button>
        <button type="submit" class="button primary">Save Alternative <span>&rarr;</span></button>
      </div>
    </form>
  `;

  const modalEl = document.getElementById('crud-modal');
  const bsModal = new bootstrap.Modal(modalEl);
  bsModal.show();

  $('#add-alt-form').onsubmit = async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    data.estimated_cost = parseFloat(data.estimated_cost);
    data.feasibility_score = parseInt(data.feasibility_score);
    try {
      await api(`/decisions/${decisionId}/alternatives`, { method: 'POST', body: data });
      toast('Alternative added!');
      bsModal.hide();
      loadAlternatives(decisionId);
    } catch (err) {
      toast(err.message, true);
    }
  };
};

// Edit Rationale Prompt
window.editRationalePrompt = async function(decisionId, currentVal) {
  const newVal = prompt('Enter the formal decision rationale:', currentVal);
  if (newVal !== null) {
    try {
      await api(`/decisions/${decisionId}/rationale`, { method: 'PUT', body: { rationale: newVal } });
      toast('Decision rationale updated!');
      render();
    } catch (e) {
      toast(e.message, true);
    }
  }
};

// Submit Decision for Review
window.submitDecisionForReview = async function(decisionId) {
  try {
    await api(`/decisions/${decisionId}/status`, { method: 'PATCH', body: { status: 'Under Review' } });
    toast('Decision submitted for review!');
    render();
  } catch (e) {
    toast(e.message, true);
  }
};

// Load Discussions
async function loadDiscussions(decisionId) {
  const container = $('#discussions-container');
  try {
    const threads = await api(`/decisions/${decisionId}/threads`);
    const comments = await api(`/decisions/${decisionId}/comments`);

    if ((!threads || threads.length === 0) && (!comments || comments.length === 0)) {
      container.innerHTML = '<div class="empty">No discussion threads yet. Start the conversation above.</div>';
      return;
    }

    container.innerHTML = `
      <div class="d-flex flex-column gap-3">
        ${(threads || []).map(t => `
          <div class="p-3 bg-light rounded border">
            <h5 class="fs-6 fw-bold mb-1">${esc(t.title)}</h5>
            <p class="small text-muted mb-2">${esc(t.description || '')}</p>
            <div class="ps-3 border-start">
              ${(comments || []).filter(c => c.thread_id === t.id).map(c => `
                <div class="mb-2">
                  <span class="fw-bold small">User #${c.user_id}:</span>
                  <span class="small">${esc(c.content)}</span>
                  <small class="text-muted d-block">${new Date(c.created_at).toLocaleString()}</small>
                </div>
              `).join('')}
              <div class="d-flex gap-2 mt-2">
                <input id="reply-${t.id}" class="form-control form-control-sm" placeholder="Post reply...">
                <button class="btn btn-sm btn-dark" onclick="sendThreadReply(${t.id})">Reply</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<p class="text-danger">${esc(e.message)}</p>`;
  }
}

window.sendThreadReply = async function(threadId) {
  const input = $(`#reply-${threadId}`);
  if (!input || !input.value.trim()) return;
  try {
    await api(`/threads/${threadId}/comments`, { method: 'POST', body: { content: input.value.trim() } });
    input.value = '';
    toast('Reply posted!');
    loadDiscussions(state.decisionId);
  } catch (e) {
    toast(e.message, true);
  }
};

// Add Thread Modal
window.openAddThreadModal = function(decisionId) {
  $('#modal-title').textContent = 'New Discussion Thread';
  $('#modal-body').innerHTML = `
    <form id="add-thread-form" class="row g-3">
      <div class="col-12">
        <label>Thread Topic *</label>
        <input name="title" class="form-control" required placeholder="e.g. Scalability Benchmarks">
      </div>
      <div class="col-12">
        <label>Description / Initial Context *</label>
        <textarea name="description" class="form-control" rows="3" required placeholder="What should the team discuss?"></textarea>
      </div>
      <div class="col-12 mt-4 text-end">
        <button type="button" class="button secondary me-2" data-bs-dismiss="modal">Cancel</button>
        <button type="submit" class="button primary">Start Discussion <span>&rarr;</span></button>
      </div>
    </form>
  `;

  const modalEl = document.getElementById('crud-modal');
  const bsModal = new bootstrap.Modal(modalEl);
  bsModal.show();

  $('#add-thread-form').onsubmit = async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      await api(`/decisions/${decisionId}/threads`, { method: 'POST', body: data });
      toast('Discussion thread started!');
      bsModal.hide();
      loadDiscussions(decisionId);
    } catch (err) {
      toast(err.message, true);
    }
  };
};

// Load Decision Approvals
async function loadDecisionApprovals(decisionId) {
  const container = $('#approvals-detail-container');
  try {
    const approvals = await api(`/approvals?decision_id=${decisionId}`);
    if (!approvals || approvals.length === 0) {
      container.innerHTML = `
        <p class="text-muted small">No formal reviews assigned yet.</p>
        <button class="button secondary btn-sm" onclick="openAssignReviewModal(${decisionId})">Assign Reviewer +</button>
      `;
      return;
    }

    container.innerHTML = `
      <div class="d-flex flex-column gap-2 mb-3">
        ${approvals.map(a => `
          <div class="p-2 border rounded bg-light">
            <div class="d-flex justify-content-between align-items-center">
              <span class="fw-bold small">Level ${a.approval_level} Review</span>
              <span class="status status-${a.status.toLowerCase()}">${esc(a.status)}</span>
            </div>
            <small class="text-muted d-block mt-1">Reviewer ID: #${a.reviewer_id} · ${a.comments || 'Awaiting sign-off'}</small>
            ${a.status === 'Pending' ? `
              <div class="actions mt-2">
                <button class="btn btn-sm btn-success py-0 px-2" onclick="actOnApproval(${a.id}, 'Approved')">Approve</button>
                <button class="btn btn-sm btn-danger py-0 px-2" onclick="actOnApproval(${a.id}, 'Rejected')">Reject</button>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
      <button class="button secondary btn-sm" onclick="openAssignReviewModal(${decisionId})">Assign Another Reviewer +</button>
    `;
  } catch (e) {
    container.innerHTML = `<p class="text-danger small">${esc(e.message)}</p>`;
  }
}

window.actOnApproval = async function(approvalId, status) {
  const comments = prompt(`Enter comments for ${status}:`, `Marked as ${status}`);
  try {
    await api(`/approvals/${approvalId}`, {
      method: 'PATCH',
      body: { status, comments: comments || status }
    });
    toast(`Approval ${status}!`);
    render();
  } catch (e) {
    toast(e.message, true);
  }
};

window.openAssignReviewModal = function(decisionId) {
  $('#modal-title').textContent = 'Assign Approval Reviewer';
  $('#modal-body').innerHTML = `
    <form id="assign-rev-form" class="row g-3">
      <div class="col-12">
        <label>Reviewer User ID *</label>
        <input name="reviewer_id" type="number" class="form-control" required placeholder="e.g. 3">
      </div>
      <div class="col-12">
        <label>Approval Level *</label>
        <select name="approval_level" class="form-select" required>
          <option value="1">Level 1 - Architectural / Peer Review</option>
          <option value="2">Level 2 - Managerial Approval</option>
        </select>
      </div>
      <div class="col-12 mt-4 text-end">
        <button type="button" class="button secondary me-2" data-bs-dismiss="modal">Cancel</button>
        <button type="submit" class="button primary">Assign Review <span>&rarr;</span></button>
      </div>
    </form>
  `;

  const modalEl = document.getElementById('crud-modal');
  const bsModal = new bootstrap.Modal(modalEl);
  bsModal.show();

  $('#assign-rev-form').onsubmit = async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    data.decision_id = decisionId;
    data.reviewer_id = parseInt(data.reviewer_id);
    data.approval_level = parseInt(data.approval_level);
    try {
      await api('/approvals', { method: 'POST', body: data });
      toast('Review assigned!');
      bsModal.hide();
      render();
    } catch (err) {
      toast(err.message, true);
    }
  };
};

// Load Timeline
async function loadTimeline(decisionId) {
  const container = $('#timeline-container');
  try {
    const history = await api(`/decisions/${decisionId}/history`);
    if (!history || history.length === 0) {
      container.innerHTML = '<div class="empty">No version history yet.</div>';
      return;
    }

    container.innerHTML = `
      <div class="timeline">
        ${history.map(v => `
          <div class="timeline-item">
            <b>Version ${v.version_number}</b><br>
            <small>${esc(v.title)} · ${new Date(v.created_at).toLocaleString()}</small>
          </div>
        `).join('')}
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<p class="text-danger small">${esc(e.message)}</p>`;
  }
}

// ====================================================================
// MODULE 5: KNOWLEDGE REPOSITORY & SEARCH
// ====================================================================
async function renderRepository(c) {
  c.innerHTML = shell(
    'Knowledge Repository & Search',
    'Search organizational memory by keyword, category, status, and tags.'
  ) + `
    <section class="panel">
      <div class="toolbar">
        <input id="repo-search" placeholder="Type keyword to search across decisions..." onkeyup="if(event.key==='Enter')executeRepoSearch()">
        <select id="repo-category">
          <option value="">All Categories</option>
          <option value="Technology">Technology</option>
          <option value="Infrastructure">Infrastructure</option>
          <option value="Security">Security</option>
          <option value="Finance">Finance</option>
        </select>
        <select id="repo-status">
          <option value="">All Statuses</option>
          <option value="Approved">Approved</option>
          <option value="Under Review">Under Review</option>
          <option value="Draft">Draft</option>
          <option value="Archived">Archived</option>
        </select>
        <button class="button primary" onclick="executeRepoSearch()">Search Repository</button>
      </div>

      <div id="repo-results" class="loading">Search previous organizational decisions.</div>
    </section>
  `;

  executeRepoSearch();
}

async function executeRepoSearch() {
  const container = $('#repo-results');
  container.innerHTML = '<div class="loading">Searching knowledge base...</div>';

  const q = $('#repo-search')?.value || '';
  const category = $('#repo-category')?.value || '';
  const status = $('#repo-status')?.value || '';

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (category) params.set('category', category);
  if (status) params.set('status', status);

  try {
    const path = q ? `/decisions/search?${params.toString()}` : `/decisions?${params.toString()}`;
    const res = await api(path);
    const list = Array.isArray(res) ? res : (res.items || res.results || []);

    if (!list || list.length === 0) {
      container.innerHTML = '<div class="empty">No matching organizational decisions found.</div>';
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Decision</th>
              <th>Category</th>
              <th>Status</th>
              <th class="text-end">Action</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(d => `
              <tr>
                <td class="title-cell">
                  ${esc(d.title)}
                  <small>${esc(d.problem_statement || '')}</small>
                </td>
                <td><span class="badge bg-light text-dark border">${esc(d.category)}</span></td>
                <td>
                  <span class="status status-${(d.status || 'draft').toLowerCase().replace(/\s+/g, '-')}">${esc(d.status)}</span>
                </td>
                <td class="text-end">
                  <button class="button secondary btn-sm py-1 px-2" onclick="navigate('detail', ${d.id})">Open Decision</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<div class="error-state">${esc(e.message)}</div>`;
  }
}

// ====================================================================
// MODULE 6: APPROVALS QUEUE
// ====================================================================
async function renderApprovals(c) {
  c.innerHTML = shell(
    'Governance Approval Queue',
    'Review pending decisions, analyze tradeoffs, and record formal approval decisions.'
  ) + `
    <section class="panel">
      <div id="approvals-queue-container" class="loading">Loading approvals queue...</div>
    </section>
  `;

  const container = $('#approvals-queue-container');
  try {
    const list = await api('/approvals');
    if (!list || list.length === 0) {
      container.innerHTML = '<div class="empty">No pending approvals waiting in your queue.</div>';
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Decision ID</th>
              <th>Review Level</th>
              <th>Status</th>
              <th>Notes / Comments</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(a => `
              <tr>
                <td>
                  <button class="text-button fw-bold" onclick="navigate('detail', ${a.decision_id})">
                    Decision #${a.decision_id} &rarr;
                  </button>
                </td>
                <td>Level ${a.approval_level}</td>
                <td><span class="status status-${a.status.toLowerCase()}">${esc(a.status)}</span></td>
                <td>${esc(a.comments || '--')}</td>
                <td>
                  ${a.status === 'Pending' ? `
                    <div class="actions">
                      <button class="btn btn-sm btn-success py-1 px-2" onclick="actOnApproval(${a.id}, 'Approved')">Approve</button>
                      <button class="btn btn-sm btn-danger py-1 px-2" onclick="actOnApproval(${a.id}, 'Rejected')">Reject</button>
                    </div>
                  ` : '<span class="text-muted small">Completed</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<div class="error-state">${esc(e.message)}</div>`;
  }
}

// ====================================================================
// MODULE 7: AUDIT ACTIVITY & COMPLIANCE
// ====================================================================
async function renderAudit(c) {
  const role = (state.user?.role || 'Employee').toLowerCase();
  if (!['administrator', 'admin'].includes(role)) {
    c.innerHTML = `
      <div class="alert alert-danger m-4 p-4 rounded-xl border border-red-300 bg-red-50">
        <h3 class="fw-bold text-red-800 fs-5 mb-2">⛔ Access Denied</h3>
        <p class="text-red-700 mb-3">System Audit & Compliance logs are strictly restricted to System Administrators. Your current role is <b>${esc(state.user?.role || 'Unknown')}</b>.</p>
        <button class="button secondary" onclick="navigate('dashboard')">&larr; Return to Dashboard</button>
      </div>
    `;
    return;
  }

  c.innerHTML = shell(
    'Audit & Compliance Activity',
    'Immutable, traceable record of organizational decisions, approvals, and security access.'
  ) + `
    <section class="panel">
      <div id="audit-table-container" class="loading">Loading audit records...</div>
    </section>
  `;

  const container = $('#audit-table-container');
  try {
    const list = await api('/audit-logs');
    const rows = Array.isArray(list) ? list : (list.data || list.items || []);

    if (!rows || rows.length === 0) {
      container.innerHTML = '<div class="empty">No audit logs recorded yet.</div>';
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Action</th>
              <th>Entity</th>
              <th>Entity ID</th>
              <th>User ID</th>
              <th>Description</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(x => `
              <tr>
                <td><span class="badge bg-dark">${esc(x.action)}</span></td>
                <td>${esc(x.entity_type || '--')}</td>
                <td>#${x.entity_id || '--'}</td>
                <td>#${x.user_id || '--'}</td>
                <td>${esc(x.description || '--')}</td>
                <td>${x.created_at ? new Date(x.created_at).toLocaleString() : '--'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<div class="error-state">${esc(e.message)}</div>`;
  }
}

// ====================================================================
// MODULE 8: REPORTS & EXPORTS
// ====================================================================
function renderReports(c) {
  const role = (state.user?.role || 'Employee').toLowerCase();
  const isAdmin = ['administrator', 'admin'].includes(role);
  const isManagerOrAdmin = ['manager', 'administrator', 'admin'].includes(role);

  if (!isManagerOrAdmin) {
    c.innerHTML = `
      <div class="alert alert-danger m-4 p-4 rounded-xl border border-red-300 bg-red-50">
        <h3 class="fw-bold text-red-800 fs-5 mb-2">⛔ Access Denied</h3>
        <p class="text-red-700 mb-3">Reports and analytical exports are restricted to Managers and Administrators. Your current role is <b>${esc(state.user?.role || 'Unknown')}</b>.</p>
        <button class="button secondary" onclick="navigate('dashboard')">&larr; Return to Dashboard</button>
      </div>
    `;
    return;
  }

  c.innerHTML = shell(
    'Reports & Export Center',
    'Generate comprehensive reports and export them into professional PDF or Excel format.'
  ) + `
    <div class="grid stats">
      <div class="stat-card">
        <small>Decisions Report</small>
        <div class="stat-value fs-4 mb-2">Decisions</div>
        <div class="d-flex gap-2">
          <button class="button secondary btn-sm py-1 px-2" onclick="downloadReport('decisions', 'pdf')">PDF</button>
          <button class="button secondary btn-sm py-1 px-2" onclick="downloadReport('decisions', 'excel')">Excel</button>
        </div>
      </div>

      <div class="stat-card">
        <small>Approvals Report</small>
        <div class="stat-value fs-4 mb-2">Approvals</div>
        <div class="d-flex gap-2">
          <button class="button secondary btn-sm py-1 px-2" onclick="downloadReport('approvals', 'pdf')">PDF</button>
          <button class="button secondary btn-sm py-1 px-2" onclick="downloadReport('approvals', 'excel')">Excel</button>
        </div>
      </div>

      <div class="stat-card">
        <small>Teams Report</small>
        <div class="stat-value fs-4 mb-2">Teams</div>
        <div class="d-flex gap-2">
          <button class="button secondary btn-sm py-1 px-2" onclick="downloadReport('teams', 'pdf')">PDF</button>
          <button class="button secondary btn-sm py-1 px-2" onclick="downloadReport('teams', 'excel')">Excel</button>
        </div>
      </div>

      ${isAdmin ? `
      <div class="stat-card">
        <small>Audit Report</small>
        <div class="stat-value fs-4 mb-2">Audit</div>
        <div class="d-flex gap-2">
          <button class="button secondary btn-sm py-1 px-2" onclick="downloadReport('audit', 'pdf')">PDF</button>
          <button class="button secondary btn-sm py-1 px-2" onclick="downloadReport('audit', 'excel')">Excel</button>
        </div>
      </div>
      ` : ''}
    </div>

    <section class="panel">
      <h3>Direct Backend Export</h3>
      <p class="muted">Reports extract data dynamically from PostgreSQL according to your authorization level (${esc(state.user?.role || '')}).</p>
    </section>
  `;
}

window.downloadReport = async function(kind, format) {
  try {
    toast(`Generating ${kind} report (${format})...`);
    const blob = await api(`/reports/${kind}/export/${format}`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${kind}_report.${format === 'excel' ? 'xlsx' : 'pdf'}`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`${kind} report downloaded successfully!`);
  } catch (e) {
    toast(e.message, true);
  }
};

// ====================================================================
// MODULE 9: DISCUSSIONS GENERAL VIEW
// ====================================================================
async function renderDiscussions(c) {
  c.innerHTML = shell(
    'Discussions & Debates',
    'Review all collaborative threads across active organizational decisions.'
  ) + `
    <section class="panel">
      <div id="all-discussions" class="loading">Loading discussions...</div>
    </section>
  `;

  try {
    const decisions = await api('/decisions');
    const container = $('#all-discussions');
    if (!decisions || decisions.length === 0) {
      container.innerHTML = '<div class="empty">No decisions found.</div>';
      return;
    }

    container.innerHTML = `
      <div class="d-flex flex-column gap-3">
        ${decisions.map(d => `
          <div class="p-3 border rounded bg-white">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h4 class="fs-6 fw-bold mb-0">${esc(d.title)}</h4>
              <button class="button secondary btn-sm py-1 px-2" onclick="navigate('detail', ${d.id})">Open Discussion Room &rarr;</button>
            </div>
            <p class="small text-muted mb-0">${esc(d.problem_statement)}</p>
          </div>
        `).join('')}
      </div>
    `;
  } catch (e) {
    $('#all-discussions').innerHTML = `<p class="text-danger">${esc(e.message)}</p>`;
  }
}

// ====================================================================
// AUTH LISTENERS & STARTUP
// ====================================================================
$('#login-form').onsubmit = async e => {
  e.preventDefault();
  const errEl = $('#login-error');
  errEl.textContent = '';
  errEl.classList.add('hidden');
  const email = ($('#login-email').value || '').trim();
  const password = $('#login-password').value || '';
  const role = $('#login-role')?.value || '';

  if (!email) {
    errEl.textContent = 'Please enter your work email address or full name.';
    errEl.classList.remove('hidden');
    return;
  }
  if (!password) {
    errEl.textContent = 'Please enter your password.';
    errEl.classList.remove('hidden');
    return;
  }

  try {
    const payload = { email, password };
    if (role) payload.role = role;

    const result = await api('/auth/login', {
      method: 'POST',
      body: payload
    });
    state.token = result.access_token;
    localStorage.setItem('dr_token', state.token);
    await boot();
    toast(`Welcome back! Signed in as ${state.user?.role || 'User'}.`);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
    errEl.classList.add('shake');
    setTimeout(() => errEl.classList.remove('shake'), 400);
  }
};

$('#login-email').oninput = () => $('#login-error').classList.add('hidden');
$('#login-password').oninput = () => $('#login-error').classList.add('hidden');
$('#login-role').onchange = () => $('#login-error').classList.add('hidden');

$('#register-form').onsubmit = async e => {
  e.preventDefault();
  $('#register-error').textContent = '';
  const body = Object.fromEntries(new FormData(e.target));

  try {
    await api('/users', { method: 'POST', body });
    toast('Account registered! Please sign in with your credentials.');
    setAuth('login');
  } catch (err) {
    $('#register-error').textContent = err.message;
  }
};

$('#auth-toggle').onclick = () => setAuth($('#register-form').classList.contains('hidden') ? 'register' : 'login');
$('#logout').onclick = () => logout();
$('#menu-toggle').onclick = () => $('.sidebar').classList.toggle('open');

// Boot application
boot();
