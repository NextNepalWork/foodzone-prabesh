import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

class TableSessionService {
  constructor() {
    this.sessionToken = localStorage.getItem('tableSessionToken');
    this.tableId = localStorage.getItem('currentTableId');
  }

  // Create or resume a table session
  async createSession(tableId) {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/table-session/create`, {
        tableId: parseInt(tableId)
      });

      if (response.data.success) {
        this.sessionToken = response.data.sessionToken;
        this.tableId = tableId;
        
        // Store in localStorage
        localStorage.setItem('tableSessionToken', this.sessionToken);
        localStorage.setItem('currentTableId', tableId);
        
        console.log('✅ Table session created/resumed:', response.data.message);
        return response.data;
      }
      
      throw new Error(response.data.error || 'Failed to create session');
    } catch (error) {
      console.error('❌ Error creating table session:', error);
      throw error;
    }
  }

  // Get session info
  async getSessionInfo() {
    if (!this.sessionToken) {
      throw new Error('No active session');
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/table-session/info`, {
        headers: {
          'X-Session-Token': this.sessionToken
        }
      });

      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        this.clearSession();
      }
      throw error;
    }
  }

  // Get order history for current table
  async getOrderHistory() {
    if (!this.sessionToken) {
      throw new Error('No active session');
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/table-session/orders`, {
        headers: {
          'X-Session-Token': this.sessionToken
        }
      });

      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        this.clearSession();
      }
      throw error;
    }
  }

  // Get current bill total
  async getBill() {
    if (!this.sessionToken) {
      throw new Error('No active session');
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/table-session/bill`, {
        headers: {
          'X-Session-Token': this.sessionToken
        }
      });

      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        this.clearSession();
      }
      throw error;
    }
  }

  // Request payment
  async requestPayment(paymentMethod) {
    if (!this.sessionToken) {
      throw new Error('No active session');
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/table-session/request-payment`, {
        paymentMethod
      }, {
        headers: {
          'X-Session-Token': this.sessionToken
        }
      });

      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        this.clearSession();
      }
      throw error;
    }
  }

  // Check if session is active
  hasActiveSession() {
    return !!(this.sessionToken && this.tableId);
  }

  // Get current table ID
  getCurrentTableId() {
    return this.tableId;
  }

  // Clear session (logout)
  clearSession() {
    this.sessionToken = null;
    this.tableId = null;
    localStorage.removeItem('tableSessionToken');
    localStorage.removeItem('currentTableId');
    console.log('🧹 Table session cleared');
  }

  // Auto-initialize session if table ID is in URL
  async autoInitialize() {
    const path = window.location.pathname;
    const tableMatch = path.match(/^\/(\d+)$/);
    
    if (tableMatch) {
      const tableId = tableMatch[1];
      
      // If we don't have a session or it's for a different table, create new one
      if (!this.hasActiveSession() || this.tableId !== tableId) {
        try {
          await this.createSession(tableId);
          return true;
        } catch (error) {
          console.error('Failed to auto-initialize session:', error);
          return false;
        }
      }
      return true;
    }
    
    return false;
  }
}

// Export singleton instance
const tableSessionService = new TableSessionService();
export default tableSessionService;