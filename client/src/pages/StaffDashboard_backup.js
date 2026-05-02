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
  const [pushEnabled, setPushEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('adminToken') || localStorage.getItem('staffToken');
  });

  // Redirect to unified login if not authenticated
  if (!isAuthenticated) {
    window.location.href = '/admin?redirect=/staff';
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

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
    if (isAuthenticated) {
      const verifyAndFetch = async () => {
        try {
          const token = localStorage.getItem('adminToken') || localStorage.getItem('staffToken');
          if (!token) {
            setIsAuthenticated(false);
            return;
          }

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
            setOrders(prevOrders => [order, ...prevOrders]);
            addNotification('New Order', `Order #${order.id} received`, 'info');
            if (audioEnabled) playNotificationSound();
          });

          newSocket.on('orderStatusUpdated', ({ orderId, status }) => {
            setOrders(prevOrders => 
              prevOrders.map(order => 
                order.id === orderId ? { ...order, status } : order
              )
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
  }, [isAuthenticated, audioEnabled]);

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
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId ? { ...order, status: newStatus } : order
          )
        );
        addNotification('Status Updated', `Order #${orderId} marked as ${newStatus}`, 'success');
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
      const audio = new Audio('/sounds/notification.mp3');
      audio.play().catch(console.error);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  const togglePushNotifications = async () => {
    if (!pushEnabled) {
      try {
        const permission = await Notification.requestPermission();
        setPushEnabled(permission === 'granted');
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    } else {
      setPushEnabled(false);
    }
  };

  const toggleAudioAlerts = () => {
    setAudioEnabled(!audioEnabled);
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
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 sm:h-16 space-y-3 sm:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Food Zone - Staff Dashboard</h1>
              <div className="flex items-center space-x-2 mt-1 sm:mt-0 sm:ml-4">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Today Only
                </span>
                <span className="text-xs sm:text-sm text-gray-500">
                  {activeOrders.length} active orders
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-medium ${
                isOnline 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                <span>{isOnline ? '🟢' : '🔴'}</span>
                <span>{isOnline ? 'Online' : 'Offline'}</span>
              </div>
              
              {/* Push Notifications Toggle */}
              <button
                onClick={togglePushNotifications}
                className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                  pushEnabled 
                    ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{pushEnabled ? '📱' : '📵'}</span>
                <span>{pushEnabled ? 'Push On' : 'Push Off'}</span>
              </button>
              
              {/* Audio Toggle */}
              <button
                onClick={toggleAudioAlerts}
                className={`px-3 py-2 rounded-lg transition-colors font-medium ${
                  audioEnabled
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                }`}
                title={audioEnabled ? 'Disable Kitchen Alarm' : 'Enable Kitchen Alarm'}
              >
                {audioEnabled ? '🚨 Alarm On' : '🔇 Alarm Off'}
              </button>
              
              <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500">
                <span>📅</span>
                <div className="text-right">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { key: 'pending', label: 'Pending', count: Array.isArray(orders) ? orders.filter(o => o.status === 'pending').length : 0 },
            { key: 'preparing', label: 'Preparing', count: Array.isArray(orders) ? orders.filter(o => o.status === 'preparing').length : 0 },
            { key: 'ready', label: 'Ready', count: Array.isArray(orders) ? orders.filter(o => o.status === 'ready').length : 0 },
            { key: 'completed', label: 'Completed', count: Array.isArray(orders) ? orders.filter(o => o.status === 'completed').length : 0 }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                filter === tab.key
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:shadow-sm'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                  filter === tab.key
                    ? 'bg-white text-blue-600'
                    : 'bg-blue-600 text-white'
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
            {filteredOrders.map((order) => (
              <div key={order.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow bg-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold text-gray-900">Order #{order.id}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      {order.table_number ? (
                        <p className="text-sm text-gray-500"><strong>Table:</strong> {order.table_number}</p>
                      ) : (
                        <p className="text-sm text-gray-500"><strong>Customer:</strong> {order.customer_name || 'N/A'} • {order.customer_phone || 'N/A'}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-2">
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        NPR {order.total_amount || (order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0)}
                      </p>
                    </div>
                    
                    {/* Status Update Buttons */}
                    <div className="flex flex-col space-y-2">
                      <div className="flex space-x-2">
                        {order.status === 'pending' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'preparing')}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm"
                          >
                            🔥 Start Preparing
                          </button>
                        )}
                        
                        {order.status === 'preparing' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'ready')}
                            className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors duration-200 shadow-sm"
                          >
                            ✅ Mark Ready
                          </button>
                        )}
                        
                        {order.status === 'ready' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'completed')}
                            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors duration-200 shadow-sm"
                          >
                            🏁 Complete Order
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Order Items:</h4>
                  <div className="space-y-1">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {item.quantity}x {item.menu_item_name || item.name}
                          </span>
                          <span className="text-gray-900 font-medium">
                            NPR {(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No items listed</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffDashboard;
