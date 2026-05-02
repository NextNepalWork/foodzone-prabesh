import React, { useState, useEffect } from 'react';
import { getApiUrl, getSocketUrl } from '../config/api';
import io from 'socket.io-client';

const StaffDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [notifications, setNotifications] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pushEnabled, setPushEnabled] = useState(() => {
    return localStorage.getItem('pushEnabled') === 'true';
  });
  const [audioEnabled, setAudioEnabled] = useState(() => {
    return localStorage.getItem('audioEnabled') === 'true';
  });
  const [userRole, setUserRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('adminToken') || localStorage.getItem('staffToken');
  });

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('staffToken');
    localStorage.removeItem('adminAuthenticated');
    window.location.href = '/admin';
  };

  // Function to decode JWT token and get user role
  const getUserRole = () => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('staffToken');
      if (!token) return null;
      
      // Decode JWT token (simple base64 decode of payload)
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

  // Role-based permission checks
  const canChangeStatus = (currentStatus, newStatus) => {
    if (!userRole) return false;
    
    // Admin can change any status
    if (userRole === 'admin' || userRole === 'Manager') return true;
    
    // Chef can only change pending -> preparing and preparing -> ready
    if (userRole === 'Chef') {
      return (currentStatus === 'pending' && newStatus === 'preparing') ||
             (currentStatus === 'preparing' && newStatus === 'ready');
    }
    
    // Waiter can only change ready -> completed
    if (userRole === 'Waiter') {
      return currentStatus === 'ready' && newStatus === 'completed';
    }
    
    // Cashier can change ready -> completed (same as waiter for order completion)
    if (userRole === 'Cashier') {
      return currentStatus === 'ready' && newStatus === 'completed';
    }
    
    return false;
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/admin?redirect=/staff';
      return;
    }

    const verifyAndFetch = async () => {
      try {
        const token = localStorage.getItem('adminToken') || localStorage.getItem('staffToken');
        if (!token) {
          setIsAuthenticated(false);
          return;
        }

        // Set user role from token
        const role = getUserRole();
        setUserRole(role);
        console.log('User role:', role);

        await fetchOrders();

          const newSocket = io(getSocketUrl(), {
            auth: { token },
            transports: ['websocket', 'polling']
          });

          newSocket.on('connect', () => {
            console.log('Connected to server');
            setIsOnline(true);
          });

          newSocket.on('disconnect', () => {
            console.log('Disconnected from server');
            setIsOnline(false);
          });

          newSocket.on('newOrder', (order) => {
            console.log('🆕 New order received:', order);
            setOrders(prevOrders => [order, ...prevOrders]);
            addNotification('🆕 New Order!', `Order #${order.id} - ${order.order_type || 'dine-in'}`, 'info');
            
            // Play audio if enabled
            const isAudioEnabled = localStorage.getItem('audioEnabled') === 'true';
            if (isAudioEnabled) {
              playNotificationSound();
            }
            
            // Show browser notification if enabled
            const isPushEnabled = localStorage.getItem('pushEnabled') === 'true';
            if (isPushEnabled && 'Notification' in window && Notification.permission === 'granted') {
              new Notification('🆕 New Order Received!', {
                body: `Order #${order.id} - ${order.items?.length || 0} items`,
                icon: '/logo192.png',
                badge: '/logo192.png',
                tag: `order-${order.id}`,
                requireInteraction: true
              });
            }
          });

          newSocket.on('orderStatusUpdated', ({ orderId, status }) => {
            console.log(`🔄 Real-time update: Order ${orderId} status changed to ${status}`);
            setOrders(prevOrders => 
              prevOrders.map(order => 
                order.id === orderId ? { ...order, status } : order
              )
            );
            
            // Get status emoji
            const statusEmoji = {
              'pending': '⏳',
              'preparing': '🔥',
              'ready': '✅',
              'completed': '🏁'
            }[status] || '📋';
            
            addNotification(`${statusEmoji} Order Updated`, `Order #${orderId} → ${status.toUpperCase()}`, 'success');
            
            // Play sound for important status changes
            const isAudioEnabled = localStorage.getItem('audioEnabled') === 'true';
            if (isAudioEnabled && (status === 'ready' || status === 'pending')) {
              playNotificationSound();
            }
          });

          return () => newSocket.close();
        } catch (error) {
          console.error('Authentication verification failed:', error);
          setIsAuthenticated(false);
        }
      };

      verifyAndFetch();
      
      // Set up periodic refresh as backup (every 30 seconds)
      const refreshInterval = setInterval(() => {
        if (isAuthenticated) {
          console.log('🔄 Periodic refresh of orders...');
          fetchOrders();
        }
      }, 30000);
      
      return () => {
        clearInterval(refreshInterval);
      };
  }, [audioEnabled, isAuthenticated]);

  async function fetchOrders() {
    try {
      setLoading(true);
      setError(null);
      
      let retries = 3;
      while (retries > 0) {
        try {
          const token = localStorage.getItem('adminToken') || localStorage.getItem('staffToken');
          const response = await fetch(`${getApiUrl()}/api/orders`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.status === 401) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('staffToken');
            setIsAuthenticated(false);
            return;
          }

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          if (data && Array.isArray(data.orders)) {
            setOrders(data.orders);
          } else if (Array.isArray(data)) {
            setOrders(data);
          } else {
            console.warn('Unexpected API response format:', data);
            setOrders([]);
          }
          break;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to load orders. Please try again.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('staffToken');
      const response = await fetch(`${getApiUrl()}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.status === 401) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('staffToken');
        setIsAuthenticated(false);
        return;
      }

      if (response.ok) {
        // Update local state immediately for instant UI feedback
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId ? { ...order, status: newStatus } : order
          )
        );
        addNotification('Status Updated', `Order #${orderId} marked as ${newStatus}`, 'success');
        
        // Refresh from server to ensure consistency and trigger auto-refresh
        console.log('🔄 Auto-refreshing orders after status change...');
        await fetchOrders();
        console.log('✅ Orders refreshed successfully');
      } else {
        throw new Error('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      addNotification('Update Failed', 'Failed to update order status', 'error');
    }
  };

  const addNotification = (title, message, type = 'info') => {
    const notification = {
      id: Date.now(),
      title,
      message,
      type,
      timestamp: new Date()
    };
    setNotifications(prev => [notification, ...prev.slice(0, 4)]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const playNotificationSound = () => {
    try {
      // Create a beep sound using Web Audio API as fallback
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      // Try to play audio file if available
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {
        console.log('Audio file not available, using beep sound');
      });
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  const togglePushNotifications = async () => {
    if (!pushEnabled) {
      try {
        const permission = await Notification.requestPermission();
        const enabled = permission === 'granted';
        setPushEnabled(enabled);
        localStorage.setItem('pushEnabled', enabled.toString());
        addNotification('Push Notifications', enabled ? 'Enabled successfully' : 'Permission denied', enabled ? 'success' : 'error');
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        addNotification('Push Notifications', 'Failed to enable', 'error');
      }
    } else {
      setPushEnabled(false);
      localStorage.setItem('pushEnabled', 'false');
      addNotification('Push Notifications', 'Disabled', 'info');
    }
  };

  const toggleAudioAlerts = () => {
    const newState = !audioEnabled;
    setAudioEnabled(newState);
    localStorage.setItem('audioEnabled', newState.toString());
    addNotification('Audio Alerts', newState ? 'Kitchen alarm enabled' : 'Kitchen alarm disabled', 'info');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-red-800 mb-2">Error Loading Dashboard</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchOrders}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'preparing': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredOrders = Array.isArray(orders) ? orders.filter(order => {
    return order.status === filter;
  }) : [];
  
  const activeOrders = Array.isArray(orders) ? orders.filter(order => 
    ['pending', 'preparing', 'ready', 'completed'].includes(order.status)
  ) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden transform transition-all duration-300 ${
              notification.type === 'success' ? 'border-l-4 border-green-400' :
              notification.type === 'error' ? 'border-l-4 border-red-400' :
              'border-l-4 border-blue-400'
            }`}
          >
            <div className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {notification.type === 'success' && <span className="text-green-400 text-xl">🎉</span>}
                  {notification.type === 'error' && <span className="text-red-400 text-xl">⚠️</span>}
                  {notification.type === 'info' && <span className="text-blue-400 text-xl">ℹ️</span>}
                </div>
                <div className="ml-3 w-0 flex-1 pt-0.5">
                  <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                  <p className="mt-1 text-sm text-gray-500">{notification.message}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {notification.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                  <button
                    className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500"
                    onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                  >
                    <span className="sr-only">Close</span>
                    <span className="text-lg">×</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 sm:h-20 space-y-3 sm:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <h1 className="text-lg sm:text-2xl font-bold text-white">🍽️ Food Zone - Staff Dashboard</h1>
              <div className="flex items-center space-x-2 mt-1 sm:mt-0 sm:ml-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-sm">
                  📅 Today
                </span>
                {userRole && (
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold shadow-lg ${
                    userRole === 'Chef' ? 'bg-orange-500 text-white' :
                    userRole === 'Waiter' ? 'bg-blue-500 text-white' :
                    userRole === 'Cashier' ? 'bg-green-500 text-white' :
                    userRole === 'Manager' ? 'bg-purple-500 text-white' :
                    'bg-gray-500 text-white'
                  }`}>
                    {userRole === 'Chef' ? '👨‍🍳' : 
                     userRole === 'Waiter' ? '🧑‍💼' : 
                     userRole === 'Cashier' ? '💰' : 
                     userRole === 'Manager' ? '👔' : '👤'} {userRole}
                  </span>
                )}
              </div>
            </div>
            
            {/* Live Order Stats */}
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-white">
                <div className="text-xs font-medium opacity-90">Active Orders</div>
                <div className="text-2xl font-bold">{activeOrders.length}</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-white">
                <div className="text-xs font-medium opacity-90">Pending</div>
                <div className="text-2xl font-bold text-yellow-300">
                  {Array.isArray(orders) ? orders.filter(o => o.status === 'pending').length : 0}
                </div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-white">
                <div className="text-xs font-medium opacity-90">Preparing</div>
                <div className="text-2xl font-bold text-blue-300">
                  {Array.isArray(orders) ? orders.filter(o => o.status === 'preparing').length : 0}
                </div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-white">
                <div className="text-xs font-medium opacity-90">Ready</div>
                <div className="text-2xl font-bold text-green-300">
                  {Array.isArray(orders) ? orders.filter(o => o.status === 'ready').length : 0}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Connection Status */}
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-bold shadow-lg ${
                isOnline 
                  ? 'bg-green-500 text-white' 
                  : 'bg-red-500 text-white animate-pulse'
              }`}>
                <span>{isOnline ? '🟢' : '🔴'}</span>
                <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
              </div>
              
              {/* Push Notifications Toggle */}
              <button
                onClick={togglePushNotifications}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 shadow-lg ${
                  pushEnabled 
                    ? 'bg-blue-500 text-white hover:bg-blue-600 ring-2 ring-blue-300' 
                    : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                }`}
                title={pushEnabled ? 'Disable Push Notifications' : 'Enable Push Notifications'}
              >
                <span className="text-lg">{pushEnabled ? '📱' : '📵'}</span>
                <span>{pushEnabled ? 'PUSH ON' : 'PUSH OFF'}</span>
              </button>
              
              {/* Audio Toggle */}
              <button
                onClick={toggleAudioAlerts}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 font-bold text-xs shadow-lg ${
                  audioEnabled
                    ? 'bg-red-500 hover:bg-red-600 text-white ring-2 ring-red-300'
                    : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                }`}
                title={audioEnabled ? 'Disable Kitchen Alarm' : 'Enable Kitchen Alarm'}
              >
                <span className="text-lg">{audioEnabled ? '🚨' : '🔇'}</span>
                <span>{audioEnabled ? 'ALARM ON' : 'ALARM OFF'}</span>
              </button>
              
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors text-xs font-bold shadow-lg"
              >
                <span>🚪</span>
                <span>LOGOUT</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-3 mb-6">
          {[
            { key: 'pending', label: '⏳ Pending', emoji: '⏳', color: 'yellow', count: Array.isArray(orders) ? orders.filter(o => o.status === 'pending').length : 0 },
            { key: 'preparing', label: '🔥 Preparing', emoji: '🔥', color: 'blue', count: Array.isArray(orders) ? orders.filter(o => o.status === 'preparing').length : 0 },
            { key: 'ready', label: '✅ Ready', emoji: '✅', color: 'orange', count: Array.isArray(orders) ? orders.filter(o => o.status === 'ready').length : 0 },
            { key: 'completed', label: '🏁 Completed', emoji: '🏁', color: 'green', count: Array.isArray(orders) ? orders.filter(o => o.status === 'completed').length : 0 }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center px-5 py-3 rounded-xl text-sm font-bold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 ${
                filter === tab.key
                  ? tab.color === 'yellow' ? 'bg-yellow-500 text-white ring-2 ring-yellow-300' :
                    tab.color === 'blue' ? 'bg-blue-600 text-white ring-2 ring-blue-300' :
                    tab.color === 'orange' ? 'bg-orange-500 text-white ring-2 ring-orange-300' :
                    'bg-green-600 text-white ring-2 ring-green-300'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg mr-2">{tab.emoji}</span>
              <span className="uppercase tracking-wide">{tab.label.replace(tab.emoji, '').trim()}</span>
              {tab.count > 0 && (
                <span className={`ml-3 px-3 py-1 rounded-full text-xs font-bold shadow-inner ${
                  filter === tab.key
                    ? 'bg-white/30 text-white'
                    : tab.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                      tab.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                      tab.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                      'bg-green-100 text-green-800'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Orders Grid */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl sm:text-6xl mb-4">📋</div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-sm sm:text-base text-gray-500">
              {`No ${filter} orders at the moment.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              // Calculate time elapsed
              const createdTime = new Date(order.created_at);
              const now = new Date();
              const minutesElapsed = Math.floor((now - createdTime) / 60000);
              const isUrgent = minutesElapsed > 20;
              const isVeryUrgent = minutesElapsed > 30;
              
              return (
              <div key={order.id} className={`border-2 rounded-xl p-4 transition-all duration-300 bg-white ${
                isVeryUrgent ? 'border-red-500 shadow-lg shadow-red-200 animate-pulse' :
                isUrgent ? 'border-orange-400 shadow-md shadow-orange-100' :
                'border-gray-200 hover:shadow-md'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xl font-bold text-gray-900">Order #{order.id}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                        {/* Time elapsed badge */}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          isVeryUrgent ? 'bg-red-100 text-red-800 animate-pulse' :
                          isUrgent ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          ⏱️ {minutesElapsed} min
                        </span>
                      </div>
                      {order.table_id ? (
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                            🪑 Table {order.table_id}
                          </span>
                          <span className="text-sm text-gray-600 font-medium">{order.customer_name || 'Walk-in'}</span>
                          {order.customer_phone && (
                            <span className="text-xs text-gray-500">📞 {order.customer_phone}</span>
                          )}
                        </div>
                      ) : order.order_type === 'delivery' ? (
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                            🚚 Delivery
                          </span>
                          <span className="text-sm text-gray-600 font-medium">{order.customer_name || 'Customer'}</span>
                          {order.customer_phone && (
                            <span className="text-xs text-gray-500">📞 {order.customer_phone}</span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm text-gray-600 font-medium">👤 {order.customer_name || 'Walk-in'}</span>
                          {order.customer_phone && (
                            <span className="text-xs text-gray-500">📞 {order.customer_phone}</span>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 font-medium">
                        🕐 {new Date(order.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-2">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        NPR {parseFloat(order.total_amount || (order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0)).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 font-medium">
                        {order.items?.length || 0} items
                      </p>
                    </div>
                    
                    {/* Status Update Buttons */}
                    <div className="flex flex-col space-y-2">
                      <div className="flex space-x-2">
                        {order.status === 'pending' && canChangeStatus('pending', 'preparing') && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'preparing')}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm"
                          >
                            🔥 Start Preparing
                          </button>
                        )}
                        
                        {order.status === 'preparing' && canChangeStatus('preparing', 'ready') && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'ready')}
                            className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors duration-200 shadow-sm"
                          >
                            ✅ Mark Ready
                          </button>
                        )}
                        
                        {order.status === 'ready' && canChangeStatus('ready', 'completed') && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'completed')}
                            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors duration-200 shadow-sm"
                          >
                            🏁 Complete Order
                          </button>
                        )}
                        
                        {/* Show disabled buttons with role-based messages */}
                        {order.status === 'pending' && !canChangeStatus('pending', 'preparing') && userRole === 'Waiter' && (
                          <div className="px-4 py-2 bg-gray-300 text-gray-600 text-sm font-medium rounded-lg cursor-not-allowed">
                            👨‍🍳 Chef Only: Start Preparing
                          </div>
                        )}
                        
                        {order.status === 'preparing' && !canChangeStatus('preparing', 'ready') && userRole === 'Waiter' && (
                          <div className="px-4 py-2 bg-gray-300 text-gray-600 text-sm font-medium rounded-lg cursor-not-allowed">
                            👨‍🍳 Chef Only: Mark Ready
                          </div>
                        )}
                        
                        {order.status === 'ready' && !canChangeStatus('ready', 'completed') && userRole === 'Chef' && (
                          <div className="px-4 py-2 bg-gray-300 text-gray-600 text-sm font-medium rounded-lg cursor-not-allowed">
                            🧑‍💼 Waiter Only: Complete Order
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="border-t-2 border-gray-100 pt-4 mt-4">
                  <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">📋 Order Items:</h4>
                  <div className="space-y-2">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center space-x-3">
                            <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full text-sm font-bold">
                              {item.quantity}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {item.menu_item_name || item.name}
                            </span>
                          </div>
                          <span className="text-sm font-bold text-gray-900">
                            NPR {parseFloat(item.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-2">No items listed</p>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffDashboard;
