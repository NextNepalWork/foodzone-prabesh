import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import audioManager from '../utils/audioNotifications';
import { fetchApi, getSocketUrl } from '../services/apiService';
import { getApiUrl } from '../config/api';

// Import premium components
import OrdersManagement from '../components/premium/OrdersManagement';
import MenuManagement from '../components/premium/MenuManagement';
import StaffManagement from '../components/admin/StaffManagement';
import ReceptionPayment from '../components/ReceptionPayment';
import Daybook from '../components/Daybook';
import AdminSettings from '../components/AdminSettings';

// Premium SaaS Dashboard Components
const AdminPremium = () => {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [dbSummary, setDbSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Only allow admin users, not staff or reception
    const isAdmin = localStorage.getItem('adminAuthenticated') === 'true';
    const hasAdminToken = localStorage.getItem('adminToken');
    const hasStaffToken = localStorage.getItem('staffToken');
    
    // If user has staff token but no admin token, they're not an admin
    if (hasStaffToken && !hasAdminToken) {
      console.warn('⚠️ Staff user attempted to access admin panel');
      localStorage.removeItem('adminAuthenticated');
      return false;
    }
    
    return isAdmin && hasAdminToken;
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [socket, setSocket] = useState(null);

  // Initialize socket and data fetching with authentication check
  useEffect(() => {
    // Security check: Prevent staff/reception users from accessing admin panel
    const staffToken = localStorage.getItem('staffToken');
    const adminToken = localStorage.getItem('adminToken');
    
    if (staffToken && !adminToken) {
      console.error('🚫 SECURITY: Staff user attempted to access admin panel');
      alert('⚠️ Access Denied: You do not have permission to access the admin panel.');
      localStorage.removeItem('adminAuthenticated');
      setIsAuthenticated(false);
      window.location.href = '/reception';
      return;
    }
    
    if (isAuthenticated) {
      // Verify authentication before fetching data
      const verifyAndFetch = async () => {
        try {
          // Verify token is still valid
          const token = localStorage.getItem('adminToken');
          if (!token) {
            console.warn('No admin token found, redirecting to login');
            setIsAuthenticated(false);
            return;
          }

          // Fetch data with proper error handling
          await Promise.allSettled([
            fetchOrders(),
            fetchCustomers(),
            fetchDatabaseSummary()
          ]);

          audioManager.requestPermissions();

          // Initialize socket connection
          const newSocket = io(getSocketUrl());
          setSocket(newSocket);
          
          newSocket.on('newOrder', (order) => {
            setOrders(prevOrders => [...prevOrders, order]);
            if (order.order_type === 'delivery') {
              audioManager.playDeliveryOrderSound();
            } else {
              audioManager.playTableOrderSound();
            }
          });

          newSocket.on('orderStatusUpdated', ({ orderId, status }) => {
            setOrders(prevOrders => 
              prevOrders.map(order => 
                order.id === orderId ? { ...order, status } : order
              )
            );
          });

          newSocket.on('tableCleared', ({ tableId }) => {
            setOrders(prevOrders => 
              prevOrders.filter(order => order.table_id !== tableId)
            );
          });

          return () => newSocket.close();
        } catch (error) {
          console.error('Authentication verification failed:', error);
          setIsAuthenticated(false);
        }
      };

      verifyAndFetch();
    }
  }, [isAuthenticated]);

  // Data fetching functions with retry logic
  async function fetchOrders() {
    try {
      setLoading(true);
      setError(null);
      
      // Retry logic for intermittent failures
      let retries = 3;
      let data = null;
      
      while (retries > 0) {
        try {
          data = await fetchApi.get('/api/orders');
          break; // Success, exit retry loop
        } catch (err) {
          retries--;
          if (retries === 0) throw err;
          
          console.warn(`Orders fetch failed, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }
      
      // Validate and extract data structure
      let ordersArray;
      if (Array.isArray(data)) {
        ordersArray = data;
      } else if (data && Array.isArray(data.orders)) {
        ordersArray = data.orders;
      } else if (data && typeof data === 'object') {
        console.log('Orders API response structure:', data);
        ordersArray = [];
      } else {
        console.error('Invalid orders data structure:', data);
        setError('Invalid data received from server');
        return;
      }
      
      // Sort orders by created_at (newest first) and status priority
      const sortedOrders = ordersArray.sort((a, b) => {
        const statusPriority = {
          'pending': 1,
          'preparing': 2,
          'ready': 3,
          'completed': 4,
          'cancelled': 5
        };
        
        // First sort by status priority, then by creation time
        const statusDiff = statusPriority[a.status] - statusPriority[b.status];
        if (statusDiff !== 0) return statusDiff;
        
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      setOrders(sortedOrders);
      console.log(`✅ Successfully loaded ${sortedOrders.length} orders`);
    } catch (err) {
      console.error('Failed to fetch orders after retries:', err);
      setError(`Failed to load orders: ${err.message}`);
      setOrders([]); // Set empty array to prevent UI issues
    } finally {
      setLoading(false);
    }
  }

  async function fetchCustomers() {
    try {
      const data = await fetchApi.get('/api/customers');
      if (Array.isArray(data)) {
        setCustomers(data);
        console.log(`✅ Successfully loaded ${data.length} customers`);
      } else {
        console.warn('Invalid customers data structure:', data);
        setCustomers([]);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
      setCustomers([]);
    }
  }

  async function fetchDatabaseSummary() {
    try {
      const data = await fetchApi.get('/api/database/summary');
      if (data && typeof data === 'object') {
        setDbSummary(data);
        console.log('✅ Successfully loaded database summary');
      } else {
        console.warn('Invalid database summary data:', data);
        setDbSummary(null);
      }
    } catch (err) {
      console.error('Error fetching database summary:', err);
      setDbSummary(null);
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Check for recent login attempts to prevent spam
    const lastAttempt = localStorage.getItem('lastLoginAttempt');
    const now = Date.now();
    if (lastAttempt && (now - parseInt(lastAttempt)) < 2000) {
      setError('Please wait before trying again.');
      setLoading(false);
      return;
    }
    localStorage.setItem('lastLoginAttempt', now.toString());

    let retries = 3;
    let delay = 1000;

    while (retries > 0) {
      try {
        // Try admin endpoint first for admin user, then staff endpoint
        const isAdmin = username === 'admin';
        const endpoint = isAdmin ? '/api/admin/auth' : '/api/staff/auth';
        
        const response = await fetch(`${getApiUrl()}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: username,
            password: password
          }),
        });

        if (response.status === 429) {
          retries--;
          if (retries === 0) {
            setError('Server is busy. Please wait 30 seconds and try again.');
            setLoading(false);
            return;
          }
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
          continue;
        }

        const data = await response.json();
        
        console.log('Login request:', { username, password });
        console.log('Login response:', response.status, data);
        
        if (response.ok && data.success) {
          // Store JWT token securely
          localStorage.setItem('adminToken', data.token);
          localStorage.setItem('adminAuthenticated', 'true');
          
          // Check if this is a staff member and redirect to appropriate page
          if (data.user && data.user.role && data.user.role !== 'admin') {
            const role = data.user.role.toLowerCase();
            switch (role) {
              case 'manager':
                // Manager stays on admin page
                break;
              case 'chef':
              case 'waiter':
                window.location.href = '/staff';
                return;
              case 'cashier':
                window.location.href = '/reception';
                return;
              default:
                break;
            }
          }
          
          setIsAuthenticated(true);
          
          // Fetch data after successful login
          setTimeout(() => {
            fetchOrders();
            fetchCustomers();
            fetchDatabaseSummary();
          }, 100);
        } else {
          console.log('Login failed:', data);
          setError(data.message || `Login failed: ${response.status} ${response.statusText}`);
        }
        break; // Success, exit retry loop
      } catch (err) {
        retries--;
        if (retries === 0) {
          setError('Network error. Please check your connection.');
          setLoading(false);
          return;
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
    
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminAuthenticated');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setIsAuthenticated(false);
    setPassword('');
    setError(null);
  };

  // Order management handlers
  const handleClearTable = async (tableId) => {
    try {
      // Check authentication
      const token = localStorage.getItem('adminToken');
      if (!token) {
        alert('Your session has expired. Please login again.');
        window.location.reload();
        return;
      }

      // eslint-disable-next-line no-restricted-globals
      if (!confirm(`Are you sure you want to clear all orders for Table ${tableId}? This will mark them as completed and paid.`)) {
        return;
      }

      // Update all orders for this table to completed status
      const tableOrders = orders.filter(order => 
        order.table_id === tableId && 
        ['pending', 'preparing', 'ready'].includes(order.status)
      );

      if (tableOrders.length === 0) {
        alert(`No active orders found for Table ${tableId}.`);
        return;
      }
      
      for (const order of tableOrders) {
        await fetchApi.put(`/api/orders/${order.id}/status`, { 
          status: 'completed',
          payment_status: 'paid'
        });
      }
      
      // Refresh orders after clearing table
      fetchOrders();
      alert(`Table ${tableId} cleared successfully! ${tableOrders.length} orders marked as completed.`);
    } catch (error) {
      console.error('Error clearing table:', error);
      
      if (error.message.includes('Authentication failed')) {
        alert('Your session has expired. Please login again.');
        window.location.reload();
      } else {
        alert(`Failed to clear table: ${error.message}`);
      }
    }
  };

  const handleCompleteOrder = async (orderId) => {
    try {
      // Check authentication
      const token = localStorage.getItem('adminToken');
      if (!token) {
        alert('Your session has expired. Please login again.');
        window.location.reload();
        return;
      }

      await fetchApi.put(`/api/orders/${orderId}/status`, { 
        status: 'completed',
        payment_status: 'paid'
      });
      // Refresh orders after updating status
      fetchOrders();
      console.log(`✅ Order ${orderId} marked as completed`);
    } catch (error) {
      console.error('Error completing order:', error);
      
      if (error.message.includes('Authentication failed')) {
        alert('Your session has expired. Please login again.');
        window.location.reload();
      } else {
        alert(`Failed to complete order: ${error.message}`);
      }
    }
  };

  const handleDeleteOrder = async (orderId, orderNumber) => {
    try {
      // eslint-disable-next-line no-restricted-globals
      if (confirm(`Are you sure you want to delete order ${orderNumber}? This action cannot be undone.`)) {
        const result = await fetchApi.delete(`/api/order/${orderId}`);
        
        if (result && result.success) {
          // Refresh orders after successful deletion
          fetchOrders();
          console.log(`🗑️ Order ${orderNumber} deleted successfully`);
          alert(`Order ${orderNumber} has been deleted successfully!`);
        } else {
          throw new Error(result?.message || 'Unknown error occurred');
        }
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      
      if (error.message.includes('Authentication failed')) {
        alert('Your session has expired. Please login again.');
        window.location.reload();
      } else {
        alert(`Failed to delete order: ${error.message}`);
      }
    }
  };

  // Refresh function for header button
  const handleRefresh = async () => {
    console.log('🔄 Refreshing data...');
    try {
      await Promise.all([
        fetchOrders(),
        fetchCustomers(),
        fetchDatabaseSummary()
      ]);
      console.log('✅ Data refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing data:', error);
    }
  };



  function renderContent() {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview orders={orders} customers={customers} dbSummary={dbSummary} />;
      case 'orders':
        return <OrdersManagement onClearTable={handleClearTable} onCompleteOrder={handleCompleteOrder} onDeleteOrder={handleDeleteOrder} />;
      case 'menu':
        return <MenuManagement />;
      case 'tables':
        return <TablesManagement orders={orders} setOrders={setOrders} socket={socket} />;
      case 'customers':
        return <CustomersManagement customers={customers} orders={orders} />;
      case 'daybook':
        return <Daybook />;
      case 'analytics':
        return <AnalyticsViewPlaceholder orders={orders} />;
      case 'staff':
        return <StaffManagement />;
      case 'settings':
        return <AdminSettings />;
      default:
        return <DashboardOverview orders={orders} customers={customers} dbSummary={dbSummary} />;
    }
  }

  // Login Form Component
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-white">🍽️</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Food Zone Admin</h1>
              <p className="text-slate-600">Sign in to access your dashboard</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter username"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard Layout
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Premium Sidebar */}
      <PremiumSidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        onLogout={handleLogout}
        orders={orders}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
        {/* Premium Header */}
        <PremiumHeader 
          activeTab={activeTab}
          orders={orders}
          customers={customers}
          orderHistory={[]}
          onRefresh={handleRefresh}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

// Premium Sidebar Component
const PremiumSidebar = ({ activeTab, setActiveTab, collapsed, setCollapsed, onLogout, orders }) => {
  // Calculate real-time badge counts
  const activeOrders = orders?.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length || 0;
  const occupiedTables = orders?.filter(order => 
    order.order_type === 'dine-in' && 
    order.table_id && 
    ['pending', 'preparing', 'ready'].includes(order.status)
  ).reduce((tables, order) => {
    if (!tables.includes(order.table_id)) {
      tables.push(order.table_id);
    }
    return tables;
  }, []).length || 0;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', badge: null },
    { id: 'orders', label: 'Orders', icon: '📋', badge: activeOrders > 0 ? activeOrders.toString() : null },
    { id: 'menu', label: 'Menu', icon: '🍽️', badge: null },
    { id: 'tables', label: 'Tables', icon: '🪑', badge: occupiedTables > 0 ? occupiedTables.toString() : null },
    { id: 'customers', label: 'Customers', icon: '👥', badge: null },
    { id: 'daybook', label: 'Daybook', icon: '📊', badge: null },
    { id: 'analytics', label: 'Analytics', icon: '📈', badge: null },
    { id: 'staff', label: 'Staff', icon: '👨‍🍳', badge: null },
    { id: 'settings', label: 'Settings', icon: '⚙️', badge: null },
  ];

  return (
    <div className={`fixed left-0 top-0 h-full bg-white border-r border-slate-200 transition-all duration-300 z-30 ${collapsed ? 'w-20' : 'w-72'}`}>
      <div className="flex flex-col h-full">
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">🍽️</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Food Zone</h1>
                  <p className="text-sm text-slate-500">Restaurant Admin</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <span className="text-slate-400">{collapsed ? '→' : '←'}</span>
            </button>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {!collapsed && (
                <>
                  <span className="font-medium flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      activeTab === item.id
                        ? 'bg-white/20 text-white'
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
          >
            <span className="text-lg">🚪</span>
            {!collapsed && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </div>
    </div>
  );
};

// Premium Header Component
const PremiumHeader = ({ activeTab, orders, customers, orderHistory, onRefresh }) => {
  const getPageTitle = () => {
    const titles = {
      dashboard: 'Dashboard Overview',
      orders: 'Order Management',
      menu: 'Menu Management',
      tables: 'Tables & Reservations',
      customers: 'Customer Management',
      analytics: 'Analytics & Reports',
      staff: 'Staff Management',
      settings: 'Settings'
    };
    return titles[activeTab] || 'Food Zone Admin';
  };

  const getPageStats = () => {
    const activeOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length;
    const totalCustomers = customers.length;
    const completedToday = orderHistory.filter(o => {
      const today = new Date().toDateString();
      return new Date(o.created_at).toDateString() === today;
    }).length;

    return { activeOrders, totalCustomers, completedToday };
  };

  const stats = getPageStats();

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{getPageTitle()}</h1>
          <p className="text-slate-600 mt-1">
            {activeTab === 'dashboard' && `${stats.activeOrders} active orders • ${stats.totalCustomers} customers • ${stats.completedToday} completed today`}
            {activeTab === 'orders' && `${stats.activeOrders} active orders requiring attention`}
            {activeTab === 'customers' && `${stats.totalCustomers} total customers in database`}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-green-700">Live</span>
          </div>
          
          <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <span className="text-slate-400">🔔</span>
          </button>
          
          <button 
            onClick={onRefresh}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>
    </header>
  );
};

// Dashboard Overview Component
const DashboardOverview = ({ orders, customers, dbSummary }) => {
  const activeOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
  const dineInOrders = activeOrders.filter(o => o.order_type === 'dine-in');
  const deliveryOrders = activeOrders.filter(o => o.order_type === 'delivery');
  
  const todayRevenue = orders.reduce((sum, order) => {
    const today = new Date().toDateString();
    const orderDate = new Date(order.created_at).toDateString();
    if (orderDate === today && order.status === 'completed') {
      const orderTotal = order.total_amount || (order.items?.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0) || 0);
      return sum + orderTotal;
    }
    return sum;
  }, 0);

  const stats = [
    {
      title: 'Active Orders',
      value: activeOrders.length,
      change: '+12%',
      changeType: 'positive',
      icon: '📋',
      color: 'blue'
    },
    {
      title: 'Today\'s Revenue',
      value: `NPR ${todayRevenue.toLocaleString()}`,
      change: '+8%',
      changeType: 'positive',
      icon: '💰',
      color: 'green'
    },
    {
      title: 'Total Customers',
      value: customers.length,
      change: '+5%',
      changeType: 'positive',
      icon: '👥',
      color: 'purple'
    },
    {
      title: 'Avg Order Value',
      value: `NPR ${Math.round(todayRevenue / Math.max(orders.length, 1))}`,
      change: '+3%',
      changeType: 'positive',
      icon: '📊',
      color: 'orange'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">{stat.title}</p>
                <p className="text-2xl font-bold text-slate-900 mt-2">{stat.value}</p>
                <div className={`flex items-center mt-2 text-sm ${
                  stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  <span>{stat.changeType === 'positive' ? '↗️' : '↘️'}</span>
                  <span className="ml-1">{stat.change} from last week</span>
                </div>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${stat.color}-100`}>
                <span className="text-xl">{stat.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Orders Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dine-in Orders */}
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">🍽️ Dine-in Orders</h3>
            <p className="text-slate-600 text-sm">{dineInOrders.length} active table orders</p>
          </div>
          <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
            {dineInOrders.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl mb-4 block">🪑</span>
                <p className="text-slate-500">No active dine-in orders</p>
              </div>
            ) : (
              dineInOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <p className="font-medium text-slate-900">Table {order.table_id}</p>
                    <p className="text-sm text-slate-600">{order.customer_name}</p>
                    <p className="text-xs text-slate-500">{order.items?.length || 0} items</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">NPR {order.total_amount || (order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0)}</p>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Delivery Orders */}
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">🚚 Delivery Orders</h3>
            <p className="text-slate-600 text-sm">{deliveryOrders.length} active delivery orders</p>
          </div>
          <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
            {deliveryOrders.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl mb-4 block">🚚</span>
                <p className="text-slate-500">No active delivery orders</p>
              </div>
            ) : (
              deliveryOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <p className="font-medium text-slate-900">{order.customer_name}</p>
                    <p className="text-sm text-slate-600">{order.phone}</p>
                    {order.latitude && order.longitude && (
                      <p className="text-xs text-slate-500 mt-1">
                        <span role="img" aria-label="location">📍</span> GPS: {order.latitude}, {order.longitude}
                      </p>
                    )}
                    <p className="text-xs text-slate-500">{order.items?.length || 0} items</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">NPR {order.total_amount || (order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0)}</p>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">⚡ Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex flex-col items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors">
            <span className="text-2xl mb-2">➕</span>
            <span className="text-sm font-medium text-blue-700">Add Menu Item</span>
          </button>
          <button className="flex flex-col items-center p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors">
            <span className="text-2xl mb-2">📊</span>
            <span className="text-sm font-medium text-green-700">View Reports</span>
          </button>
          <button className="flex flex-col items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors">
            <span className="text-2xl mb-2">👥</span>
            <span className="text-sm font-medium text-purple-700">Manage Staff</span>
          </button>
          <button className="flex flex-col items-center p-4 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors">
            <span className="text-2xl mb-2">⚙️</span>
            <span className="text-sm font-medium text-orange-700">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Placeholder components for other views

// Tables Management Component
const TablesManagement = ({ orders, setOrders, socket }) => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Fetch real table statuses from API and setup socket listeners
  useEffect(() => {
    fetchTableStatuses();
    
    // Setup socket listeners for real-time updates
    if (socket) {
      socket.on('tableCleared', ({ tableId }) => {
        console.log(`🔄 Real-time: Table ${tableId} cleared by another client`);
        fetchTableStatuses();
      });

      socket.on('newOrder', (order) => {
        console.log('🔄 Real-time: New order received, refreshing table statuses');
        fetchTableStatuses();
      });

      socket.on('orderStatusUpdated', ({ orderId, status }) => {
        console.log(`🔄 Real-time: Order ${orderId} status updated to ${status}`);
        fetchTableStatuses();
      });

      return () => {
        socket.off('tableCleared');
        socket.off('newOrder');
        socket.off('orderStatusUpdated');
      };
    }
    
    // Set up periodic refresh as backup (every 30 seconds)
    const refreshInterval = setInterval(() => {
      console.log('🔄 Periodic refresh of table statuses...');
      fetchTableStatuses();
    }, 30000);
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [socket]);

  const fetchTableStatuses = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching table statuses from API...');
      
      // Try to fetch from the API endpoint first
      const response = await fetchApi.get('/api/tables/status');
      console.log('📊 Table status API response:', response);
      
      if (response && Array.isArray(response)) {
        setTables(response);
        console.log('✅ Using API table data:', response.length, 'tables');
      } else {
        console.log('⚠️ API response invalid, falling back to generated data');
        generateTableDataFromOrders();
      }
    } catch (error) {
      console.error('❌ Error fetching table statuses from API:', error);
      console.log('🔄 Falling back to generating table data from orders');
      // Fallback to generating table data from orders
      generateTableDataFromOrders();
    } finally {
      setLoading(false);
    }
  };

  const generateTableDataFromOrders = () => {
    const tableData = [];
    for (let i = 1; i <= 25; i++) {
      const tableOrders = orders.filter(order => 
        (order.table_id === i || order.table_id === i.toString()) && ['pending', 'preparing', 'ready'].includes(order.status)
      );
      const isOccupied = tableOrders.length > 0;
      const totalAmount = tableOrders.reduce((sum, order) => {
        const orderTotal = order.total_amount || (order.items?.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0) || 0);
        return sum + orderTotal;
      }, 0);
      
      tableData.push({
        table_id: i,
        status: isOccupied ? 'occupied' : 'empty',
        customer_name: tableOrders[0]?.customer_name || null,
        customer_phone: tableOrders[0]?.phone || tableOrders[0]?.customer_phone || null,
        total_amount: totalAmount,
        order_count: tableOrders.length,
        session_start: tableOrders[0]?.created_at || null,
        hours_occupied: tableOrders[0] ? (Date.now() - new Date(tableOrders[0].created_at)) / (1000 * 60 * 60) : 0
      });
    }
    setTables(tableData);
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const clearTable = async (tableId) => {
    try {
      console.log('🔧 AdminPremium clearing table:', tableId);
      
      // Call the proper clear table API endpoint that handles database cleanup
      const response = await fetchApi.post(`/api/clear-table/${tableId}`, {});
      console.log('🔧 Clear table API response:', response);
      
      if (response && response.success) {
        // Emit socket event for real-time updates across all clients
        if (socket) {
          socket.emit('tableCleared', { tableId });
        }
        
        // Update local orders state immediately for instant UI feedback
        setOrders(prevOrders => 
          prevOrders.filter(order => order.table_id !== tableId)
        );
        
        // Auto-refresh table statuses and orders for consistency
        console.log('🔄 Auto-refreshing after table clear...');
        await Promise.all([
          fetchTableStatuses(),
          // Also refresh parent orders if available
          window.location.pathname.includes('admin') && window.fetchOrders && window.fetchOrders()
        ]);
        
        console.log(`✅ Table ${tableId} cleared successfully. ${response.movedToHistory || 0} orders moved to history.`);
        showNotification(`Table ${tableId} cleared successfully! ${response.movedToHistory || 0} orders moved to history.`, 'success');
      } else {
        console.warn('⚠️ Clear table response indicates failure:', response);
        showNotification('Failed to clear table. Please try again.', 'error');
      }
      
      setShowClearModal(false);
      setSelectedTable(null);
    } catch (error) {
      console.error('❌ Error clearing table:', error);
      showNotification(`Error clearing table: ${error.message}`, 'error');
      // Refresh table statuses anyway to get current state
      await fetchTableStatuses();
      setShowClearModal(false);
      setSelectedTable(null);
    }
  };

  const getTableStatusColor = (status) => {
    switch (status) {
      case 'empty': return 'bg-green-100 border-green-300 text-green-700';
      case 'occupied': return 'bg-red-100 border-red-300 text-red-700';
      case 'ordering': return 'bg-blue-100 border-blue-300 text-blue-700';
      case 'dining': return 'bg-yellow-100 border-yellow-300 text-yellow-700';
      case 'payment_pending': return 'bg-orange-100 border-orange-300 text-orange-700';
      default: return 'bg-gray-100 border-gray-300 text-gray-700';
    }
  };

  const occupiedTables = (tables || []).filter(t => t.status === 'occupied' || t.status === 'ordering' || t.status === 'dining');
  const availableTables = (tables || []).filter(t => t.status === 'empty');
  
  // Debug logging for revenue calculation
  console.log('🔍 Tables data for revenue calculation:', tables);
  console.log('🔍 Occupied tables:', occupiedTables);
  console.log('🔍 Revenue calculation:', occupiedTables.map(t => ({ id: t.table_id, amount: t.total_amount })));
  const totalRevenue = occupiedTables.reduce((sum, t) => sum + (t.total_amount || 0), 0);
  console.log('🔍 Total revenue calculated:', totalRevenue);

  return (
    <div className="space-y-6">
      {/* Table Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-xs sm:text-sm font-medium">Total Tables</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900">25</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-lg sm:text-xl">🪑</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-xs sm:text-sm font-medium">Occupied</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600">{occupiedTables.length}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <span className="text-lg sm:text-xl">🔴</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-xs sm:text-sm font-medium">Available</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">{availableTables.length}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <span className="text-lg sm:text-xl">🟢</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-xs sm:text-sm font-medium">Revenue Today</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-600">
                NPR {totalRevenue.toLocaleString()}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-lg sm:text-xl">💰</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table Grid */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <h2 className="text-xl font-semibold">Table Layout</h2>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-200 border border-green-300 rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-200 border border-red-300 rounded"></div>
              <span>Occupied</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="ml-3 text-gray-600">Loading tables...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {(tables || []).map((table) => (
              <div
                key={table.table_id}
                onClick={() => setSelectedTable(table)}
                className={`p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${getTableStatusColor(table.status)}`}
              >
                <div className="text-center">
                  <div className="text-sm sm:text-lg font-bold mb-1">Table {table.table_id}</div>
                  <div className="text-xs capitalize mb-2">{table.status.replace('_', ' ')}</div>
                  {table.status !== 'empty' && (
                    <div className="text-xs">
                      {table.customer_name && (
                        <div className="font-medium truncate">{table.customer_name}</div>
                      )}
                      {table.total_amount > 0 && (
                        <div className="font-semibold">NPR {table.total_amount}</div>
                      )}
                      {table.order_count > 0 && (
                        <div>{table.order_count} order(s)</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Occupied Tables Details */}
      {occupiedTables.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="text-lg font-semibold mb-4">Occupied Tables Details</h3>
          <div className="space-y-4">
            {occupiedTables.map((table) => (
              <div key={table.table_id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">Table {table.table_id}</h4>
                  <button
                    onClick={() => {
                      setSelectedTable(table);
                      setShowClearModal(true);
                    }}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    Clear Table
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{table.customer_name || 'Unknown Customer'}</div>
                      <div className="text-sm text-gray-600 truncate">• {table.customer_phone || 'No phone'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">NPR {table.total_amount || 0}</div>
                      <div className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                        {table.status}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table Details Modal */}
      {selectedTable && !showClearModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Table {selectedTable.table_id} Details
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedTable.customer_name && `Customer: ${selectedTable.customer_name}`}
                  {selectedTable.customer_phone && ` • ${selectedTable.customer_phone}`}
                </p>
              </div>
              <button
                onClick={() => setSelectedTable(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Table Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="text-lg font-semibold capitalize">
                    {selectedTable.status.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-lg font-semibold text-blue-600">
                    NPR {parseFloat(selectedTable.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Orders</p>
                  <p className="text-lg font-semibold">
                    {selectedTable.order_count || selectedTable.orders?.length || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Time Occupied</p>
                  <p className="text-lg font-semibold">
                    {selectedTable.hours_occupied 
                      ? `${selectedTable.hours_occupied.toFixed(1)} hrs` 
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Orders List */}
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Orders</h3>
              {selectedTable.orders && selectedTable.orders.length > 0 ? (
                selectedTable.orders.map((order, orderIndex) => (
                  <div key={order.id || orderIndex} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-gray-900">
                          Order #{order.order_number || order.id}
                        </p>
                        <p className="text-sm text-gray-600 capitalize">
                          Status: {order.status}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-blue-600">
                        NPR {parseFloat(order.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    {/* Order Items */}
                    {order.items && order.items.length > 0 ? (
                      <div className="space-y-2 mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm font-medium text-gray-700">Items: ({order.items.length})</p>
                        {order.items.map((item, itemIndex) => (
                          <div key={itemIndex} className="flex items-center justify-between text-sm">
                            <div className="flex-1">
                              <span className="text-gray-900">{item.name || 'Unknown Item'}</span>
                              <span className="text-gray-500 ml-2">× {item.quantity || 0}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-gray-900 font-medium">
                                NPR {parseFloat(item.subtotal || (item.price * item.quantity) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                              <p className="text-xs text-gray-500">
                                @ NPR {parseFloat(item.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-500">
                        No items in this order
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No active orders for this table</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => setSelectedTable(null)}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
              {selectedTable.status !== 'empty' && (
                <button
                  onClick={() => setShowClearModal(true)}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  🧹 Clear Table
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Clear Table Confirmation Modal */}
      {showClearModal && selectedTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Clear Table {selectedTable.table_id}?</h3>
            <p className="text-gray-600 mb-6">
              This will mark all active orders for this table as completed and make the table available for new customers.
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => clearTable(selectedTable.table_id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Yes, Clear Table
              </button>
              <button
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notification.type === 'success' 
            ? 'bg-green-100 border border-green-400 text-green-700' 
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          <div className="flex items-center">
            <span className="mr-2">
              {notification.type === 'success' ? '✅' : '❌'}
            </span>
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-4 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Customers Management Component
const CustomersManagement = ({ customers, orders }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [sortBy, setSortBy] = useState('recent');

  // Calculate customer statistics
  const getCustomerStats = (customer) => {
    const customerOrders = orders.filter(order => 
      order.customer_name === customer.name || order.phone === customer.phone
    );
    const totalSpent = customerOrders.reduce((sum, order) => {
      const orderTotal = order.total_amount || (order.items?.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0) || 0);
      return sum + orderTotal;
    }, 0);
    const lastOrderDate = customerOrders.length > 0 ? 
      Math.max(...customerOrders.map(o => new Date(o.created_at).getTime())) : null;
    
    return {
      totalOrders: customerOrders.length,
      totalSpent,
      lastOrderDate,
      orders: customerOrders
    };
  };

  // Filter and sort customers
  const filteredCustomers = customers
    .filter(customer => 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aStats = getCustomerStats(a);
      const bStats = getCustomerStats(b);
      
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'orders':
          return bStats.totalOrders - aStats.totalOrders;
        case 'spent':
          return bStats.totalSpent - aStats.totalSpent;
        case 'recent':
        default:
          return (bStats.lastOrderDate || 0) - (aStats.lastOrderDate || 0);
      }
    });

  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((sum, customer) => {
    return sum + getCustomerStats(customer).totalSpent;
  }, 0);
  const avgOrderValue = totalRevenue / Math.max(orders.length, 1);

  return (
    <div className="space-y-6">
      {/* Customer Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Total Customers</p>
              <p className="text-2xl font-bold text-slate-900">{totalCustomers}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">👥</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">NPR {totalRevenue.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">💰</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Avg Order Value</p>
              <p className="text-2xl font-bold text-purple-600">NPR {Math.round(avgOrderValue)}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">📊</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Active Today</p>
              <p className="text-2xl font-bold text-orange-600">
                {customers.filter(customer => {
                  const stats = getCustomerStats(customer);
                  const today = new Date().toDateString();
                  return stats.lastOrderDate && new Date(stats.lastOrderDate).toDateString() === today;
                }).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">🔥</span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Management */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Customer Database</h2>
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="recent">Recent Activity</option>
              <option value="name">Name A-Z</option>
              <option value="orders">Most Orders</option>
              <option value="spent">Highest Spent</option>
            </select>
          </div>
        </div>

        {/* Customer List */}
        <div className="space-y-4">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl mb-4 block">👥</span>
              <p className="text-gray-500">
                {searchTerm ? `No customers found matching "${searchTerm}"` : 'No customers found'}
              </p>
            </div>
          ) : (
            filteredCustomers.map((customer) => {
              const stats = getCustomerStats(customer);
              return (
                <div
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                          <p className="text-sm text-gray-600">{customer.phone}</p>
                          {customer.email && (
                            <p className="text-sm text-gray-500">{customer.email}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-lg font-bold text-blue-600">{stats.totalOrders}</p>
                          <p className="text-xs text-gray-500">Orders</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-green-600">NPR {stats.totalSpent}</p>
                          <p className="text-xs text-gray-500">Total Spent</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">
                            {stats.lastOrderDate ? 
                              new Date(stats.lastOrderDate).toLocaleDateString() : 
                              'No orders'
                            }
                          </p>
                          <p className="text-xs text-gray-500">Last Order</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Customer Details</h3>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {(() => {
              const stats = getCustomerStats(selectedCustomer);
              return (
                <div className="space-y-6">
                  {/* Customer Info */}
                  <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      {selectedCustomer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold">{selectedCustomer.name}</h4>
                      <p className="text-gray-600">{selectedCustomer.phone}</p>
                      {selectedCustomer.email && (
                        <p className="text-gray-500">{selectedCustomer.email}</p>
                      )}
                    </div>
                  </div>

                  {/* Customer Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{stats.totalOrders}</p>
                      <p className="text-sm text-gray-600">Total Orders</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">NPR {stats.totalSpent}</p>
                      <p className="text-sm text-gray-600">Total Spent</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">
                        NPR {stats.totalOrders > 0 ? Math.round(stats.totalSpent / stats.totalOrders) : 0}
                      </p>
                      <p className="text-sm text-gray-600">Avg Order</p>
                    </div>
                  </div>

                  {/* Order History */}
                  <div>
                    <h5 className="text-lg font-semibold mb-4">Order History</h5>
                    {stats.orders.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No orders found</p>
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {stats.orders
                          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                          .map((order) => (
                            <div key={order.id} className="border border-gray-200 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">
                                  {order.order_type === 'dine-in' ? `Table ${order.table_id}` : 'Delivery'}
                                </span>
                                <p className="text-sm text-gray-600">
                                  {order.customer_name} • {new Date(order.created_at).toLocaleString()}
                                </p>
                                {order.order_type === 'delivery' && order.latitude && order.longitude && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    📍 {order.latitude}, {order.longitude}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">
                                  {order.items?.length || 0} items
                                </span>
                                <div className="flex items-center space-x-2">
                                  <span className="font-semibold">NPR {order.total_amount}</span>
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-blue-100 text-blue-700'
                                  }`}>
                                    {order.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

// Analytics Component
const AnalyticsViewPlaceholder = ({ orders }) => {
  const [dateRange, setDateRange] = useState('today');
  // const [selectedMetric, setSelectedMetric] = useState('revenue');

  // Calculate analytics data
  const getAnalyticsData = () => {
    const now = new Date();
    let startDate;
    
    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(0);
    }

    const filteredOrders = orders.filter(order => 
      new Date(order.created_at) >= startDate
    );

    const totalRevenue = filteredOrders.reduce((sum, order) => {
      const orderTotal = order.total_amount || (order.items?.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0) || 0);
      return sum + orderTotal;
    }, 0);
    const totalOrders = filteredOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Group by status
    const ordersByStatus = filteredOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    // Group by order type
    const ordersByType = filteredOrders.reduce((acc, order) => {
      acc[order.order_type] = (acc[order.order_type] || 0) + 1;
      return acc;
    }, {});

    // Daily revenue trend (last 7 days)
    const dailyRevenue = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const dayOrders = orders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= dayStart && orderDate < dayEnd;
      });
      
      const dayRevenue = dayOrders.reduce((sum, order) => {
        const orderTotal = order.total_amount || (order.items ? order.items.reduce((itemSum, item) => itemSum + item.price * item.quantity, 0) : 0);
        return sum + orderTotal;
      }, 0);
      dailyRevenue.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        revenue: dayRevenue,
        orders: dayOrders.length
      });
    }

    // Popular items analysis
    const itemCounts = {};
    filteredOrders.forEach(order => {
      if (order.items) {
        order.items.forEach(item => {
          const itemName = item.name || item.item_name;
          if (itemName) {
            itemCounts[itemName] = (itemCounts[itemName] || 0) + (item.quantity || 1);
          }
        });
      }
    });

    const popularItems = Object.entries(itemCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      ordersByStatus,
      ordersByType,
      dailyRevenue,
      popularItems
    };
  };

  const analytics = getAnalyticsData();

  // Export functions
  const exportToCSV = () => {
    const csvData = [
      ['Date', 'Revenue', 'Orders'],
      ...analytics.dailyRevenue.map(day => [day.date, day.revenue, day.orders]),
      [],
      ['Popular Items', 'Quantity'],
      ...analytics.popularItems.map(item => [item.name, item.count]),
      [],
      ['Order Status', 'Count'],
      ...Object.entries(analytics.ordersByStatus).map(([status, count]) => [status, count]),
      [],
      ['Summary'],
      ['Total Revenue', analytics.totalRevenue],
      ['Total Orders', analytics.totalOrders],
      ['Average Order Value', analytics.avgOrderValue.toFixed(2)]
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `food-zone-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Food Zone Analytics Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .section { margin-bottom: 25px; }
          .section h3 { color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; }
          .summary-card { display: inline-block; margin: 10px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Food Zone Analytics Report</h1>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="section">
          <h3>Summary</h3>
          <div class="summary-card">
            <strong>Total Revenue:</strong> NPR ${analytics.totalRevenue}
          </div>
          <div class="summary-card">
            <strong>Total Orders:</strong> ${analytics.totalOrders}
          </div>
          <div class="summary-card">
            <strong>Average Order Value:</strong> NPR ${analytics.avgOrderValue.toFixed(2)}
          </div>
        </div>

        <div class="section">
          <h3>Daily Revenue (Last 7 Days)</h3>
          <table>
            <tr><th>Day</th><th>Revenue (NPR)</th><th>Orders</th></tr>
            ${analytics.dailyRevenue.map(day => 
              `<tr><td>${day.date}</td><td>${day.revenue}</td><td>${day.orders}</td></tr>`
            ).join('')}
          </table>
        </div>

        <div class="section">
          <h3>Popular Items</h3>
          <table>
            <tr><th>Item Name</th><th>Quantity Sold</th></tr>
            ${analytics.popularItems.map(item => 
              `<tr><td>${item.name}</td><td>${item.count}</td></tr>`
            ).join('')}
          </table>
        </div>

        <div class="section">
          <h3>Order Status Distribution</h3>
          <table>
            <tr><th>Status</th><th>Count</th></tr>
            ${Object.entries(analytics.ordersByStatus).map(([status, count]) => 
              `<tr><td>${status}</td><td>${count}</td></tr>`
            ).join('')}
          </table>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  const emailReport = () => {
    const subject = `Food Zone Analytics Report - ${new Date().toLocaleDateString()}`;
    const body = `
Analytics Summary:
- Total Revenue: NPR ${analytics.totalRevenue}
- Total Orders: ${analytics.totalOrders}
- Average Order Value: NPR ${analytics.avgOrderValue.toFixed(2)}

Daily Revenue (Last 7 Days):
${analytics.dailyRevenue.map(day => `${day.date}: NPR ${day.revenue} (${day.orders} orders)`).join('\n')}

Popular Items:
${analytics.popularItems.map(item => `${item.name}: ${item.count} sold`).join('\n')}

Generated from Food Zone Admin Dashboard
    `;
    
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  return (
    <div className="space-y-6">
      {/* Analytics Controls */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Analytics & Reports</h2>
          <div className="flex items-center space-x-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Revenue</p>
                <p className="text-2xl font-bold">NPR {analytics.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-blue-400 rounded-xl flex items-center justify-center">
                <span className="text-xl">💰</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Total Orders</p>
                <p className="text-2xl font-bold">{analytics.totalOrders}</p>
              </div>
              <div className="w-12 h-12 bg-green-400 rounded-xl flex items-center justify-center">
                <span className="text-xl">📋</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Avg Order Value</p>
                <p className="text-2xl font-bold">NPR {Math.round(analytics.avgOrderValue)}</p>
              </div>
              <div className="w-12 h-12 bg-purple-400 rounded-xl flex items-center justify-center">
                <span className="text-xl">📊</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Completion Rate</p>
                <p className="text-2xl font-bold">
                  {analytics.totalOrders > 0 ? 
                    Math.round(((analytics.ordersByStatus.completed || 0) / analytics.totalOrders) * 100) : 0}%
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-400 rounded-xl flex items-center justify-center">
                <span className="text-xl">✅</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200">
          <h3 className="text-lg font-semibold mb-4">Revenue Trend (Last 7 Days)</h3>
          <div className="space-y-4">
            {analytics.dailyRevenue.map((day, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 min-w-0">{day.date}</span>
                  <div className="flex items-center space-x-2 text-right">
                    <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                      NPR {day.revenue}
                    </span>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      ({day.orders} orders)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.max(5, (day.revenue / Math.max(...analytics.dailyRevenue.map(d => d.revenue))) * 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="text-lg font-semibold mb-4">Order Status Distribution</h3>
          <div className="space-y-4">
            {Object.entries(analytics.ordersByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${
                    status === 'completed' ? 'bg-green-500' :
                    status === 'pending' ? 'bg-yellow-500' :
                    status === 'preparing' ? 'bg-blue-500' :
                    'bg-gray-500'
                  }`}></div>
                  <span className="text-sm font-medium capitalize">{status}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold">{count}</span>
                  <span className="text-xs text-gray-500">
                    ({analytics.totalOrders > 0 ? Math.round((count / analytics.totalOrders) * 100) : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Type Distribution */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="text-lg font-semibold mb-4">Order Type Distribution</h3>
          <div className="space-y-4">
            {Object.entries(analytics.ordersByType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${
                    type === 'dine-in' ? 'bg-purple-500' : 'bg-orange-500'
                  }`}></div>
                  <span className="text-sm font-medium capitalize">{type.replace('-', ' ')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold">{count}</span>
                  <span className="text-xs text-gray-500">
                    ({analytics.totalOrders > 0 ? Math.round((count / analytics.totalOrders) * 100) : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Items */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="text-lg font-semibold mb-4">Popular Items</h3>
          <div className="space-y-3">
            {analytics.popularItems.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No items data available</p>
            ) : (
              analytics.popularItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-600">{item.count} sold</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <h3 className="text-lg font-semibold mb-4">Export Reports</h3>
        <div className="flex items-center space-x-4">
          <button 
            onClick={exportToCSV}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Export CSV
          </button>
          <button 
            onClick={exportToPDF}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Export PDF
          </button>
          <button 
            onClick={emailReport}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            Email Report
          </button>
        </div>
      </div>
    </div>
  );
};



export default AdminPremium;
