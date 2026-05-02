import React from 'react';

class ChunkErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isChunkError: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Check if this is a chunk loading error
    const isChunkError = error.message && (
      error.message.includes('ChunkLoadError') ||
      error.message.includes('Loading chunk') ||
      error.message.includes('.chunk.js')
    );

    return {
      hasError: true,
      isChunkError
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log the error for debugging
    console.error('ChunkErrorBoundary caught an error:', error, errorInfo);

    // If it's a chunk error, try to recover
    if (this.state.isChunkError) {
      this.handleChunkError();
    }
  }

  handleChunkError = async () => {
    console.warn('🔧 ChunkErrorBoundary handling chunk error...');
    
    // Clear caches and retry
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Increment retry count
      this.setState(prevState => ({
        retryCount: prevState.retryCount + 1
      }));

      // Auto-retry after a delay if not too many retries
      if (this.state.retryCount < 3) {
        setTimeout(() => {
          this.handleRetry();
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to clear caches:', error);
    }
  };

  handleRetry = () => {
    // Reset error state to retry rendering
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload(true);
  };

  renderChunkErrorFallback() {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          textAlign: 'center',
          maxWidth: '500px',
          width: '100%'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: '32px'
          }}>
            🍽️
          </div>
          
          <h1 style={{
            color: '#1f2937',
            fontSize: '24px',
            fontWeight: 'bold',
            margin: '0 0 16px 0',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            Food Zone Menu Loading
          </h1>
          
          <p style={{
            color: '#6b7280',
            fontSize: '16px',
            lineHeight: '1.5',
            margin: '0 0 32px 0'
          }}>
            We're optimizing your menu experience. This will just take a moment.
          </p>

          {this.state.retryCount < 3 ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '24px'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid #d97706',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <span style={{ color: '#d97706', fontWeight: '500' }}>
                Retrying... ({this.state.retryCount + 1}/3)
              </span>
            </div>
          ) : null}
          
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={this.handleRetry}
              style={{
                background: 'linear-gradient(135deg, #d97706, #b45309)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-1px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              🔄 Try Again
            </button>
            
            <button
              onClick={this.handleReload}
              style={{
                background: 'white',
                color: '#d97706',
                border: '2px solid #d97706',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.target.style.background = '#d97706';
                e.target.style.color = 'white';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'white';
                e.target.style.color = '#d97706';
              }}
            >
              🏠 Refresh Page
            </button>
          </div>

          <div style={{
            marginTop: '24px',
            padding: '16px',
            background: '#fef3c7',
            borderRadius: '8px',
            border: '1px solid #fcd34d'
          }}>
            <p style={{
              color: '#92400e',
              fontSize: '14px',
              margin: 0,
              lineHeight: '1.4'
            }}>
              💡 <strong>Tip:</strong> If this continues, try clearing your browser cache or using an incognito window.
            </p>
          </div>
        </div>

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  renderGenericErrorFallback() {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px'
          }}>
            😔
          </div>
          
          <h2 style={{
            color: '#1f2937',
            fontSize: '20px',
            margin: '0 0 12px 0'
          }}>
            Something went wrong
          </h2>
          
          <p style={{
            color: '#6b7280',
            margin: '0 0 24px 0'
          }}>
            We're sorry for the inconvenience. Please try refreshing the page.
          </p>
          
          <button
            onClick={this.handleReload}
            style={{
              background: '#d97706',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh Page
          </button>
        </div>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      return this.state.isChunkError 
        ? this.renderChunkErrorFallback()
        : this.renderGenericErrorFallback();
    }

    return this.props.children;
  }
}

export default ChunkErrorBoundary;
