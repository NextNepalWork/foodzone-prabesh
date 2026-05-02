// Centralized API service layer for all HTTP requests
import axios from 'axios';
import { getApiUrl, getSocketUrl } from '../config/api';
import API_CONFIG from '../config/api';
// DO NOT import settingsService here - it creates a circular dependency
// settingsService will be lazily imported when needed

// Create axios instance with dynamic base configuration
const apiClient = axios.create({
  baseURL: getApiUrl(),
  timeout: 45000, // 45 seconds timeout for database connection issues
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Fixed: Disable credentials for cross-origin requests
});

// Request interceptor — attach JWT token for authenticated admin/staff calls.
// Public customer endpoints ignore the header, so this is safe across the app.
apiClient.interceptors.request.use((config) => {
  try {
    const token =
      localStorage.getItem('adminToken') ||
      localStorage.getItem('staffToken');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (_) {}
  return config;
});

// On 401 from an admin call, clear session so the login screen reappears.
apiClient.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error?.response?.status === 401 && localStorage.getItem('adminToken')) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminAuthenticated');
      try { window.dispatchEvent(new CustomEvent('auth:expired')); } catch (_) {}
    }
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    // Check if response is HTML instead of JSON
    const contentType = response.headers['content-type'];
    if (contentType && contentType.includes('text/html')) {
      console.error('Received HTML response instead of JSON:', response.data);
      throw new Error('Server returned HTML instead of JSON - API endpoint may be incorrect');
    }
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    
    // Handle HTML error responses
    if (error.response?.headers['content-type']?.includes('text/html')) {
      console.error('Server returned HTML error page instead of JSON');
      error.message = 'Server configuration error - received HTML instead of JSON';
    }
    
    return Promise.reject(error);
  }
);



