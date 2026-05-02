import React, { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../../services/apiService';

const OrdersManagement = ({ onClearTable, onCompleteOrder, onDeleteOrder }) => {
  const [activeFilter, setActiveFilter] = useState(() => {
    return localStorage.getItem('orderManagementActiveFilter') || 'all';
  });
  const [searchTerm, setSearchTerm] = useState(() => {
    return localStorage.getItem('orderManagementSearchTerm') || '';
  });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [orderDetailsLoading, setOrderDetailsLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  
  // Advanced filters with localStorage persistence
  const [advancedFilters, setAdvancedFilters] = useState(() => {
    const saved = localStorage.getItem('orderManagementFilters');
    return saved ? JSON.parse(saved) : {
      paymentStatus: '',
      tableNumber: '',
      startDate: '',
      endDate: '',
      sortBy: 'created_at',
      sortOrder: 'DESC'
    };
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(() => {
    return localStorage.getItem('showAdvancedFilters') === 'true';
  });

  // Fetch orders from API with filters and pagination
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      // Check if user is authenticated with retry mechanism
      const token = localStorage.getItem('adminToken') || localStorage.getItem('authToken');
      if (!token) {
        console.log('⚠️ No admin token found, checking admin authentication...');
        const isAdminAuthenticated = localStorage.getItem('adminAuthenticated') === 'true';
        if (!isAdminAuthenticated) {
          console.log('⚠️ Admin not authenticated, orders will be empty');
          setOrders([]);
          setLoading(false);
          return;
        }
      }

      const params = new URLSearchParams();
      
      // Basic filters
      if (activeFilter !== 'all') {
        if (activeFilter === 'active') {
          // For active orders, we'll filter on frontend since it's a composite filter
        } else {
          params.append('status', activeFilter);
        }
      }
      
      // Search terms
      if (searchTerm) {
        if (searchTerm.includes('FZ-')) {
          params.append('orderNumber', searchTerm);
        } else if (/^\d+$/.test(searchTerm)) {
          params.append('customerPhone', searchTerm);
        } else {
          params.append('customerName', searchTerm);
        }
      }
      
      // Advanced filters
      if (advancedFilters.paymentStatus) {
        params.append('paymentStatus', advancedFilters.paymentStatus);
      }
      if (advancedFilters.tableNumber) {
        params.append('tableId', advancedFilters.tableNumber);
      }
      if (advancedFilters.startDate) {
        params.append('startDate', advancedFilters.startDate);
      }
      if (advancedFilters.endDate) {
        params.append('endDate', advancedFilters.endDate + 'T23:59:59.999Z');
      }
      
      // Pagination and sorting
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      params.append('sortBy', advancedFilters.sortBy);
      params.append('sortOrder', advancedFilters.sortOrder);
      
      const response = await fetchApi.get(`/api/orders?${params.toString()}`);
      console.log('📊 Orders API Response:', response);
      console.log('📊 Response type:', typeof response, Array.isArray(response));
      
      // Handle different response structures
      let fetchedOrders = [];
      let paginationData = pagination;
      
      if (Array.isArray(response)) {
        // Direct array response
        fetchedOrders = response;
      } else if (response.orders) {
        // Nested orders response
        fetchedOrders = response.orders;
        paginationData = response.pagination || pagination;
      } else if (response.data) {
        // Data wrapper response
        if (Array.isArray(response.data)) {
          fetchedOrders = response.data;
        } else if (response.data.orders) {
          fetchedOrders = response.data.orders;
          paginationData = response.data.pagination || pagination;
        }
      }
      
      console.log('📋 Extracted Orders:', fetchedOrders.length, 'orders');
      console.log('📋 Sample order:', fetchedOrders[0]);
      
      // Apply active filter on frontend if needed
      if (activeFilter === 'active') {
        fetchedOrders = fetchedOrders.filter(order => 
          order.status !== 'completed' && order.status !== 'cancelled'
        );
      }
      
      setOrders(fetchedOrders);
      setPagination(paginationData);
      
    } catch (error) {
      console.error('❌ Error fetching orders:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, searchTerm, advancedFilters, pagination.page, pagination.limit]);

  // Fetch orders on component mount and filter changes
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Save state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('orderManagementActiveFilter', activeFilter);
  }, [activeFilter]);

  useEffect(() => {
    localStorage.setItem('orderManagementSearchTerm', searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    localStorage.setItem('orderManagementFilters', JSON.stringify(advancedFilters));
  }, [advancedFilters]);

  useEffect(() => {
    localStorage.setItem('showAdvancedFilters', showAdvancedFilters.toString());
  }, [showAdvancedFilters]);

  // Reset to first page when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [activeFilter, searchTerm, advancedFilters]);

  // Debug: Log order types to see what we're getting (only when orders change)
  React.useEffect(() => {
    if (orders.length > 0) {
      console.log('🔍 All orders:', orders.map(o => ({ id: o.id, order_type: o.order_type, customer_name: o.customer_name })));
    }
  }, [orders]);

  // Reset all filters and show today's orders
  const resetAllFilters = () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Reset all filters
    setActiveFilter('all');
    setSearchTerm('');
    setAdvancedFilters({
      paymentStatus: '',
      tableNumber: '',
      startDate: today,
      endDate: today,
      sortBy: 'created_at',
      sortOrder: 'DESC'
    });
    
    // Clear localStorage
    localStorage.removeItem('orderManagementActiveFilter');
    localStorage.removeItem('orderManagementSearchTerm');
    localStorage.setItem('orderManagementFilters', JSON.stringify({
      paymentStatus: '',
      tableNumber: '',
      startDate: today,
      endDate: today,
      sortBy: 'created_at',
      sortOrder: 'DESC'
    }));
    
    console.log('🔄 All filters reset, showing today\'s orders:', today);
  };
  
  const dineInOrders = orders.filter(o => o.order_type === 'dine-in' || o.order_type === 'dine_in' || (!o.order_type && o.table_id));
  const deliveryOrders = orders.filter(o => o.order_type === 'delivery' || (!o.order_type && o.address));

  const filterTabs = [
    { id: 'all', label: 'All Orders', count: orders.length },
    { id: 'active', label: 'Active', count: orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length },
    { id: 'pending', label: 'Pending', count: orders.filter(o => o.status === 'pending').length },
    { id: 'preparing', label: 'Preparing', count: orders.filter(o => o.status === 'preparing').length },
    { id: 'ready', label: 'Ready', count: orders.filter(o => o.status === 'ready').length },
    { id: 'completed', label: 'Completed', count: orders.filter(o => o.status === 'completed').length },
  ];

  const getTotalAmount = (order) => {
    if (order.total_amount) return order.total_amount;
    if (order.items && Array.isArray(order.items)) {
      return order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }
    return 0;
  };

  const viewOrderDetails = async (orderId) => {
    console.log('🔍 View Details clicked for order ID:', orderId);
    setOrderDetailsLoading(true);
    setShowOrderDetails(true);
    
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('adminToken');
      if (!token) {
        alert('Your session has expired. Please login again.');
        window.location.reload();
        return;
      }
      
      console.log('📡 Fetching order details for ID:', orderId);
      const response = await fetchApi.get(`/api/orders/${orderId}`);
      console.log('📊 Order details response:', response);
      
      if (response.success) {
        setSelectedOrder(response.order);
        console.log('✅ Order details loaded successfully');
      } else {
        console.error('❌ Failed to fetch order details:', response.message);
        const errorMessage = response.message === 'Order not found' 
          ? 'This order no longer exists in the system.' 
          : 'Failed to load order details. Please try again.';
        alert(errorMessage);
        setShowOrderDetails(false);
      }
    } catch (error) {
      console.error('💥 Error fetching order details:', error);
      let errorMessage = 'Failed to load order details. Please try again.';
      
      if (error.message && error.message.includes('404')) {
        errorMessage = 'This order no longer exists in the system.';
      } else if (error.message && error.message.includes('401') || error.message && error.message.includes('403')) {
        errorMessage = 'Authentication required. Please refresh the page.';
        // Clear invalid token
        localStorage.removeItem('adminToken');
      } else if (error.message && error.message.includes('500')) {
        errorMessage = 'Server error occurred. Please try again later.';
      }
      
      alert(errorMessage);
      setShowOrderDetails(false);
      
      // Refresh orders list to ensure we have current data
      fetchOrders();
    } finally {
      setOrderDetailsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus, paymentStatus = null, paymentMethod = null) => {
    try {
      await fetchApi.put(`/api/orders/${orderId}/status`, { status: newStatus });
      fetchOrders(); // Refresh the orders list
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Order Management</h2>
            <p className="text-slate-600 mt-1">{pagination.total} orders found {loading && '(loading...)'}</p>
          </div>
          
          {/* Search Bar and Quick Date Filter */}
          <div className="flex-1 max-w-4xl">
            <div className="flex gap-3">
              {/* Search Input */}
              <div className="flex-1 relative">
                <span className="absolute left-3 top-3 text-slate-400">🔍</span>
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Quick Date Filter */}
              <div className="flex gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400 text-sm">📅</span>
                  <input
                    type="date"
                    value={advancedFilters.startDate}
                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    className="pl-8 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Start Date"
                  />
                </div>
                <div className="flex items-center text-slate-400">
                  <span>to</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400 text-sm">📅</span>
                  <input
                    type="date"
                    value={advancedFilters.endDate}
                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className="pl-8 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="End Date"
                  />
                </div>
                
                {/* Reset Filter Button */}
                <button
                  onClick={resetAllFilters}
                  className="px-4 py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 border border-red-300 whitespace-nowrap"
                  title="Reset all filters and show today's orders"
                >
                  <span>🔄</span>
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mt-6">
          {filterTabs.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeFilter === filter.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filter.label}
              <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                activeFilter === filter.id
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {filter.count}
              </span>
            </button>
          ))}
          
          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              showAdvancedFilters
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ⚙️ Advanced
          </button>
        </div>
        
        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Payment Status Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Payment Status</label>
                <select
                  value={advancedFilters.paymentStatus}
                  onChange={(e) => setAdvancedFilters(prev => ({ ...prev, paymentStatus: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Payments</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              
              {/* Table Number Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Table Number</label>
                <input
                  type="number"
                  placeholder="Table #"
                  value={advancedFilters.tableNumber}
                  onChange={(e) => setAdvancedFilters(prev => ({ ...prev, tableNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max="25"
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 mt-4">
              {/* Sort Options */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700">Sort by:</label>
                <select
                  value={advancedFilters.sortBy}
                  onChange={(e) => setAdvancedFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                  className="px-3 py-1 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="created_at">Date Created</option>
                  <option value="updated_at">Last Updated</option>
                  <option value="total">Order Total</option>
                  <option value="customer_name">Customer Name</option>
                  <option value="order_number">Order Number</option>
                  <option value="status">Status</option>
                </select>
                
                <select
                  value={advancedFilters.sortOrder}
                  onChange={(e) => setAdvancedFilters(prev => ({ ...prev, sortOrder: e.target.value }))}
                  className="px-3 py-1 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="DESC">Newest First</option>
                  <option value="ASC">Oldest First</option>
                </select>
              </div>
              
              {/* Clear Filters */}
              <button
                onClick={() => {
                  setAdvancedFilters({
                    paymentStatus: '',
                    tableNumber: '',
                    startDate: '',
                    endDate: '',
                    sortBy: 'created_at',
                    sortOrder: 'DESC'
                  });
                  setSearchTerm('');
                  setActiveFilter('all');
                  localStorage.removeItem('orderManagementFilters');
                  localStorage.removeItem('orderManagementSearchTerm');
                  localStorage.removeItem('orderManagementActiveFilter');
                }}
                className="px-4 py-1 bg-red-100 text-red-600 rounded-lg font-medium hover:bg-red-200 transition-colors"
              >
                🗑️ Clear All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} orders
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={!pagination.hasPrev || loading}
                className="px-3 py-1 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                ← Previous
              </button>
              
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg font-medium">
                {pagination.page} / {pagination.totalPages}
              </span>
              
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={!pagination.hasNext || loading}
                className="px-3 py-1 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Orders Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Dine-in Orders */}
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">🍽️ Dine-in Orders</h3>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                {dineInOrders.length}
              </span>
            </div>
          </div>
          
          <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin text-4xl mb-4">⏳</div>
                <p className="text-slate-500 text-lg">Loading orders...</p>
              </div>
            ) : dineInOrders.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block opacity-50">🪑</span>
                <p className="text-slate-500 text-lg">No dine-in orders found</p>
              </div>
            ) : (
              dineInOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  type="dine-in"
                  onClearTable={onClearTable}
                  onCompleteOrder={onCompleteOrder}
                  onDeleteOrder={onDeleteOrder}
                  onViewDetails={viewOrderDetails}
                  onRefresh={fetchOrders}
                />
              ))
            )}
          </div>
        </div>

        {/* Delivery Orders */}
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">🚚 Delivery Orders</h3>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                {deliveryOrders.length}
              </span>
            </div>
          </div>
          
          <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin text-4xl mb-4">⏳</div>
                <p className="text-slate-500 text-lg">Loading orders...</p>
              </div>
            ) : deliveryOrders.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block opacity-50">🚚</span>
                <p className="text-slate-500 text-lg">No delivery orders found</p>
              </div>
            ) : (
              deliveryOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  type="delivery"
                  onClearTable={onClearTable}
                  onCompleteOrder={onCompleteOrder}
                  onDeleteOrder={onDeleteOrder}
                  onViewDetails={viewOrderDetails}
                  onRefresh={fetchOrders}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      {showOrderDetails && (
        <OrderDetailsModal
          order={selectedOrder}
          loading={orderDetailsLoading}
          onClose={() => {
            setShowOrderDetails(false);
            setSelectedOrder(null);
            setOrderDetailsLoading(false);
          }}
          onRefresh={fetchOrders}
        />
      )}
    </div>
  );
};

