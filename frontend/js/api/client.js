// ====================================================================
// Expert Decision Replay Platform - Central API Client
// ====================================================================

import { authState } from '../auth/authState.js';

export const API_BASE = (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '8000'))
  ? 'http://127.0.0.1:8000'
  : '';

/**
 * Normalizes FastAPI error responses into human-friendly strings.
 */
function extractErrorMessage(data, fallback) {
  if (!data) return fallback;
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.detail)) {
    // Pydantic validation error list
    return data.detail.map(e => {
      const field = e.loc ? e.loc.filter(x => x !== 'body').join('.') : 'Field';
      return `${field ? field + ': ' : ''}${e.msg}`;
    }).join('; ');
  }
  if (data.message) return data.message;
  return fallback;
}

/**
 * Centralized fetch API wrapper with automatic JWT injection,
 * response type parsing, and standard HTTP error normalization.
 */
export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});

  const token = authState.getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.body && !(options.body instanceof FormData) && !(options.body instanceof URLSearchParams)) {
    headers.set('Content-Type', 'application/json');
    options.body = JSON.stringify(options.body);
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = path.startsWith('http') ? path : `${API_BASE}${cleanPath}`;

  let response;
  try {
    response = await fetch(fullUrl, { ...options, headers });
  } catch (netErr) {
    throw new Error(`Network Error: Unable to communicate with the server (${netErr.message || 'offline'}).`);
  }

  // Handle HTTP 401 Unauthorized
  if (response.status === 401) {
    let detail = 'Authentication failed. Please check your credentials.';
    try {
      const data = await response.json();
      detail = extractErrorMessage(data, detail);
    } catch {}

    const isLoginEndpoint = cleanPath.includes('/auth/login') || cleanPath.includes('/users/login');
    if (token && !isLoginEndpoint) {
      authState.logout(false);
      detail = 'Your session has expired or is invalid. Please sign in again.';
    }
    throw new Error(detail);
  }

  // Handle HTTP 403 Forbidden
  if (response.status === 403) {
    let detail = 'Access Denied: You do not have sufficient permissions for this action.';
    try {
      const data = await response.json();
      detail = extractErrorMessage(data, detail);
    } catch {}
    throw new Error(detail);
  }

  // Handle HTTP 404 Not Found
  if (response.status === 404) {
    let detail = 'Requested resource was not found.';
    try {
      const data = await response.json();
      detail = extractErrorMessage(data, detail);
    } catch {}
    throw new Error(detail);
  }

  // Handle HTTP 400 / 422 Validation & Business Logic Errors
  if (response.status === 400 || response.status === 422) {
    let detail = 'Validation failed. Please verify your inputs.';
    try {
      const data = await response.json();
      detail = extractErrorMessage(data, detail);
    } catch {}
    throw new Error(detail);
  }

  // Handle HTTP 500+ Internal Server Error
  if (response.status >= 500) {
    let detail = 'An unexpected server error occurred. Please try again or contact system support.';
    try {
      const data = await response.json();
      // Only display server message if not a raw python traceback
      if (data.detail && typeof data.detail === 'string' && !data.detail.includes('Traceback')) {
        detail = data.detail;
      }
    } catch {}
    throw new Error(detail);
  }

  if (!response.ok) {
    let detail = `Request failed (Status ${response.status})`;
    try {
      const data = await response.json();
      detail = extractErrorMessage(data, detail);
    } catch {}
    throw new Error(detail);
  }

  // 204 No Content
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await response.json();
  }

  return await response.blob();
}

/**
 * Downloads a Blob response as a file in the browser.
 */
export function triggerFileDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