// API Service methods
export const apiService = {
  // Menu services
  getMenu: async () => {
    // Check cache first for fast loading
    const cachedMenu = sessionStorage.getItem('menuCache');
    const cacheTime = sessionStorage.getItem('menuCacheTime');
    
    if (cachedMenu && cacheTime) {
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (now - parseInt(cacheTime) < fiveMinutes) {
        return Promise.resolve({ data: JSON.parse(cachedMenu) });
      }
    }
    
    try {
      // Fetch from API and cache
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.MENU);
      
      // Validate response is JSON
      if (typeof response.data === 'string' && response.data.includes('<html>')) {
        throw new Error('Received HTML response instead of JSON from menu API');
      }
      
      sessionStorage.setItem('menuCache', JSON.stringify(response.data));
      sessionStorage.setItem('menuCacheTime', Date.now().toString());
      return response;
    } catch (error) {
      console.error('Menu API error:', error);
      
      // Return cached data if available, even if expired
      if (cachedMenu) {
        console.log('Using expired cache due to API error');
        return Promise.resolve({ data: JSON.parse(cachedMenu) });
      }
      
      throw error;
    }
  },
  
  // Direct order submission without health checker interference
  createOrder: async (orderData) => {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.ORDER, orderData);
      return response.data;
    } catch (error) {
      console.error('Order submission error:', error);
      throw error;
    }
  },
  getOrders: (params = {}) => {
    return apiClient.get(API_CONFIG.ENDPOINTS.ORDERS, { params });
  },
  getOrderHistory: () => {
    return apiClient.get(API_CONFIG.ENDPOINTS.ORDER_HISTORY);
  },
  updateOrderStatus: (orderId, status) => {
    return apiClient.put(API_CONFIG.ENDPOINTS.ORDER_STATUS(orderId), { status });
  },
  
  // Table services
  getTableStatuses: () => apiClient.get(API_CONFIG.ENDPOINTS.TABLES_STATUS),
  getTableSession: (tableId) => apiClient.get(API_CONFIG.ENDPOINTS.TABLE_SESSION(tableId)),
  clearTable: (tableId) => apiClient.post(API_CONFIG.ENDPOINTS.TABLE_CLEAR(tableId)),
  getTablePayments: (tableId) => apiClient.get(API_CONFIG.ENDPOINTS.TABLE_PAYMENTS(tableId)),
  createTablePayment: (tableId, paymentData) => 
    apiClient.post(API_CONFIG.ENDPOINTS.TABLE_PAYMENT(tableId), paymentData),
  clearTableAdmin: (tableId) => apiClient.post(API_CONFIG.ENDPOINTS.CLEAR_TABLE(tableId)),
  clearTableSessions: () => apiClient.post(API_CONFIG.ENDPOINTS.CLEAR_TABLE_SESSIONS),
  
  // Payment services
  createPayment: async (paymentData) => {
    try {
      console.log('🔄 API Service: Creating payment with data:', paymentData);
      console.log('🔗 API Service: Using endpoint:', API_CONFIG.ENDPOINTS.PAYMENTS);
      console.log('🌐 API Service: Base URL:', getApiUrl());
      
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.PAYMENTS, paymentData);
      console.log('✅ API Service: Payment created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ API Service: Payment creation error:', error);
      console.error('❌ API Service: Error message:', error.message);
      console.error('❌ API Service: Error code:', error.code);
      console.error('❌ API Service: Response status:', error.response?.status);
      console.error('❌ API Service: Response data:', error.response?.data);
      
      // Enhanced error handling for better debugging
      if (error.code === 'ERR_NETWORK') {
        error.message = 'Network Error';
      }
      
      throw error;
    }
  },
  updatePaymentStatus: (paymentId, statusData) => 
    apiClient.put(API_CONFIG.ENDPOINTS.PAYMENT_STATUS(paymentId), statusData),
  
  // Admin services
  getCustomers: () => {
    return apiClient.get(API_CONFIG.ENDPOINTS.CUSTOMERS);
  },
  getDatabaseSummary: () => {
    return apiClient.get(API_CONFIG.ENDPOINTS.DATABASE_SUMMARY);
  },
  getAnalytics: () => {
    return apiClient.get(API_CONFIG.ENDPOINTS.ANALYTICS);
  },
  
  // Settings services
  getTableSettings: () => apiClient.get(API_CONFIG.ENDPOINTS.SETTINGS_TABLES),
  updateTableSettings: (settings) => apiClient.post(API_CONFIG.ENDPOINTS.SETTINGS_TABLES, settings),
};

