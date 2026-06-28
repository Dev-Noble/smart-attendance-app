import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary, #0f1117)',
          padding: '2rem',
          fontFamily: "'Inter', 'Segoe UI', sans-serif"
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            background: 'var(--bg-secondary, #1a1d27)',
            borderRadius: '16px',
            border: '1px solid var(--border-color, #2a2d3a)',
            padding: '3rem 2rem',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <AlertTriangle size={36} color="#ef4444" />
            </div>

            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--text-primary, #e4e4e7)',
              marginBottom: '0.75rem'
            }}>
              Something went wrong
            </h1>

            <p style={{
              color: 'var(--text-tertiary, #71717a)',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              marginBottom: '2rem'
            }}>
              An unexpected error occurred. This has been logged and we'll look into it.
            </p>

            {this.state.error && (
              <div style={{
                padding: '0.75rem 1rem',
                background: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                textAlign: 'left'
              }}>
                <code style={{
                  fontSize: '0.75rem',
                  color: '#f87171',
                  fontFamily: 'monospace',
                  wordBreak: 'break-word'
                }}>
                  {this.state.error.message}
                </code>
              </div>
            )}

            <button
              onClick={this.handleReload}
              style={{
                padding: '0.75rem 2rem',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #0a3d91, #072b6b)',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
              }}
            >
              <RefreshCw size={16} />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
