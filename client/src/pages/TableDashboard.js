import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchApi } from '../services/apiService';
import PaymentQRModal from '../components/PaymentQRModal';
import './TableDashboard.css';

const TableDashboard = () => {
  const { tableId } = useParams();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTableOrders();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchTableOrders, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId]);

  // Listen for table cleared events via socket
  useEffect(() => {
    // Import socket if available
    const setupSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        const socket = io(window.location.origin);
        
        socket.on('tableCleared', (data) => {
          if (data.tableId === parseInt(tableId)) {
            console.log('🔔 Table cleared event received, refreshing orders');
            fetchTableOrders(false);
          }
        });

        socket.on('tableStatusUpdated', (data) => {
          if (data.tableId === parseInt(tableId)) {
            console.log('🔔 Table status updated, refreshing orders');
            fetchTableOrders(false);
          }
        });

        return () => {
          socket.disconnect();
        };
      } catch (err) {
        console.log('Socket.io not available, using polling only');
      }
    };

    setupSocket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId]);

  const fetchTableOrders = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      else setRefreshing(true);
      
      const response = await fetchApi.get(`/api/orders/table/${tableId}`);
      
      if (response && Array.isArray(response)) {
        // Sort by created_at descending (newest first)
        const sortedOrders = response.sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        );
        setOrders(sortedOrders);
      } else {
        setOrders([]);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching table orders:', err);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePayNow = (order) => {
    setSelectedOrder(order);
    setShowPaymentModal(true);
  };

  const handlePayTotal = () => {
    // Create a combined order object for all pending orders
    const pendingOrders = orders.filter(order => order.payment_status === 'pending');
    if (pendingOrders.length === 0) return;

    const combinedOrder = {
      id: 'combined',
      total: getPendingAmount(),
      items: pendingOrders.flatMap(order => order.items || []),
      order_ids: pendingOrders.map(order => order.id)
    };

    setSelectedOrder(combinedOrder);
    setShowPaymentModal(true);
  };

  const handlePaymentComplete = () => {
    setShowPaymentModal(false);
    setSelectedOrder(null);
    fetchTableOrders(false);
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'confirmed': 'bg-blue-100 text-blue-800 border-blue-300',
      'preparing': 'bg-purple-100 text-purple-800 border-purple-300',
      'ready': 'bg-green-100 text-green-800 border-green-300',
      'served': 'bg-teal-100 text-teal-800 border-teal-300',
      'completed': 'bg-gray-100 text-gray-800 border-gray-300',
      'cancelled': 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      'pending': 'bg-orange-100 text-orange-800 border-orange-300',
      'paid': 'bg-green-100 text-green-800 border-green-300',
      'failed': 'bg-red-100 text-red-800 border-red-300',
      'refunded': 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  // eslint-disable-next-line no-unused-vars
  const getTotalAmount = () => {
    return orders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
  };

  const getPendingAmount = () => {
    return orders
      .filter(order => order.payment_status === 'pending')
      .reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
        <p className="mt-4 text-slate-600 text-sm">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-50 overflow-hidden">
      {/* Desktop wrapper with max-width */}
      <div className="flex-1 flex flex-col mx-auto w-full max-w-2xl bg-white shadow-xl">
        {/* Header */}
        <header className="shrink-0 bg-white border-b border-slate-200 shadow-sm">
        <div className="px-4 py-3 pt-safe">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => navigate(`/${tableId}`)}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
            >
              <span className="text-xl">←</span>
              <span className="text-sm font-semibold">Back to Menu</span>
            </button>
            
            <button
              onClick={() => fetchTableOrders(false)}
              disabled={refreshing}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold disabled:opacity-50"
            >
              <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
              <span>Refresh</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white font-bold text-lg shadow">
              {tableId}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Table {tableId}</h1>
              <p className="text-sm text-slate-600">Orders & Payment</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {orders.length > 0 && (
          <div className="px-4 pb-3 grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
              <div className="text-xs text-blue-600 font-semibold mb-1">Total Orders</div>
              <div className="text-2xl font-bold text-blue-800">{orders.length}</div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 border border-orange-200">
              <div className="text-xs text-orange-600 font-semibold mb-1">Pending Payment</div>
              <div className="text-2xl font-bold text-orange-800">NPR {getPendingAmount()}</div>
            </div>
          </div>
        )}
      </header>

      {/* Orders List */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Pay Total Button - Shows when multiple pending orders exist */}
        {orders.filter(order => order.payment_status === 'pending').length > 1 && (
          <div className="mb-4 bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-300 rounded-xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-semibold text-orange-800 mb-1">
                  💰 Pay All Pending Orders
                </div>
                <div className="text-xs text-orange-600">
                  {orders.filter(order => order.payment_status === 'pending').length} orders pending payment
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-orange-800">
                  NPR {getPendingAmount().toFixed(2)}
                </div>
              </div>
            </div>
            <button
              onClick={handlePayTotal}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-bold text-base shadow-lg active:scale-[0.98] transition flex items-center justify-center gap-2"
            >
              <span className="text-xl">📱</span>
              <span>Pay Total with QR Code</span>
            </button>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">No Orders Yet</h3>
            <p className="text-slate-600 mb-4">Start by ordering from the menu</p>
            <button
              onClick={() => navigate(`/${tableId}`)}
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold shadow"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Order Header */}
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">
                        Order #{order.order_number || order.id}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {formatDate(order.created_at)} · {formatTime(order.created_at)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getPaymentStatusColor(order.payment_status)}`}>
                      💳 {order.payment_status === 'paid' ? 'Paid' : 'Payment Pending'}
                    </span>
                    <span className="text-lg font-bold text-orange-600">
                      NPR {parseFloat(order.total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Order Items */}
                <div className="px-4 py-3">
                  <div className="text-xs font-semibold text-slate-600 mb-2">Items:</div>
                  <ul className="space-y-1.5">
                    {order.items && Array.isArray(order.items) && order.items.map((item, idx) => (
                      <li key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">
                          <span className="font-semibold">{item.quantity}×</span> {item.name}
                        </span>
                        <span className="text-slate-600 font-medium">
                          NPR {(item.price * item.quantity).toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Subtotal and Discount */}
                  {order.subtotal && (
                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-1 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal:</span>
                        <span>NPR {parseFloat(order.subtotal || 0).toFixed(2)}</span>
                      </div>
                      {order.discount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount:</span>
                          <span>- NPR {parseFloat(order.discount || 0).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Payment Action */}
                {order.payment_status === 'pending' && order.status !== 'cancelled' && (
                  <div className="px-4 pb-3">
                    <button
                      onClick={() => handlePayNow(order)}
                      className="w-full py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-semibold text-sm shadow active:scale-[0.99] transition flex items-center justify-center gap-2"
                    >
                      <span>📱</span>
                      <span>Pay with QR Code</span>
                    </button>
                  </div>
                )}

                {order.payment_status === 'paid' && (
                  <div className="px-4 pb-3">
                    <div className="flex items-center justify-center gap-2 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-semibold">
                      <span>✅</span>
                      <span>Payment Completed</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Payment QR Modal */}
      {showPaymentModal && selectedOrder && (
        <PaymentQRModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedOrder(null);
          }}
          paymentMethod="esewa"
          amount={parseFloat(selectedOrder.total || 0)}
          tableId={parseInt(tableId)}
          orderIds={selectedOrder.id === 'combined' ? selectedOrder.order_ids : [selectedOrder.id]}
          onPaymentComplete={handlePaymentComplete}
        />
      )}
      </div> {/* End desktop wrapper */}
    </div>
  );
};

export default TableDashboard;
