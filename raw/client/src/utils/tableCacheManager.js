/**
 * Table Cache Manager - DISABLED
 * This was causing performance issues by clearing cache every 10 minutes
 * for all 25 tables even when not needed
 */

class TableCacheManager {
  constructor() {
    this.tableCount = 25;
    this.cleanupInterval = 10 * 60 * 1000; // 10 minutes in milliseconds
    this.intervalId = null;
    this.isRunning = false;
    this.lastCleanup = null;
    
    // DISABLED: Initialize on construction
    // this.init();
    console.log('🚫 TableCacheManager disabled to improve performance');
  }

  init() {
    console.log('🧹 Table Cache Manager initialized');
    console.log(`📋 Managing cache for tables 1-${this.tableCount}`);
    console.log(`⏰ Cleanup interval: ${this.cleanupInterval / 1000 / 60} minutes`);
    
    // DISABLED: Start automatic cleanup
    // this.startAutomaticCleanup();
    
    // DISABLED: Run initial cleanup after 30 seconds to allow app to load
    // setTimeout(() => {
    //   this.performCleanup();
    // }, 30000);
  }

  startAutomaticCleanup() {
    console.log('⚠️ Automatic cleanup is disabled');
    return;
    
    // DISABLED CODE BELOW
    // if (this.isRunning) {
    //   console.log('⚠️ Cache manager already running');
    //   return;
    // }

    // this.isRunning = true;
    // this.intervalId = setInterval(() => {
    //   this.performCleanup();
    // }, this.cleanupInterval);

    // console.log('✅ Automatic cache cleanup started');
  }

  stopAutomaticCleanup() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log('🛑 Automatic cache cleanup stopped');
    }
  }

  async performCleanup() {
    const startTime = Date.now();
    let clearedTables = 0;
    let errors = 0;

    console.log('🧹 Starting table cache cleanup...');

    try {
      // Clear localStorage for each table
      for (let tableId = 1; tableId <= this.tableCount; tableId++) {
        try {
          await this.clearTableCache(tableId);
          clearedTables++;
        } catch (error) {
          console.error(`❌ Error clearing cache for table ${tableId}:`, error);
          errors++;
        }
      }

      // Clear general application cache
      await this.clearGeneralCache();

      // Clear service worker cache if available
      await this.clearServiceWorkerCache();

      const duration = Date.now() - startTime;
      this.lastCleanup = new Date();

      console.log(`✅ Cache cleanup completed in ${duration}ms`);
      console.log(`📊 Tables cleared: ${clearedTables}/${this.tableCount}`);
      if (errors > 0) {
        console.log(`⚠️ Errors encountered: ${errors}`);
      }

      // Dispatch custom event for monitoring
      this.dispatchCleanupEvent(clearedTables, errors, duration);

    } catch (error) {
      console.error('❌ Cache cleanup failed:', error);
    }
  }

  async clearTableCache(tableId) {
    const tableKey = `table_${tableId}`;
    const cartKey = `cart_table_${tableId}`;
    const orderKey = `order_table_${tableId}`;
    
    // Clear localStorage entries
    const keysToRemove = [
      tableKey,
      cartKey,
      orderKey,
      `${tableKey}_cart`,
      `${tableKey}_order`,
      `${tableKey}_customer`,
      `${tableKey}_session`,
      `table${tableId}_cart`,
      `table${tableId}_order`,
      `table${tableId}_data`
    ];

    keysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
      }
    });

    // Clear sessionStorage entries
    keysToRemove.forEach(key => {
      if (sessionStorage.getItem(key)) {
        sessionStorage.removeItem(key);
      }
    });

    // Clear cookies for table-specific data
    this.clearTableCookies(tableId);
  }

  clearTableCookies(tableId) {
    const cookiesToClear = [
      `table_${tableId}`,
      `cart_table_${tableId}`,
      `order_table_${tableId}`,
      `session_table_${tableId}`,
      `customer_table_${tableId}`
    ];

    cookiesToClear.forEach(cookieName => {
      // Clear cookie by setting it to expire in the past
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
      
      // Also try with leading dot for subdomain cookies
      if (window.location.hostname.includes('.')) {
        const domain = '.' + window.location.hostname.split('.').slice(-2).join('.');
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`;
      }
    });
  }

  async clearGeneralCache() {
    // Clear general localStorage items that might accumulate
    const generalKeys = [
      'menu_cache',
      'customer_data',
      'temp_order',
      'app_state',
      'user_preferences',
      'cart_backup',
      'order_backup'
    ];

    generalKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
      }
      if (sessionStorage.getItem(key)) {
        sessionStorage.removeItem(key);
      }
    });
  }

  async clearServiceWorkerCache() {
    if ('serviceWorker' in navigator && 'caches' in window) {
      try {
        const cacheNames = await caches.keys();
        const tableRelatedCaches = cacheNames.filter(name => 
          name.includes('table') || 
          name.includes('cart') || 
          name.includes('order')
        );

        for (const cacheName of tableRelatedCaches) {
          await caches.delete(cacheName);
        }

        if (tableRelatedCaches.length > 0) {
          console.log(`🗑️ Cleared ${tableRelatedCaches.length} service worker caches`);
        }
      } catch (error) {
        console.error('Error clearing service worker cache:', error);
      }
    }
  }

  dispatchCleanupEvent(clearedTables, errors, duration) {
    const event = new CustomEvent('tableCacheCleanup', {
      detail: {
        timestamp: new Date().toISOString(),
        tablesCleared: clearedTables,
        errors: errors,
        duration: duration,
        totalTables: this.tableCount
      }
    });
    
    window.dispatchEvent(event);
  }

  // Manual cleanup trigger
  async manualCleanup() {
    console.log('🔧 Manual cache cleanup triggered');
    await this.performCleanup();
  }

  // Get cleanup status
  getStatus() {
    return {
      isRunning: this.isRunning,
      tableCount: this.tableCount,
      cleanupInterval: this.cleanupInterval,
      lastCleanup: this.lastCleanup,
      nextCleanup: this.lastCleanup ? new Date(this.lastCleanup.getTime() + this.cleanupInterval) : null
    };
  }

  // Update table count dynamically
  updateTableCount(newCount) {
    if (newCount > 0 && newCount <= 100) {
      this.tableCount = newCount;
      console.log(`📋 Table count updated to ${newCount}`);
    }
  }

  // Cleanup specific table on demand
  async cleanupTable(tableId) {
    if (tableId >= 1 && tableId <= this.tableCount) {
      console.log(`🧹 Cleaning cache for table ${tableId}`);
      await this.clearTableCache(tableId);
      console.log(`✅ Table ${tableId} cache cleared`);
    }
  }

  // Destroy the manager
  destroy() {
    this.stopAutomaticCleanup();
    console.log('🗑️ Table Cache Manager destroyed');
  }
}

// Create singleton instance
const tableCacheManager = new TableCacheManager();

// Export for use in other modules
export default tableCacheManager;

// Also attach to window for global access
window.tableCacheManager = tableCacheManager;
