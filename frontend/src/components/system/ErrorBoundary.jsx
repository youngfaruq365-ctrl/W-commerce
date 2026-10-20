import React from 'react';

/**
 * ErrorBoundary — catches React render errors.
 * In production: shows a branded recovery screen, logs error to server.
 * In development: shows full error details with copy button.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, copied: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });

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

    // In production, log silently to the server
    if (import.meta.env.PROD) {
      try {
        fetch('/api/v1/error-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: error?.toString(),
            stack: error?.stack,
            componentStack: errorInfo?.componentStack,
            url: window.location.href,
            timestamp: new Date().toISOString(),
          }),
          credentials: 'include',
        }).catch(() => {}); // fire-and-forget, never block
      } catch (_) {}
    } else {
    }
  }

  handleCopy = () => {
    const text = `${this.state.error?.toString()}\n\n${this.state.errorInfo?.componentStack}`;
    navigator.clipboard.writeText(text).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const isDev = !import.meta.env.PROD;

    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: '520px',
            width: '100%',
            background: 'var(--bg-secondary, #fff)',
            border: '1px solid var(--border-color, #e5e7eb)',
            borderRadius: '16px',
            padding: '2.5rem',
            textAlign: 'center',
            boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--bg-tertiary, #f9fafb)',
              border: '1px solid var(--border-color, #e5e7eb)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main, #111)' }}>
            Something went wrong
          </h1>
          <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            This page encountered an unexpected error. Try refreshing — if the problem persists, contact support.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '0.6rem 1.5rem',
                background: 'var(--accent-gray, #374151)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Refresh Page
            </button>
            <button
              onClick={() => { window.location.href = '/'; }}
              style={{
                padding: '0.6rem 1.5rem',
                background: 'transparent',
                color: 'var(--text-muted, #6b7280)',
                border: '1px solid var(--border-color, #e5e7eb)',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Go to Home
            </button>
          </div>

          {/* Dev-only: full error details */}
          {isDev && this.state.error && (
            <details
              style={{
                marginTop: '2rem',
                textAlign: 'left',
                background: '#1a1a1a',
                borderRadius: '8px',
                padding: '1rem',
                color: '#f87171',
              }}
            >
              <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', color: '#fca5a5', marginBottom: '0.5rem' }}>
                Dev: Show Error Details
              </summary>
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: '0.72rem',
                  lineHeight: 1.5,
                  color: '#fca5a5',
                  maxHeight: '300px',
                  overflowY: 'auto',
                }}
              >
                {this.state.error?.toString()}
                {'\n\n'}
                {this.state.errorInfo?.componentStack}
              </pre>
              <button
                onClick={this.handleCopy}
                style={{
                  marginTop: '0.75rem',
                  padding: '0.4rem 1rem',
                  background: '#374151',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {this.state.copied ? '✓ Copied' : 'Copy Error'}
              </button>
            </details>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
