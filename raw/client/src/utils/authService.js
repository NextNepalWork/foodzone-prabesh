// Secure authentication service for admin and staff
import { getApiUrl } from '../config/api';

class AuthService {
  constructor() {
    this.tokenKey = 'adminToken';
    this.userKey = 'adminUser';
    this.authKey = 'adminAuthenticated';
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
    console.warn('Authentication failed - clearing stored credentials');
    this.clearAuth();
    // Optionally redirect to login page
    if (window.location.pathname !== '/admin') {
      window.location.href = '/admin';
    }
  }

  // Login with username and password
  async login(username, password) {
    try {
      const response = await fetch(`${getApiUrl()}/api/admin/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem(this.tokenKey, data.token);
        localStorage.setItem(this.userKey, JSON.stringify(data.user));
        localStorage.setItem(this.authKey, 'true');
        return { success: true, user: data.user };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  }

  // Logout and clear all auth data
  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.authKey);
  }

  // Get authorization headers for API requests
  getAuthHeaders() {
    const token = this.getToken();
    return token ? {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    } : {
      'Content-Type': 'application/json'
    };
  }

  // Make authenticated API request
  async authenticatedRequest(url, options = {}) {
    const headers = this.getAuthHeaders();
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    });

    // Handle token expiration
    if (response.status === 401) {
      this.logout();
      window.location.reload(); // Force re-authentication
      throw new Error('Session expired. Please login again.');
    }

    return response;
  }

  // Verify token is still valid
  async verifyToken() {
    try {
      const response = await this.authenticatedRequest(`${getApiUrl()}/api/admin/verify`, {
        method: 'GET'
      });
      
      return response.ok;
    } catch (error) {
      console.error('Token verification failed:', error);
      return false;
    }
  }
}

export default new AuthService();
