import React, { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../../services/apiService';
import { useTableCount } from '../../hooks/useSettings';
import { useDateTimeFormatter } from '../../hooks/useDateTimeFormatter';

const OrdersManagement = ({ onClearTable, onCompleteOrder, onDeleteOrder, refreshTrigger }) => {
  const tableCount = useTableCount(); // Get table count from settings
  const { formatTime: formatTimeWithTZ, formatDate: formatDateWithTZ, formatDateTime } = useDateTimeFormatter();
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
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menuSearchTerm, setMenuSearchTerm] = useState('');
  const [newOrder, setNewOrder] = useState({
    table_id: '',
    customer_name: '',
    customer_phone: '',
    items: [],
    notes: '',
    is_takeaway: false
  });
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
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
    const today = new Date().toISOString().split('T')[0];
    
    // ALWAYS use today's date for Order Management
    // This ensures we only show today's orders
    return {
      paymentStatus: '',
      tableNumber: '',
      startDate: today,
      endDate: today,
      sortBy: 'created_at',
      sortOrder: 'DESC'
    };
  });

  // Fetch orders from API with filters and pagination
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      
      // Search terms - search across name, dish, table, phone, order number
      if (searchTerm) {
        const trimmed = searchTerm.trim();
        if (trimmed) {
          // Use a general search parameter that the backend can handle
          // The backend should search across: customer name, phone, table ID, order number, and item names
          params.append('search', trimmed);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, searchTerm, advancedFilters, pagination.page, pagination.limit]);

  // Fetch menu items for create order modal
  const fetchMenuItems = useCallback(async () => {
    try {
      console.log('🍽️ Fetching menu items...');
      const response = await fetchApi.get('/api/menu');
      console.log('📊 Menu response:', response);
      
      // The API returns the items array directly, not wrapped in success/items
      const items = Array.isArray(response) ? response : (response.items || []);
      
      setMenuItems(items);
      // Extract unique categories
      const uniqueCategories = [...new Set(items.map(item => item.category))];
      setCategories(uniqueCategories);
      console.log('✅ Loaded', items.length, 'menu items in', uniqueCategories.length, 'categories');
    } catch (error) {
      console.error('❌ Error fetching menu items:', error);
      setMenuItems([]);
      setCategories([]);
    }
  }, []);

  // Create new order
  const handleCreateOrder = async () => {
    try {
      if ((!newOrder.table_id && !newOrder.is_takeaway) || newOrder.items.length === 0) {
        alert('Please select a table or mark as takeaway, and add at least one item');
        return;
      }

      setIsCreatingOrder(true);

      const orderData = {
        orderType: newOrder.is_takeaway ? 'takeaway' : 'dine-in',
        tableId: newOrder.is_takeaway ? null : parseInt(newOrder.table_id),
        customerName: newOrder.customer_name || null,
        phone: newOrder.customer_phone || null,
        items: newOrder.items.map(item => ({
          id: item.id,
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          price: item.price,
          instructions: item.notes || ''
        })),
        totalAmount: newOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        notes: newOrder.notes || '',
        status: 'pending'
      };

      const response = await fetchApi.post('/api/order', orderData);
      
      if (response.success) {
        alert('✅ Order created successfully!');
        setShowCreateOrder(false);
        setMenuSearchTerm(''); // Reset search
        // Reset form
        setNewOrder({
          table_id: '',
          customer_name: '',
          customer_phone: '',
          items: [],
          notes: '',
          is_takeaway: false
        });
        // Refresh orders
        fetchOrders();
      } else {
        alert('❌ Failed to create order: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Error creating order:', error);
      alert('❌ Failed to create order. Please try again.');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Add item to new order
  const addItemToOrder = (menuItem) => {
    const existingItem = newOrder.items.find(item => item.id === menuItem.id);
    if (existingItem) {
      setNewOrder({
        ...newOrder,
        items: newOrder.items.map(item =>
          item.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      });
    } else {
      setNewOrder({
        ...newOrder,
        items: [...newOrder.items, { ...menuItem, quantity: 1, notes: '' }]
      });
    }
  };

  // Remove item from new order
  const removeItemFromOrder = (itemId) => {
    setNewOrder({
      ...newOrder,
      items: newOrder.items.filter(item => item.id !== itemId)
    });
  };

  // Update item quantity
  const updateItemQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeItemFromOrder(itemId);
      return;
    }
    setNewOrder({
      ...newOrder,
      items: newOrder.items.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      )
    });
  };

  // Fetch orders on component mount and filter changes
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Fetch menu items when create order modal opens
  useEffect(() => {
    if (showCreateOrder) {
      fetchMenuItems();
    }
  }, [showCreateOrder, fetchMenuItems]);

  // Refresh when refreshTrigger changes (from header refresh button)
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchOrders();
    }
  }, [refreshTrigger, fetchOrders]);

  // Save state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('orderManagementActiveFilter', activeFilter);
  }, [activeFilter]);

  useEffect(() => {
    localStorage.setItem('orderManagementSearchTerm', searchTerm);
  }, [searchTerm]);

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
  // eslint-disable-next-line no-unused-vars
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
    localStorage.removeItem('orderManagementFilters');
    
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

  // eslint-disable-next-line no-unused-vars
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
      // eslint-disable-next-line no-mixed-operators
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

  // eslint-disable-next-line no-unused-vars
  const updateOrderStatus = async (orderId, newStatus, paymentStatus = null, paymentMethod = null) => {
    try {
      await fetchApi.put(`/api/orders/${orderId}/status`, { status: newStatus });
      fetchOrders(); // Refresh the orders list
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  return (
    <div className="h-[calc(100vh-52px-32px)] flex flex-col overflow-hidden">
      {/* Compact Filter Bar */}
      <div className="glass-card p-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Search Input - Compact */}
          <div className="relative w-64">
            <span className="absolute left-2.5 top-2 text-slate-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search name, dish, table..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
            {loading && (
              <div className="absolute right-2.5 top-2">
                <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-slate-200"></div>

          {/* Filter Tabs - Professional Layout */}
          <div className="flex-1 flex items-center gap-2">
            {filterTabs.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeFilter === filter.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:border-slate-300'
                }`}
              >
                <span>{filter.label}</span>
                <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-md tabular-nums min-w-[20px] text-center ${
                  activeFilter === filter.id
                    ? 'bg-white/25 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {filter.count}
                </span>
              </button>
            ))}
          </div>

          {/* Create Order Button */}
          <button
            onClick={() => setShowCreateOrder(true)}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200 transition-all"
          >
            <span className="text-base">➕</span>
            <span>Create Order</span>
          </button>
        </div>
      </div>
      
      {/* Orders Layout - Single Page View */}
      <div className="grid grid-cols-12 gap-4 flex-1 min-h-0 mt-4">
        {/* Dine-in Orders - Main Area (Left) */}
        <div className="col-span-12 lg:col-span-8 xl:col-span-9 flex flex-col min-h-0">
          <div className="glass-card flex-1 flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-slate-200/60 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">🍽️ Dine-in Orders</h3>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  {dineInOrders.length}
                </span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto fz-scroll p-4 min-h-0">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {loading ? (
                <div className="col-span-full text-center py-12">
                  <div className="animate-spin text-4xl mb-4">⏳</div>
                  <p className="text-slate-500 text-sm">Loading orders...</p>
                </div>
              ) : dineInOrders.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <span className="text-5xl mb-3 block opacity-50">🪑</span>
                  <p className="text-slate-500 text-sm">No dine-in orders today</p>
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
                    compact={true}
                  />
                ))
              )}
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Orders - Sidebar (Right) */}
        <div className="col-span-12 lg:col-span-4 xl:col-span-3 flex flex-col min-h-0">
          <div className="glass-card flex-1 flex flex-col min-h-0">
            <div className="px-3 py-2.5 border-b border-slate-200/60 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-900">🚚 Delivery</h3>
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-medium">
                  {deliveryOrders.length}
                </span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto fz-scroll p-3 space-y-2 min-h-0">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin text-2xl mb-2">⏳</div>
                  <p className="text-slate-500 text-xs">Loading...</p>
                </div>
              ) : deliveryOrders.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-3xl mb-2 block opacity-50">🚚</span>
                  <p className="text-slate-500 text-xs">No delivery orders</p>
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
                    compact={true}
                    mini={true}
                  />
                ))
              )}
            </div>
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

      {/* Create Order Modal */}
      {showCreateOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Create New Order</h2>
                <p className="text-xs text-slate-500 mt-0.5">Add items and assign to a table</p>
              </div>
              <button
                onClick={() => setShowCreateOrder(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden flex">
              {/* Left: Menu Items */}
              <div className="w-3/5 border-r border-slate-200 flex flex-col">
                <div className="px-4 py-3 border-b border-slate-200 flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Menu Items</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {menuSearchTerm 
                          ? `${menuItems.filter(item => 
                              item.name.toLowerCase().includes(menuSearchTerm.toLowerCase()) ||
                              item.category.toLowerCase().includes(menuSearchTerm.toLowerCase())
                            ).length} items found`
                          : `${menuItems.length} items available`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search menu items..."
                      value={menuSearchTerm}
                      onChange={(e) => setMenuSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 pl-9 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
                    />
                    <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {menuItems.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="animate-spin text-3xl mb-2">⏳</div>
                      <p className="text-slate-500 text-sm">Loading menu...</p>
                    </div>
                  ) : categories.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-slate-500 text-sm">No categories found</p>
                    </div>
                  ) : (
                    categories.map(category => {
                      const categoryItems = menuItems.filter(item => 
                        item.category === category && 
                        item.is_available &&
                        (menuSearchTerm === '' || 
                         item.name.toLowerCase().includes(menuSearchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(menuSearchTerm.toLowerCase()))
                      );
                      if (categoryItems.length === 0) return null;
                      
                      return (
                        <div key={category} className="mb-4">
                          <h4 className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">{category}</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {categoryItems.map(item => (
                              <button
                                key={item.id}
                                onClick={() => addItemToOrder(item)}
                                className="text-left p-3 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition"
                              >
                                <div className="font-medium text-sm text-slate-900 truncate">{item.name}</div>
                                <div className="text-xs text-slate-500 mt-0.5">NPR {item.price}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right: Order Details */}
              <div className="w-2/5 flex flex-col">
                <div className="px-4 py-3 border-b border-slate-200 flex-shrink-0">
                  <h3 className="text-sm font-semibold text-slate-900">Order Details</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Table & Customer Info */}
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">
                        Table Number {!newOrder.is_takeaway && '*'}
                        {newOrder.is_takeaway && <span className="text-slate-400">(Not needed for takeaway)</span>}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={tableCount}
                        value={newOrder.table_id}
                        onChange={(e) => setNewOrder({ ...newOrder, table_id: e.target.value })}
                        disabled={newOrder.is_takeaway}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                        placeholder={newOrder.is_takeaway ? 'Not needed for takeaway' : `Enter table number (1-${tableCount})`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">Customer Name</label>
                      <input
                        type="text"
                        value={newOrder.customer_name}
                        onChange={(e) => setNewOrder({ ...newOrder, customer_name: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">Customer Phone</label>
                      <input
                        type="tel"
                        value={newOrder.customer_phone}
                        onChange={(e) => setNewOrder({ ...newOrder, customer_phone: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">Notes</label>
                      <textarea
                        value={newOrder.notes}
                        onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none resize-none"
                        rows="2"
                        placeholder="Special instructions..."
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="is_takeaway"
                        checked={newOrder.is_takeaway}
                        onChange={(e) => setNewOrder({ ...newOrder, is_takeaway: e.target.checked })}
                        className="w-4 h-4 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-400 cursor-pointer"
                      />
                      <label htmlFor="is_takeaway" className="text-xs font-medium text-slate-700 cursor-pointer">
                        🛍️ Takeaway Order
                      </label>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 mb-2">Items ({newOrder.items.length})</h4>
                    {newOrder.items.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-sm">
                        No items added yet
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {newOrder.items.map(item => (
                          <div key={item.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-900 truncate">{item.name}</div>
                              <div className="text-xs text-slate-500">NPR {item.price}</div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                                className="w-6 h-6 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-sm"
                              >
                                −
                              </button>
                              <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                              <button
                                onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                                className="w-6 h-6 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-sm"
                              >
                                +
                              </button>
                            </div>
                            <button
                              onClick={() => removeItemFromOrder(item.id)}
                              className="w-6 h-6 rounded bg-red-100 text-red-600 hover:bg-red-200 text-sm"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Total */}
                  {newOrder.items.length > 0 && (
                    <div className="pt-3 border-t border-slate-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-slate-900">Total:</span>
                        <span className="text-lg font-bold text-slate-900">
                          NPR {newOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="px-4 py-3 border-t border-slate-200 flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => setShowCreateOrder(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateOrder}
                    disabled={((!newOrder.table_id && !newOrder.is_takeaway) || newOrder.items.length === 0) || isCreatingOrder}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
                  >
                    {isCreatingOrder ? 'Creating...' : 'Create Order'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Premium Order Card Component
const OrderCard = ({ order, type, onClearTable, onCompleteOrder, onDeleteOrder, onViewDetails, onRefresh, compact, mini }) => {
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

  // Use timezone-aware formatters from useDateTimeFormatter hook
  const formatTime = (dateString) => {
    return formatTimeWithTZ(dateString);
  };

  const formatDate = (dateString) => {
    return formatDateWithTZ(dateString, { month: 'short', day: 'numeric' });
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

  // Print bill function
  const handlePrintBill = (order) => {
    const printWindow = window.open('', '_blank');
    const orderTotal = getTotalAmount(order);
    const orderDate = new Date(order.created_at);
    
    const billHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bill - Order #${order.order_number}</title>
        <style>
          @media print {
            @page { margin: 0; }
            body { margin: 1cm; }
          }
          body {
            font-family: 'Courier New', monospace;
            max-width: 80mm;
            margin: 0 auto;
            padding: 10px;
            font-size: 12px;
          }
          .header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          .header h1 {
            margin: 0;
            font-size: 18px;
          }
          .header p {
            margin: 2px 0;
            font-size: 10px;
          }
          .order-info {
            margin: 10px 0;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .order-info div {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          .items {
            margin: 10px 0;
          }
          .item {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
          }
          .item-name {
            flex: 1;
          }
          .item-qty {
            width: 40px;
            text-align: center;
          }
          .item-price {
            width: 80px;
            text-align: right;
          }
          .totals {
            border-top: 2px dashed #000;
            padding-top: 10px;
            margin-top: 10px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
          }
          .total-row.grand {
            font-weight: bold;
            font-size: 14px;
            border-top: 1px solid #000;
            padding-top: 5px;
            margin-top: 5px;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            border-top: 2px dashed #000;
            padding-top: 10px;
            font-size: 10px;
          }
          .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border: 1px solid #000;
            margin: 5px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>FOOD ZONE</h1>
          <p>Restaurant Bill</p>
          <p>Thank you for dining with us!</p>
        </div>
        
        <div class="order-info">
          <div><span>Order #:</span><span>${order.order_number}</span></div>
          <div><span>Date:</span><span>${orderDate.toLocaleDateString()}</span></div>
          <div><span>Time:</span><span>${orderDate.toLocaleTimeString()}</span></div>
          ${order.table_id ? `<div><span>Table:</span><span>${order.table_id}</span></div>` : order.order_type === 'takeaway' ? '<div><span>Type:</span><span>Takeaway</span></div>' : '<div><span>Type:</span><span>Delivery</span></div>'}
          ${order.customer_name ? `<div><span>Customer:</span><span>${order.customer_name}</span></div>` : ''}
          ${order.customer_phone ? `<div><span>Phone:</span><span>${order.customer_phone}</span></div>` : ''}
          <div><span>Status:</span><span class="status-badge">${order.status.toUpperCase()}</span></div>
          ${order.payment_status ? `<div><span>Payment:</span><span>${order.payment_status.toUpperCase()}</span></div>` : ''}
        </div>
        
        <div class="items">
          <div style="border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 5px; font-weight: bold;">
            <div class="item">
              <span class="item-name">ITEM</span>
              <span class="item-qty">QTY</span>
              <span class="item-price">PRICE</span>
            </div>
          </div>
          ${order.items?.map(item => `
            <div class="item">
              <span class="item-name">${item.name}</span>
              <span class="item-qty">× ${item.quantity}</span>
              <span class="item-price">NPR ${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          `).join('') || '<p>No items</p>'}
        </div>
        
        <div class="totals">
          ${order.subtotal ? `<div class="total-row"><span>Subtotal:</span><span>NPR ${parseFloat(order.subtotal).toFixed(2)}</span></div>` : ''}
          ${order.discount && order.discount > 0 ? `<div class="total-row"><span>Discount:</span><span>- NPR ${parseFloat(order.discount).toFixed(2)}</span></div>` : ''}
          ${order.delivery_fee && order.delivery_fee > 0 ? `<div class="total-row"><span>Delivery Fee:</span><span>NPR ${parseFloat(order.delivery_fee).toFixed(2)}</span></div>` : ''}
          <div class="total-row grand">
            <span>TOTAL:</span>
            <span>NPR ${orderTotal.toFixed(2)}</span>
          </div>
        </div>
        
        <div class="footer">
          <p>Thank you for your order!</p>
          <p>Visit us again 🙏</p>
          ${order.notes ? `<p style="margin-top: 10px; font-style: italic;">Note: ${order.notes}</p>` : ''}
        </div>
        
        <script>
          window.onload = function() {
            window.print();
            // Close window after printing or if user cancels
            setTimeout(function() {
              window.close();
            }, 100);
          };
        </script>
      </body>
      </html>
    `;
    
    printWindow.document.write(billHTML);
    printWindow.document.close();
  };

  // Mini mode for delivery sidebar
  if (mini) {
    return (
      <div className="border border-slate-200 rounded-lg p-2.5 hover:shadow-md transition-all bg-white">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-900 truncate">{order.customer_name || 'Guest'}</h4>
            <p className="text-[10px] text-slate-600 truncate">{order.phone}</p>
          </div>
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${getStatusColor(order.status)}`}>
            {order.status}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2">
          <span>🕒 {formatTime(order.created_at)}</span>
          <span className="font-mono font-semibold text-slate-900">NPR {getTotalAmount(order).toLocaleString()}</span>
        </div>

        <div className="text-[10px] text-slate-600 mb-2">
          📦 {order.items?.length || 0} items
        </div>

        <div className="flex gap-1">
          {order.status === 'pending' && (
            <button onClick={() => updateOrderStatus(order.id, 'preparing')} className="flex-1 bg-blue-600 text-white py-1 px-2 rounded text-[10px] font-medium hover:bg-blue-700">
              Prepare
            </button>
          )}
          {order.status === 'preparing' && (
            <button onClick={() => updateOrderStatus(order.id, 'ready')} className="flex-1 bg-orange-600 text-white py-1 px-2 rounded text-[10px] font-medium hover:bg-orange-700">
              Ready
            </button>
          )}
          {/* Show Pay & Clear button only if NOT paid yet */}
          {order.payment_status !== 'paid' && order.status === 'ready' && (
            <button
              onClick={() => onCompleteOrder(order.id)}
              className="flex-1 bg-green-600 text-white py-1 px-2 rounded text-[10px] font-medium hover:bg-green-700"
              title={type === 'dine-in' ? 'Collect payment, then clear the table' : 'Collect payment'}
            >
              {type === 'dine-in' ? 'Pay & Clear' : 'Collect Pay'}
            </button>
          )}
          {/* Show Pay button for completed but unpaid orders */}
          {order.payment_status !== 'paid' && order.status === 'completed' && (
            <button
              onClick={() => onCompleteOrder(order.id)}
              className="flex-1 bg-purple-600 text-white py-1 px-2 rounded text-[10px] font-medium hover:bg-purple-700"
            >
              Pay
            </button>
          )}
          {/* DON'T show Clear Table button - order is already completed when paid */}
          <button onClick={() => onViewDetails(order.id)} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-[10px] font-medium hover:bg-slate-200">
            View
          </button>
          {(order.status === 'completed' || order.status === 'paid') && (
            <button onClick={() => handlePrintBill(order)} className="px-2 py-1 bg-indigo-600 text-white rounded text-[10px] font-medium hover:bg-indigo-700" title="Print">
              🖨️
            </button>
          )}
        </div>
      </div>
    );
  }

  // Compact mode for main area
  if (compact) {
    return (
      <div className="border border-slate-200 rounded-lg p-3 hover:shadow-md transition-all bg-white">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-base">{type === 'dine-in' ? '🍽️' : type === 'takeaway' ? '🥡' : '🚚'}</span>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-900">
                {type === 'dine-in' ? `Table ${order.table_id}` : type === 'takeaway' ? 'Takeaway Order' : order.customer_name}
              </h4>
              <p className="text-xs text-slate-600">
                {type === 'dine-in' ? order.customer_name : order.phone || order.customer_name}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-base font-bold text-slate-900 tabular-nums">NPR {getTotalAmount(order).toLocaleString()}</p>
            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(order.status)}`}>
              {order.status}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
          <span>🕒 {formatTime(order.created_at)}</span>
          <span>📋 {order.order_number}</span>
          <span>📦 {order.items?.length || 0} items</span>
        </div>

        <div className="bg-slate-50 rounded p-2 mb-2">
          <div className="space-y-0.5">
            {order.items?.slice(0, 2).map((item, index) => (
              <div key={index} className="flex justify-between text-xs">
                <span className="text-slate-600">{item.name} × {item.quantity}</span>
                <span className="font-medium text-slate-900 tabular-nums">NPR {(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
            {order.items?.length > 2 && (
              <p className="text-[10px] text-slate-500 italic">+{order.items.length - 2} more...</p>
            )}
          </div>
        </div>

        <div className="flex gap-1.5">
          {order.status === 'pending' && (
            <button onClick={() => updateOrderStatus(order.id, 'preparing')} className="flex-1 bg-blue-600 text-white py-1.5 px-3 rounded-lg text-xs font-medium hover:bg-blue-700">
              🔥 Start Preparing
            </button>
          )}
          {order.status === 'preparing' && (
            <button onClick={() => updateOrderStatus(order.id, 'ready')} className="flex-1 bg-orange-600 text-white py-1.5 px-3 rounded-lg text-xs font-medium hover:bg-orange-700">
              ✅ Mark Ready
            </button>
          )}
          {/* Show Pay & Clear button only if NOT paid yet */}
          {order.payment_status !== 'paid' && order.status === 'ready' && (
            <button
              onClick={() => onCompleteOrder(order.id)}
              className="flex-1 bg-green-600 text-white py-1.5 px-3 rounded-lg text-xs font-medium hover:bg-green-700"
              title={type === 'dine-in' ? 'Collect payment, then clear the table' : 'Collect payment'}
            >
              {type === 'dine-in' ? '💳 Pay & Clear' : '💳 Collect Payment'}
            </button>
          )}
          {/* Show Pay button for completed but unpaid orders */}
          {order.payment_status !== 'paid' && order.status === 'completed' && (
            <button
              onClick={() => onCompleteOrder(order.id)}
              className="flex-1 bg-purple-600 text-white py-1.5 px-3 rounded-lg text-xs font-medium hover:bg-purple-700"
            >
              💳 {type === 'dine-in' ? 'Pay & Clear' : 'Pay'}
            </button>
          )}
          {/* DON'T show Clear Table button - order is already completed when paid */}
          <button onClick={() => onViewDetails(order.id)} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200">
            Details
          </button>
          {(order.status === 'completed' || order.status === 'paid') && (
            <button onClick={() => handlePrintBill(order)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700" title="Print Bill">
              🖨️ Print
            </button>
          )}
          <button onClick={() => onDeleteOrder(order.id, order.order_number)} className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-medium hover:bg-red-200" title="Delete Order">
            🗑️
          </button>
        </div>
      </div>
    );
  }

  // Default full mode (fallback)
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
                {type === 'dine-in' ? `Table ${order.table_id}` : type === 'takeaway' ? 'Takeaway Order' : order.customer_name}
              </h4>
              <p className="text-sm text-slate-600">
                {type === 'dine-in' ? order.customer_name : order.phone || order.customer_name}
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
          <div className="space-y-1">
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
        
        {/* Show Pay & Clear button only if NOT paid yet AND status is ready */}
        {order.payment_status !== 'paid' && order.status === 'ready' && (
          <button
            onClick={() => onCompleteOrder(order.id)}
            className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-2 px-4 rounded-lg font-medium hover:from-green-700 hover:to-green-800 transition-all"
            title={type === 'dine-in' ? 'Collect payment, then clear the table' : 'Collect payment'}
          >
            {type === 'dine-in' ? '💳 Pay & Clear Table' : '💳 Collect Payment'}
          </button>
        )}

        {/* Completed-but-unpaid edge case (rare — usually completion+payment happen together). */}
        {order.payment_status !== 'paid' && order.status === 'completed' && (
          <button
            onClick={() => onCompleteOrder(order.id)}
            className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-2 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-purple-800 transition-all"
          >
            💳 {type === 'dine-in' ? 'Pay & Clear Table' : 'Record Payment'}
          </button>
        )}

        {/* DON'T show Clear Table button - order is already completed when paid */}
        
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
        
        {(order.status === 'completed' || order.status === 'paid') && (
          <button
            onClick={() => handlePrintBill(order)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            title="Print Bill"
          >
            🖨️ Print
          </button>
        )}
        
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
  const { formatDateTime: formatDateTimeWithTZ } = useDateTimeFormatter();
  
  const formatDateTime = (dateString) => {
    return formatDateTimeWithTZ(dateString, {
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
            <span>${order.table_id ? `Table ${order.table_id}` : order.order_type === 'takeaway' ? 'Takeaway' : 'Delivery'}</span>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Compact Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold">📋 Order #{order?.order_number || 'N/A'}</h2>
              <p className="text-xs text-indigo-100">{formatDateTime(order?.created_at)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={printKOT} className="px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-xs font-medium transition">
                🖨️ Print KOT
              </button>
              <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1.5 transition">
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Compact Content - No Scroll */}
        <div className="flex-1 p-4 overflow-hidden flex flex-col min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin text-3xl mb-2">⏳</div>
                <p className="text-slate-500 text-sm">Loading...</p>
              </div>
            </div>
          ) : order ? (
            <div className="grid grid-cols-12 gap-3 h-full">
              {/* Left Column - Order Info */}
              <div className="col-span-4 flex flex-col gap-3">
                {/* Status Card */}
                <div className="glass-card p-3">
                  <h3 className="text-xs font-semibold text-slate-700 mb-2">📊 Status</h3>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(order.status)}`}>
                    {order.status?.toUpperCase()}
                  </span>
                  <p className="text-[10px] text-slate-600 mt-1">
                    {formatDateTime(order.created_at)}
                  </p>
                </div>

                {/* Payment Card */}
                <div className="glass-card p-3">
                  <h3 className="text-xs font-semibold text-slate-700 mb-2">💳 Payment</h3>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${getPaymentStatusColor(order.payment_status)}`}>
                    {order.payment_status?.toUpperCase()}
                  </span>
                  {order.payment_method && (
                    <p className="text-[10px] text-slate-600 mt-1">{order.payment_method.toUpperCase()}</p>
                  )}
                  <p className="text-sm font-bold text-slate-900 mt-1 tabular-nums">NPR {order.total_amount?.toLocaleString()}</p>
                </div>

                {/* Customer/Table Card */}
                <div className="glass-card p-3 flex-1">
                  <h3 className="text-xs font-semibold text-slate-700 mb-2">
                    {order.table_id ? '🪑 Table' : order.order_type === 'takeaway' ? '🥡 Takeaway' : '🚚 Delivery'}
                  </h3>
                  {order.table_id ? (
                    <>
                      <p className="text-xs text-slate-900 font-medium">Table {order.table_id}</p>
                      <p className="text-[10px] text-slate-600">{order.customer_name || 'Guest'}</p>
                    </>
                  ) : order.order_type === 'takeaway' ? (
                    <>
                      <p className="text-xs text-slate-900 font-medium">Takeaway Order</p>
                      <p className="text-[10px] text-slate-600">{order.customer_name || order.customer_phone || 'Guest'}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-slate-900 font-medium">{order.customer_name}</p>
                      <p className="text-[10px] text-slate-600">{order.customer_phone}</p>
                      {(order.delivery_address || order.address) && (
                        <p className="text-[10px] text-slate-600 mt-1 line-clamp-2">{order.delivery_address || order.address}</p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Right Column - Items & Totals */}
              <div className="col-span-8 flex flex-col gap-3 min-h-0">
                {/* Items List */}
                <div className="glass-card flex-1 flex flex-col min-h-0">
                  <div className="px-3 py-2 border-b border-slate-200/60 flex-shrink-0">
                    <h3 className="text-xs font-semibold text-slate-700">📦 Items ({order.items?.length || 0})</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto fz-scroll p-3 space-y-2 min-h-0">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, index) => (
                        <div key={index} className="flex items-start justify-between p-2 bg-slate-50 rounded">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-medium text-slate-900 truncate">{item.name}</h4>
                            {item.category && (
                              <p className="text-[10px] text-slate-500">{item.category}</p>
                            )}
                            {item.special_instructions && (
                              <p className="text-[10px] text-blue-600 mt-0.5 line-clamp-1">📝 {item.special_instructions}</p>
                            )}
                          </div>
                          <div className="text-right ml-2 flex-shrink-0">
                            <p className="text-[10px] text-slate-600 tabular-nums">{item.quantity} × NPR {item.price?.toLocaleString()}</p>
                            <p className="text-xs font-bold text-slate-900 tabular-nums">NPR {(item.price * item.quantity)?.toLocaleString()}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 text-xs text-center py-4">No items</p>
                    )}
                  </div>
                </div>

                {/* Totals */}
                <div className="glass-card p-3 flex-shrink-0">
                  <h3 className="text-xs font-semibold text-slate-700 mb-2">💰 Totals</h3>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">Subtotal:</span>
                      <span className="font-medium tabular-nums">NPR {order.subtotal?.toLocaleString()}</span>
                    </div>
                    {order.tax_amount > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">Tax:</span>
                        <span className="font-medium tabular-nums">NPR {order.tax_amount?.toLocaleString()}</span>
                      </div>
                    )}
                    {order.discount_amount > 0 && (
                      <div className="flex justify-between text-xs text-green-600">
                        <span>Discount:</span>
                        <span className="font-medium tabular-nums">-NPR {order.discount_amount?.toLocaleString()}</span>
                      </div>
                    )}
                    {order.delivery_fee > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">Delivery:</span>
                        <span className="font-medium tabular-nums">NPR {order.delivery_fee?.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                      <span>Total:</span>
                      <span className="tabular-nums">NPR {order.total_amount?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-500">Order not found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrdersManagement;
