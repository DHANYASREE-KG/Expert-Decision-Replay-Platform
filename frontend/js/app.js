// ====================================================================
// Expert Decision Replay Platform - Main Application Bootstrap
// ====================================================================

import { authState } from './auth/authState.js';
import { router } from './router/router.js';
import { AppLayout } from './layouts/appLayout.js';
import { AuthPage } from './pages/authPage.js';
import { toast } from './components/toast.js';

// Page modules
import { renderEmployeeDashboard } from './pages/employeeDashboard.js';
import { renderReviewerDashboard } from './pages/reviewerDashboard.js';
import { renderManagerDashboard } from './pages/managerDashboard.js';
import { renderAdminDashboard } from './pages/adminDashboard.js';
import { renderDecisionsList } from './pages/decisionsList.js';
import { renderDecisionForm } from './pages/decisionForm.js';
import { renderDecisionDetailPage } from './pages/decisionDetail.js';
import { renderGeneralDiscussions } from './pages/discussions.js';
import { renderApprovalsPage } from './pages/approvals.js';
import { renderRepositoryPage } from './pages/repository.js';
import { renderAuditPage } from './pages/audit.js';
import { renderReportsPage } from './pages/reports.js';
import { renderUserManagementPage } from './pages/userManagement.js';

// 1. Register Routes & RBAC Roles
router.register('dashboard', (container) => {
  const role = authState.getRoleNormalized();
  if (role === 'administrator' || role === 'admin') {
    return renderAdminDashboard(container);
  }
  if (role === 'manager') {
    return renderManagerDashboard(container);
  }
  if (role === 'reviewer') {
    return renderReviewerDashboard(container);
  }
  return renderEmployeeDashboard(container);
}, { kicker: 'WORKSPACE', title: 'Dashboard' });

router.register('decisions', renderDecisionsList, { kicker: 'DECISION ROOM', title: 'Decisions' });
router.register('create', (c) => renderDecisionForm(c, null), { kicker: 'DECISION ROOM', title: 'Create Decision' });
router.register('edit', (c, id) => renderDecisionForm(c, id), { kicker: 'DECISION ROOM', title: 'Edit Decision' });
router.register('detail', (c, id) => renderDecisionDetailPage(c, id), { kicker: 'DECISION ROOM', title: 'Decision Details' });
router.register('repository', renderRepositoryPage, { kicker: 'KNOWLEDGE BASE', title: 'Knowledge Repository' });
router.register('discussions', renderGeneralDiscussions, { kicker: 'COLLABORATION', title: 'Discussions' });
router.register('profile', () => {
  AppLayout.openProfileModal();
  router.navigate('dashboard');
}, { kicker: 'ACCOUNT', title: 'My Profile' });

// Role-protected Routes
router.register('approvals', renderApprovalsPage, {
  kicker: 'GOVERNANCE',
  title: 'Approvals Queue',
  roles: ['Reviewer', 'Manager', 'Administrator']
});

router.register('reports', renderReportsPage, {
  kicker: 'INSIGHTS',
  title: 'Reports & Export',
  roles: ['Manager', 'Administrator']
});

router.register('audit', renderAuditPage, {
  kicker: 'COMPLIANCE',
  title: 'Audit & System Activity',
  roles: ['Administrator']
});

router.register('users', renderUserManagementPage, {
  kicker: 'ORGANIZATION',
  title: 'User Management',
  roles: ['Administrator']
});

// 2. Global Bridge for In-App Navigation
window.navigateTo = (view, id = null, params = {}) => router.navigate(view, id, params);
window.renderCurrentPage = () => router.render();

// 3. UI Shell State Toggle
function showAuthScreen() {
  const authEl = document.getElementById('auth-screen');
  const appEl = document.getElementById('app-shell');
  if (authEl) authEl.classList.remove('hidden');
  if (appEl) appEl.classList.add('hidden');
}

function showAppShell() {
  const authEl = document.getElementById('auth-screen');
  const appEl = document.getElementById('app-shell');
  if (authEl) authEl.classList.add('hidden');
  if (appEl) appEl.classList.remove('hidden');

  AppLayout.renderProfile();
  AppLayout.renderSidebar(router.currentView);
}

// 4. Auth Lifecycle Listener
authState.subscribe((event) => {
  if (event === 'logout' || event === 'unauthenticated') {
    showAuthScreen();
    toast('You have signed out.');
  } else if (event === 'authenticated') {
    showAppShell();
  }
});

window.onAuthSuccess = () => {
  showAppShell();
  router.navigate('dashboard');
};

// 5. App Initialization
async function boot() {
  AuthPage.init();

  // Bind static header & sidebar triggers
  const logoutBtn = document.getElementById('logout');
  if (logoutBtn) {
    logoutBtn.onclick = () => authState.logout();
  }

  const menuToggle = document.getElementById('menu-toggle');
  if (menuToggle) {
    menuToggle.onclick = () => {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) sidebar.classList.toggle('open');
    };
  }

  const isAuthed = await authState.init();
  if (isAuthed) {
    showAppShell();
    router.navigate('dashboard');
  } else {
    showAuthScreen();
  }
}

// Run bootstrap
boot();
