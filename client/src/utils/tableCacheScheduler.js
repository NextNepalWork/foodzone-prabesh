/**
 * Table cache scheduler for Food Zone Restaurant PWA
 * Handles scheduled cache cleanup and table session management
 * Integrates with admin panel for dynamic table count management
 */
import { getApiUrl } from '../config/api';

class TableCacheScheduler {
  constructor() {
    this.isInitialized = false;
    this.currentTableCount = 25;
    this.cleanupManagers = [];
    
    this.init();
  }

  async init() {
    if (this.isInitialized) return;
    
    console.log('🎯 Table Cache Scheduler initializing...');
    
    // Get current table count from admin settings
    await this.loadTableSettings();
    
    // Initialize cache managers with current settings
    this.initializeCacheManagers();
    
    // Listen for table count changes from admin panel
    this.setupAdminListeners();
    
    this.isInitialized = true;
    console.log(`✅ Cache Scheduler ready - managing ${this.currentTableCount} tables`);
  }

  async loadTableSettings() {
    try {
      // Try to get table count from admin settings API
      const response = await fetch(getApiUrl('/api/settings/tables'), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.currentTableCount = data.tableCount || 25;
        console.log(`📋 Loaded table count from admin: ${this.currentTableCount}`);
      } else {
        console.log('📋 Using default table count: 25');
      }
    } catch (error) {
      console.log('📋 Admin API not available, using default table count: 25');
    }
  }

  initializeCacheManagers() {
    // Update table count in existing managers
    if (window.tableCacheManager) {
      window.tableCacheManager.updateTableCount(this.currentTableCount);
    }
    
    if (window.advancedCacheManager) {
      window.advancedCacheManager.tableCount = this.currentTableCount;
    }
  }

  setupAdminListeners() {
    // Listen for table count updates from admin panel
    window.addEventListener('tableCountUpdated', (event) => {
      const newCount = event.detail.tableCount;
      this.updateTableCount(newCount);
    });

    // Listen for manual cleanup requests
    window.addEventListener('manualCacheCleanup', (event) => {
      const tableId = event.detail.tableId;
      if (tableId) {
        this.cleanupSpecificTable(tableId);
      } else {
        this.performFullCleanup();
      }
    });
  }

  updateTableCount(newCount) {
    if (newCount !== this.currentTableCount && newCount > 0 && newCount <= 100) {
      const oldCount = this.currentTableCount;
      this.currentTableCount = newCount;
      
      console.log(`📊 Table count updated: ${oldCount} → ${newCount}`);
      
      // Update all cache managers
      if (window.tableCacheManager) {
        window.tableCacheManager.updateTableCount(newCount);
      }
      
      if (window.advancedCacheManager) {
        window.advancedCacheManager.tableCount = newCount;
      }
      
      // If reducing table count, clean up removed tables immediately
      if (newCount < oldCount) {
        this.cleanupRemovedTables(newCount + 1, oldCount);
      }
    }
  }

  async cleanupRemovedTables(startTable, endTable) {
    console.log(`🧹 Cleaning up removed tables ${startTable}-${endTable}`);
    
    for (let tableId = startTable; tableId <= endTable; tableId++) {
      await this.cleanupSpecificTable(tableId);
    }
    
    console.log(`✅ Removed tables ${startTable}-${endTable} cleaned up`);
  }

  async cleanupSpecificTable(tableId) {
    console.log(`🎯 Cleaning table ${tableId} cache...`);
    
    // Use both cache managers for thorough cleanup
    if (window.tableCacheManager) {
      await window.tableCacheManager.cleanupTable(tableId);
    }
    
    if (window.advancedCacheManager) {
      await window.advancedCacheManager.cleanupTable(tableId);
    }
    
    // Dispatch event for monitoring
    window.dispatchEvent(new CustomEvent('tableCleanupComplete', {
      detail: { tableId, timestamp: new Date().toISOString() }
    }));
  }

  async performFullCleanup() {
    console.log('🔄 Performing full cache cleanup...');
    
    if (window.tableCacheManager) {
      await window.tableCacheManager.manualCleanup();
    }
    
    if (window.advancedCacheManager) {
      await window.advancedCacheManager.performFullCleanup();
    }
  }

  // Get comprehensive status
  getStatus() {
    const tableCacheStatus = window.tableCacheManager?.getStatus() || {};
    const advancedCacheStatus = window.advancedCacheManager?.getStatus() || {};
    
    return {
      isInitialized: this.isInitialized,
      currentTableCount: this.currentTableCount,
      tableCacheManager: tableCacheStatus,
      advancedCacheManager: advancedCacheStatus,
      lastUpdate: new Date().toISOString()
    };
  }

  // Admin panel integration methods
  async syncWithAdminPanel() {
    await this.loadTableSettings();
    this.initializeCacheManagers();
  }

  // Emergency cleanup - clears everything immediately
  async emergencyCleanup() {
    console.log('🚨 Emergency cache cleanup initiated');
    
    try {
      // Clear all storage types immediately
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear all cookies
      document.cookie.split(";").forEach(cookie => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      });
      
      // Clear IndexedDB
      if ('indexedDB' in window) {
        const databases = await indexedDB.databases();
        for (const db of databases) {
          indexedDB.deleteDatabase(db.name);
        }
      }
      
      // Clear Cache API
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
        }
      }
      
      console.log('✅ Emergency cleanup completed');
      
      // Reload page to ensure clean state
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Emergency cleanup error:', error);
    }
  }
}

// Create singleton instance
const tableCacheScheduler = new TableCacheScheduler();

// Export for use in other modules
export default tableCacheScheduler;

// Global access for admin panel
window.tableCacheScheduler = tableCacheScheduler;
