import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import mobileAudioManager from '../utils/mobileAudioManager';
import { apiService, fetchApi, getSocketUrl } from '../services/apiService';
import MobileOrderCard from '../components/MobileOrderCard';

const AdminMobile = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Security: Only allow admin users, not staff or reception
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
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('dine-in');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [tableToDelete, setTableToDelete] = useState(null);

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
      fetchOrders();
      
      // Initialize mobile audio manager with full permissions
      mobileAudioManager.requestAllPermissions();
      mobileAudioManager.setEnabled(true);
      
      // Register service worker for background notifications
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('✅ Service Worker registered for background notifications');
          })
          .catch(error => {
            console.error('❌ Service Worker registration failed:', error);
          });
      }

      const newSocket = io(getSocketUrl());
      
      newSocket.on('newOrder', (order) => {
        setOrders(prevOrders => [...prevOrders, order]);
        
        // Use mobile audio manager for maximum volume alerts
        if (order.order_type === 'delivery') {
          mobileAudioManager.playDeliveryOrderSound();
        } else {
          mobileAudioManager.playTableOrderSound();
        }
        
        // Send message to service worker for background notification
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'NEW_ORDER',
            orderType: order.order_type
          });
        }
      });

      newSocket.on('orderStatusUpdated', ({ orderId, status }) => {
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId ? { ...order, status } : order
          )
        );
      });

      // Keep service worker alive with periodic pings
      const keepAliveInterval = setInterval(() => {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const messageChannel = new MessageChannel();
          navigator.serviceWorker.controller.postMessage(
            { type: 'KEEP_ALIVE' },
            [messageChannel.port2]
          );
        }
      }, 25000); // Every 25 seconds

      return () => {
        newSocket.close();
        clearInterval(keepAliveInterval);
      };
    }
  }, [isAuthenticated]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await fetchApi.get('/api/orders');
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchApi.post('/api/admin/auth', { password });
      
      if (response.success) {
        setIsAuthenticated(true);
        localStorage.setItem('adminAuthenticated', 'true');
        setPassword('');
      } else {
        setError('Incorrect password');
        setPassword('');
      }
    } catch (err) {
      setError('Authentication failed');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('adminAuthenticated');
    setPassword('');
    setError(null);
  };

  const handleClearTable = (tableId) => {
    setTableToDelete(tableId);
    setShowConfirmModal(true);
  };

  const confirmClearTable = async () => {
    if (tableToDelete) {
      try {
        const response = await apiService.clearTableAdmin(tableToDelete);
        if (response.data.success) {
          await fetchOrders();
        }
        setShowConfirmModal(false);
        setTableToDelete(null);
      } catch (error) {
        console.error('Error clearing table:', error);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const getTotalOrderValue = (items, fallbackTotal) => {
    if (!items || items.length === 0) return fallbackTotal || 0;
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // Login Screen - Mobile Optimized
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-2xl">🍽️</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">Food Zone</h1>
            <p className="text-gray-600 text-sm">Admin Panel</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all outline-none text-center"
                placeholder="Enter admin password"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-600 text-sm text-center">❌ {error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-4 rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all transform active:scale-95 disabled:opacity-50"
            >
              {loading ? '⏳ Signing in...' : '🚀 Access Panel'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact Mobile Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-lg">🍽️</span>
            </div>
            <div>
              <h1 className="text-base font-bold">Food Zone Admin</h1>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => {
                mobileAudioManager.setEnabled(!mobileAudioManager.isEnabled);
                if (mobileAudioManager.isEnabled) {
                  mobileAudioManager.testSound();
                }
              }}
              className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center"
            >
              <span className="text-sm">{mobileAudioManager.isEnabled ? '🔊' : '🔇'}</span>
            </button>
            <button 
              onClick={handleLogout}
              className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center"
            >
              <span className="text-sm">🚪</span>
            </button>
          </div>
        </div>
      </div>

      {/* Compact Tab Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="flex">
          <button
            onClick={() => setActiveTab('dine-in')}
            className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'dine-in'
                ? 'border-orange-500 text-orange-600 bg-orange-50'
                : 'border-transparent text-gray-500'
            }`}
          >
            <div className="flex items-center justify-center space-x-1">
              <span className="text-sm">🪑</span>
              <span>Dine-in</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('delivery')}
            className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'delivery'
                ? 'border-orange-500 text-orange-600 bg-orange-50'
                : 'border-transparent text-gray-500'
            }`}
          >
            <div className="flex items-center justify-center space-x-1">
              <span className="text-sm">🚚</span>
              <span>Delivery</span>
            </div>
          </button>
        </div>
      </div>

      {/* Compact Content */}
      <div className="p-2 pb-16">
        {/* Dine-in Orders */}
        {activeTab === 'dine-in' && (
          <>
            {orders.filter(order => order.order_type === 'dine-in' && order.status !== 'completed' && order.status !== 'cancelled').length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🪑</span>
                </div>
                <h2 className="text-base font-semibold text-gray-600 mb-1">No Dine-in Orders</h2>
                <p className="text-gray-500 text-sm">Table orders will appear here</p>
              </div>
            ) : (
              <div>
                {orders.filter(order => order.table_id !== null && order.order_type === 'dine-in' && order.status !== 'completed' && order.status !== 'cancelled').map(order => (
                  <MobileOrderCard
                    key={order.id}
                    order={order}
                    onClearTable={handleClearTable}
                    formatDate={formatDate}
                    getTotalOrderValue={getTotalOrderValue}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Delivery Orders */}
        {activeTab === 'delivery' && (
          <>
            {orders.filter(order => order.order_type === 'delivery' && order.status !== 'completed' && order.status !== 'cancelled').length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🚚</span>
                </div>
                <h2 className="text-base font-semibold text-gray-600 mb-1">No Delivery Orders</h2>
                <p className="text-gray-500 text-sm">Delivery orders will appear here</p>
              </div>
            ) : (
              <div>
                {orders.filter(order => order.order_type === 'delivery' && order.status !== 'completed' && order.status !== 'cancelled').map(order => (
                  <MobileOrderCard
                    key={order.id}
                    order={order}
                    onCompleteOrder={(orderId) => console.log('Complete order:', orderId)}
                    formatDate={formatDate}
                    getTotalOrderValue={getTotalOrderValue}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Compact Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 max-w-sm w-full">
            <div className="text-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <span className="text-lg">⚠️</span>
              </div>
              <h3 className="text-base font-bold text-gray-800 mb-1">Clear Table {tableToDelete}?</h3>
              <p className="text-gray-600 text-sm">Move orders to history and free table.</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearTable}
                className="flex-1 bg-red-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Clear Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMobile;
