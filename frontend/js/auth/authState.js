// ====================================================================
// Expert Decision Replay Platform - Auth State Management
// ====================================================================

import { api } from '../api/client.js';

const TOKEN_KEY = 'dr_token';

class AuthState {
  constructor() {
    this.token = localStorage.getItem(TOKEN_KEY);
    this.user = null;
    this.listeners = [];
  }

  getToken() {
    return this.token;
  }

  getUser() {
    return this.user;
  }

  isAuthenticated() {
    return !!this.token && !!this.user;
  }

  subscribe(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  notify(event) {
    this.listeners.forEach(fn => fn(event, this));
  }

  decodeJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Failed to parse JWT payload:', e);
      return null;
    }
  }

  async init() {
    if (!this.token) {
      this.user = null;
      this.notify('unauthenticated');
      return false;
    }

    const payload = this.decodeJwt(this.token);
    if (!payload || !payload.sub) {
      this.logout(false);
      return false;
    }

    try {
      // Fetch full user record from database
      this.user = await api(`/users/${payload.sub}`);
      this.notify('authenticated');
      return true;
    } catch (err) {
      console.warn('Could not fetch user record from backend; using JWT claims as fallback', err);
      this.user = {
        id: parseInt(payload.sub, 10) || payload.sub,
        email: payload.email || 'user@company.com',
        full_name: payload.email ? payload.email.split('@')[0] : 'User',
        role: payload.role || 'Employee'
      };
      this.notify('authenticated');
      return true;
    }
  }

  async login(email, password, role = '') {
    const payload = {
      email: email.trim(),
      password
    };
    if (role && role.trim()) {
      payload.role = role.trim();
    }

    const result = await api('/auth/login', {
      method: 'POST',
      body: payload
    });

    this.token = result.access_token;
    localStorage.setItem(TOKEN_KEY, this.token);

    await this.init();
    return this.user;
  }

  async register(userData) {
    const created = await api('/users', {
      method: 'POST',
      body: userData
    });
    return created;
  }

  logout(notifyEvent = true) {
    this.token = null;
    this.user = null;
    localStorage.removeItem(TOKEN_KEY);
    if (notifyEvent) {
      this.notify('logout');
    }
  }

  // --- Role Check Helpers ---
  getRole() {
    return (this.user?.role || 'Employee').trim();
  }

  getRoleNormalized() {
    return this.getRole().toLowerCase();
  }

  isAdmin() {
    return ['administrator', 'admin'].includes(this.getRoleNormalized());
  }

  isManager() {
    return this.getRoleNormalized() === 'manager';
  }

  isReviewer() {
    return this.getRoleNormalized() === 'reviewer';
  }

  isEmployee() {
    return this.getRoleNormalized() === 'employee';
  }

  isManagerOrAbove() {
    return ['manager', 'administrator', 'admin'].includes(this.getRoleNormalized());
  }

  isReviewerOrAbove() {
    return ['reviewer', 'manager', 'administrator', 'admin'].includes(this.getRoleNormalized());
  }
}

export const authState = new AuthState();
