import React, { useState, useEffect } from 'react';
import { fetchApi } from '../services/apiService';
import { getSocketUrl } from '../config/api';
import axios from 'axios';

const DatabaseManager = () => {
  const [activeTab, setActiveTab] = useState('customers');
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(false);

  // Fetch customers data
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await fetchApi.get('/api/database/summary');
      setCustomers(data.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
    setLoading(false);
  };

  // Fetch orders data
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const result = await fetchApi.post('/api/database/cleanup');
      setOrders(result.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
    setLoading(false);
  };

  // Fetch order history
  const fetchOrderHistory = async () => {
    setLoading(true);
    try {
      const data = await fetchApi.get('/api/order-history');
      setOrderHistory(data);
    } catch (error) {
      console.error('Error fetching order history:', error);
    }
    setLoading(false);
  };

  // Fetch analytics
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const data = await fetchApi.get('/api/analytics');
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    switch (activeTab) {
      case 'customers':
        fetchCustomers();
        break;
      case 'orders':
        fetchOrders();
        break;
      case 'history':
        fetchOrderHistory();
        break;
      case 'analytics':
        fetchAnalytics();
        break;
      default:
        break;
    }
  }, [activeTab]);

  const TabButton = ({ id, label, icon, isActive, onClick }) => (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
        isActive
          ? 'bg-blue-600 text-white shadow-lg'
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
    >
      <span className="text-lg">{icon}</span>
      {label}
    </button>
  );

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">🗄️ Database Management</h2>
        <p className="text-gray-600">View and manage customer data, orders, and analytics</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-3 mb-6">
        <TabButton
          id="customers"
          label="Customers"
          icon="👥"
          isActive={activeTab === 'customers'}
          onClick={setActiveTab}
        />
        <TabButton
          id="orders"
          label="Active Orders"
          icon="📦"
          isActive={activeTab === 'orders'}
          onClick={setActiveTab}
        />
        <TabButton
          id="history"
          label="Order History"
          icon="📋"
          isActive={activeTab === 'history'}
          onClick={setActiveTab}
        />
        <TabButton
          id="analytics"
          label="Analytics"
          icon="📊"
          isActive={activeTab === 'analytics'}
          onClick={setActiveTab}
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading...</span>
        </div>
      )}

      {/* Customers Tab */}
      {activeTab === 'customers' && !loading && (
        <div>
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-xl font-semibold">👥 Customer Database</h3>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {customers.length} Total Customers
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Orders</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{customer.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{customer.phone}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{customer.total_orders}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">Rs. {customer.total_spent}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {customer.last_order_date ? new Date(customer.last_order_date).toLocaleDateString() : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Active Orders Tab */}
      {activeTab === 'orders' && !loading && (
        <div>
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-xl font-semibold">📦 Active Orders</h3>
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              {orders.length} Active Orders
            </span>
          </div>
          
          <div className="grid gap-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-lg">{order.order_number}</h4>
                    <p className="text-gray-600">{order.customer_name} - {order.customer_phone}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'ready' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status.toUpperCase()}
                    </span>
                    <p className="text-lg font-bold mt-1">Rs. {order.total}</p>
                  </div>
                </div>
                
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{order.order_type === 'delivery' ? '🚚 Delivery' : '🍽️ Dine-in'}</span>
                  <span>{new Date(order.created_at).toLocaleString()}</span>
                </div>
                
                {order.items_summary && (
                  <div className="mt-2 text-sm text-gray-700">
                    <strong>Items:</strong> {order.items_summary}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order History Tab */}
      {activeTab === 'history' && !loading && (
        <div>
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-xl font-semibold">📋 Order History</h3>
            <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
              {orderHistory.length} Completed Orders
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orderHistory.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{order.order_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{order.customer_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {order.order_type === 'delivery' ? '🚚 Delivery' : '🍽️ Dine-in'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">Rs. {order.total}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {order.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && !loading && (
        <div>
          <h3 className="text-xl font-semibold mb-6">📊 Business Analytics</h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-blue-600">{analytics.totalOrders || 0}</div>
              <div className="text-blue-800 font-medium">Total Orders</div>
            </div>
            <div className="bg-green-50 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-green-600">Rs. {analytics.totalRevenue || 0}</div>
              <div className="text-green-800 font-medium">Total Revenue</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-purple-600">{analytics.totalCustomers || 0}</div>
              <div className="text-purple-800 font-medium">Total Customers</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-orange-600">Rs. {analytics.avgOrderValue || 0}</div>
              <div className="text-orange-800 font-medium">Avg Order Value</div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-lg font-semibold mb-4">📈 Order Types</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>🍽️ Dine-in Orders:</span>
                  <span className="font-medium">{analytics.dineInOrders || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>🚚 Delivery Orders:</span>
                  <span className="font-medium">{analytics.deliveryOrders || 0}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-lg font-semibold mb-4">⏰ Today's Stats</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>📦 Today's Orders:</span>
                  <span className="font-medium">{analytics.todayOrders || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>💰 Today's Revenue:</span>
                  <span className="font-medium">Rs. {analytics.todayRevenue || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseManager;
