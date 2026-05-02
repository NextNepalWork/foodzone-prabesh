/**
 * Settings Loader - Caches and provides access to restaurant settings
 * Used throughout the backend for business logic that depends on settings
 */

const { query } = require('../database/config');

class SettingsLoader {
  constructor() {
    this.cache = {};
    this.lastRefresh = 0;
    this.refreshInterval = 5 * 60 * 1000; // Refresh every 5 minutes
  }

  /**
   * Get a single setting value
   */
  async get(key, defaultValue = null) {
    await this.ensureFresh();
    return this.cache[key] ?? defaultValue;
  }

  /**
   * Get multiple settings at once
   */
  async getMany(keys) {
    await this.ensureFresh();
    const result = {};
    keys.forEach(key => {
      result[key] = this.cache[key];
    });
    return result;
  }

  /**
   * Get all settings
   */
  async getAll() {
    await this.ensureFresh();
    return { ...this.cache };
  }

  /**
   * Ensure cache is fresh (refresh if needed)
   */
  async ensureFresh() {
    const now = Date.now();
    if (now - this.lastRefresh > this.refreshInterval) {
      await this.refresh();
    }
  }

  /**
   * Force refresh from database
   */
  async refresh() {
    try {
      const { rows } = await query(`SELECT setting_key, setting_value FROM restaurant_settings`);
      this.cache = {};
      rows.forEach(row => {
        this.cache[row.setting_key] = this.deserialize(row.setting_value, row.setting_key);
      });
      this.lastRefresh = Date.now();
      console.log('✅ Settings cache refreshed');
    } catch (err) {
      console.error('❌ Failed to refresh settings cache:', err);
    }
  }

  /**
   * Deserialize setting values based on key
   */
  deserialize(value, key) {
    if (value === null || value === undefined) return null;
    
    // Boolean settings
    if (key.includes('enabled') || key.includes('accept') || key.includes('require') || key.includes('allow') || key.includes('show')) {
      return value === 'true' || value === true;
    }
    
    // Number settings
    if (key.includes('count') || key.includes('fee') || key.includes('percent') || key.includes('min') || key.includes('max') || key.includes('timeout') || key.includes('buffer') || key.includes('distance') || key.includes('km') || key.includes('price') || key.includes('volume')) {
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    }
    
    // Array/JSON settings
    if (key.includes('days') || key.includes('json')) {
      try {
        return JSON.parse(value);
      } catch (_) {
        return value;
      }
    }
    
    // String settings (default)
    return value;
  }
}

// Export singleton instance
module.exports = new SettingsLoader();
