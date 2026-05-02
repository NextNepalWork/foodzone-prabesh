// Enhanced Chunk Loading Error Handler for Production Sites
class ChunkErrorHandler {
  constructor() {
    this.retryAttempts = new Map();
    this.maxRetries = 5;
    this.retryDelay = 2000; // 2 seconds
    this.failedChunks = new Set();
    this.cacheInvalidated = false;
    this.setupGlobalErrorHandler();
    this.setupPerformanceObserver();
  }

  setupGlobalErrorHandler() {
    // Handle chunk loading errors globally
    window.addEventListener('error', (event) => {
      if (this.isChunkLoadError(event)) {
        this.handleChunkError(event);
      }
    });

    // Handle unhandled promise rejections (chunk loading failures)
    window.addEventListener('unhandledrejection', (event) => {
      if (this.isChunkLoadError(event)) {
        this.handleChunkError(event);
      }
    });

    // Handle resource loading failures
    window.addEventListener('error', (event) => {
      if (event.target && event.target.tagName === 'SCRIPT' && 
          event.target.src && event.target.src.includes('.chunk.js')) {
        this.handleScriptLoadError(event);
      }
    }, true);
  }

  setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name.includes('.chunk.js') && entry.transferSize === 0) {
            console.warn(`🔄 Chunk ${entry.name} failed to load (0 bytes transferred)`);
          }
        });
      });
      observer.observe({ entryTypes: ['resource'] });
    }
  }

  isChunkLoadError(event) {
    const message = event.message || event.reason?.message || '';
    const errorName = event.reason?.name || event.error?.name || '';
    return message.includes('ChunkLoadError') || 
           message.includes('Loading chunk') || 
           errorName === 'ChunkLoadError' ||
           message.includes('.chunk.js');
  }

  handleScriptLoadError(event) {
    const src = event.target.src;
    const chunkMatch = src.match(/(\d+)\..*\.chunk\.js/);
    if (chunkMatch) {
      const chunkName = `chunk-${chunkMatch[1]}`;
      console.warn(`🔄 Script loading failed: ${chunkName}`);
      this.retryChunkLoad(chunkName, src);
    }
  }

  handleChunkError(event) {
    const chunkName = this.extractChunkName(event);
    console.warn(`🔄 Chunk loading failed: ${chunkName}. Attempting recovery...`);
    
    // Prevent default error handling
    event.preventDefault();
    
    // Track failed chunks
    this.failedChunks.add(chunkName);
    
    // Try to recover
    this.retryChunkLoad(chunkName);
  }

  extractChunkName(event) {
    const error = event.error || event.reason;
    const message = error?.message || event.message || '';
    
    // Extract chunk name from error message
    const chunkMatch = message.match(/Loading chunk (\d+) failed/);
    if (chunkMatch) {
      return `chunk-${chunkMatch[1]}`;
    }
    
    // Extract from filename
    const fileMatch = message.match(/([^/]+\.chunk\.js)/);
    if (fileMatch) {
      return fileMatch[1];
    }
    
    return 'unknown-chunk';
  }

  async retryChunkLoad(chunkName, scriptSrc = null) {
    const attempts = this.retryAttempts.get(chunkName) || 0;
    
    if (attempts >= this.maxRetries) {
      console.error(`❌ Max retries exceeded for ${chunkName}. Initiating recovery sequence.`);
      await this.initiateRecoverySequence(chunkName);
      return;
    }
    
    this.retryAttempts.set(chunkName, attempts + 1);
    console.log(`🔄 Retry attempt ${attempts + 1}/${this.maxRetries} for ${chunkName}`);
    
    // Progressive delay with exponential backoff
    const delay = this.retryDelay * Math.pow(1.5, attempts);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      // Clear various caches on different retry attempts
      if (attempts === 1) {
        await this.clearWebpackCache(chunkName);
      } else if (attempts === 2) {
        await this.clearServiceWorkerCache();
      } else if (attempts === 3) {
        await this.clearBrowserCache();
      }
      
      // Try direct script injection for specific chunks
      if (scriptSrc && attempts >= 2) {
        await this.tryDirectScriptLoad(scriptSrc, chunkName);
      }
      
    } catch (error) {
      console.error(`Retry ${attempts + 1} failed for ${chunkName}:`, error);
      // Continue to next retry
      setTimeout(() => this.retryChunkLoad(chunkName, scriptSrc), 1000);
    }
  }

  async clearWebpackCache(chunkName) {
    if (window.__webpack_require__ && window.__webpack_require__.cache) {
      Object.keys(window.__webpack_require__.cache).forEach(key => {
        if (key.includes(chunkName) || key.includes('292')) {
          delete window.__webpack_require__.cache[key];
        }
      });
      console.log(`🧹 Cleared webpack cache for ${chunkName}`);
    }
  }

  async clearServiceWorkerCache() {
    if ('serviceWorker' in navigator && 'caches' in window) {
      try {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          for (const request of requests) {
            if (request.url.includes('.chunk.js')) {
              await cache.delete(request);
            }
          }
        }
        console.log(`🧹 Cleared service worker chunk caches`);
      } catch (error) {
        console.warn('Failed to clear service worker cache:', error);
      }
    }
  }

  async clearBrowserCache() {
    // Force cache busting by adding timestamp
    const timestamp = Date.now();
    const scripts = document.querySelectorAll('script[src*=".chunk.js"]');
    scripts.forEach(script => {
      if (script.src.includes('292') || script.src.includes('.chunk.js')) {
        const newSrc = script.src.includes('?') 
          ? `${script.src}&_cb=${timestamp}`
          : `${script.src}?_cb=${timestamp}`;
        script.src = newSrc;
      }
    });
    console.log(`🧹 Applied cache busting to chunk scripts`);
  }

  async tryDirectScriptLoad(scriptSrc, chunkName) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = scriptSrc + '?cb=' + Date.now();
      script.async = true;
      
      script.onload = () => {
        console.log(`✅ Successfully loaded ${chunkName} via direct injection`);
        this.clearRetryAttempts(chunkName);
        resolve();
      };
      
      script.onerror = () => {
        console.warn(`❌ Direct injection failed for ${chunkName}`);
        document.head.removeChild(script);
        reject(new Error(`Direct load failed for ${chunkName}`));
      };
      
      document.head.appendChild(script);
    });
  }

  async initiateRecoverySequence(chunkName) {
    console.warn(`🚨 Initiating recovery sequence for ${chunkName}`);
    
    // Show user-friendly message
    this.showRecoveryMessage();
    
    // Try alternative recovery methods
    try {
      // Method 1: Clear all caches and reload
      await this.clearAllCaches();
      
      // Method 2: Force hard reload after short delay
      setTimeout(() => {
        console.warn(`🔄 Hard reloading page to recover from chunk failure...`);
        window.location.reload(true);
      }, 3000);
      
    } catch (error) {
      console.error('Recovery sequence failed:', error);
      // Last resort: immediate reload
      window.location.reload(true);
    }
  }

  async clearAllCaches() {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('🧹 Cleared all browser caches');
    }
  }

  showRecoveryMessage() {
    // Create a non-intrusive recovery message
    const existingMessage = document.getElementById('chunk-recovery-message');
    if (existingMessage) return;
    
    const message = document.createElement('div');
    message.id = 'chunk-recovery-message';
    message.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f59e0b;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      max-width: 300px;
    `;
    message.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 16px; height: 16px; border: 2px solid white; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <span>Recovering menu data...</span>
      </div>
    `;
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
    document.head.appendChild(style);
    
    document.body.appendChild(message);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (message.parentNode) {
        message.parentNode.removeChild(message);
      }
    }, 5000);
  }

  // Legacy method - now handled by initiateRecoverySequence
  fallbackToDirectImport() {
    this.initiateRecoverySequence('legacy-fallback');
  }

  showFallbackMenu() {
    // Create a simple fallback menu interface
    const fallbackHTML = `
      <div style="min-height: 100vh; padding: 20px; background: #f9fafb;">
        <div style="max-width: 800px; margin: 0 auto; text-align: center;">
          <h1 style="color: #d97706; margin-bottom: 20px;">Food Zone Menu</h1>
          <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p style="margin-bottom: 15px;">Loading menu items...</p>
            <button onclick="window.location.reload()" style="background: #d97706; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">
              Refresh Menu
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.innerHTML = fallbackHTML;
  }

  // Clear retry attempts for successful loads
  clearRetryAttempts(chunkName) {
    this.retryAttempts.delete(chunkName);
  }

  // Get retry statistics
  getRetryStats() {
    return {
      activeRetries: this.retryAttempts.size,
      retryAttempts: Object.fromEntries(this.retryAttempts),
      failedChunks: Array.from(this.failedChunks),
      cacheInvalidated: this.cacheInvalidated
    };
  }

  // Force recovery for specific chunk (useful for debugging)
  forceRecovery(chunkName = 'chunk-292') {
    console.log(`🔧 Force recovery initiated for ${chunkName}`);
    this.retryAttempts.delete(chunkName);
    this.failedChunks.delete(chunkName);
    this.initiateRecoverySequence(chunkName);
  }

  // Check if a specific chunk has failed
  hasChunkFailed(chunkName) {
    return this.failedChunks.has(chunkName);
  }
}

// Initialize global chunk error handler
const chunkErrorHandler = new ChunkErrorHandler();

export default chunkErrorHandler;
export { ChunkErrorHandler };
