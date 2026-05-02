import React, { useState, useEffect } from 'react';
import { useTableSession } from '../hooks/useTableSession';
import PaymentQRModal from './PaymentQRModal';

const TablePayment = () => {
  const { bill, loading, error, requestPayment, sessionActive, tableId, refreshData } = useTableSession();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentRequested, setPaymentRequested] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodes, setQrCodes] = useState([]);

  const paymentMethods = [
    { id: 'cash', name: 'Cash', icon: '💵', description: 'Pay with cash to staff', type: 'traditional' },
    { id: 'card', name: 'Card', icon: '💳', description: 'Credit/Debit card', type: 'traditional' },
    { id: 'phonepe', name: 'PhonePe', icon: '📱', description: 'UPI payment via PhonePe', type: 'digital' },
    { id: 'gpay', name: 'Google Pay', icon: '🟢', description: 'UPI payment via Google Pay', type: 'digital' },
    { id: 'paytm', name: 'Paytm', icon: '🔵', description: 'Digital wallet payment', type: 'digital' },
    { id: 'esewa', name: 'eSewa', icon: '💰', description: 'Digital wallet payment', type: 'digital' },
    { id: 'khalti', name: 'Khalti', icon: '🟣', description: 'Digital wallet payment', type: 'digital' }
  ];

  // Fetch QR codes on component mount
  useEffect(() => {
    fetchQRCodes();
  }, []);

  const fetchQRCodes = async () => {
    try {
      const response = await fetch('/api/payment-qr/qr-codes');
      const data = await response.json();
      if (data.success) {
        setQrCodes(data.qrCodes);
      }
    } catch (error) {
      console.error('Failed to fetch QR codes:', error);
    }
  };

  const handlePaymentRequest = async () => {
    if (!bill || bill.total <= 0) {
      alert('No amount to pay');
      return;
    }

    const selectedMethod = paymentMethods.find(m => m.id === selectedPaymentMethod);
    
    // For digital payments, show QR modal
    if (selectedMethod?.type === 'digital') {
      setShowQRModal(true);
      return;
    }

    // For traditional payments, use existing flow
    setIsProcessing(true);
    try {
      await requestPayment(selectedPaymentMethod);
      setPaymentRequested(true);
      
      // Show success message
      alert(`Payment request sent! Staff will assist you with ${selectedMethod?.name} payment.`);
    } catch (error) {
      alert('Failed to request payment: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!sessionActive) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <div className="text-gray-500 mb-4">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v2a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Session</h3>
          <p className="text-gray-600">Scan a table QR code to view your bill</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-600">{error}</p>
          </div>
          <button
            onClick={refreshData}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Payment</h2>
            <p className="text-sm text-gray-600">Table {tableId}</p>
          </div>
          <button
            onClick={refreshData}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bill Summary */}
      <div className="p-6">
        {!bill || bill.orderCount === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v2a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Bills</h3>
              <p className="text-gray-600">All orders have been paid or no orders placed yet</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Bill Details */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Bill Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Orders ({bill.orderCount})</span>
                  <span className="text-gray-900">Rs. {bill.subtotal.toFixed(2)}</span>
                </div>
                {bill.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount</span>
                    <span className="text-green-600">-Rs. {bill.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between font-semibold text-lg">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">Rs. {bill.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Select Payment Method</h3>
              <div className="grid grid-cols-1 gap-3">
                {paymentMethods.map((method) => (
                  <label
                    key={method.id}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedPaymentMethod === method.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.id}
                      checked={selectedPaymentMethod === method.id}
                      onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex items-center space-x-3 flex-1">
                      <span className="text-2xl">{method.icon}</span>
                      <div>
                        <div className="font-medium text-gray-900">{method.name}</div>
                        <div className="text-sm text-gray-500">{method.description}</div>
                      </div>
                    </div>
                    {selectedPaymentMethod === method.id && (
                      <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Payment Button */}
            <div className="pt-4">
              {paymentRequested ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-green-600 mb-2">
                    <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-medium">Payment Request Sent!</p>
                    <p className="text-sm text-green-700 mt-1">
                      Staff will assist you with your {paymentMethods.find(m => m.id === selectedPaymentMethod)?.name} payment shortly.
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handlePaymentRequest}
                  disabled={isProcessing || bill.total <= 0}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                    isProcessing || bill.total <= 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    `Request Payment - Rs. ${bill.total.toFixed(2)}`
                  )}
                </button>
              )}
            </div>

            {/* Help Text */}
            <div className="text-center text-sm text-gray-500">
              <p>
                {paymentMethods.find(m => m.id === selectedPaymentMethod)?.type === 'digital' 
                  ? 'Scan QR code to pay instantly with your mobile wallet'
                  : 'Staff will be notified and will assist you with the payment process.'
                }
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Payment QR Modal */}
      {showQRModal && (
        <PaymentQRModal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          paymentMethod={selectedPaymentMethod}
          amount={bill?.total || 0}
          tableId={tableId}
          orderIds={bill?.orders?.map(o => o.order_id) || []}
          qrCodes={qrCodes}
          onPaymentComplete={() => {
            setShowQRModal(false);
            setPaymentRequested(true);
            refreshData();
          }}
        />
      )}
    </div>
  );
};

export default TablePayment;