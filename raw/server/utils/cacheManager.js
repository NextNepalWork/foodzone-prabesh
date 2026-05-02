// Active Cache Management System for Food Zone Restaurant
const EventEmitter = require('events');

class CacheManager extends EventEmitter {
  constructor(io) {
    super();
    this.io = io;
    this.caches = new Map();
    this.isActive = true;
    this.cleanupInterval = null;
    this.stats = {
      totalCleared: 0,
      lastCleanup: null,
      activeSessions: 0
    };
    
    this.startActiveCleaning();
    console.log('🚀 ACTIVE CACHE SYSTEM INITIALIZED');
  }

  // Set cache with timestamp
  set(key, value, ttl = 5 * 60 * 1000) { // 5 minutes default
    this.caches.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });
    this.stats.activeSessions = this.caches.size;
    console.log(`📝 Cache set for key: ${key}`);
  }

  // Get cache with auto-expiry check
  get(key) {
    const cached = this.caches.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.delete(key);
      return null;
    }

    return cached.value;
  }

  // Delete specific cache
  delete(key) {
    const deleted = this.caches.delete(key);
    if (deleted) {
      this.stats.activeSessions = this.caches.size;
      console.log(`🗑️ Cache deleted for key: ${key}`);
      this.io.emit('cacheCleared', { key, type: 'single' });
    }
    return deleted;
  }

  // Clear all caches
  clearAll() {
    const count = this.caches.size;
    this.caches.clear();
    this.stats.totalCleared += count;
    this.stats.activeSessions = 0;
    console.log(`🧹 ALL CACHES CLEARED: ${count} items removed`);
    this.io.emit('cacheCleared', { type: 'all', count });
    return count;
  }

  // Active cleanup process
  performCleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, cached] of this.caches.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.caches.delete(key);
        cleanedCount++;
        console.log(`🧹 ACTIVE CLEANUP: Expired cache removed - ${key}`);
        this.io.emit('cacheCleared', { key, type: 'expired' });
      }
    }

    if (cleanedCount > 0) {
      this.stats.totalCleared += cleanedCount;
      this.stats.lastCleanup = new Date().toISOString();
      this.stats.activeSessions = this.caches.size;
      console.log(`🕒 ACTIVE CLEANUP COMPLETE: ${cleanedCount} expired caches removed`);
    }

    return cleanedCount;
  }

  // Start active cleaning
  startActiveCleaning() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Run cleanup every 30 seconds for maximum responsiveness
    this.cleanupInterval = setInterval(() => {
      if (this.isActive) {
        this.performCleanup();
      }
    }, 30 * 1000);

    console.log('🔄 ACTIVE CACHE CLEANING STARTED (30-second intervals)');
  }

  // Stop active cleaning
  stopActiveCleaning() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.isActive = false;
    console.log('⏹️ ACTIVE CACHE CLEANING STOPPED');
  }

  // Get cache statistics
  getStats() {
    return {
      ...this.stats,
      isActive: this.isActive,
      currentTime: new Date().toISOString()
    };
  }

  // Force immediate cleanup
  forceCleanup() {
    console.log('⚡ FORCE CLEANUP INITIATED');
    return this.performCleanup();
  }
}

module.exports = CacheManager;
