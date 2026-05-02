import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchApi } from '../services/apiService';
import io from 'socket.io-client';
import { getSocketUrl } from '../config/api';

const TableSessionDashboard = () => {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    fetchSessionData();
    
    // Socket connection for real-time updates
    const socket = io(getSocketUrl());
    
    socket.on('tableStatusUpdate', (data) => {
      if (data.tableId === parseInt(tableId)) {
        fetchSessionData();
      }
    });
    
    socket.on('paymentCompleted', (data) => {
      if (data.tableId === parseInt(tableId)) {
        fetchSessionData();
        alert('✅ Payment completed successfully!');
      }
    });
    
    socket.on('tableCleared', (data) => {
      if (data.tableId === parseInt(tableId)) {
        alert('🍽️ Your table session has been cleared by restaurant staff.');
        navigate('/');
      }
    });

    return () => socket.disconnect();
  }, [tableId, navigate]);

  const fetchSessionData = async () => {
    try {
      // Get active session
      const sessionData = await fetchApi.get(`/api/tables/${tableId}/session`);
      setSession(sessionData);

      // Get orders for this table
      const ordersData = await fetchApi.get(`/api/orders?tableId=${tableId}&status=active`);
      setOrders(ordersData);

      // Get payments for this session
      const paymentsData = await fetchApi.get(`/api/tables/${tableId}/payments`);
      setPayments(paymentsData);
    } catch (error) {
      console.error('Error fetching session data:', error);
    } finally {
      setLoading(false);
    }
  };

  const initiatePayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    try {
      await fetchApi.post(`/api/tables/${tableId}/payment`, {
        amount: totalAmount,
        payment_method: paymentMethod,
        customer_name: session.customer_name,
        customer_phone: session.customer_phone
      });
      
      alert('Payment processed successfully!');
      setShowPayment(false);
      setPaymentAmount('');
      fetchSessionData();
    } catch (error) {
      console.error('❌ Error initiating payment:', error);
      alert(`❌ Payment failed: ${error.message}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'occupied': return 'bg-yellow-100 text-yellow-800';
      case 'ordering': return 'bg-blue-100 text-blue-800';
      case 'dining': return 'bg-purple-100 text-purple-800';
      case 'payment_pending': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getTotalOrderAmount = () => {
    return orders.reduce((sum, order) => sum + order.total, 0);
  };

  const getTotalPaid = () => {
    return payments
      .filter(p => p.payment_status === 'completed')
      .reduce((sum, payment) => sum + payment.amount, 0);
  };

  const getRemainingBalance = () => {
    return getTotalOrderAmount() - getTotalPaid();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your table session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🍽️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">No Active Session</h1>
          <p className="text-gray-600 mb-4">Table {tableId} is not currently occupied.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">🍽️ Table {tableId}</h1>
              <p className="text-gray-600">Welcome, {session.customer_name}!</p>
            </div>
            <div className="text-right">
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(session.status)}`}>
                {session.status.replace('_', ' ').toUpperCase()}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Since: {formatDateTime(session.session_start)}
              </p>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-2xl font-bold text-blue-600">${getTotalOrderAmount().toFixed(2)}</div>
            <div className="text-sm text-gray-600">Total Orders</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-2xl font-bold text-green-600">${getTotalPaid().toFixed(2)}</div>
            <div className="text-sm text-gray-600">Total Paid</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-2xl font-bold text-orange-600">${getRemainingBalance().toFixed(2)}</div>
            <div className="text-sm text-gray-600">Remaining Balance</div>
          </div>
        </div>

        {/* Orders History */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">📋 Your Orders</h2>
          {orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🍽️</div>
              <p>No orders yet. Start by browsing our menu!</p>
              <button
                onClick={() => navigate(`/table/${tableId}`)}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Menu
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">Order #{order.order_number}</div>
                      <div className="text-sm text-gray-500">{formatDateTime(order.created_at)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">${order.total}</div>
                      <div className={`text-sm px-2 py-1 rounded ${
                        order.status === 'completed' ? 'bg-green-100 text-green-800' :
                        order.status === 'preparing' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {order.status.toUpperCase()}
                      </div>
                    </div>
                  </div>
                  
                  {/* Order Items */}
                  <div className="text-sm text-gray-600">
                    {order.items && order.items.map((item, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{item.quantity}x {item.name}</span>
                        <span>${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Section */}
        {getRemainingBalance() > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">💳 Payment</h2>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-lg">Outstanding Balance: <strong>${getRemainingBalance().toFixed(2)}</strong></p>
                <p className="text-sm text-gray-600">Pay directly from your mobile device</p>
              </div>
              <button
                onClick={() => setShowPayment(true)}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                💳 Pay Now
              </button>
            </div>
          </div>
        )}

        {/* Payment History */}
        {payments.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-xl font-bold mb-4">💰 Payment History</h2>
            <div className="space-y-3">
              {payments.map((payment) => (
                <div key={payment.id} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <div className="font-medium">${payment.amount}</div>
                    <div className="text-sm text-gray-500">{formatDateTime(payment.created_at)}</div>
                  </div>
                  <div className={`px-2 py-1 rounded text-sm ${
                    payment.payment_status === 'completed' ? 'bg-green-100 text-green-800' :
                    payment.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {payment.payment_status.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">💳 Mobile Payment</h3>
              <button
                onClick={() => setShowPayment(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={`Max: $${getRemainingBalance().toFixed(2)}`}
                  max={getRemainingBalance()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Outstanding Balance:</span>
                    <span>${getRemainingBalance().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowPayment(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={initiatePayment}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Pay ${paymentAmount || '0.00'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableSessionDashboard;
