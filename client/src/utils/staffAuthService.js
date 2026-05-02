// Staff authentication service for all user types
import { getApiUrl } from '../config/api';

class StaffAuthService {
  constructor() {
    this.tokenKey = 'staffToken';
    this.userKey = 'staffUser';
    this.authKey = 'staffAuthenticated';
  }

  // Get stored token
  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  // Get stored user info
  getUser() {
    const userStr = localStorage.getItem(this.userKey);
    return userStr ? JSON.parse(userStr) : null;
  }

  // Check if user is authenticated
  isAuthenticated() {
    const token = this.getToken();
    const isAuth = localStorage.getItem(this.authKey) === 'true';
    return !!(token && isAuth);
  }

  // Clear invalid authentication data
  clearAuth() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.authKey);
  }

  // Handle authentication errors
  handleAuthError() {
    console.warn('Staff authentication failed - clearing stored credentials');
    this.clearAuth();
    // Optionally redirect to staff login page
    if (window.location.pathname !== '/staff-login') {
      window.location.href = '/staff-login';
    }
  }

  // Login with username and password for staff
  async login(username, password) {
    try {
      const response = await fetch(`${getApiUrl()}/api/staff/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Store authentication data
        localStorage.setItem(this.tokenKey, data.token);
        localStorage.setItem(this.userKey, JSON.stringify(data.user));
        localStorage.setItem(this.authKey, 'true');
        
        return {
          success: true,
          user: data.user,
          token: data.token,
          message: data.message
        };
      } else {
        return {
          success: false,
          message: data.message || 'Authentication failed'
        };
      }
    } catch (error) {
      console.error('Staff login error:', error);
      return {
        success: false,
        message: 'Network error. Please try again.'
      };
    }
  }

  // Logout
  logout() {
    this.clearAuth();
    window.location.href = '/staff-login';
  }

  // Check if user has specific role
  hasRole(role) {
    const user = this.getUser();
    return user && user.role === role;
  }

  // Check if user has any of the specified roles
  hasAnyRole(roles) {
    const user = this.getUser();
    return user && roles.includes(user.role);
  }

  // Role-specific checks
  isManager() {
    return this.hasRole('Manager');
  }

  isChef() {
    return this.hasRole('Chef');
  }

  isWaiter() {
    return this.hasRole('Waiter');
  }

  isCashier() {
    return this.hasRole('Cashier');
  }

  // Group role checks
  isKitchenStaff() {
    return this.hasAnyRole(['Chef', 'Kitchen Helper']);
  }

  isFrontStaff() {
    return this.hasAnyRole(['Manager', 'Waiter', 'Cashier']);
  }

  // Get role-based permissions
  getPermissions() {
    const user = this.getUser();
    if (!user) return [];

    const permissions = {
      'Manager': ['view_orders', 'manage_orders', 'view_reports', 'manage_staff', 'manage_menu', 'handle_payments'],
      'Chef': ['view_orders', 'update_order_status', 'view_kitchen_orders'],
      'Waiter': ['view_orders', 'take_orders', 'update_order_status', 'handle_tables'],
      'Cashier': ['view_orders', 'handle_payments', 'view_sales'],
      'Kitchen Helper': ['view_kitchen_orders', 'assist_preparation']
    };

    return permissions[user.role] || [];
  }

  // Check if user has specific permission
  hasPermission(permission) {
    return this.getPermissions().includes(permission);
  }
}

// Create and export singleton instance
const staffAuthService = new StaffAuthService();
export default staffAuthService;