// Premium Order Card Component
const OrderCard = ({ order, type, onClearTable, onCompleteOrder, onDeleteOrder, onViewDetails, onRefresh }) => {
  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      preparing: 'bg-blue-100 text-blue-700 border-blue-200',
      ready: 'bg-green-100 text-green-700 border-green-200',
      completed: 'bg-gray-100 text-gray-700 border-gray-200',
      cancelled: 'bg-red-100 text-red-700 border-red-200'
    };
    return colors[status] || colors.pending;
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getTotalAmount = (order) => {
    if (order.total_amount) return order.total_amount;
    if (order.items && Array.isArray(order.items)) {
      return order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }
    return 0;
  };

  // Update order status function
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await fetchApi.put(`/api/orders/${orderId}/status`, { status: newStatus });
      onRefresh(); // Refresh the orders list
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl p-5 hover:shadow-lg transition-all duration-200 bg-gradient-to-r from-white to-slate-50">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-lg">
              {type === 'dine-in' ? '🍽️' : '🚚'}
            </span>
            <div>
              <h4 className="font-bold text-slate-900">
                {type === 'dine-in' ? `Table ${order.table_id}` : order.customer_name}
              </h4>
              <p className="text-sm text-slate-600">
                {type === 'dine-in' ? order.customer_name : order.phone}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span>📅 {formatDate(order.created_at)}</span>
            <span>🕒 {formatTime(order.created_at)}</span>
            <span>📋 {order.order_number}</span>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xl font-bold text-slate-900">
            NPR {getTotalAmount(order).toLocaleString()}
          </p>
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
            {order.status?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Order Items */}
      <div className="mb-4">
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-sm font-medium text-slate-700 mb-2">
            📦 Order Items ({order.items?.length || 0})
          </p>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {order.items?.slice(0, 3).map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-slate-600">{item.name} × {item.quantity}</span>
                <span className="font-medium text-slate-900">NPR {(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
            {order.items?.length > 3 && (
              <p className="text-xs text-slate-500 italic">
                +{order.items.length - 3} more items...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {order.status === 'pending' && (
          <button
            onClick={() => updateOrderStatus(order.id, 'preparing')}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all"
          >
            🔥 Start Preparing
          </button>
        )}
        
        {order.status === 'preparing' && (
          <button
            onClick={() => updateOrderStatus(order.id, 'ready')}
            className="flex-1 bg-gradient-to-r from-orange-600 to-orange-700 text-white py-2 px-4 rounded-lg font-medium hover:from-orange-700 hover:to-orange-800 transition-all"
          >
            ✅ Mark Ready
          </button>
        )}
        
        {order.status === 'ready' && (
          <>
            {type === 'dine-in' ? (
              <button
                onClick={() => onClearTable(order.table_id)}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-2 px-4 rounded-lg font-medium hover:from-green-700 hover:to-green-800 transition-all"
              >
                ✅ Clear Table
              </button>
            ) : (
              <button
                onClick={() => onCompleteOrder(order.id)}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-2 px-4 rounded-lg font-medium hover:from-green-700 hover:to-green-800 transition-all"
              >
                ✅ Complete Order
              </button>
            )}
          </>
        )}
        
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('👁️ View Details button clicked for order:', order.id);
            onViewDetails(order.id);
          }}
          className="px-4 py-2 bg-indigo-100 text-indigo-600 rounded-lg font-medium hover:bg-indigo-200 transition-colors cursor-pointer"
          title="View Details"
          style={{ zIndex: 10, position: 'relative' }}
        >
          👁️ View
        </button>
        
        <button
          onClick={() => onDeleteOrder(order.id, order.order_number)}
          className="px-4 py-2 bg-red-100 text-red-600 rounded-lg font-medium hover:bg-red-200 transition-colors"
          title="Cancel Order"
        >
          🗑️
        </button>
        
        {type === 'delivery' && (order.delivery_address || order.address) && (
          <button
            onClick={() => {
              const address = order.delivery_address || order.address;
              let mapUrl;
              
              // If we have coordinates, use them for more accurate location
              if (order.delivery_latitude && order.delivery_longitude) {
                mapUrl = `https://maps.google.com/?q=${order.delivery_latitude},${order.delivery_longitude}`;
              } else {
                mapUrl = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
              }
              
              window.open(mapUrl, '_blank');
            }}
            className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg font-medium hover:bg-blue-200 transition-colors"
            title={order.delivery_latitude && order.delivery_longitude ? 
              `Open GPS location: ${order.delivery_latitude}, ${order.delivery_longitude}` : 
              'Open address in maps'}
          >
            📍
          </button>
        )}
      </div>
    </div>
  );
};

// Order Details Modal Component
const OrderDetailsModal = ({ order, loading, onClose, onRefresh }) => {
  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const printKOT = () => {
    const kotWindow = window.open('', '_blank');
    const kotContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>KOT - Order #${order.order_number}</title>
        <style>
          @media print {
            @page { 
              size: 80mm auto; 
              margin: 2mm; 
            }
            body { 
              margin: 0; 
              font-family: 'Courier New', monospace; 
            }
          }
          body {
            width: 80mm;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.2;
            margin: 0;
            padding: 5px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 5px;
            margin-bottom: 8px;
          }
          .restaurant-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 2px;
          }
          .kot-title {
            font-size: 14px;
            font-weight: bold;
            margin: 5px 0;
          }
          .order-info {
            margin-bottom: 8px;
            border-bottom: 1px dashed #000;
            padding-bottom: 5px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
          }
          .items-section {
            margin-bottom: 8px;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            border-bottom: 1px dotted #ccc;
            padding-bottom: 2px;
          }
          .item-name {
            flex: 1;
            font-weight: bold;
          }
          .item-qty {
            width: 30px;
            text-align: center;
          }
          .footer {
            border-top: 2px solid #000;
            padding-top: 5px;
            text-align: center;
            font-size: 10px;
          }
          .special-instructions {
            background: #f0f0f0;
            padding: 3px;
            margin: 5px 0;
            border: 1px solid #ccc;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="restaurant-name">FOOD ZONE</div>
          <div>Kitchen Order Ticket</div>
          <div class="kot-title">*** KOT ***</div>
        </div>
        
        <div class="order-info">
          <div class="info-row">
            <span>Order #:</span>
            <span>${order.order_number}</span>
          </div>
          <div class="info-row">
            <span>Table:</span>
            <span>${order.table_id ? `Table ${order.table_id}` : 'Delivery'}</span>
          </div>
          <div class="info-row">
            <span>Customer:</span>
            <span>${order.customer_name || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span>Time:</span>
            <span>${new Date(order.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div class="info-row">
            <span>Date:</span>
            <span>${new Date(order.created_at).toLocaleDateString('en-US')}</span>
          </div>
        </div>

        <div class="items-section">
          <div style="font-weight: bold; margin-bottom: 5px; text-align: center;">ITEMS TO PREPARE</div>
          ${order.items?.map(item => `
            <div class="item-row">
              <div class="item-name">${item.menu_item_name || item.name}</div>
              <div class="item-qty">x${item.quantity}</div>
            </div>
            ${item.special_instructions ? `<div style="font-size: 10px; font-style: italic; margin-left: 10px; color: #666;">Note: ${item.special_instructions}</div>` : ''}
          `).join('') || '<div>No items found</div>'}
        </div>

        ${order.special_instructions ? `
          <div class="special-instructions">
            <strong>Special Instructions:</strong><br>
            ${order.special_instructions}
          </div>
        ` : ''}

        <div class="footer">
          <div>Status: ${order.status?.toUpperCase()}</div>
          <div>Printed: ${new Date().toLocaleString('en-US')}</div>
          <div>--- KITCHEN COPY ---</div>
        </div>
      </body>
      </html>
    `;
    
    kotWindow.document.write(kotContent);
    kotWindow.document.close();
    
    // Auto print after a short delay
    setTimeout(() => {
      kotWindow.print();
      kotWindow.close();
    }, 500);
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      preparing: 'bg-blue-100 text-blue-700 border-blue-200',
      ready: 'bg-green-100 text-green-700 border-green-200',
      completed: 'bg-gray-100 text-gray-700 border-gray-200',
      cancelled: 'bg-red-100 text-red-700 border-red-200'
    };
    return colors[status] || colors.pending;
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      pending: 'bg-orange-100 text-orange-700 border-orange-200',
      paid: 'bg-green-100 text-green-700 border-green-200',
      failed: 'bg-red-100 text-red-700 border-red-200'
    };
    return colors[status] || colors.pending;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">📋 Order Details</h2>
              <p className="text-indigo-100">
                {loading ? 'Loading order information...' : `Order #${order?.order_number || 'N/A'}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin text-4xl mb-4">⏳</div>
              <p className="text-slate-500 text-lg">Loading order details...</p>
            </div>
          ) : order ? (
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-700 mb-3">📊 Order Status</h3>
                  <div className="space-y-2">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
                      {order.status?.toUpperCase()}
                    </span>
                    <p className="text-sm text-slate-600">
                      Created: {formatDateTime(order.created_at)}
                    </p>
                    {order.updated_at && order.updated_at !== order.created_at && (
                      <p className="text-sm text-slate-600">
                        Updated: {formatDateTime(order.updated_at)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-700 mb-3">💳 Payment Info</h3>
                  <div className="space-y-2">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getPaymentStatusColor(order.payment_status)}`}>
                      {order.payment_status?.toUpperCase()}
                    </span>
                    {order.payment_method && (
                      <p className="text-sm text-slate-600">
                        Method: {order.payment_method.toUpperCase()}
                      </p>
                    )}
                    <p className="text-lg font-bold text-slate-900">
                      NPR {order.total_amount?.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-700 mb-3">
                    {order.table_info ? '🪑 Table Info' : '🚚 Delivery Info'}
                  </h3>
                  <div className="space-y-2">
                    {order.table_info ? (
                      <>
                        <p className="text-sm text-slate-600">
                          Table: {order.table_info.table_number}
                        </p>
                        <p className="text-sm text-slate-600">
                          Capacity: {order.table_info.capacity} people
                        </p>
                        <p className="text-sm text-slate-600">
                          Status: {order.table_info.status}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-slate-600">
                          Customer: {order.customer_name}
                        </p>
                        <p className="text-sm text-slate-600">
                          Phone: {order.customer_phone}
                        </p>
                        {(order.delivery_address || order.address) && (
                          <div className="text-sm text-slate-600">
                            <p>Address: {order.delivery_address || order.address}</p>
                            {order.delivery_latitude && order.delivery_longitude && (
                              <p className="text-xs text-blue-600 mt-1">
                                📍 GPS: {parseFloat(order.delivery_latitude).toFixed(4)}, {parseFloat(order.delivery_longitude).toFixed(4)}
                                {order.delivery_landmark && ` • ${order.delivery_landmark}`}
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="bg-white border border-slate-200 rounded-lg">
                <div className="p-4 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-700">📦 Order Items ({order.items?.length || 0})</h3>
                </div>
                <div className="p-4">
                  {order.items && order.items.length > 0 ? (
                    <div className="space-y-3">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium text-slate-900">{item.name}</h4>
                            {item.category && (
                              <p className="text-sm text-slate-500">{item.category}</p>
                            )}
                            {item.special_instructions && (
                              <p className="text-sm text-blue-600 mt-1">
                                📝 {item.special_instructions}
                              </p>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <p className="font-medium text-slate-900">
                              {item.quantity} × NPR {item.price?.toLocaleString()}
                            </p>
                            <p className="text-lg font-bold text-slate-900">
                              NPR {(item.price * item.quantity)?.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-4">No items found</p>
                  )}
                </div>
              </div>

              {/* Order Totals */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold text-slate-700 mb-3">💰 Order Totals</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal:</span>
                    <span className="font-medium">NPR {order.subtotal?.toLocaleString()}</span>
                  </div>
                  {order.tax_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Tax:</span>
                      <span className="font-medium">NPR {order.tax_amount?.toLocaleString()}</span>
                    </div>
                  )}
                  {order.discount_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Discount:</span>
                      <span className="font-medium text-green-600">-NPR {order.discount_amount?.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-2">
                    <div className="flex justify-between">
                      <span className="text-lg font-bold text-slate-900">Total:</span>
                      <span className="text-lg font-bold text-slate-900">NPR {order.total_amount?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              {order.payment_history && order.payment_history.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-lg">
                  <div className="p-4 border-b border-slate-200">
                    <h3 className="font-semibold text-slate-700">💳 Payment History</h3>
                  </div>
                  <div className="p-4">
                    <div className="space-y-3">
                      {order.payment_history.map((payment, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div>
                            <p className="font-medium text-slate-900">{payment.description}</p>
                            <p className="text-sm text-slate-500">
                              {formatDateTime(payment.created_at)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">
                              NPR {payment.amount?.toLocaleString()}
                            </p>
                            <p className="text-sm text-slate-500">{payment.transaction_type}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Special Instructions */}
              {order.special_instructions && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-700 mb-2">📝 Special Instructions</h3>
                  <p className="text-blue-800">{order.special_instructions}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block opacity-50">❌</span>
              <p className="text-slate-500 text-lg">Order details not found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors"
            >
              Close
            </button>
            {order && (
              <>
                <button
                  onClick={printKOT}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
                  title="Print Kitchen Order Ticket"
                >
                  🧾 Print KOT
                </button>
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  🖨️ Print Receipt
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdersManagement;
