import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { GXDialogHost } from './components/shared/ui/GXDialog';

import axios from 'axios';
import { useAuthStore } from './store/authStore';

// ── Global Axios Configuration for CSRF ──────────────────────────────────────
axios.defaults.xsrfCookieName = 'gx_csrf';
axios.defaults.xsrfHeaderName = 'x-csrf-token';
axios.defaults.withCredentials = true;

// ── CSRF Request Interceptor ─────────────────────────────────────────────────
axios.interceptors.request.use(config => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
    const match = document.cookie.match(new RegExp('(^| )gx_csrf=([^;]+)'));
    if (match) {
      if (config.headers && typeof config.headers.set === 'function') {
        config.headers.set('x-csrf-token', match[2]);
      } else if (config.headers) {
        config.headers['x-csrf-token'] = match[2];
      }
    }
  }
  return config;
});

// ── Global 401 Response Interceptor ─────────────────────────────────────────
// When any API call returns 401 (session expired / token invalid), clear local
// auth state and redirect to login so the user is never stuck with stale data.
axios.interceptors.response.use(
  response => response,
  async error => {
    const status = error?.response?.status;
    const requestUrl = error?.config?.url ?? '';

    // Only handle 401s from API routes, not from auth routes themselves
    // (to avoid redirect loops on login / checkAuth calls).
    const isAuthRoute = /\/api\/v1\/auth\//i.test(requestUrl);

    if (status === 401 && !isAuthRoute) {
      try {
        // Clear local auth state without hitting the server (server already rejected us)
        useAuthStore.getState().logout();
      } catch {
        // Store may not be mounted yet — clear manually
      }
      // Redirect to login, preserving the current path so users can return after re-auth
      const returnPath = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?from=${returnPath}`;
    }

    return Promise.reject(error);
  }
);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
    <GXDialogHost />
  </React.StrictMode>
);