// Fetch API wrapper for components that use fetch directly
export const fetchApi = {
  get: async (endpoint, options = {}) => {
    // Get dynamic timeout from settings (lazy import to avoid circular dependency)
    let timeouts = { apiColdStartTimeoutMs: 45000, apiTimeoutMs: 30000 };
    try {
      // Lazy import settingsService to avoid circular dependency
      const { default: settingsService } = await import('./settingsService');
      if (settingsService && settingsService.getTimeoutSettings) {
        timeouts = settingsService.getTimeoutSettings();
      }
    } catch (error) {
      // Use default timeouts if settingsService is not available
    }
    const timeout = endpoint.includes('/api/settings') ? timeouts.apiColdStartTimeoutMs : timeouts.apiTimeoutMs;
    
    // Add timeout with dynamic duration
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const url = getApiUrl(endpoint);
      
      // Get auth token from localStorage with fallback checks
      const token = localStorage.getItem('adminToken') || localStorage.getItem('staffToken');
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };
      
      // Add Authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
        ...options,
      });
      
      clearTimeout(timeoutId);
      
      // Handle authentication errors
      if (response.status === 401) {
        console.warn('Authentication failed - clearing stored tokens');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('staffToken');
        localStorage.removeItem('adminAuthenticated');
        localStorage.removeItem('staffAuthenticated');
        
        // Redirect to login if on admin page
        if (window.location.pathname.includes('/admin')) {
          window.location.reload();
        }
        throw new Error('Authentication failed - please login again');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Validate response structure
      if (typeof data === 'string' && data.includes('<html>')) {
        throw new Error('Server returned HTML instead of JSON');
      }
      
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`API GET ${endpoint} failed:`, error);
      throw error;
    }
  },
  
  post: async (endpoint, data, options = {}) => {
    // Get dynamic timeout from settings (lazy import to avoid circular dependency)
    let timeouts = { apiColdStartTimeoutMs: 45000, apiTimeoutMs: 30000 };
    try {
      // Lazy import settingsService to avoid circular dependency
      const { default: settingsService } = await import('./settingsService');
      if (settingsService && settingsService.getTimeoutSettings) {
        timeouts = settingsService.getTimeoutSettings();
      }
    } catch (error) {
      // Use default timeouts if settingsService is not available
    }
    
    // Add timeout and better error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeouts.apiTimeoutMs);
    
    try {
      const url = getApiUrl(endpoint);
      console.log('🚀 Making POST request to:', url);
      console.log('📤 Request data:', data);
      
      // Get auth token from localStorage
      const token = localStorage.getItem('adminToken');
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };
      
      // Add Authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        signal: controller.signal,
        ...options,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please check your connection');
      }
      throw error;
    }
  },
  
  put: async (endpoint, data, options = {}) => {
    // Get dynamic timeout from settings (lazy import to avoid circular dependency)
    let timeouts = { apiColdStartTimeoutMs: 45000, apiTimeoutMs: 30000 };
    try {
      // Lazy import settingsService to avoid circular dependency
      const { default: settingsService } = await import('./settingsService');
      if (settingsService && settingsService.getTimeoutSettings) {
        timeouts = settingsService.getTimeoutSettings();
      }
    } catch (error) {
      // Use default timeouts if settingsService is not available
    }
    
    // Add timeout and better error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeouts.apiTimeoutMs);
    
    try {
      const url = getApiUrl(endpoint);
      console.log('🔄 Making PUT request to:', url);
      console.log('📤 Request data:', data);
      
      // Get auth token from localStorage
      const token = localStorage.getItem('adminToken');
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };
      
      // Add Authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
        signal: controller.signal,
        ...options,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please check your connection');
      }
      throw error;
    }
  },
  
  patch: async (endpoint, data, options = {}) => {
    // Get dynamic timeout from settings (lazy import to avoid circular dependency)
    let timeouts = { apiColdStartTimeoutMs: 45000, apiTimeoutMs: 30000 };
    try {
      // Lazy import settingsService to avoid circular dependency
      const { default: settingsService } = await import('./settingsService');
      if (settingsService && settingsService.getTimeoutSettings) {
        timeouts = settingsService.getTimeoutSettings();
      }
    } catch (error) {
      // Use default timeouts if settingsService is not available
    }
    
    // Add timeout and better error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeouts.apiTimeoutMs);
    
    try {
      const url = getApiUrl(endpoint);
      console.log('🔄 Making PATCH request to:', url);
      console.log('📤 Request data:', data);
      
      // Get auth token from localStorage
      const token = localStorage.getItem('adminToken');
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };
      
      // Add Authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data),
        signal: controller.signal,
        ...options,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please check your connection');
      }
      throw error;
    }
  },
  
  delete: async (endpoint, options = {}) => {
    // Get dynamic timeout from settings (lazy import to avoid circular dependency)
    let timeouts = { apiColdStartTimeoutMs: 45000, apiTimeoutMs: 30000 };
    try {
      // Lazy import settingsService to avoid circular dependency
      const { default: settingsService } = await import('./settingsService');
      if (settingsService && settingsService.getTimeoutSettings) {
        timeouts = settingsService.getTimeoutSettings();
      }
    } catch (error) {
      // Use default timeouts if settingsService is not available
    }
    
    // Add timeout and better error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeouts.apiTimeoutMs);
    
    try {
      const url = getApiUrl(endpoint);
      console.log('🔄 Making DELETE request to:', url);
      
      // Get auth token from localStorage
      const token = localStorage.getItem('adminToken');
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };
      
      // Add Authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers,
        signal: controller.signal,
        ...options,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please check your connection');
      }
      throw error;
    }
  }
};

export { getSocketUrl };
export default apiService;
