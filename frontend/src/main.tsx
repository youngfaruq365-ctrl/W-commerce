import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { GXDialogHost } from './components/shared/ui/GXDialog';

// ── DOM Reconciliation Safety Patch ──────────────────────────────────────────
// Prevents "NotFoundError: Failed to execute 'removeChild' on 'Node'"
// Triggered when browser translation (Google Translate), extensions, or animation
// wrappers detach/modify nodes outside React's fiber tree.
if (typeof window !== 'undefined' && typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      if (child.parentNode) {
        return child.parentNode.removeChild(child);
      }
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (referenceNode.parentNode) {
        return referenceNode.parentNode.insertBefore(newNode, referenceNode);
      }
      return this.appendChild(newNode);
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}

import axios from 'axios';
import { useAuthStore } from './store/authStore';
import { ThemeProvider } from './context/ThemeContext';
import { AnimationProvider } from './context/AnimationContext';
import * as Sentry from "@sentry/react";
import './offline/offlineStore';

Sentry.init({
  dsn: "https://58752bd96ccb33145c85d7ab91cbcea8@o4512157730209792.ingest.us.sentry.io/4512157808721920"
});

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

// ── Global 401 + Network Error Response Interceptor ─────────────────────────
axios.interceptors.response.use(
  response => {
    if (typeof window !== 'undefined' && (window as any).__wasAppOffline) {
      (window as any).__wasAppOffline = false;
      window.dispatchEvent(new CustomEvent('app:reconnected'));
    }
    return response;
  },
  async error => {
    const status = error?.response?.status;
    const requestUrl = error?.config?.url ?? '';

    // Network failure (backend down, CORS, DNS, timeout)
    if (!error.response && (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || error.message === 'Network Error')) {
      if (typeof window !== 'undefined') {
        (window as any).__wasAppOffline = true;
      }
      // Don't spam — only fire once per failure burst
      if (!window.__networkErrorShown) {
        window.__networkErrorShown = true;
        window.dispatchEvent(new CustomEvent('app:offline'));
        setTimeout(() => { window.__networkErrorShown = false; }, 5000);
      }
      return Promise.reject(error);
    }

    // Only handle 401s from API routes, not from auth routes themselves
    // (to avoid redirect loops on login / checkAuth calls).
    const isAuthRoute = /\/api\/v1\/auth\//i.test(requestUrl);

    if (status === 401 && !isAuthRoute) {
      try {
        useAuthStore.getState().logout();
      } catch {
        // Store may not be mounted yet
      }
      const returnPath = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?from=${returnPath}`;
    }

    return Promise.reject(error);
  }
);

// Helper: extract human-readable message from any axios error
export function getApiErrorMessage(error, fallback = 'An unexpected error occurred') {
  return error?.response?.data?.message
    || error?.response?.data?.error
    || error?.message
    || fallback;
}

if (import.meta.env.DEV && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister();
    }
  }).catch(() => {});
}

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('GlobalErrorBoundary caught an error:', error, errorInfo);
    const msg = String(error?.message || error || '');
    const isStaleModuleError =
      msg.includes("Cannot read properties of null (reading 'use") ||
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Importing a module script failed');
    if (isStaleModuleError && typeof window !== 'undefined') {
      const lastReload = Number(sessionStorage.getItem('gx_module_reload_ts') || 0);
      if (Date.now() - lastReload > 10000) {
        sessionStorage.setItem('gx_module_reload_ts', String(Date.now()));
        window.location.reload();
        return;
      }
    }
  }
  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;
      return (
        <div style={{
          padding: '2rem',
          background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)',
          color: '#e2e8f0',
          minHeight: '100vh',
          zIndex: 9999,
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.5rem' }}>Something went wrong</h1>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              The application encountered an unexpected error. Our team has been notified.
            </p>
            {isDev && this.state.error && (
              <pre style={{
                background: '#1e293b', padding: '1rem', borderRadius: '0.75rem',
                overflowX: 'auto', fontSize: '0.75rem', color: '#f87171',
                textAlign: 'left', marginBottom: '1.5rem', maxHeight: '200px', overflowY: 'auto'
              }}>
                {this.state.error?.stack || this.state.error?.toString()}
              </pre>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '0.625rem 1.5rem', background: '#3b82f6', color: 'white',
                  borderRadius: '0.75rem', fontWeight: 700, border: 'none', cursor: 'pointer'
                }}
              >
                Reload page
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                style={{
                  padding: '0.625rem 1.5rem', background: 'rgba(255,255,255,0.1)', color: 'white',
                  borderRadius: '0.75rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer'
                }}
              >
                Go home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const container = document.getElementById('root') as HTMLElement;
const root = (window as any).__reactRoot || ReactDOM.createRoot(container);
(window as any).__reactRoot = root;

root.render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <ThemeProvider>
        <AnimationProvider>
          <App />
          <GXDialogHost />
        </AnimationProvider>
      </ThemeProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>
);
