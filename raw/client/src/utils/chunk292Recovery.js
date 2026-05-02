// Specialized Recovery System for Chunk 292 Loading Failures
import { getApiUrl } from '../config/api';

class Chunk292Recovery {
  constructor() {
    this.chunk292Failures = 0;
    this.maxFailures = 10;
    this.fallbackMenuData = null;
    this.recoveryActive = false;
    this.setupSpecializedHandling();
  }

  setupSpecializedHandling() {
    // Listen specifically for chunk 292 failures
    window.addEventListener('error', (event) => {
      if (this.isChunk292Error(event)) {
        this.handleChunk292Failure(event);
      }
    });

    // Monitor for repeated failures
    window.addEventListener('unhandledrejection', (event) => {
      if (this.isChunk292Error(event)) {
        this.handleChunk292Failure(event);
      }
    });

    // Preload fallback menu data
    this.preloadFallbackData();
  }

  isChunk292Error(event) {
    const message = event.message || event.reason?.message || '';
    return message.includes('chunk 292') || 
           message.includes('292.d7074078.chunk.js') ||
           (event.target && event.target.src && event.target.src.includes('292'));
  }

  async handleChunk292Failure(event) {
    this.chunk292Failures++;
    console.warn(`🚨 Chunk 292 failure #${this.chunk292Failures} detected`);

    // Prevent default error handling
    event.preventDefault();

    if (this.chunk292Failures >= 3 && !this.recoveryActive) {
      await this.initiateChunk292Recovery();
    }
  }

  async initiateChunk292Recovery() {
    if (this.recoveryActive) return;
    
    this.recoveryActive = true;
    console.warn('🔧 Initiating specialized chunk 292 recovery...');

    try {
      // Method 1: Clear specific chunk 292 from all caches
      await this.clearChunk292FromCaches();

      // Method 2: Try alternative chunk loading
      await this.tryAlternativeChunkLoad();

      // Method 3: Load menu component directly if on menu page
      if (window.location.pathname.includes('/menu')) {
        await this.loadMenuDirectly();
      }

      // Method 4: Show recovery UI
      this.showChunk292RecoveryUI();

    } catch (error) {
      console.error('Chunk 292 recovery failed:', error);
      this.forcePageReload();
    }
  }

