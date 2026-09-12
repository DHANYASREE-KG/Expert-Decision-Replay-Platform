// ====================================================================
// Expert Decision Replay Platform - Client-Side Router with RBAC
// ====================================================================

import { authState } from '../auth/authState.js';
import { AppLayout } from '../layouts/appLayout.js';
import { toast } from '../components/toast.js';
import { loadingState, errorState } from '../components/feedback.js';

class Router {
  constructor() {
    this.routes = {};
    this.currentView = 'dashboard';
    this.currentId = null;
    this.params = {};
  }

  register(view, handler, meta = {}) {
    this.routes[view] = {
      handler,
      meta: {
        kicker: meta.kicker || 'OVERVIEW',
        title: meta.title || view.charAt(0).toUpperCase() + view.slice(1),
        roles: meta.roles || [] // empty means all authenticated roles
      }
    };
  }

  async navigate(view, id = null, params = {}) {
    if (!authState.isAuthenticated()) {
      return;
    }

    const route = this.routes[view];
    if (!route) {
      console.warn(`Route "${view}" not found. Falling back to dashboard.`);
      return this.navigate('dashboard');
    }

    // Role-based Access Guard
    const userRole = authState.getRole();
    if (route.meta.roles && route.meta.roles.length > 0) {
      const allowed = route.meta.roles.some(
        r => r.toLowerCase() === userRole.toLowerCase() || (['administrator', 'admin'].includes(r.toLowerCase()) && authState.isAdmin())
      );
      if (!allowed) {
        toast(`Access Denied: ${route.meta.roles.join(' or ')} privilege required for ${route.meta.title}.`, 'error');
        if (this.currentView !== 'dashboard') {
          return this.navigate('dashboard');
        }
        return;
      }
    }

    this.currentView = view;
    this.currentId = id;
    this.params = params;

    // Update Layout sidebar and header
    AppLayout.renderSidebar(view);
    AppLayout.updateHeader(route.meta.kicker, route.meta.title);

    // Close mobile drawer if open
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.remove('open');

    // Render View
    await this.render();
  }

  async render() {
    const container = document.getElementById('content');
    if (!container) return;

    const route = this.routes[this.currentView];
    if (!route) return;

    container.innerHTML = loadingState(`Loading ${route.meta.title}...`);

    try {
      await route.handler(container, this.currentId, this.params);
    } catch (err) {
      console.error(`Render error in view "${this.currentView}":`, err);
      container.innerHTML = errorState({
        title: `Failed to load ${route.meta.title}`,
        message: err.message,
        onRetry: 'window.renderCurrentPage()'
      });
    }
  }
}

export const router = new Router();
