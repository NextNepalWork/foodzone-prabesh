// Advanced cache management system for Food Zone Restaurant PWA
// Handles intelligent caching, cleanup, and performance optimization
import { getApiUrl } from '../config/api'; 

class CacheManager {
  constructor() {
    this.cleanupInterval = 10 * 60 * 1000; // 10 minutes in milliseconds
    this.isRunning = false;
    this.intervalId = null;
    this.tableCount = 25; // Tables 1-25
  }

  // Start automatic cleanup every 10 minutes
  startAutoCleanup() {
    if (this.isRunning) {
      console.log('🧹 Cache cleanup already running');
      return;
    }

    console.log('🚀 Starting automatic cache cleanup every 10 minutes');
    this.isRunning = true;
    
    // Run cleanup immediately on start
    this.performCleanup();
    
    // Set interval for recurring cleanup
    this.intervalId = setInterval(() => {
      this.performCleanup();
    }, this.cleanupInterval);
  }

  // Stop automatic cleanup
  stopAutoCleanup() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log('🛑 Stopped automatic cache cleanup');
    }
  }

  // Perform comprehensive cleanup
  performCleanup() {
    const timestamp = new Date().toLocaleString();
    console.log(`🧹 Starting cache cleanup at ${timestamp}`);
    
    try {
      // Clear localStorage for all table sessions
      this.clearLocalStorage();
      
      // Clear sessionStorage for all table sessions
      this.clearSessionStorage();
      
      // Clear cookies related to tables
      this.clearTableCookies();
      
      // Clear browser cache (if possible)
      this.clearBrowserCache();
      
      // Notify server to clear table sessions
      this.clearServerSessions();
      
      console.log('✅ Cache cleanup completed successfully');
      
      // Emit cleanup event for components to listen to
      window.dispatchEvent(new CustomEvent('cacheCleanup', {
        detail: { timestamp, tablesCleared: this.tableCount }
      }));
      
    } catch (error) {
      console.error('❌ Error during cache cleanup:', error);
    }
  }

  // Clear localStorage for table data
  clearLocalStorage() {
    const keysToRemove = [];
    
    // Find all table-related keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (this.isTableRelatedKey(key)) {
        keysToRemove.push(key);
      }
    }
    
    // Remove table-related keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log(`🗑️ Cleared ${keysToRemove.length} localStorage items`);
  }

  // Clear sessionStorage for table data
  clearSessionStorage() {
    const keysToRemove = [];
    
    // Find all table-related keys
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (this.isTableRelatedKey(key)) {
        keysToRemove.push(key);
      }
    }
    
    // Remove table-related keys
    keysToRemove.forEach(key => {
      sessionStorage.removeItem(key);
    });
    
    console.log(`🗑️ Cleared ${keysToRemove.length} sessionStorage items`);
  }

  // Clear cookies related to table sessions
  clearTableCookies() {
    const cookies = document.cookie.split(';');
    let clearedCount = 0;
    
    cookies.forEach(cookie => {
      const [name] = cookie.split('=');
      const cookieName = name.trim();
      
      if (this.isTableRelatedKey(cookieName)) {
        // Clear cookie by setting it to expire in the past
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        clearedCount++;
      }
    });
    
    console.log(`🍪 Cleared ${clearedCount} table-related cookies`);
  }

  // Clear browser cache (limited by browser security)
  clearBrowserCache() {
    try {
      // Clear cache for table URLs if service worker is available
      if ('serviceWorker' in navigator && 'caches' in window) {
        caches.keys().then(cacheNames => {
          return Promise.all(
            cacheNames.map(cacheName => {
              if (cacheName.includes('table') || cacheName.includes('restaurant')) {
                return caches.delete(cacheName);
              }
              return Promise.resolve();
            })
          );
        }).then(() => {
          console.log('🗂️ Cleared relevant browser caches');
        });
      }
    } catch (error) {
      console.warn('⚠️ Could not clear browser cache:', error);
    }
  }

  // Notify server to clear table sessions
  async clearServerSessions() {
    try {
      const response = await fetch(getApiUrl('/api/clear-table-sessions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'cleanup',
          timestamp: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        console.log('🖥️ Server table sessions cleared');
      } else {
        console.warn('⚠️ Failed to clear server sessions');
      }
    } catch (error) {
      console.warn('⚠️ Could not reach server for session cleanup:', error);
    }
  }

  // Check if a key is related to table data
  isTableRelatedKey(key) {
    if (!key) return false;
    
    const tablePatterns = [
      /^table_\d+/i,           // table_1, table_2, etc.
      /^cart_\d+/i,            // cart_1, cart_2, etc.
      /^session_\d+/i,         // session_1, session_2, etc.
      /^order_\d+/i,           // order_1, order_2, etc.
      /^restaurant_table/i,     // restaurant_table_*
      /^foodzone_table/i,       // foodzone_table_*
      /currentTable/i,          // currentTable
      /tableSession/i,          // tableSession
      /dineInCart/i,           // dineInCart
      /tableOrder/i            // tableOrder
    ];
    
    return tablePatterns.some(pattern => pattern.test(key));
  }

  // Manual cleanup trigger
  triggerManualCleanup() {
    console.log('🔧 Manual cache cleanup triggered');
    this.performCleanup();
  }

  // Get cleanup status
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalId: this.intervalId,
      cleanupInterval: this.cleanupInterval,
      tableCount: this.tableCount,
      nextCleanup: this.isRunning ? 
        new Date(Date.now() + this.cleanupInterval).toLocaleString() : 
        'Not scheduled'
    };
  }
}

// Create singleton instance
const cacheManager = new CacheManager();

// Auto-start cleanup when module loads
cacheManager.startAutoCleanup();

// Export for use in other components
export default cacheManager;

// Also make it globally available
window.cacheManager = cacheManager;
