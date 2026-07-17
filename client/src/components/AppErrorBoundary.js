import React from 'react';

// Render-only error boundary: catches render crashes and shows a reload
// screen. Deliberately does NOT intercept network requests or chunk loading
// (the old ChunkErrorBoundary blocked order submissions).
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('App render error:', error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', padding: 16 }}>
          <div style={{ textAlign: 'center', maxWidth: 360 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>😵</div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
              The screen hit an unexpected error. Reloading usually fixes it.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '10px 24px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              Reload app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default AppErrorBoundary;
