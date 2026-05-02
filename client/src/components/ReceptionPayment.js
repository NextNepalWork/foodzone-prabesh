import React, { useState, useEffect } from 'react';
import { fetchApi, apiService } from '../services/apiService';
import API_CONFIG from '../config/api';

const ReceptionPayment = ({ order, onPaymentComplete, onCancel }) => {
  const [paymentMethod, setPaymentMethod] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amountReceived, setAmountReceived] = useState('');
  const [changeGiven, setChangeGiven] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  
  // Opening balance states
  // eslint-disable-next-line no-unused-vars
  const [showOpeningBalance, setShowOpeningBalance] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [openingBalanceProcessing, setOpeningBalanceProcessing] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [daybookSummary, setDaybookSummary] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [loadingSummary, setLoadingSummary] = useState(true);

  // Expense states
  // eslint-disable-next-line no-unused-vars
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseCause, setExpenseCause] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [expenseProcessing, setExpenseProcessing] = useState(false);

  const orderTotal = parseFloat(order.total || order.total_amount || 0);
  const today = new Date().toISOString().split('T')[0];

  // Load daybook summary on component mount
  useEffect(() => {
    loadDaybookSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDaybookSummary = async () => {
    try {
      setLoadingSummary(true);
      const response = await fetchApi.get(`${API_CONFIG.ENDPOINTS.DAYBOOK_SUMMARY}?date=${today}`);
      setDaybookSummary(response.data || response);
    } catch (error) {
      console.error('Failed to load daybook summary:', error);
    } finally {
      setLoadingSummary(false);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleOpeningBalance = async () => {
    if (!openingBalance || parseFloat(openingBalance) <= 0) {
      setError('Please enter a valid opening balance amount');
      return;
    }

    setOpeningBalanceProcessing(true);
    setError('');

    try {
      const transactionData = {
        transaction_type: 'opening_balance',
        amount: parseFloat(openingBalance),
        description: `Opening balance for ${today}`,
        date: today
      };

      await fetchApi.post(API_CONFIG.ENDPOINTS.DAYBOOK_TRANSACTION, transactionData);
      
      // Reload summary to show updated opening balance
      await loadDaybookSummary();
      
      setOpeningBalance('');
      setShowOpeningBalance(false);
      
      console.log('✅ Opening balance set successfully');
    } catch (error) {
      console.error('Failed to set opening balance:', error);
      setError('Failed to set opening balance. Please try again.');
    } finally {
      setOpeningBalanceProcessing(false);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleExpenseSubmit = async () => {
    if (!expenseCause.trim() || !expenseAmount || parseFloat(expenseAmount) <= 0) {
      setError('Please enter both expense cause and amount');
      return;
    }

    setExpenseProcessing(true);
    setError('');

    try {
      const transactionData = {
        transaction_type: 'expense',
        amount: parseFloat(expenseAmount),
        description: `Expense: ${expenseCause.trim()}`,
        date: today
      };

      await fetchApi.post(API_CONFIG.ENDPOINTS.DAYBOOK_TRANSACTION, transactionData);
      
      // Reload summary to show updated expenses
      await loadDaybookSummary();
      
      setExpenseCause('');
      setExpenseAmount('');
      setShowExpenseModal(false);
      
      console.log(`✅ Expense recorded: ${expenseCause} - NPR ${expenseAmount}`);
    } catch (error) {
      console.error('Failed to record expense:', error);
      setError('Failed to record expense. Please try again.');
    } finally {
      setExpenseProcessing(false);
    }
  };

  const handleAmountReceivedChange = (value) => {
    setAmountReceived(value);
    const received = parseFloat(value) || 0;
    const change = Math.max(0, received - orderTotal);
    setChangeGiven(change);
  };

  const handlePayment = async () => {
    setProcessing(true);
    setError('');

    try {
      // Validate inputs
      if (!paymentMethod) {
        throw new Error('Please select a payment method');
      }

      if (paymentMethod === 'phonepe' && !invoiceNumber.trim()) {
        throw new Error('Please enter PhonePe transaction ID');
      }

      if (paymentMethod === 'esewa' && !invoiceNumber.trim()) {
        throw new Error('Please enter eSewa transaction ID');
      }

      if (paymentMethod === 'khalti' && !invoiceNumber.trim()) {
        throw new Error('Please enter Khalti transaction ID');
      }

      if (paymentMethod === 'card' && !invoiceNumber.trim()) {
        throw new Error('Please enter card transaction reference');
      }

      if (paymentMethod === 'cash') {
        const received = parseFloat(amountReceived);
        if (!received || received < orderTotal) {
          throw new Error(`Amount received must be at least NPR ${orderTotal}`);
        }
      }

      // Process payment with timeout handling
      const paymentData = {
        order_id: order.id,
        payment_method: paymentMethod,
        amount: orderTotal,
        status: 'completed'
      };

      if (paymentMethod === 'phonepe') {
        paymentData.invoice_number = invoiceNumber.trim();
        paymentData.payment_type = 'online';
        paymentData.amount_received = null;
        paymentData.change_given = null;
      } else if (paymentMethod === 'esewa') {
        paymentData.invoice_number = invoiceNumber.trim();
        paymentData.payment_type = 'online';
        paymentData.amount_received = null;
        paymentData.change_given = null;
      } else if (paymentMethod === 'khalti') {
        paymentData.invoice_number = invoiceNumber.trim();
        paymentData.payment_type = 'online';
        paymentData.amount_received = null;
        paymentData.change_given = null;
      } else if (paymentMethod === 'card') {
        paymentData.invoice_number = invoiceNumber.trim();
        paymentData.payment_type = 'card';
        paymentData.amount_received = null;
        paymentData.change_given = null;
      } else {
        paymentData.amount_received = parseFloat(amountReceived);
        paymentData.change_given = changeGiven;
        paymentData.payment_type = 'cash';
        paymentData.invoice_number = null;
      }

      // Direct API calls without complex retry logic to avoid timeout issues
      console.log('Submitting payment:', paymentData);
      console.log('API endpoint:', API_CONFIG.ENDPOINTS.PAYMENTS);
      console.log('Environment:', process.env.NODE_ENV);
      
      // Use apiService.createPayment for proper error handling and logging
      const response = await apiService.createPayment(paymentData);

      console.log('✅ Payment record created successfully:', response);

      // Update order status to paid
      try {
        // Map payment methods to what the database expects for orders table
        const dbPaymentMethod = ['phonepe', 'esewa', 'khalti'].includes(paymentMethod) ? 'digital' : paymentMethod;
        
        await fetchApi.put(`${API_CONFIG.ENDPOINTS.ORDERS}/${order.id}/status`, { 
          status: 'completed',
          payment_status: 'paid',
          payment_method: dbPaymentMethod
        });
        
        console.log('✅ Order status updated successfully');
      } catch (error) {
        console.error('Order status update failed:', error);
        throw new Error('Failed to update order status');
      }

      // Record in daybook
      const getTransactionType = () => {
        if (paymentMethod === 'cash') return 'cash_payment';
        if (paymentMethod === 'card') return 'card_payment';
        return 'online_payment';
      };

      const getPaymentDescription = () => {
        if (paymentMethod === 'cash') return `Cash payment - Change: NPR ${changeGiven}`;
        if (paymentMethod === 'card') return `Card payment - Ref: ${invoiceNumber}`;
        return `PhonePe payment - Invoice: ${invoiceNumber}`;
      };

      const transactionData = {
        transaction_type: getTransactionType(),
        amount: orderTotal,
        description: `Payment for Order #${order.order_number || order.id} - ${getPaymentDescription()}`,
        order_id: order.id,
        date: new Date().toISOString()
      };

      // Record daybook transaction
      try {
        await fetchApi.post(API_CONFIG.ENDPOINTS.DAYBOOK_TRANSACTION, transactionData);
        
        console.log('✅ Daybook transaction recorded successfully');
        
        // Refresh daybook summary to show updated totals
        await loadDaybookSummary();
      } catch (error) {
        console.error('Daybook transaction failed:', error);
        // Don't throw error here as payment is already processed
        console.warn('Payment completed but daybook recording failed');
      }

      onPaymentComplete({
        ...paymentData,
        order_number: order.order_number,
        payment_method: paymentMethod,
        success: true,
        message: `Payment processed successfully - ${getPaymentDescription()}`
      });

    } catch (err) {
      console.error('Payment processing error:', err);
      
      let errorMessage = 'Payment processing failed. Please try again.';
      if (err.message && err.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (err.response) {
        errorMessage = `Server error: ${err.response.status}. Please try again.`;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 max-w-md w-full">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="text-3xl mb-2">💳</div>
        <h3 className="text-lg font-semibold text-gray-900">Process Payment</h3>
        <p className="text-gray-600 mt-1">Order: {order.order_number || `#${order.id}`}</p>
        <p className="text-lg font-bold text-blue-600">Total: NPR {orderTotal.toLocaleString()}</p>
      </div>


      {/* Order Details */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Customer:</span>
            <span className="font-medium">{order.customer_name}</span>
          </div>
          <div className="flex justify-between">
            <span>Phone:</span>
            <span>{order.customer_phone}</span>
          </div>
          <div className="flex justify-between">
            <span>Table:</span>
            <span>{order.order_type === 'dine-in' ? `Table ${order.table_id}` : 'Delivery'}</span>
          </div>
          <div className="flex justify-between">
            <span>Items:</span>
            <span>{order.items?.length || 0} items</span>
          </div>
        </div>
      </div>

      {/* Payment Method Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Payment Method</label>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <button
            onClick={() => setPaymentMethod('cash')}
            className={`p-3 rounded-lg border-2 transition-all ${
              paymentMethod === 'cash'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-xl mb-1">💵</div>
            <div className="font-medium text-xs">Cash</div>
          </button>
          <button
            onClick={() => setPaymentMethod('card')}
            className={`p-3 rounded-lg border-2 transition-all ${
              paymentMethod === 'card'
                ? 'border-purple-500 bg-purple-50 text-purple-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-xl mb-1">💳</div>
            <div className="font-medium text-xs">Card</div>
          </button>
          <button
            onClick={() => setPaymentMethod('phonepe')}
            className={`p-3 rounded-lg border-2 transition-all ${
              paymentMethod === 'phonepe' 
                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-xl mb-1">📱</div>
            <div className="font-medium text-xs">PhonePe</div>
          </button>
        </div>
        
        {/* Digital Payment Methods Row */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setPaymentMethod('esewa')}
            className={`p-3 rounded-lg border-2 transition-all ${
              paymentMethod === 'esewa'
                ? 'border-orange-500 bg-orange-50 text-orange-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-xl mb-1">🟢</div>
            <div className="font-medium text-xs">eSewa</div>
          </button>
          <button
            onClick={() => setPaymentMethod('khalti')}
            className={`p-3 rounded-lg border-2 transition-all ${
              paymentMethod === 'khalti'
                ? 'border-purple-600 bg-purple-50 text-purple-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-xl mb-1">🟣</div>
            <div className="font-medium text-xs">Khalti</div>
          </button>
        </div>
      </div>

      {/* PhonePe Transaction ID */}
      {paymentMethod === 'phonepe' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            PhonePe Transaction ID
          </label>
          <input
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="Enter PhonePe transaction ID"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {/* eSewa Payment Details */}
      {paymentMethod === 'esewa' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            eSewa Transaction ID
          </label>
          <input
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="Enter eSewa transaction ID"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">Enter the eSewa payment reference ID</p>
        </div>
      )}

      {/* Khalti Payment Details */}
      {paymentMethod === 'khalti' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Khalti Transaction ID
          </label>
          <input
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="Enter Khalti transaction ID"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">Enter the Khalti payment reference ID</p>
        </div>
      )}

      {/* Card Payment Details */}
      {paymentMethod === 'card' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Transaction Reference
          </label>
          <input
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="Enter transaction reference number"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">Enter the card terminal reference number</p>
        </div>
      )}

      {/* Cash Payment Details */}
      {paymentMethod === 'cash' && (
        <div className="mb-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount Received (NPR)
            </label>
            <input
              type="number"
              value={amountReceived}
              onChange={(e) => handleAmountReceivedChange(e.target.value)}
              placeholder="Enter amount received"
              min={orderTotal}
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          
          {amountReceived && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Order Total:</span>
                  <span className="font-medium">NPR {orderTotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount Received:</span>
                  <span className="font-medium">NPR {parseFloat(amountReceived) || 0}</span>
                  </div>
                  <div className="flex justify-between border-t border-green-300 pt-2">
                    <span className="font-medium">Change to Give:</span>
                    <span className="font-bold text-green-700">NPR {changeGiven}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <button
          onClick={onCancel}
          disabled={processing}
          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handlePayment}
          disabled={processing || !paymentMethod}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? 'Processing...' : 'Complete Payment'}
        </button>
      </div>
    </div>
  );
};

export default ReceptionPayment;
