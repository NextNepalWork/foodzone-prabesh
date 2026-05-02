// Performance optimization utilities for Food Zone PWA

// Preload critical resources
export const preloadCriticalResources = () => {
  const criticalResources = [
    '/images/logo.jpg',
    '/sounds/notification-bell.mp3'
  ];

  criticalResources.forEach(resource => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = resource;
    link.as = resource.includes('.jpg') || resource.includes('.png') ? 'image' : 'audio';
    document.head.appendChild(link);
  });
};

// Debounce function for search inputs
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function for scroll events
export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Intersection Observer for lazy loading
export const createIntersectionObserver = (callback, options = {}) => {
  const defaultOptions = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1
  };

  return new IntersectionObserver(callback, { ...defaultOptions, ...options });
};

// Memory cleanup for components
export const cleanupMemory = (refs = []) => {
  refs.forEach(ref => {
    if (ref && ref.current) {
      ref.current = null;
    }
  });
};

// Optimize bundle size by dynamic imports
export const loadComponentAsync = (componentPath) => {
  // Dynamic import for React lazy loading
  return import('react').then(React => React.lazy(() => import(componentPath)));
};

// Image optimization
export const optimizeImage = (src, width, height) => {
  if (!src) return src;
  
  // Add image optimization parameters if using a CDN
  if (src.includes('cloudinary') || src.includes('imagekit')) {
    return `${src}?w=${width}&h=${height}&f=auto&q=auto`;
  }
  
  return src;
};
