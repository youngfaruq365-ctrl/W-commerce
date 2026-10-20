import React from 'react';
import { AlertTriangle, WifiOff, Lock, Search, ServerCrash, RefreshCw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const variants = {
  notFound: {
    icon: Search,
    title: 'Not Found',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  serverError: {
    icon: ServerCrash,
    title: 'Something went wrong',
    color: 'text-red-500',
    bg: 'bg-red-500/10',
  },
  unauthorized: {
    icon: Lock,
    title: 'Login required',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  networkError: {
    icon: WifiOff,
    title: 'No connection',
    color: 'text-gray-500',
    bg: 'bg-gray-500/10',
  },
  empty: {
    icon: Search,
    title: 'Nothing here yet',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
};

/**
 * Reusable ErrorState component.
 * 
 * @param {('notFound'|'serverError'|'unauthorized'|'networkError'|'empty')} variant
 * @param {string} title - Override default title
 * @param {string} message - Descriptive message
 * @param {Function} onRetry - If provided, shows a Retry button
 * @param {boolean} showHome - If true, shows a Go Home button
 * @param {string} className - Extra classes for the container
 */
export function ErrorState({
  variant = 'serverError',
  title,
  message,
  onRetry,
  showHome = false,
  className = '',
}) {
  const navigate = useNavigate();
  const cfg = variants[variant] || variants.serverError;
  const Icon = cfg.icon;
  const displayTitle = title || cfg.title;

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      <div className={`w-16 h-16 rounded-2xl ${cfg.bg} flex items-center justify-center mb-4`}>
        <Icon size={32} className={cfg.color} />
      </div>
      <h3 className="text-xl font-black text-[var(--text-main)] mb-2">{displayTitle}</h3>
      {message && (
        <p className="text-sm text-[var(--text-muted)] max-w-sm leading-relaxed mb-6">{message}</p>
      )}
      <div className="flex gap-3 flex-wrap justify-center">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
          >
            <RefreshCw size={14} />
            Try again
          </button>
        )}
        {showHome && (
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-5 py-2 neu-button text-sm font-bold rounded-xl"
          >
            <Home size={14} />
            Go home
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Section-level error boundary — wraps a section and catches render errors.
 * Shows a compact error card instead of crashing the whole page.
 */
export class SectionErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error(`[SectionErrorBoundary:${this.props.name || 'unknown'}]`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="neu-card p-6 my-4">
          <ErrorState
            variant="serverError"
            title={`${this.props.name || 'Section'} failed to load`}
            message="This section encountered an error. The rest of the page is still available."
            onRetry={() => this.setState({ hasError: false, error: null })}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorState;