  async clearChunk292FromCaches() {
    // Clear from service worker caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        for (const request of requests) {
          if (request.url.includes('292') || request.url.includes('.chunk.js')) {
            await cache.delete(request);
            console.log(`🧹 Deleted ${request.url} from cache ${cacheName}`);
          }
        }
      }
    }

    // Clear from webpack cache
    if (window.__webpack_require__ && window.__webpack_require__.cache) {
      Object.keys(window.__webpack_require__.cache).forEach(key => {
        if (key.includes('292')) {
          delete window.__webpack_require__.cache[key];
          console.log(`🧹 Cleared webpack cache for ${key}`);
        }
      });
    }
  }

  async tryAlternativeChunkLoad() {
    // Try to load chunk 292 with cache busting
    const chunkUrls = [
      '/static/js/292.d7074078.chunk.js',
      './static/js/292.d7074078.chunk.js'
    ];

    for (const url of chunkUrls) {
      try {
        const timestamp = Date.now();
        const response = await fetch(`${url}?cb=${timestamp}`, {
          cache: 'no-cache',
          mode: 'cors'
        });
        
        if (response.ok) {
          const scriptContent = await response.text();
          // Execute the chunk content
          const script = document.createElement('script');
          script.textContent = scriptContent;
          document.head.appendChild(script);
          console.log('✅ Successfully loaded chunk 292 via alternative method');
          return true;
        }
      } catch (error) {
        console.warn(`Failed to load chunk 292 from ${url}:`, error);
      }
    }
    return false;
  }

  async loadMenuDirectly() {
    // If we're on the menu page, try to load menu component directly
    try {
      // Create a fallback menu interface
      const menuContainer = document.getElementById('root');
      if (menuContainer && this.fallbackMenuData) {
        this.renderFallbackMenu(menuContainer);
      }
    } catch (error) {
      console.error('Failed to load menu directly:', error);
    }
  }

  async preloadFallbackData() {
    // Preload basic menu data as fallback - disabled to prevent rate limiting
    console.log('📦 Fallback menu data preloading disabled to prevent rate limiting');
  }

  renderFallbackMenu(container) {
    const fallbackHTML = `
      <div style="min-height: 100vh; background: #f9fafb; padding: 20px;">
        <div style="max-width: 1200px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #d97706; font-size: 2rem; margin-bottom: 10px;">🍽️ Food Zone Menu</h1>
            <p style="color: #6b7280;">Loading optimized menu experience...</p>
          </div>
          
          <div style="display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
            ${this.fallbackMenuData ? this.renderMenuItems() : this.renderLoadingCards()}
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <button onclick="window.location.reload()" 
                    style="background: #d97706; color: white; padding: 12px 24px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              🔄 Refresh Full Menu
            </button>
          </div>
        </div>
      </div>
    `;
    
    container.innerHTML = fallbackHTML;
  }

  renderMenuItems() {
    if (!this.fallbackMenuData || !this.fallbackMenuData.length) {
      return this.renderLoadingCards();
    }

    return this.fallbackMenuData.slice(0, 12).map(item => `
      <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: transform 0.2s;">
        <h3 style="color: #1f2937; margin: 0 0 8px 0; font-size: 18px;">${item.name}</h3>
        <p style="color: #6b7280; margin: 0 0 12px 0; font-size: 14px;">${item.description || 'Delicious food item'}</p>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #d97706; font-weight: bold; font-size: 16px;">Rs. ${item.price}</span>
          <button style="background: #d97706; color: white; padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer;">
            Add to Cart
          </button>
        </div>
      </div>
    `).join('');
  }

  renderLoadingCards() {
    return Array(8).fill(0).map(() => `
      <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <div style="height: 20px; background: #e5e7eb; border-radius: 4px; margin-bottom: 8px; animation: pulse 2s infinite;"></div>
        <div style="height: 14px; background: #e5e7eb; border-radius: 4px; margin-bottom: 12px; width: 80%; animation: pulse 2s infinite;"></div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="height: 16px; background: #e5e7eb; border-radius: 4px; width: 60px; animation: pulse 2s infinite;"></div>
          <div style="height: 32px; background: #e5e7eb; border-radius: 6px; width: 80px; animation: pulse 2s infinite;"></div>
        </div>
      </div>
    `).join('');
  }

  showChunk292RecoveryUI() {
    // Show a specific recovery message for chunk 292
    const existingMessage = document.getElementById('chunk-292-recovery');
    if (existingMessage) return;

    const message = document.createElement('div');
    message.id = 'chunk-292-recovery';
    message.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 8px 16px rgba(0,0,0,0.2);
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      max-width: 400px;
      text-align: center;
    `;
    
    message.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 8px;">
        <div style="width: 20px; height: 20px; border: 2px solid white; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <strong>Menu Recovery Active</strong>
      </div>
      <p style="margin: 0; opacity: 0.9;">Optimizing menu loading experience...</p>
    `;

    // Add CSS animation
    if (!document.getElementById('recovery-animations')) {
      const style = document.createElement('style');
      style.id = 'recovery-animations';
      style.textContent = `
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(message);

    // Auto-remove after 8 seconds
    setTimeout(() => {
      if (message.parentNode) {
        message.parentNode.removeChild(message);
      }
    }, 8000);
  }

  forcePageReload() {
    console.warn('🔄 Forcing page reload due to persistent chunk 292 failures...');
    
    // Clear all caches before reload
    if ('caches' in window) {
      caches.keys().then(names => {
        Promise.all(names.map(name => caches.delete(name)))
          .then(() => window.location.reload(true));
      });
    } else {
      window.location.reload(true);
    }
  }

  // Public method to manually trigger recovery
  triggerRecovery() {
    console.log('🔧 Manual chunk 292 recovery triggered');
    this.chunk292Failures = 3; // Set to trigger recovery
    this.initiateChunk292Recovery();
  }

  // Get recovery status
  getStatus() {
    return {
      failures: this.chunk292Failures,
      recoveryActive: this.recoveryActive,
      hasFallbackData: !!this.fallbackMenuData
    };
  }

  // Reset recovery state
  reset() {
    this.chunk292Failures = 0;
    this.recoveryActive = false;
    console.log('🔄 Chunk 292 recovery state reset');
  }
}

// Create global instance
const chunk292Recovery = new Chunk292Recovery();

// Expose to window for debugging
window.chunk292Recovery = chunk292Recovery;

export default chunk292Recovery;
export { Chunk292Recovery };
