// Centralized API configuration for dynamic environment-based deployment
const API_CONFIG = {
  // Base URLs completely driven by environment variables
  BASE_URL: process.env.REACT_APP_API_URL || 
    process.env.REACT_APP_BACKEND_URL || 
    process.env.NEXT_PUBLIC_API_URL ||
    `${window.location.protocol}//${window.location.hostname}:3002`,
  
  SOCKET_URL: process.env.REACT_APP_SOCKET_URL || 
    process.env.REACT_APP_BACKEND_URL || 
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3002',

  // API endpoints
  ENDPOINTS: {
    // Menu endpoints
    MENU: '/api/menu',
    
    // Order endpoints
    ORDER: '/api/order',
    ORDERS: '/api/orders',
    ORDER_HISTORY: '/api/order-history',
    ORDER_STATUS: (orderId) => `/api/orders/${orderId}/status`,
    
    // Table endpoints
    TABLES_STATUS: '/api/tables/status',
    TABLE_SESSION: (tableId) => `/api/tables/${tableId}/session`,
    TABLE_CLEAR: (tableId) => `/api/tables/${tableId}/clear`,
    TABLE_PAYMENTS: (tableId) => `/api/tables/${tableId}/payments`,
    TABLE_PAYMENT: (tableId) => `/api/tables/${tableId}/payment`,
    CLEAR_TABLE: (tableId) => `/api/clear-table/${tableId}`,
    CLEAR_TABLE_SESSIONS: '/api/clear-table-sessions',
    
    // Payment endpoints
    PAYMENTS: '/api/payments',
    PAYMENT_STATUS: (paymentId) => `/api/payments/${paymentId}/status`,
    
    // Admin endpoints
    CUSTOMERS: '/api/customers',
    DATABASE_SUMMARY: '/api/database/summary',
    ANALYTICS: '/api/analytics',
    
    // Settings endpoints
    SETTINGS_TABLES: '/api/settings/tables',
    
    // Daybook endpoints
    DAYBOOK_SUMMARY: '/api/daybook/summary',
    DAYBOOK_TRANSACTION: '/api/daybook/transaction',
    DAYBOOK_OPENING_BALANCE: '/api/daybook/opening-balance',
    DAYBOOK_RECENT_TRANSACTIONS: '/api/daybook/recent-transactions'
  }
};

// Helper function to get full API URL
export const getApiUrl = (endpoint = '') => {
  if (!endpoint) return API_CONFIG.BASE_URL;
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function to get Socket.IO URL
export const getSocketUrl = () => {
  return API_CONFIG.SOCKET_URL;
};

export default API_CONFIG;
