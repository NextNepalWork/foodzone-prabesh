// Critical Resource Preloader for Ultra-Fast Table Loading
import { getApiUrl } from '../config/api';

class CriticalResourcePreloader {
  constructor() {
    this.preloadedResources = new Set();
    this.criticalImages = [
      '/images/Food Zone Restaurant Logo.jpg',
      '/images/chicken-momo.jpg',
      '/images/chicken-thali.jpg',
      '/images/burger-combo.jpg',
      '/images/cheese-pizza.jpg'
    ];
    this.criticalFonts = [
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
    ];
  }

  // Preload critical resources immediately on app start
  async preloadCriticalResources() {
    const preloadPromises = [];

    // Preload critical images
    this.criticalImages.forEach(imageSrc => {
      if (!this.preloadedResources.has(imageSrc)) {
        preloadPromises.push(this.preloadImage(imageSrc));
        this.preloadedResources.add(imageSrc);
      }
    });

    // Preload critical fonts
    this.criticalFonts.forEach(fontUrl => {
      if (!this.preloadedResources.has(fontUrl)) {
        preloadPromises.push(this.preloadFont(fontUrl));
        this.preloadedResources.add(fontUrl);
      }
    });

    // Preload critical API endpoints
    preloadPromises.push(this.preloadCriticalAPIs());

    try {
      await Promise.allSettled(preloadPromises);
      console.log('✅ Critical resources preloaded for instant table loading');
    } catch (error) {
      console.log('⚠️ Some critical resources failed to preload:', error);
    }
  }

  // Preload image with high priority
  preloadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = () => reject(new Error(`Failed to preload image: ${src}`));
      img.src = src;
      
      // Set high priority for critical images
      if (img.loading) {
        img.loading = 'eager';
      }
      if (img.fetchPriority) {
        img.fetchPriority = 'high';
      }
    });
  }

  // Preload font with high priority
  preloadFont(url) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = url;
      link.crossOrigin = 'anonymous';
      
      link.onload = () => {
        // Also add as stylesheet for immediate use
        const styleLink = document.createElement('link');
        styleLink.rel = 'stylesheet';
        styleLink.href = url;
        document.head.appendChild(styleLink);
        resolve(url);
      };
      
      link.onerror = () => reject(new Error(`Failed to preload font: ${url}`));
      document.head.appendChild(link);
    });
  }

  // Preload critical API endpoints - disabled to prevent rate limiting
  async preloadCriticalAPIs() {
    // Temporarily disabled to prevent 429 rate limit errors
    // The main components will handle their own API calls
    console.log('🚫 API preloading disabled to prevent rate limiting');
    return Promise.resolve();
  }

  // Preload table-specific resources based on table number
  async preloadTableResources(tableNumber) {
    // Preload nearby table resources predictively
    const nearbyTables = this.getNearbyTables(tableNumber);
    
    // Preload table-specific images if they exist
    const tableImages = nearbyTables.map(table => `/images/table-${table}.jpg`);
    
    const imagePromises = tableImages.map(img => 
      this.preloadImage(img).catch(() => {
        // Ignore errors for non-existent table images
      })
    );

    await Promise.allSettled(imagePromises);
  }

  // Get nearby tables for predictive preloading
  getNearbyTables(tableNumber) {
    const nearby = [];
    const num = parseInt(tableNumber);
    
    // Add adjacent tables (±2 range)
    for (let i = Math.max(1, num - 2); i <= Math.min(25, num + 2); i++) {
      if (i !== num) nearby.push(i);
    }
    
    return nearby;
  }

  // Preload menu page resources
  async preloadMenuPageResources() {
    // Preload menu-specific images
    const menuImages = [
      '/images/menu-bg.jpg',
      '/images/category-appetizers.jpg',
      '/images/category-main.jpg',
      '/images/category-pizza.jpg'
    ];

    const imagePromises = menuImages.map(img => 
      this.preloadImage(img).catch(() => {
        // Ignore errors for non-existent images
      })
    );

    await Promise.allSettled(imagePromises);
  }

  // Check if resource is already preloaded
  isResourcePreloaded(resource) {
    return this.preloadedResources.has(resource);
  }

  // Get preloaded API data
  getPreloadedAPIData(endpoint) {
    const cacheKey = endpoint.split('/').pop();
    const cached = localStorage.getItem(`preload_${cacheKey}`);
    
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Check if data is fresh (less than 5 minutes)
        if (Date.now() - parsed.timestamp < 300000) {
          return parsed.data;
        }
      } catch (error) {
        console.log('Failed to parse preloaded API data:', error);
      }
    }
    
    return null;
  }

  // Clear old preloaded data
  clearOldPreloadedData() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('preload_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          // Remove data older than 10 minutes
          if (Date.now() - data.timestamp > 600000) {
            localStorage.removeItem(key);
          }
        } catch (error) {
          // Remove corrupted data
          localStorage.removeItem(key);
        }
      }
    });
  }
}

// Export singleton instance
export const criticalResourcePreloader = new CriticalResourcePreloader();
export default criticalResourcePreloader;
