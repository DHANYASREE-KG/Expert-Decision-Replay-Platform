// ====================================================================
// Expert Decision Replay Platform - Authentication Page (Login/Register)
// ====================================================================

import { authState } from '../auth/authState.js';
import { FormValidator } from '../forms/validator.js';
import { toast } from '../components/toast.js';

export class AuthPage {
  static init() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const authToggle = document.getElementById('auth-toggle');

    if (loginForm) {
      loginForm.onsubmit = e => this.handleLogin(e);
    }
    if (registerForm) {
      registerForm.onsubmit = e => this.handleRegister(e);
    }
    if (authToggle) {
      authToggle.onclick = () => this.toggleMode();
    }
  }

  static toggleMode(mode = null) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const authToggle = document.getElementById('auth-toggle');
    const copyTitle = document.querySelector('#auth-copy h2');
    const copySub = document.querySelector('#auth-copy .muted');

    const shouldShowRegister = mode === 'register' || (mode === null && registerForm.classList.contains('hidden'));

    if (loginForm) loginForm.classList.toggle('hidden', shouldShowRegister);
    if (registerForm) registerForm.classList.toggle('hidden', !shouldShowRegister);

    if (copyTitle) {
      copyTitle.textContent = shouldShowRegister ? 'Create an account' : 'Sign in to your account';
    }
    if (copySub) {
      copySub.textContent = shouldShowRegister
        ? 'Register as an Employee to capture and track decisions.'
        : 'Access your organizational decision registry.';
    }
    if (authToggle) {
      authToggle.textContent = shouldShowRegister
        ? 'Already have an account? Sign in'
        : 'Need an account? Register new user';
    }

    this.clearErrors();
  }

  static clearErrors() {
    const loginErr = document.getElementById('login-error');
    const regErr = document.getElementById('register-error');
    if (loginErr) {
      loginErr.textContent = '';
      loginErr.classList.add('hidden');
    }
    if (regErr) {
      regErr.textContent = '';
      regErr.classList.add('hidden');
    }
  }

  static showLoginError(msg) {
    const errEl = document.getElementById('login-error');
    if (errEl) {
      errEl.textContent = msg;
      errEl.classList.remove('hidden');
      errEl.classList.add('shake');
      setTimeout(() => errEl.classList.remove('shake'), 400);
    }
  }

  static showRegisterError(msg) {
    const errEl = document.getElementById('register-error');
    if (errEl) {
      errEl.textContent = msg;
      errEl.classList.remove('hidden');
    }
  }

  static async handleLogin(e) {
    e.preventDefault();
    this.clearErrors();

    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-password');
    const roleSelect = document.getElementById('login-role');

    const email = (emailInput?.value || '').trim();
    const password = passInput?.value || '';
    const role = roleSelect?.value || '';

    // Frontend validation
    if (!email) {
      return this.showLoginError('Please enter your work email or full name.');
    }
    if (!password) {
      return this.showLoginError('Please enter your account password.');
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Signing In...';
    }

    try {
      const user = await authState.login(email, password, role);
      toast(`Signed in successfully as ${user.full_name} (${user.role}).`);
      if (window.onAuthSuccess) {
        window.onAuthSuccess();
      }
    } catch (err) {
      this.showLoginError(err.message);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    }
  }

  static async handleRegister(e) {
    e.preventDefault();
    this.clearErrors();

    const form = e.target;
    const rawData = Object.fromEntries(new FormData(form));

    // Validation
    const validationRules = {
      full_name: [v => FormValidator.validateRequired(v, 'Full name')],
      email: [v => FormValidator.validateEmail(v)],
      password: [v => FormValidator.validatePassword(v, 6)],
      role: [v => FormValidator.validateRequired(v, 'Role')]
    };

    const result = FormValidator.validate(rawData, validationRules);
    if (!result.isValid) {
      const firstError = Object.values(result.errors)[0];
      return this.showRegisterError(firstError);
    }

    // Password confirmation validation
    const confirmPass = rawData.confirm_password;
    if (confirmPass !== undefined) {
      const confirmErr = FormValidator.validatePasswordConfirm(rawData.password, confirmPass);
      if (confirmErr) return this.showRegisterError(confirmErr);
      delete rawData.confirm_password;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Creating Account...';
    }

    try {
      const created = await authState.register(rawData);
      toast(`Account created for ${created.full_name}! Please sign in.`);
      form.reset();
      this.toggleMode('login');
      const loginEmail = document.getElementById('login-email');
      if (loginEmail) loginEmail.value = created.email;
    } catch (err) {
      this.showRegisterError(err.message);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    }
  }
}
