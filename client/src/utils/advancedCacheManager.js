/**
 * Advanced Cache Manager - Enhanced cache clearing with browser API integration
 * Handles IndexedDB, WebSQL, and other browser storage mechanisms
 */

class AdvancedCacheManager {
  constructor() {
    this.tableCount = 25;
    this.cleanupInterval = 10 * 60 * 1000; // 10 minutes
    this.intervalId = null;
    this.isRunning = false;
    
    this.init();
  }

  init() {
    console.log('🚀 Advanced Cache Manager initialized');
    this.startPeriodicCleanup();
  }

  startPeriodicCleanup() {
    this.isRunning = true;
    
    // Initial cleanup after 30 seconds
    setTimeout(() => this.performFullCleanup(), 30000);
    
    // Set up recurring cleanup
    this.intervalId = setInterval(() => {
      this.performFullCleanup();
    }, this.cleanupInterval);
    
    console.log('✅ Periodic cache cleanup started (every 10 minutes)');
  }

  async performFullCleanup() {
    console.log('🧹 Starting comprehensive cache cleanup...');
    const startTime = Date.now();
    
    try {
      // Clear all storage types
      await Promise.all([
        this.clearLocalStorage(),
        this.clearSessionStorage(),
        this.clearCookies(),
        this.clearIndexedDB(),
        this.clearWebSQL(),
        this.clearCacheAPI(),
        this.clearBrowserCache()
      ]);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Full cleanup completed in ${duration}ms`);
      
      // Dispatch event
      window.dispatchEvent(new CustomEvent('cacheCleanupComplete', {
        detail: { duration, timestamp: new Date().toISOString() }
      }));
      
    } catch (error) {
      console.error('❌ Cache cleanup error:', error);
    }
  }

  clearLocalStorage() {
    const keysToRemove = [];
    
    // Collect table-specific keys
    for (let i = 1; i <= this.tableCount; i++) {
      keysToRemove.push(
        `table_${i}`,
        `cart_table_${i}`,
        `order_table_${i}`,
        `session_table_${i}`,
        `customer_table_${i}`,
        `table${i}_data`
      );
    }
    
    // Add general keys
    keysToRemove.push(
      'menu_cache',
      'temp_order',
      'cart_backup',
      'order_backup',
      'user_session',
      'app_state'
    );
    
    let cleared = 0;
    keysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        cleared++;
      }
    });
    
    console.log(`🗑️ LocalStorage: ${cleared} items cleared`);
  }

  clearSessionStorage() {
    const keysToRemove = [];
    
    for (let i = 1; i <= this.tableCount; i++) {
      keysToRemove.push(
        `table_${i}`,
        `session_table_${i}`,
        `temp_data_${i}`
      );
    }
    
    let cleared = 0;
    keysToRemove.forEach(key => {
      if (sessionStorage.getItem(key)) {
        sessionStorage.removeItem(key);
        cleared++;
      }
    });
    
    console.log(`🗑️ SessionStorage: ${cleared} items cleared`);
  }

  clearCookies() {
    const cookiesToClear = [];
    
    for (let i = 1; i <= this.tableCount; i++) {
      cookiesToClear.push(
        `table_${i}`,
        `cart_table_${i}`,
        `session_table_${i}`
      );
    }
    
    cookiesToClear.push('user_session', 'app_data', 'temp_data');
    
    cookiesToClear.forEach(name => {
      // Clear for current domain
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
      
      // Clear for parent domain
      if (window.location.hostname.includes('.')) {
        const domain = '.' + window.location.hostname.split('.').slice(-2).join('.');
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`;
      }
    });
    
    console.log(`🍪 Cookies cleared: ${cookiesToClear.length} items`);
  }

  async clearIndexedDB() {
    if (!('indexedDB' in window)) return;
    
    try {
      const databases = await indexedDB.databases();
      let cleared = 0;
      
      for (const db of databases) {
        if (db.name && (db.name.includes('table') || db.name.includes('cart') || db.name.includes('order'))) {
          const deleteReq = indexedDB.deleteDatabase(db.name);
          await new Promise((resolve, reject) => {
            deleteReq.onsuccess = () => resolve();
            deleteReq.onerror = () => reject(deleteReq.error);
          });
          cleared++;
        }
      }
      
      console.log(`🗄️ IndexedDB: ${cleared} databases cleared`);
    } catch (error) {
      console.error('IndexedDB cleanup error:', error);
    }
  }

  async clearWebSQL() {
    if (!('openDatabase' in window)) return;
    
    try {
      // WebSQL is deprecated but still present in some browsers
      const db = window.openDatabase('', '', '', '');
      if (db) {
        db.transaction(tx => {
          tx.executeSql('DROP TABLE IF EXISTS table_data');
          tx.executeSql('DROP TABLE IF EXISTS cart_data');
          tx.executeSql('DROP TABLE IF EXISTS order_data');
        });
        console.log('🗃️ WebSQL tables cleared');
      }
    } catch (error) {
      // WebSQL not supported or error occurred
    }
  }

  async clearCacheAPI() {
    if (!('caches' in window)) return;
    
    try {
      const cacheNames = await caches.keys();
      let cleared = 0;
      
      for (const cacheName of cacheNames) {
        if (cacheName.includes('table') || cacheName.includes('cart') || cacheName.includes('order')) {
          await caches.delete(cacheName);
          cleared++;
        }
      }
      
      console.log(`💾 Cache API: ${cleared} caches cleared`);
    } catch (error) {
      console.error('Cache API cleanup error:', error);
    }
  }

  async clearBrowserCache() {
    // Force reload resources by updating cache-busting parameters
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.update();
        }
        console.log('🔄 Service workers updated');
      } catch (error) {
        console.error('Service worker update error:', error);
      }
    }
  }

  // Manual cleanup for specific table
  async cleanupTable(tableId) {
    if (tableId < 1 || tableId > this.tableCount) return;
    
    console.log(`🧹 Cleaning table ${tableId} cache...`);
    
    // Clear localStorage
    const keys = [
      `table_${tableId}`,
      `cart_table_${tableId}`,
      `order_table_${tableId}`,
      `session_table_${tableId}`,
      `customer_table_${tableId}`
    ];
    
    keys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    
    // Clear cookies
    keys.forEach(name => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });
    
    console.log(`✅ Table ${tableId} cache cleared`);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log('🛑 Cache manager stopped');
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      tableCount: this.tableCount,
      interval: this.cleanupInterval / 1000 / 60 + ' minutes'
    };
  }
}

// Create and export singleton
const advancedCacheManager = new AdvancedCacheManager();
export default advancedCacheManager;

// Global access
window.advancedCacheManager = advancedCacheManager;
