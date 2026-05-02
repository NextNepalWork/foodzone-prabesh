import React, { useState, useEffect } from 'react';
import { fetchApi, getSocketUrl } from '../services/apiService';
import { getApiUrl } from '../config/api';
import io from 'socket.io-client';
import PushNotificationManager from '../utils/pushNotifications';
import OfflineStorageManager from '../utils/offlineStorage';
import ReceptionPayment from '../components/ReceptionPayment';
import { useTableCount } from '../hooks/useSettings';

const Reception = () => {
  const [completedOrders, setCompletedOrders] = useState([]);
  
  // Get dynamic table count from settings
  const tableCount = useTableCount();
  const [activeOrders, setActiveOrders] = useState([]);
  const [tableStatuses, setTableStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('adminToken') || localStorage.getItem('staffToken');
  });
  // eslint-disable-next-line no-unused-vars
  const [showLogin, setShowLogin] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [loginCredentials, setLoginCredentials] = useState({ username: '', password: '' });

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('staffToken');
    localStorage.removeItem('adminAuthenticated');
    window.location.href = '/admin';
  };
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'completed' or 'tables'
  // const [socket, setSocket] = useState(null);
  const [clearingTable, setClearingTable] = useState(null);
  const [pushManager, setPushManager] = useState(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [offlineStorage, setOfflineStorage] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceType, setBalanceType] = useState('');
  const [cashDenominations, setCashDenominations] = useState({
    1000: 0,
    500: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    5: 0
  });
  const [showTransactionMonitor, setShowTransactionMonitor] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [dailySummary, setDailySummary] = useState({
    totalCash: 0,
    totalOnline: 0,
    totalCard: 0,
    transactionCount: 0
  });
  const [totalBalance, setTotalBalance] = useState(0);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseCause, setExpenseCause] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('success');
  const [showCashHandoverModal, setShowCashHandoverModal] = useState(false);
  const [handoverAmount, setHandoverAmount] = useState('');
  const [handoverTo, setHandoverTo] = useState('');
  const [handoverReason, setHandoverReason] = useState('');
  const [showDaybookSummaryModal, setShowDaybookSummaryModal] = useState(false);
  const [daybookData, setDaybookData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Day Close functionality
  const [showDayCloseModal, setShowDayCloseModal] = useState(false);
  const [dayStatus, setDayStatus] = useState({ status: 'open', is_closed: false });
  const [closingBalance, setClosingBalance] = useState('');
  const [cashCount, setCashCount] = useState('');
  const [dayCloseNotes, setDayCloseNotes] = useState('');
  
  // Day Open functionality
  const [showDayOpenModal, setShowDayOpenModal] = useState(false);
  const [openReason, setOpenReason] = useState('');
  
  // Table Details Modal
  const [showTableDetailsModal, setShowTableDetailsModal] = useState(false);
  const [selectedTableDetails, setSelectedTableDetails] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Initialize data loading with proper error handling
    const initializeReception = async () => {
      try {
        // Load critical data first
        await Promise.allSettled([
          fetchAllOrders(),
          fetchTableStatuses(),
          fetchDayStatus(),
          fetchTransactionData()
        ]);
        
        // Initialize PWA features asynchronously (non-blocking)
        setTimeout(() => {
          initializePWA().catch(err => console.warn('PWA init failed:', err));
          initializeOfflineStorage().catch(err => console.warn('Offline storage init failed:', err));
        }, 100);
        
      } catch (error) {
        console.error('Reception initialization failed:', error);
        setLoading(false);
      }
    };
    
    initializeReception();
    
    // Set up periodic refresh for both tables and orders (fallback for missed socket events)
    const tableRefreshInterval = setInterval(() => {
      console.log('🔄 Periodic refresh of table statuses...');
      fetchTableStatuses().catch(err => console.warn('Periodic table refresh failed:', err));
    }, 30000); // Refresh every 30 seconds
    
    const orderRefreshInterval = setInterval(() => {
      console.log('🔄 Periodic refresh of orders...');
      fetchAllOrders().catch(err => console.warn('Periodic order refresh failed:', err));
    }, 45000); // Refresh every 45 seconds (offset from tables)
    
    // Initialize socket connection with error handling
    let newSocket = null;
    try {
      newSocket = io(getSocketUrl(), {
        timeout: 5000,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000
      });
      
      newSocket.on('connect', () => {
        console.log('🏨 Reception connected to server');
      });
      
      newSocket.on('connect_error', (error) => {
        console.warn('Socket connection failed:', error);
      });
      
      newSocket.on('orderStatusUpdated', (data) => {
        console.log('🔄 Real-time: Order status updated, refreshing orders...');
        fetchAllOrders().catch(err => console.warn('Failed to refresh orders:', err));
      });
      
      newSocket.on('newOrder', (order) => {
        console.log('🔄 Real-time: New order received, refreshing orders...');
        fetchAllOrders().catch(err => console.warn('Failed to refresh orders:', err));
        fetchTableStatuses().catch(err => console.warn('Failed to refresh tables:', err));
      });
      
      newSocket.on('tableCleared', ({ tableId }) => {
        console.log(`🔄 Real-time: Table ${tableId} cleared, refreshing tables...`);
        fetchTableStatuses().catch(err => console.warn('Failed to refresh tables:', err));
        fetchAllOrders().catch(err => console.warn('Failed to refresh orders:', err));
      });
      
      newSocket.on('tableOccupied', ({ tableId }) => {
        console.log(`🔄 Real-time: Table ${tableId} occupied, refreshing tables...`);
        fetchTableStatuses().catch(err => console.warn('Failed to refresh tables:', err));
      });
      
      newSocket.on('tableStatusUpdate', (data) => {
        console.log('🔄 Real-time: Table status update, refreshing tables...');
        fetchTableStatuses().catch(err => console.warn('Failed to refresh tables:', err));
      });
      
      newSocket.on('tableCacheCleared', () => {
        console.log('🔄 Real-time: Table cache cleared, refreshing tables...');
        fetchTableStatuses().catch(err => console.warn('Failed to refresh tables:', err));
      });
    } catch (error) {
      console.warn('Socket initialization failed:', error);
    }
    
    // PWA install prompt listener
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Online/offline listeners
    const handleOnline = () => {
      setIsOnline(true);
      if (offlineStorage) {
        offlineStorage.syncPendingActions(fetchApi).catch(err => console.warn('Sync failed:', err));
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
      clearInterval(tableRefreshInterval);
      clearInterval(orderRefreshInterval);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAllOrders = async () => {
    try {
      console.log('🔍 Fetching orders from API...');
      
      // Add timeout and retry logic
      let retries = 2;
      let data = [];
      
      while (retries > 0) {
        try {
          const response = await fetchApi.get('/api/orders');
          console.log('📦 Raw API response:', response);
          
          // Handle different response formats
          if (Array.isArray(response)) {
            data = response;
          } else if (response && Array.isArray(response.orders)) {
            data = response.orders; // API returns {orders: [...], pagination: {...}}
          } else if (response && Array.isArray(response.data)) {
            data = response.data;
          } else if (response && response.success === false) {
            console.warn('API Error:', response.message);
            if (response.message?.includes('Too many requests')) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              retries--;
              continue;
            }
            data = [];
          } else {
            data = [];
          }
          break;
        } catch (err) {
          console.error('❌ API request failed:', err);
          retries--;
          if (retries === 0) throw err;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log('📊 Total orders from API:', data.length);
      
      // Filter for today's orders only
      const today = new Date().toDateString();
      console.log('📅 Today\'s date:', today);
      
      const todayOrders = data.filter(order => 
        new Date(order.created_at).toDateString() === today
      );
      console.log('📋 Today\'s orders:', todayOrders.length);
      
      // Separate active and completed orders
      // Active: pending, preparing, ready (not completed)
      const active = todayOrders.filter(order => 
        ['pending', 'preparing', 'ready'].includes(order.status)
      );
      // Completed: all completed orders (regardless of payment status)
      const completed = todayOrders.filter(order => 
        order.status === 'completed'
      );
      
      console.log('🔥 Active orders:', active.length);
      console.log('✅ Completed orders:', completed.length);
      console.log('Active orders data:', active);
      console.log('Completed orders data:', completed);
      
      setActiveOrders(active);
      setCompletedOrders(completed);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setActiveOrders([]);
      setCompletedOrders([]);
      setLoading(false);
    }
  };

  const fetchTableStatuses = async () => {
    try {
      console.log('🔄 Fetching table statuses from API...');
      const response = await fetchApi.get('/api/tables/status');
      console.log('📊 Table status API response:', response);
      
      // Handle different response formats
      let data = [];
      if (Array.isArray(response)) {
        data = response;
      } else if (response && Array.isArray(response.data)) {
        data = response.data;
      } else if (response && response.success === false) {
        console.warn('Table status API Error:', response.message);
        data = [];
      } else {
        console.warn('Unexpected table status response format:', response);
        data = [];
      }
      
      console.log(`📊 Setting ${data.length} table statuses:`, data.filter(t => t.status !== 'available'));
      setTableStatuses(data);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error fetching table statuses:', error);
      setTableStatuses([]);
      setLoading(false);
    }
  };

  // Initialize PWA features
  const initializePWA = async () => {
    try {
      const manager = new PushNotificationManager();
      setPushManager(manager);
      
      if (manager.isSupported()) {
        const initialized = await manager.initialize();
        setPushEnabled(initialized);
        console.log(initialized ? 'Reception PWA: Push notifications enabled' : 'Reception PWA: Local notifications only');
      }
    } catch (error) {
      console.error('Reception PWA initialization failed:', error);
    }
  };

  // Initialize offline storage
  const initializeOfflineStorage = async () => {
    try {
      const storage = new OfflineStorageManager();
      await storage.init();
      setOfflineStorage(storage);
    } catch (error) {
      console.error('Reception offline storage initialization failed:', error);
    }
  };

  // Install PWA
  const handleInstallPWA = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      console.log(`Reception PWA install: ${outcome}`);
      setInstallPrompt(null);
    }
  };

  // Toggle push notifications
  // eslint-disable-next-line no-unused-vars
  const togglePushNotifications = async () => {
    if (!pushManager) return;
    
    if (pushEnabled) {
      await pushManager.unsubscribe();
      setPushEnabled(false);
    } else {
      const initialized = await pushManager.initialize();
      setPushEnabled(initialized);
    }
  };

  const handleViewTableDetails = (tableStatus) => {
    console.log('👁️ Viewing table details:', tableStatus);
    console.log('👁️ Table orders:', tableStatus.orders);
    console.log('👁️ Order count:', tableStatus.order_count);
    console.log('👁️ Total amount:', tableStatus.total_amount);
    
    // Log each order's items in detail
    if (tableStatus.orders && tableStatus.orders.length > 0) {
      tableStatus.orders.forEach((order, index) => {
        console.log(`👁️ Order ${index + 1}:`, order);
        console.log(`👁️ Order ${index + 1} items count:`, order.items?.length);
        if (order.items && order.items.length > 0) {
          order.items.forEach((item, itemIndex) => {
            console.log(`   Item ${itemIndex + 1}:`, {
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.subtotal
            });
          });
        } else {
          console.log(`   ⚠️ No items in order ${index + 1}`);
        }
      });
    } else {
      console.log('⚠️ No orders found for this table');
    }
    
    setSelectedTableDetails(tableStatus);
    setShowTableDetailsModal(true);
  };

  const handleClearTable = async (tableId) => {
    setClearingTable(tableId);
    try {
      console.log(`🔄 Clearing table ${tableId}...`);
      
      if (isOnline) {
        await fetchApi.post(`/api/clear-table/${tableId}`);
      } else if (offlineStorage) {
        await offlineStorage.storePendingAction({
          type: 'CLEAR_TABLE',
          tableId
        });
      }
      
      // Auto-refresh both tables and orders for consistency
      console.log('🔄 Auto-refreshing after table clear...');
      await Promise.all([
        fetchTableStatuses(),
        fetchAllOrders()
      ]);
      
      console.log(`✅ Table ${tableId} cleared successfully`);
      
      // Close the table details modal if it's open
      if (showTableDetailsModal) {
        setShowTableDetailsModal(false);
        setSelectedTableDetails(null);
      }
    } catch (error) {
      console.error('Error clearing table:', error);
    } finally {
      setClearingTable(null);
    }
  };

  const handlePaymentClick = (order) => {
    console.log('💳 Payment button clicked for order:', order.id, order.order_number);
    console.log('Order details:', order);
    setSelectedOrder(order);
    setShowPaymentModal(true);
    console.log('Payment modal should now be visible');
  };

  const handlePrintOrder = (order) => {
    console.log('🖨️ Print button clicked for order:', order.id);
    console.log('🖨️ Order data for printing:', order);
    console.log('🖨️ Order items:', order.items);
    
    // Create thermal printer optimized content
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          
          body {
            font-family: 'Courier New', monospace;
            font-size: 11px;
            line-height: 1.3;
            margin: 0;
            padding: 3mm;
            width: 80mm;
            color: #000;
            background: #fff;
          }
          
          .center { text-align: center; }
          .bold { font-weight: bold; }
          
          .header {
            text-align: center;
            margin-bottom: 6px;
            padding-bottom: 4px;
            border-bottom: 2px solid #000;
          }
          
          .restaurant-name {
            font-size: 16px;
            font-weight: bold;
            margin: 2px 0;
            letter-spacing: 1px;
          }
          
          .restaurant-info {
            font-size: 10px;
            margin: 1px 0;
          }
          
          .divider {
            border-bottom: 1px dashed #000;
            margin: 4px 0;
            height: 1px;
          }
          
          .order-section {
            margin: 6px 0;
          }
          
          .info-line {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
            font-size: 10px;
          }
          
          .info-label {
            font-weight: bold;
            min-width: 50px;
          }
          
          .items-header {
            text-align: center;
            font-weight: bold;
            margin: 4px 0;
            font-size: 12px;
          }
          
          .item-line {
            display: flex;
            justify-content: space-between;
            margin: 1px 0;
            font-size: 10px;
          }
          
          .item-name {
            flex: 1;
            padding-right: 6px;
          }
          
          .item-qty {
            min-width: 25px;
            text-align: center;
          }
          
          .item-price {
            min-width: 50px;
            text-align: right;
            font-weight: bold;
          }
          
          .total-section {
            border-top: 2px solid #000;
            padding-top: 4px;
            margin-top: 6px;
            text-align: center;
          }
          
          .total-amount {
            font-size: 14px;
            font-weight: bold;
            margin: 2px 0;
          }
          
          .payment-info {
            font-size: 11px;
            font-weight: bold;
            margin: 2px 0;
          }
          
          .footer {
            text-align: center;
            margin-top: 6px;
            padding-top: 4px;
            border-top: 1px dashed #000;
            font-size: 9px;
          }
          
          .footer-line {
            margin: 1px 0;
          }
          
          @media print {
            body { 
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <!-- Restaurant Header -->
        <div class="header">
          <div class="restaurant-name">FOOD ZONE</div>
          <div class="restaurant-info">Duwakot, Bhaktapur</div>
          <div class="restaurant-info">Phone: 9851234567</div>
          <div class="restaurant-info">ORDER RECEIPT</div>
        </div>
        
        <!-- Order Information -->
        <div class="order-section">
          <div class="info-line">
            <span class="info-label">Order:</span>
            <span>${order.order_number || `FZ-${order.id}`}</span>
          </div>
          <div class="info-line">
            <span class="info-label">Date:</span>
            <span>${new Date(order.created_at).toLocaleDateString('en-GB')}</span>
          </div>
          <div class="info-line">
            <span class="info-label">Time:</span>
            <span>${new Date(order.created_at).toLocaleTimeString('en-GB', { hour12: false })}</span>
          </div>
          <div class="info-line">
            <span class="info-label">Type:</span>
            <span>${order.order_type === 'dine-in' ? 'DINE-IN' : 'DELIVERY'}</span>
          </div>
          ${order.order_type === 'dine-in' && order.table_id ? `
          <div class="info-line">
            <span class="info-label">Table:</span>
            <span>${order.table_id}</span>
          </div>
          ` : ''}
          <div class="info-line">
            <span class="info-label">Customer:</span>
            <span>${order.customer_name}</span>
          </div>
          <div class="info-line">
            <span class="info-label">Phone:</span>
            <span>${order.customer_phone || order.phone || 'N/A'}</span>
          </div>
          ${order.delivery_address ? `
          <div class="info-line">
            <span class="info-label">Address:</span>
            <span>${order.delivery_address}</span>
          </div>
          ` : ''}
        </div>
        
        <div class="divider"></div>
        
        <!-- Order Items -->
        <div class="items-header">ORDER ITEMS</div>
        ${order.items && order.items.length > 0 ? order.items.map(item => `
        <div class="item-line">
          <div class="item-name">${item.menu_item_name || item.name || 'Item'}</div>
          <div class="item-qty">x${item.quantity || 1}</div>
          <div class="item-price">Rs.${parseFloat(item.subtotal || (item.price * item.quantity) || 0).toFixed(0)}</div>
        </div>
        `).join('') : '<div class="center">No items found</div>'}
        
        <!-- Total Section -->
        <div class="total-section">
          <div class="total-amount">TOTAL: Rs.${parseFloat(order.total || order.total_amount || 0).toFixed(0)}</div>
          <div class="payment-info">
            ${order.payment_status === 'paid' 
              ? `PAID - ${order.payment_method?.toUpperCase() || 'CASH'}` 
              : 'PAYMENT PENDING'}
          </div>
        </div>
        
        <div class="divider"></div>
        
        <!-- Footer -->
        <div class="footer">
          <div class="footer-line bold">Thank you for choosing Food Zone!</div>
          <div class="footer-line">Quality Food, Quick Service</div>
          <div class="footer-line">Visit us again soon!</div>
          <div class="footer-line">Printed: ${new Date().toLocaleString('en-GB')}</div>
        </div>
      </body>
      </html>
    `;

    // Try to open print window
    try {
      const printWindow = window.open('', '_blank', 'width=300,height=600');
      
      if (!printWindow) {
        // Fallback if popup is blocked
        console.warn('⚠️ Popup blocked, using alternative print method');
        const printFrame = document.createElement('iframe');
        printFrame.style.display = 'none';
        document.body.appendChild(printFrame);
        
        printFrame.contentDocument.write(printContent);
        printFrame.contentDocument.close();
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
        
        // Remove iframe after printing
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 1000);
        return;
      }
      
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      
      // Wait for content to load before printing
      setTimeout(() => {
        printWindow.print();
        // Close window after print dialog
        setTimeout(() => {
          printWindow.close();
        }, 500);
      }, 100);
      
    } catch (error) {
      console.error('❌ Print error:', error);
      alert('Print failed. Please check if popups are allowed or try again.');
    }
  };

  const handlePaymentComplete = (updatedOrder) => {
    setShowPaymentModal(false);
    setSelectedOrder(null);
    
    // Show success notification
    if (updatedOrder.success) {
      setNotificationMessage(updatedOrder.message || 'Payment processed successfully');
      setNotificationType('success');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    }
    
    // Refresh orders to properly move paid orders from active to completed tab
    fetchAllOrders();
    if (showTransactionMonitor) {
      fetchTransactionData();
    }
  };

  const handlePaymentCancel = () => {
    setShowPaymentModal(false);
    setSelectedOrder(null);
  };

  const handleBalanceClick = (type) => {
    setBalanceType(type);
    setShowBalanceModal(true);
    // Reset denominations
    setCashDenominations({
      5: 0,
      10: 0,
      20: 0,
      50: 0,
      100: 0,
      500: 0,
      1000: 0
    });
    setTotalBalance(0);
  };

  const handleDenominationChange = (denomination, count) => {
    const newDenominations = {
      ...cashDenominations,
      [denomination]: parseInt(count) || 0
    };
    setCashDenominations(newDenominations);
    
    // Calculate total balance
    const total = Object.entries(newDenominations).reduce((sum, [denom, count]) => {
      return sum + (parseInt(denom) * parseInt(count));
    }, 0);
    setTotalBalance(total);
  };

  const handleBalanceSubmit = async (e) => {
    // Prevent any default behavior and stop propagation
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    console.log('Balance submit clicked:', { balanceType, totalBalance, cashDenominations });
    
    try {
      // Validate required data
      if (!balanceType) {
        setNotificationMessage('Error: Balance type not set. Please close and reopen the modal.');
        setNotificationType('error');
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
        return;
      }

      if (totalBalance < 0) {
        setNotificationMessage('Error: Balance amount cannot be negative.');
        setNotificationType('error');
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
        return;
      }

      const transactionData = {
        transaction_type: balanceType === 'opening' ? 'opening_balance' : 'closing_balance',
        amount: totalBalance || 0,
        description: `${balanceType === 'opening' ? 'Opening' : 'Closing'} balance - Cash count: ${Object.entries(cashDenominations).map(([denom, count]) => `${count}x${denom}`).filter(item => !item.startsWith('0x')).join(', ')}`,
        date: new Date().toISOString()
      };

      console.log('Submitting transaction:', transactionData);
      
      // Use proper error handling with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );
      
      const response = await Promise.race([
        fetchApi.post(`/api/daybook/transaction`, transactionData),
        timeoutPromise
      ]);
      
      console.log('Transaction response:', response);
      
      // Reset all states
      setShowBalanceModal(false);
      setBalanceType('');
      setCashDenominations({
        5: 0,
        10: 0,
        20: 0,
        50: 0,
        100: 0,
        500: 0,
        1000: 0
      });
      setTotalBalance(0);
      
      // Show success notification
      setNotificationMessage(`✅ ${balanceType === 'opening' ? 'Opening' : 'Closing'} balance recorded: NPR ${(totalBalance || 0).toLocaleString()}`);
      setNotificationType('success');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      
      // Refresh transaction data for real-time updates
      if (showTransactionMonitor) {
        fetchTransactionData();
      }
      
      console.log(`✅ ${balanceType === 'opening' ? 'Opening' : 'Closing'} balance recorded: NPR ${totalBalance}`);
    } catch (error) {
      console.error('Error recording balance:', error);
      
      let errorMessage = 'Failed to record balance. Please try again.';
      if (error.message === 'Request timeout') {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (error.response) {
        errorMessage = `Server error: ${error.response.status}. Please try again.`;
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      setNotificationMessage(errorMessage);
      setNotificationType('error');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);
    }
  };

  const handleBalanceCancel = () => {
    setShowBalanceModal(false);
    setCashDenominations({
      5: 0,
      10: 0,
      20: 0,
      50: 0,
      100: 0,
      500: 0,
      1000: 0
    });
    setTotalBalance(0);
  };

  // Fetch transaction data for monitoring with real-time updates
  const fetchTransactionData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Use timeout for better error handling
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 8000)
      );
      
      const response = await Promise.race([
        fetchApi.get(`/api/daybook/summary?date=${today}`),
        timeoutPromise
      ]);
      
      if (response && response.data) {
        setDailySummary({
          totalCash: parseFloat(response.data.cash_payments || 0),
          totalOnline: parseFloat(response.data.online_payments || 0),
          totalCard: parseFloat(response.data.card_payments || 0),
          transactionCount: parseInt(response.data.transaction_count || 0)
        });
      }

      // Fetch recent transactions with timeout
      const transactionsResponse = await Promise.race([
        fetchApi.get(`/api/daybook/recent-transactions`),
        timeoutPromise
      ]);
      
      if (transactionsResponse && transactionsResponse.data) {
        setRecentTransactions(transactionsResponse.data.slice(0, 10)); // Last 10 transactions
      }
    } catch (error) {
      console.error('Error fetching transaction data:', error);
      
      if (error.message !== 'Request timeout') {
        setNotificationMessage('Failed to fetch latest transaction data');
        setNotificationType('error');
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
      }
    }
  };

  // Handle transaction monitor toggle with real-time updates
  const handleTransactionMonitorToggle = () => {
    if (!showTransactionMonitor) {
      fetchTransactionData();
      // Set up periodic refresh for real-time updates
      const interval = setInterval(() => {
        if (showTransactionMonitor) {
          fetchTransactionData();
        } else {
          clearInterval(interval);
        }
      }, 30000); // Refresh every 30 seconds
    }
    setShowTransactionMonitor(!showTransactionMonitor);
  };

  // Handle expense modal
  const handleExpenseClick = () => {
    setShowExpenseModal(true);
    setExpenseCause('');
    setExpenseAmount('');
  };

  const handleExpenseSubmit = async () => {
    if (!expenseCause.trim() || !expenseAmount || parseFloat(expenseAmount) <= 0) {
      setNotificationMessage('Please enter both expense cause and amount');
      setNotificationType('error');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      return;
    }

    try {
      const transactionData = {
        transaction_type: 'expense',
        amount: parseFloat(expenseAmount),
        description: `Expense: ${expenseCause.trim()}`,
        date: new Date().toISOString()
      };

      // Use proper error handling with timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      // eslint-disable-next-line no-unused-vars
      const response = await Promise.race([
        fetchApi.post(`/api/daybook/transaction`, transactionData),
        timeoutPromise
      ]);

      setShowExpenseModal(false);
      setExpenseCause('');
      setExpenseAmount('');
      
      // Show success notification
      setNotificationMessage(`✅ Expense recorded: ${expenseCause} - NPR ${parseFloat(expenseAmount).toLocaleString()}`);
      setNotificationType('success');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      
      // Refresh transaction data for real-time updates
      if (showTransactionMonitor) {
        fetchTransactionData();
      }
      
      console.log(`✅ Expense recorded: ${expenseCause} - NPR ${expenseAmount}`);
    } catch (error) {
      console.error('Error recording expense:', error);
      
      let errorMessage = 'Failed to record expense. Please try again.';
      if (error.message === 'Request timeout') {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (error.response) {
        errorMessage = `Server error: ${error.response.status}. Please try again.`;
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      setNotificationMessage(errorMessage);
      setNotificationType('error');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);
    }
  };

  const handleExpenseCancel = () => {
    setShowExpenseModal(false);
    setExpenseCause('');
    setExpenseAmount('');
  };

  // Handle cash handover functionality
  const handleCashHandoverClick = () => {
    setShowCashHandoverModal(true);
    setHandoverAmount('');
    setHandoverTo('');
    setHandoverReason('');
  };

  const handleCashHandoverSubmit = async () => {
    if (!handoverTo.trim() || !handoverAmount || parseFloat(handoverAmount) <= 0) {
      setNotificationMessage('Please enter handover recipient and amount');
      setNotificationType('error');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      return;
    }

    try {
      const transactionData = {
        transaction_type: 'cash_handover',
        amount: parseFloat(handoverAmount),
        description: `Cash handover to ${handoverTo.trim()}${handoverReason.trim() ? ` - ${handoverReason.trim()}` : ''}`,
        date: new Date().toISOString()
      };

      await fetchApi.post(`/api/daybook/transaction`, transactionData);
      
      setShowCashHandoverModal(false);
      setHandoverAmount('');
      setHandoverTo('');
      setHandoverReason('');
      
      setNotificationMessage(`✅ Cash handover recorded: NPR ${parseFloat(handoverAmount).toLocaleString()} to ${handoverTo}`);
      setNotificationType('success');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      
      console.log(`✅ Cash handover recorded: ${handoverTo} - NPR ${handoverAmount}`);
    } catch (error) {
      console.error('Error recording cash handover:', error);
      setNotificationMessage(`Failed to record cash handover: ${error.message || 'Unknown error'}. Please try again.`);
      setNotificationType('error');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);
    }
  };

  const handleCashHandoverCancel = () => {
    setShowCashHandoverModal(false);
    setHandoverAmount('');
    setHandoverTo('');
    setHandoverReason('');
  };

  // Handle daybook summary functionality
  const handleDaybookSummaryClick = async () => {
    setShowDaybookSummaryModal(true);
    await fetchDaybookData(selectedDate);
  };

  const fetchDaybookData = async (date) => {
    try {
      const response = await fetchApi.get(`/api/daybook/summary?date=${date}`);
      setDaybookData(response.data || response);
    } catch (error) {
      console.error('Error fetching daybook data:', error);
      setNotificationMessage('Failed to fetch daybook data. Please try again.');
      setNotificationType('error');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    }
  };

  const handleDateChange = async (newDate) => {
    setSelectedDate(newDate);
    if (showDaybookSummaryModal) {
      await fetchDaybookData(newDate);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatCurrency = (amount) => {
    // Convert to number and remove any leading zeros
    const numAmount = parseFloat(amount) || 0;
    // Format with 2 decimal places and thousand separators
    return `NPR ${numAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Day Close functionality
  const fetchDayStatus = async (date = null) => {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const response = await fetchApi.get(`/api/daybook/day-status/${targetDate}`);
      setDayStatus(response.data || response);
    } catch (error) {
      console.error('Error fetching day status:', error);
    }
  };

  // Day Close functionality with confirmation
  const handleDayCloseClick = async () => {
    // First confirmation - Are you sure?
    const confirmClose = window.confirm(
      '⚠️ CONFIRM DAY CLOSE\n\n' +
      'Are you sure you want to close today?\n\n' +
      '• This will end daily operations\n' +
      '• You can reopen if needed\n' +
      '• All transactions will be finalized\n\n' +
      'Click OK to continue or Cancel to abort.'
    );
    
    if (!confirmClose) {
      return; // User cancelled
    }
    
    await fetchDayStatus();
    await fetchDaybookData(new Date().toISOString().split('T')[0]);
    setShowDayCloseModal(true);
  };

  const handleDayClose = async () => {
    try {
      if (!closingBalance) {
        setNotificationMessage('Please enter the closing balance amount.');
        setNotificationType('error');
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
        return;
      }

      // Final confirmation before closing
      const finalConfirm = window.confirm(
        `🔚 FINAL CONFIRMATION\n\n` +
        `Closing Balance: Rs.${parseFloat(closingBalance).toLocaleString()}\n` +
        `Cash Count: ${cashCount || 'Not specified'}\n` +
        `Notes: ${dayCloseNotes || 'None'}\n\n` +
        `⚠️ This will CLOSE today and set tomorrow's opening balance.\n\n` +
        `Are you absolutely sure?`
      );
      
      if (!finalConfirm) {
        return; // User cancelled final confirmation
      }

      const dayCloseData = {
        closing_balance: parseFloat(closingBalance),
        cash_count: cashCount,
        notes: dayCloseNotes,
        date: new Date().toISOString().split('T')[0]
      };

      const response = await fetchApi.post('/api/daybook/close-day', dayCloseData);
      
      console.log('🔚 Day Close Full Response:', response);
      console.log('🔚 Response Status:', response?.status);
      console.log('🔚 Response Success:', response?.success);
      console.log('🔚 Response Data:', response?.data);
      
      if (response && response.success) {
        setNotificationMessage('Day closed successfully! Opening balance set for tomorrow.');
        setNotificationType('success');
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 5000);
        
        // Reset form and close modal
        setShowDayCloseModal(false);
        setClosingBalance('');
        setCashCount('');
        setDayCloseNotes('');
        
        // Refresh data
        await fetchDayStatus();
        await fetchTransactionData();
      } else {
        // Handle unexpected response format
        setNotificationMessage('Day close completed, but response format was unexpected.');
        setNotificationType('warning');
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 5000);
        
        // Still refresh data to get current status
        await fetchDayStatus();
      }
    } catch (error) {
      console.error('Error closing day:', error);
      const errorMessage = error.response?.data?.message || 'Failed to close day. Please try again.';
      
      // Special handling for "Day already closed"
      if (errorMessage.includes('already been closed')) {
        setNotificationMessage('✅ Day is already closed! Tomorrow will start with today\'s closing balance.');
        setNotificationType('info');
        setShowDayCloseModal(false); // Close modal since day is already closed
      } else {
        setNotificationMessage(errorMessage);
        setNotificationType('error');
      }
      
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);
      
      // Always refresh day status to update button state
      await fetchDayStatus();
    }
  };

  // Day Open functionality with confirmation
  const handleDayOpenClick = async () => {
    // First confirmation - Are you sure?
    const confirmOpen = window.confirm(
      '⚠️ CONFIRM DAY REOPEN\n\n' +
      'Are you sure you want to reopen today?\n\n' +
      '• This will allow more transactions\n' +
      '• Previous closing will be removed\n' +
      '• You must close again when finished\n' +
      '• This should only be done for corrections\n\n' +
      'Click OK to continue or Cancel to abort.'
    );
    
    if (!confirmOpen) {
      return; // User cancelled
    }
    
    await fetchDayStatus();
    setShowDayOpenModal(true);
  };

  const handleDayOpen = async () => {
    try {
      // Final confirmation before reopening
      const finalConfirm = window.confirm(
        `🔓 FINAL CONFIRMATION\n\n` +
        `Reason: ${openReason || 'Not specified'}\n\n` +
        `⚠️ This will REOPEN today for more transactions.\n` +
        `Previous closing balance will be removed.\n` +
        `You MUST close the day again when finished.\n\n` +
        `Are you absolutely sure this is necessary?`
      );
      
      if (!finalConfirm) {
        return; // User cancelled final confirmation
      }

      const dayOpenData = {
        date: new Date().toISOString().split('T')[0],
        reason: openReason
      };

      const response = await fetchApi.post('/api/daybook/open-day', dayOpenData);
      
      console.log('🔓 Day Open Response:', response);
      console.log('🔓 Response Data:', response?.data);
      console.log('🔓 Direct Success:', response?.success);
      
      if (response && response.success) {
        setNotificationMessage(`✅ Day reopened successfully! You can now add more transactions.`);
        setNotificationType('success');
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 5000);
        
        // Reset form and close modal
        setShowDayOpenModal(false);
        setOpenReason('');
        
        // Refresh data
        await fetchDayStatus();
        await fetchTransactionData();
      } else {
        setNotificationMessage('Day reopened, but response format was unexpected.');
        setNotificationType('warning');
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 5000);
        
        await fetchDayStatus();
      }
    } catch (error) {
      console.error('Error reopening day:', error);
      const errorMessage = error.response?.data?.message || 'Failed to reopen day. Please try again.';
      
      if (errorMessage.includes('not closed yet')) {
        setNotificationMessage('✅ Day is already open! You can add transactions normally.');
        setNotificationType('info');
        setShowDayOpenModal(false);
      } else {
        setNotificationMessage(errorMessage);
        setNotificationType('error');
      }
      
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);
      
      await fetchDayStatus();
    }
  };

  const getOrderStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'preparing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTableStatusColor = (status) => {
    switch (status) {
      case 'available':
      case 'empty': return 'bg-green-100 border-green-300 text-green-800';
      case 'occupied': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'ordering': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'dining': return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'payment_pending': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'completed': return 'bg-gray-100 border-gray-300 text-gray-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getTableStatusIcon = (status) => {
    switch (status) {
      case 'available':
      case 'empty': return '✅';
      case 'occupied': return '🟡';
      case 'ordering': return '📝';
      case 'dining': return '🍽️';
      case 'payment_pending': return '💳';
      case 'completed': return '🏁';
      default: return '❓';
    }
  };

  // Login handler
  // eslint-disable-next-line no-unused-vars
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${getApiUrl()}/api/staff/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginCredentials)
      });
      
      const data = await response.json();
      if (data.success) {
        localStorage.setItem('staffToken', data.token);
        setIsAuthenticated(true);
        setShowLogin(false);
      } else {
        alert('Login failed: ' + data.message);
      }
    } catch (error) {
      alert('Login error: ' + error.message);
    }
  };

  // Redirect to unified login if not authenticated
  if (!isAuthenticated) {
    window.location.href = '/admin?redirect=/reception';
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reception data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Modern Header */}
      <div className="bg-white/95 backdrop-blur-sm shadow-xl border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-4 lg:py-0 lg:h-20">
            <div className="flex items-center space-x-4 mb-4 lg:mb-0">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">🏨</span>
                </div>
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Reception Desk</h1>
                <p className="text-sm text-gray-600 font-medium">Food Zone Restaurant Management</p>
              </div>
            </div>
            
            <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-6">
              {/* New Order Notification Button */}
              <div className="relative mb-4 lg:mb-0">
                <button
                  onClick={() => {
                    // Play notification sound and show alert
                    try {
                      const audio = new Audio('/sounds/notification-bell.mp3');
                      audio.play().catch(e => console.log('Audio play failed:', e));
                    } catch (e) {
                      console.log('Audio not available');
                    }
                    alert(`🔔 New Orders Alert!\n\nActive Orders: ${activeOrders.length}\nCompleted Today: ${completedOrders.length}\n\nClick to refresh orders.`);
                    fetchAllOrders();
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <span className="text-lg">🔔</span>
                  <span>Orders</span>
                  {activeOrders.length > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 ml-1 animate-pulse">
                      {activeOrders.length}
                    </span>
                  )}
                </button>
                {activeOrders.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                )}
              </div>

              {/* Day Close/Open Button */}
              {dayStatus.is_closed ? (
                <button
                  onClick={handleDayOpenClick}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium mb-4 lg:mb-0 shadow-lg hover:shadow-xl transform hover:scale-105 bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700"
                >
                  <span className="text-lg">🔓</span>
                  <span>Open Day</span>
                </button>
              ) : (
                <button
                  onClick={handleDayCloseClick}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium mb-4 lg:mb-0 shadow-lg hover:shadow-xl transform hover:scale-105 bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700"
                >
                  <span className="text-lg">🔚</span>
                  <span>Close Day</span>
                </button>
              )}

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium mb-4 lg:mb-0"
              >
                <span>🚪</span>
                <span>Logout</span>
              </button>
              
              {/* Install PWA Button */}
              {installPrompt && (
                <button
                  onClick={handleInstallPWA}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 mb-4 lg:mb-0"
                >
                  <span className="text-lg">📱</span>
                  <span>Install App</span>
                </button>
              )}
              
              <div className="text-center lg:text-right">
                <p className="text-sm font-semibold text-gray-900">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
                <p className="text-xs text-gray-500 font-medium">
                  {new Date().toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Daybook Management Dashboard */}
        <div className="mb-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              Financial Management Center
            </h2>
            <p className="text-gray-600 text-lg">Manage your daily operations with ease</p>
          </div>
          
          {/* Daybook Management Grid */}
          <div className="overflow-x-auto pb-4 mb-8">
            <div className="flex space-x-4 lg:grid lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 lg:space-x-0 lg:gap-4 xl:gap-6 min-w-max lg:min-w-0">
            {/* Opening Balance Card */}
            <div className="group flex-shrink-0 w-48 lg:w-auto">
              <button
                onClick={() => handleBalanceClick('opening')}
                className="w-full bg-white/80 backdrop-blur-sm hover:bg-white border border-gray-200/50 hover:border-green-300 rounded-2xl p-6 shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-green-50 group-hover:to-emerald-50"
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                    <span className="text-3xl">💰</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 group-hover:text-green-700 transition-colors">Opening Balance</h3>
                  <p className="text-xs text-gray-600 group-hover:text-green-600">Start your day</p>
                </div>
              </button>
            </div>

            {/* Closing Balance Card */}
            <div className="group flex-shrink-0 w-48 lg:w-auto">
              <button
                onClick={() => handleBalanceClick('closing')}
                className="w-full bg-white/80 backdrop-blur-sm hover:bg-white border border-gray-200/50 hover:border-orange-300 rounded-2xl p-6 shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-orange-50 group-hover:to-red-50"
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                    <span className="text-3xl">🏁</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 group-hover:text-orange-700 transition-colors">Closing Balance</h3>
                  <p className="text-xs text-gray-600 group-hover:text-orange-600">End your day</p>
                </div>
              </button>
            </div>

            {/* Cash Handover Card */}
            <div className="group flex-shrink-0 w-48 lg:w-auto">
              <button
                onClick={handleCashHandoverClick}
                className="w-full bg-white/80 backdrop-blur-sm hover:bg-white border border-gray-200/50 hover:border-blue-300 rounded-2xl p-6 shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-blue-50 group-hover:to-indigo-50"
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                    <span className="text-3xl">🤝</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">Cash Handover</h3>
                  <p className="text-xs text-gray-600 group-hover:text-blue-600">Transfer funds</p>
                </div>
              </button>
            </div>

            {/* Record Expense Card */}
            <div className="group flex-shrink-0 w-48 lg:w-auto">
              <button
                onClick={handleExpenseClick}
                className="w-full bg-white/80 backdrop-blur-sm hover:bg-white border border-gray-200/50 hover:border-pink-300 rounded-2xl p-6 shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-red-50 group-hover:to-pink-50"
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                    <span className="text-3xl">💸</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 group-hover:text-red-700 transition-colors">Record Expense</h3>
                  <p className="text-xs text-gray-600 group-hover:text-red-600">Track spending</p>
                </div>
              </button>
            </div>

            {/* Daily Report Card */}
            <div className="group flex-shrink-0 w-48 lg:w-auto">
              <button
                onClick={handleTransactionMonitorToggle}
                className="w-full bg-white/80 backdrop-blur-sm hover:bg-white border border-gray-200/50 hover:border-purple-300 rounded-2xl p-6 shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-purple-50 group-hover:to-violet-50"
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                    <span className="text-3xl">📊</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 group-hover:text-purple-700 transition-colors">Daily Report</h3>
                  <p className="text-xs text-gray-600 group-hover:text-purple-600">View analytics</p>
                </div>
              </button>
            </div>

            {/* Daybook Summary Card */}
            <div className="group flex-shrink-0 w-48 lg:w-auto">
              <button
                onClick={handleDaybookSummaryClick}
                className="w-full bg-white/80 backdrop-blur-sm hover:bg-white border border-gray-200/50 hover:border-teal-300 rounded-2xl p-6 shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-teal-50 group-hover:to-cyan-50"
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                    <span className="text-3xl">📋</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 group-hover:text-teal-700 transition-colors">Daybook Summary</h3>
                  <p className="text-xs text-gray-600 group-hover:text-teal-600">Full overview</p>
                </div>
              </button>
            </div>

            {/* Day Close Card */}
            <div className="group flex-shrink-0 w-48 lg:w-auto">
              <button
                onClick={handleDayCloseClick}
                disabled={dayStatus.is_closed}
                className={`w-full backdrop-blur-sm border rounded-2xl p-6 shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 ${
                  dayStatus.is_closed 
                    ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-60' 
                    : 'bg-white/80 hover:bg-white border-gray-200/50 hover:border-red-300 group-hover:bg-gradient-to-br group-hover:from-red-50 group-hover:to-pink-50'
                }`}
              >
                <div className="text-center">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg transition-shadow duration-300 ${
                    dayStatus.is_closed 
                      ? 'bg-gray-400' 
                      : 'bg-gradient-to-br from-red-500 to-pink-600 group-hover:shadow-xl'
                  }`}>
                    <span className="text-3xl">{dayStatus.is_closed ? '🔒' : '🔚'}</span>
                  </div>
                  <h3 className={`font-bold mb-2 transition-colors ${
                    dayStatus.is_closed 
                      ? 'text-gray-600' 
                      : 'text-gray-900 group-hover:text-red-700'
                  }`}>
                    {dayStatus.is_closed ? 'Day Closed' : 'Close Day'}
                  </h3>
                  <p className={`text-xs transition-colors ${
                    dayStatus.is_closed 
                      ? 'text-gray-500' 
                      : 'text-gray-600 group-hover:text-red-600'
                  }`}>
                    {dayStatus.is_closed ? 'Already closed' : 'End daily operations'}
                  </p>
                </div>
              </button>
            </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-200/50 p-6 mb-8">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-1 bg-gradient-to-r from-gray-100 to-gray-50 p-2 rounded-2xl shadow-inner">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 flex items-center justify-center px-6 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                activeTab === 'active'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl border-2 border-blue-300'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-white/80 hover:shadow-lg border-2 border-transparent'
              }`}
            >
              <span className="mr-2 text-xl">🔥</span>
              <span className="hidden sm:inline">Active Orders</span>
              <span className="sm:hidden">Active</span>
              {activeOrders.length > 0 && (
                <span className={`ml-2 px-3 py-1 rounded-full text-xs font-bold shadow-lg ${
                  activeTab === 'active' ? 'bg-white text-blue-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                }`}>
                  {activeOrders.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`flex-1 flex items-center justify-center px-6 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                activeTab === 'completed'
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-xl border-2 border-green-300'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-white/80 hover:shadow-lg border-2 border-transparent'
              }`}
            >
              <span className="mr-2 text-xl">✅</span>
              <span className="hidden sm:inline">Completed Orders</span>
              <span className="sm:hidden">Completed</span>
              {completedOrders.length > 0 && (
                <span className={`ml-2 px-3 py-1 rounded-full text-xs font-bold shadow-lg ${
                  activeTab === 'completed' ? 'bg-white text-green-600' : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                }`}>
                  {completedOrders.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('tables')}
              className={`flex-1 flex items-center justify-center px-6 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                activeTab === 'tables'
                  ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-xl border-2 border-purple-300'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-white/80 hover:shadow-lg border-2 border-transparent'
              }`}
            >
              <span className="mr-2 text-xl">🪑</span>
              <span className="hidden sm:inline">Tables & Reservations</span>
              <span className="sm:hidden">Tables</span>
              {tableStatuses.filter(t => t.status !== 'available').length > 0 && (
                <span className={`ml-2 px-3 py-1 rounded-full text-xs font-bold shadow-lg ${
                  activeTab === 'tables' ? 'bg-white text-purple-600' : 'bg-gradient-to-r from-purple-500 to-violet-600 text-white'
                }`}>
                  {tableStatuses.filter(t => t.status !== 'available').length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Active Orders Tab */}
        {activeTab === 'active' && (
          <div className="space-y-6">
            {activeOrders.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <div className="text-6xl mb-4">🔥</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Orders</h3>
                <p className="text-gray-500">Active orders will appear here as they come in</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {activeOrders.map((order) => (
                  <div key={order.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                    <div className={`px-6 py-4 ${
                      order.status === 'pending' ? 'bg-gradient-to-r from-yellow-500 to-amber-600' :
                      order.status === 'preparing' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                      'bg-gradient-to-r from-orange-500 to-orange-600'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold">
                              {order.order_type === 'dine-in' ? '🍽️' : '🚚'}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white">
                              {order.order_type === 'dine-in' ? `Table ${order.table_id}` : 'Delivery Order'}
                            </h3>
                            <p className="text-white text-opacity-90 text-sm">Order #{order.order_number || order.id}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="bg-white bg-opacity-20 px-3 py-1 rounded-full mb-2">
                            <span className="text-white font-bold text-lg">{formatCurrency(order.total)}</span>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getOrderStatusColor(order.status)}`}>
                            {order.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <span className="mr-2">👤</span>
                            Customer Details
                          </h4>
                          <div className="space-y-2 text-sm">
                            <p><span className="font-medium">Name:</span> {order.customer_name}</p>
                            <p><span className="font-medium">Phone:</span> {order.customer_phone}</p>
                            {order.delivery_address && (
                              <p><span className="font-medium">Address:</span> {order.delivery_address}</p>
                            )}
                            <p><span className="font-medium">Ordered:</span> {formatDate(order.created_at)}</p>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <span className="mr-2">🍽️</span>
                            Order Items ({order.items?.length || 0})
                          </h4>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {order.items && order.items.length > 0 ? (
                              order.items.map((item, index) => (
                                <div key={index} className="flex justify-between text-sm bg-gray-50 rounded-lg p-2">
                                  <span>{item.menu_item_name || item.item_name || item.name || 'Unknown Item'} x{item.quantity}</span>
                                  <span className="font-medium">{formatCurrency(item.subtotal || item.price * item.quantity)}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-500">No items</p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getOrderStatusColor(order.status)}`}>
                              {order.status === 'pending' && '⏳ Pending'}
                              {order.status === 'preparing' && '🔥 Preparing'}
                              {order.status === 'ready' && '🍽️ Ready'}
                            </span>
                            {order.payment_method && (
                              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                💳 {order.payment_method}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => handlePrintOrder(order)}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
                            >
                              <span>🖨️</span>
                              <span>Print</span>
                            </button>
                            <div className="text-right">
                              <p className="text-sm text-gray-500">Total Amount</p>
                              <p className="text-lg font-bold text-gray-900">{formatCurrency(order.total)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Completed Orders Tab */}
        {activeTab === 'completed' && (
          <div className="space-y-6">
            {completedOrders.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Completed Orders Today</h3>
                <p className="text-gray-500">Completed orders will appear here for today's service</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {completedOrders.map((order) => (
                  <div key={order.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold">
                              {order.order_type === 'dine-in' ? '🍽️' : '🚚'}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white">
                              {order.order_type === 'dine-in' ? `Table ${order.table_id}` : 'Delivery Order'}
                            </h3>
                            <p className="text-green-100 text-sm">Order #{order.order_number || order.id}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
                            <span className="text-white font-bold text-lg">{formatCurrency(order.total)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <span className="mr-2">👤</span>
                            Customer Details
                          </h4>
                          <div className="space-y-2 text-sm">
                            <p><span className="font-medium">Name:</span> {order.customer_name}</p>
                            <p><span className="font-medium">Phone:</span> {order.customer_phone}</p>
                            {order.delivery_address && (
                              <p><span className="font-medium">Address:</span> {order.delivery_address}</p>
                            )}
                            <p><span className="font-medium">Completed:</span> {formatDate(order.created_at)}</p>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <span className="mr-2">🍽️</span>
                            Order Items ({order.items?.length || 0})
                          </h4>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {order.items && order.items.length > 0 ? (
                              order.items.map((item, index) => (
                                <div key={index} className="flex justify-between text-sm bg-gray-50 rounded-lg p-2">
                                  <span>{item.menu_item_name || item.item_name || item.name || 'Unknown Item'} x{item.quantity}</span>
                                  <span className="font-medium">{formatCurrency(item.subtotal || item.price * item.quantity)}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-500">No items</p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                              ✅ Completed
                            </span>
                            {order.payment_status === 'paid' ? (
                              <div className="flex items-center space-x-2">
                                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                  {order.payment_method === 'cash' && '💵 Cash Payment'}
                                  {order.payment_method === 'digital' && '📱 PhonePe Payment'}
                                  {order.payment_method === 'phonepe' && '📱 PhonePe Payment'}
                                  {order.payment_method === 'card' && '💳 Card Payment'}
                                  {!order.payment_method && '💰 Paid'}
                                </span>
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                  NPR {parseFloat(order.total || order.total_amount || 0).toFixed(0)}
                                </span>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('Button clicked - event:', e);
                                  handlePaymentClick(order);
                                }}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 shadow-sm"
                                style={{ cursor: 'pointer' }}
                              >
                                💳 Process Payment
                              </button>
                            )}
                          </div>
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => handlePrintOrder(order)}
                              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
                            >
                              <span>🖨️</span>
                              <span>Print</span>
                            </button>
                            <div className="text-right">
                              <p className="text-sm text-gray-500">Total Amount</p>
                              <p className="text-lg font-bold text-gray-900">{formatCurrency(order.total)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tables & Reservations Tab */}
        {activeTab === 'tables' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Table Status Overview</h2>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => {
                      console.log('🔄 Manual refresh clicked');
                      fetchTableStatuses();
                    }}
                    className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    🔄 Refresh
                  </button>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Available</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span>Occupied</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span>Ordering</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span>Dining</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: tableCount }, (_, i) => i + 1).map((tableNumber) => {
                  const tableStatus = tableStatuses.find(t => t.table_id === tableNumber) || { status: 'available' };
                  // eslint-disable-next-line no-unused-vars
                  const isClearing = clearingTable === tableNumber;
                  
                  // Debug logging for first few tables
                  if (tableNumber <= 5) {
                    console.log(`🔍 Table ${tableNumber}:`, {
                      found: tableStatuses.find(t => t.table_id === tableNumber),
                      status: tableStatus.status,
                      allTableStatuses: tableStatuses.map(t => ({ id: t.table_id, status: t.status }))
                    });
                  }
                  
                  return (
                    <div
                      key={tableNumber}
                      onClick={() => {
                        if (tableStatus.status !== 'available' && tableStatus.status !== 'empty') {
                          handleViewTableDetails(tableStatus);
                        }
                      }}
                      className={`relative border-2 rounded-xl p-4 text-center transition-all duration-200 hover:shadow-md ${
                        tableStatus.status !== 'available' && tableStatus.status !== 'empty' 
                          ? 'cursor-pointer hover:scale-105' 
                          : ''
                      } ${getTableStatusColor(tableStatus.status)}`}
                    >
                      <div className="text-2xl mb-2">{getTableStatusIcon(tableStatus.status)}</div>
                      <div className="font-bold text-lg mb-1">Table {tableNumber}</div>
                      <div className="text-xs capitalize mb-3">
                        {tableStatus.status === 'empty' ? 'available' : tableStatus.status.replace('_', ' ')}
                      </div>
                      
                      {tableStatus.customer_name && (
                        <div className="text-xs mb-2">
                          <p className="font-medium">{tableStatus.customer_name}</p>
                          {tableStatus.total_amount > 0 && (
                            <p className="text-gray-600">{formatCurrency(tableStatus.total_amount)}</p>
                          )}
                        </div>
                      )}
                      
                      {tableStatus.status !== 'available' && tableStatus.status !== 'empty' && (
                        <div className="text-xs text-gray-500 mt-2">
                          Click to view details
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <ReceptionPayment
                order={selectedOrder}
                onPaymentComplete={handlePaymentComplete}
                onCancel={handlePaymentCancel}
              />
            </div>
          </div>
        )}

        {/* Table Details Modal */}
        {showTableDetailsModal && selectedTableDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Table {selectedTableDetails.table_id} Details
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedTableDetails.customer_name && `Customer: ${selectedTableDetails.customer_name}`}
                    {selectedTableDetails.customer_phone && ` • ${selectedTableDetails.customer_phone}`}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowTableDetailsModal(false);
                    setSelectedTableDetails(null);
                  }}
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
                      {selectedTableDetails.status.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-lg font-semibold text-blue-600">
                      {formatCurrency(selectedTableDetails.total_amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Active Orders</p>
                    <p className="text-lg font-semibold">
                      {selectedTableDetails.order_count || selectedTableDetails.orders?.length || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Time Occupied</p>
                    <p className="text-lg font-semibold">
                      {selectedTableDetails.hours_occupied 
                        ? `${selectedTableDetails.hours_occupied.toFixed(1)} hrs` 
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Orders List */}
              <div className="space-y-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Orders</h3>
                {selectedTableDetails.orders && selectedTableDetails.orders.length > 0 ? (
                  selectedTableDetails.orders.map((order, orderIndex) => (
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
                          {formatCurrency(order.total)}
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
                                  {formatCurrency(item.subtotal || (item.price * item.quantity))}
                                </p>
                                <p className="text-xs text-gray-500">
                                  @ {formatCurrency(item.price)}
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
                  onClick={() => {
                    setShowTableDetailsModal(false);
                    setSelectedTableDetails(null);
                  }}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => handleClearTable(selectedTableDetails.table_id)}
                  disabled={clearingTable === selectedTableDetails.table_id}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 transition-colors font-medium"
                >
                  {clearingTable === selectedTableDetails.table_id ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Clearing...
                    </span>
                  ) : (
                    '🧹 Clear Table'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Balance Modal */}
        {showBalanceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">{balanceType === 'opening' ? '💰' : '🏁'}</div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {balanceType === 'opening' ? 'Opening Balance' : 'Closing Balance'}
                </h3>
                <p className="text-gray-600 mt-2">Count cash denominations</p>
              </div>

              {/* Cash Denomination Counter */}
              <div className="space-y-4 mb-6">
                {Object.entries(cashDenominations).map(([denomination, count]) => (
                  <div key={denomination} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-8 bg-green-600 text-white rounded flex items-center justify-center font-bold text-sm">
                        {denomination}
                      </div>
                      <span className="font-medium">NPR {denomination} Notes</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleDenominationChange(denomination, Math.max(0, count - 1))}
                        className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={count}
                        onChange={(e) => handleDenominationChange(denomination, e.target.value)}
                        className="w-16 text-center border border-gray-300 rounded px-2 py-1"
                        min="0"
                      />
                      <button
                        onClick={() => handleDenominationChange(denomination, count + 1)}
                        className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-colors"
                      >
                        +
                      </button>
                      <div className="w-20 text-right font-medium">
                        NPR {(parseInt(denomination) * count).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Balance */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-blue-900">Total Balance:</span>
                  <span className="text-2xl font-bold text-blue-600">NPR {totalBalance.toLocaleString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleBalanceCancel}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBalanceSubmit}
                  onMouseDown={(e) => e.preventDefault()}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                  style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                >
                  Record {balanceType === 'opening' ? 'Opening' : 'Closing'} Balance
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Notification */}
        {showNotification && (
          <div className="fixed top-4 right-4 z-[60] max-w-sm">
            <div className={`p-4 rounded-lg shadow-lg ${
              notificationType === 'success' 
                ? 'bg-green-500 text-white' 
                : 'bg-red-500 text-white'
            } animate-slide-in`}>
              <div className="flex items-center space-x-2">
                <div className="text-xl">
                  {notificationType === 'success' ? '✅' : '❌'}
                </div>
                <div className="flex-1 text-sm font-medium">
                  {notificationMessage}
                </div>
                <button
                  onClick={() => setShowNotification(false)}
                  className="text-white hover:text-gray-200 text-lg font-bold"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Expense Modal */}
        {showExpenseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">💸</div>
                <h3 className="text-xl font-semibold text-gray-900">Record Expense</h3>
                <p className="text-gray-600 mt-2">Enter expense details</p>
              </div>

              <div className="space-y-4 mb-6">
                {/* Expense Cause */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expense Cause
                  </label>
                  <input
                    type="text"
                    value={expenseCause}
                    onChange={(e) => setExpenseCause(e.target.value)}
                    placeholder="e.g., Office supplies, Maintenance, Utilities"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                {/* Expense Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (NPR)
                  </label>
                  <input
                    type="number"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              {/* Preview */}
              {expenseCause && expenseAmount && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-red-800">Expense Preview:</p>
                      <p className="text-red-700">{expenseCause}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">NPR {parseFloat(expenseAmount || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleExpenseCancel}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExpenseSubmit}
                  disabled={!expenseCause.trim() || !expenseAmount || parseFloat(expenseAmount) <= 0}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Record Expense
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cash Handover Modal */}
        {showCashHandoverModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">🤝</div>
                <h3 className="text-xl font-semibold text-gray-900">Cash Handover</h3>
                <p className="text-gray-600 mt-2">Record cash handover transaction</p>
              </div>

              <div className="space-y-4 mb-6">
                {/* Handover To */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Handover To (Recipient)
                  </label>
                  <input
                    type="text"
                    value={handoverTo}
                    onChange={(e) => setHandoverTo(e.target.value)}
                    placeholder="e.g., Manager, Shift Leader, Staff Name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Handover Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (NPR)
                  </label>
                  <input
                    type="number"
                    value={handoverAmount}
                    onChange={(e) => setHandoverAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Handover Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason (Optional)
                  </label>
                  <input
                    type="text"
                    value={handoverReason}
                    onChange={(e) => setHandoverReason(e.target.value)}
                    placeholder="e.g., End of shift, Emergency, Deposit"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Preview */}
              {handoverTo && handoverAmount && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-blue-800">Handover Preview:</p>
                      <p className="text-blue-700">To: {handoverTo}</p>
                      {handoverReason && <p className="text-blue-600 text-sm">{handoverReason}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">NPR {parseFloat(handoverAmount || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleCashHandoverCancel}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCashHandoverSubmit}
                  disabled={!handoverTo.trim() || !handoverAmount || parseFloat(handoverAmount) <= 0}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Record Handover
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Daybook Summary Modal */}
        {showDaybookSummaryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">📋</div>
                <h3 className="text-xl font-semibold text-gray-900">Daybook Summary</h3>
                <p className="text-gray-600 mt-2">Complete financial overview</p>
              </div>

              {/* Date Selector */}
              <div className="mb-6 flex justify-center">
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-gray-700">Select Date:</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={() => fetchDaybookData(selectedDate)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>

              {daybookData && (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-600">Opening Balance</p>
                          <p className="text-2xl font-bold text-green-900">NPR {(daybookData.opening_balance || 0).toLocaleString()}</p>
                        </div>
                        <div className="text-2xl">💰</div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-600">Total Income</p>
                          <p className="text-2xl font-bold text-blue-900">NPR {(daybookData.total_income || 0).toLocaleString()}</p>
                        </div>
                        <div className="text-2xl">📈</div>
                      </div>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-red-600">Total Expenses</p>
                          <p className="text-2xl font-bold text-red-900">NPR {(daybookData.expenses || 0).toLocaleString()}</p>
                        </div>
                        <div className="text-2xl">💸</div>
                      </div>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-purple-600">Net Balance</p>
                          <p className="text-2xl font-bold text-purple-900">NPR {(daybookData.calculated_closing_balance || 0).toLocaleString()}</p>
                        </div>
                        <div className="text-2xl">🏁</div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <div className="text-center">
                        <div className="text-2xl mb-2">💵</div>
                        <p className="text-sm font-medium text-emerald-600">Cash Payments</p>
                        <p className="text-xl font-bold text-emerald-900">NPR {(daybookData.cash_payments || 0).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                      <div className="text-center">
                        <div className="text-2xl mb-2">📱</div>
                        <p className="text-sm font-medium text-cyan-600">Online Payments</p>
                        <p className="text-xl font-bold text-cyan-900">NPR {(daybookData.online_payments || 0).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                      <div className="text-center">
                        <div className="text-2xl mb-2">💳</div>
                        <p className="text-sm font-medium text-indigo-600">Card Payments</p>
                        <p className="text-xl font-bold text-indigo-900">NPR {(daybookData.card_payments || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Recent Transactions */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">All Transactions for {selectedDate}</h4>
                    <div className="bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
                      {daybookData.transactions && daybookData.transactions.length > 0 ? (
                        <div className="divide-y divide-gray-200">
                          {daybookData.transactions.map((transaction, index) => (
                            <div key={index} className="p-4 flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="text-lg">
                                  {transaction.transaction_type === 'cash_payment' ? '💵' : 
                                   transaction.transaction_type === 'online_payment' ? '📱' : 
                                   transaction.transaction_type === 'card_payment' ? '💳' : 
                                   transaction.transaction_type === 'opening_balance' ? '💰' : 
                                   transaction.transaction_type === 'closing_balance' ? '🏁' : 
                                   transaction.transaction_type === 'cash_handover' ? '🤝' : 
                                   transaction.transaction_type === 'expense' ? '💸' : '📊'}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{transaction.description || 'Transaction'}</p>
                                  <p className="text-sm text-gray-500">
                                    {new Date(transaction.created_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`font-bold ${
                                  transaction.transaction_type === 'expense' || transaction.transaction_type === 'cash_handover'
                                    ? 'text-red-600' : 'text-green-600'
                                }`}>
                                  {transaction.transaction_type === 'expense' || transaction.transaction_type === 'cash_handover' ? '-' : '+'}NPR {Math.abs(transaction.amount).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-gray-500">
                          <div className="text-4xl mb-2">📋</div>
                          <p>No transactions found for this date</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowDaybookSummaryModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Day Close Modal */}
        {showDayCloseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="text-center mb-6">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-4xl">🔚</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Close Day</h2>
                <p className="text-gray-600 mt-2">End daily operations and set closing balance</p>
              </div>

              {dayStatus.is_closed ? (
                <div className="text-center p-8">
                  <div className="text-6xl mb-4">🔒</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Day Already Closed</h3>
                  <p className="text-gray-600">This day has already been closed. You cannot close it again.</p>
                  <div className="mt-6">
                    <button
                      onClick={() => setShowDayCloseModal(false)}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Current Day Summary */}
                  {daybookData && (
                    <div className="bg-gray-50 rounded-xl p-4 mb-6">
                      <h3 className="font-bold text-gray-900 mb-4">Today's Summary</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="text-center">
                          <p className="text-gray-600">Opening Balance</p>
                          <p className="font-bold text-green-600">Rs.{(daybookData.opening_balance || 0).toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-600">Cash Sales</p>
                          <p className="font-bold text-blue-600">Rs.{(daybookData.cash_payments || 0).toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-600">Total Expenses</p>
                          <p className="font-bold text-red-600">Rs.{(daybookData.expenses || 0).toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-600">Expected Closing</p>
                          <p className="font-bold text-purple-600">Rs.{(
                            (daybookData.opening_balance || 0) + 
                            (daybookData.cash_payments || 0) - 
                            (daybookData.expenses || 0)
                          ).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Day Close Form */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Actual Closing Balance <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={closingBalance}
                        onChange={(e) => setClosingBalance(e.target.value)}
                        placeholder="Enter actual cash amount"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cash Count Details (Optional)
                      </label>
                      <input
                        type="text"
                        value={cashCount}
                        onChange={(e) => setCashCount(e.target.value)}
                        placeholder="e.g., 10x1000, 5x500, 20x100..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes (Optional)
                      </label>
                      <textarea
                        value={dayCloseNotes}
                        onChange={(e) => setDayCloseNotes(e.target.value)}
                        placeholder="Any additional notes about the day..."
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3 mt-6">
                    <button
                      onClick={() => setShowDayCloseModal(false)}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDayClose}
                      disabled={!closingBalance}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Close Day
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Day Open Modal */}
        {showDayOpenModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4">
              <div className="text-center mb-6">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-4xl">🔓</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Open Day</h2>
                <p className="text-gray-600 mt-2">Reopen today for additional transactions</p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <h3 className="font-bold text-yellow-800 mb-1">Important Notice</h3>
                    <p className="text-sm text-yellow-700">
                      Opening a closed day will allow you to add more transactions. 
                      You'll need to close the day again when finished.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Reopening (Optional)
                  </label>
                  <textarea
                    value={openReason}
                    onChange={(e) => setOpenReason(e.target.value)}
                    placeholder="e.g., Late transaction, correction needed, additional sale..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowDayOpenModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDayOpen}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Open Day
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Monitor Modal */}
        {showTransactionMonitor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">📊</div>
                <h3 className="text-xl font-semibold text-gray-900">Transaction Monitor</h3>
                <p className="text-gray-600 mt-2">Real-time financial tracking</p>
              </div>

              {/* Daily Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Cash Payments</p>
                      <p className="text-2xl font-bold text-green-900">NPR {dailySummary.totalCash.toLocaleString()}</p>
                    </div>
                    <div className="text-2xl">💵</div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Online Payments</p>
                      <p className="text-2xl font-bold text-blue-900">NPR {dailySummary.totalOnline.toLocaleString()}</p>
                    </div>
                    <div className="text-2xl">📱</div>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600">Card Payments</p>
                      <p className="text-2xl font-bold text-purple-900">NPR {dailySummary.totalCard.toLocaleString()}</p>
                    </div>
                    <div className="text-2xl">💳</div>
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-600">Total Transactions</p>
                      <p className="text-2xl font-bold text-orange-900">{dailySummary.transactionCount}</p>
                    </div>
                    <div className="text-2xl">📈</div>
                  </div>
                </div>
              </div>

              {/* Total Revenue */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6 mb-6">
                <div className="text-center">
                  <p className="text-lg font-medium text-indigo-600 mb-2">Total Daily Revenue</p>
                  <p className="text-4xl font-bold text-indigo-900">
                    NPR {(dailySummary.totalCash + dailySummary.totalOnline + dailySummary.totalCard).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h4>
                <div className="bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
                  {recentTransactions.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                      {recentTransactions.map((transaction, index) => (
                        <div key={index} className="p-4 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="text-lg">
                              {transaction.transaction_type === 'cash_payment' ? '💵' : 
                               transaction.transaction_type === 'online_payment' ? '📱' : 
                               transaction.transaction_type === 'card_payment' ? '💳' : 
                               transaction.transaction_type === 'opening_balance' ? '💰' : 
                               transaction.transaction_type === 'closing_balance' ? '🏁' : '📊'}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{transaction.description || 'Transaction'}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(transaction.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              NPR {Math.abs(transaction.amount).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <div className="text-4xl mb-2">📊</div>
                      <p>No recent transactions found</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={fetchTransactionData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  🔄 Refresh Data
                </button>
                <button
                  onClick={() => setShowTransactionMonitor(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reception;