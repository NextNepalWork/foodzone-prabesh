import React, { useState } from 'react';

const PaymentMethodModal = ({ isOpen, onClose, onConfirm, orderAmount, orderId }) => {
  const [selectedMethod, setSelectedMethod] = useState('');
  const [loading, setLoading] = useState(false);

  const paymentMethods = [
    { id: 'cash', label: 'Cash', icon: '💵', color: 'green' },
    { id: 'card', label: 'Card', icon: '💳', color: 'blue' },
    { id: 'esewa', label: 'eSewa', icon: '📱', color: 'green' },
    { id: 'khalti', label: 'Khalti', icon: '💜', color: 'purple' },
    { id: 'fonepay', label: 'FonePay', icon: '📲', color: 'orange' },
    { id: 'bank_transfer', label: 'Bank Transfer', icon: '🏦', color: 'indigo' },
    { id: 'other', label: 'Other', icon: '💰', color: 'gray' }
  ];

  const handleConfirm = async () => {
    if (!selectedMethod) {
      alert('Please select a payment method');
      return;
    }

    setLoading(true);
    try {
      await onConfirm(selectedMethod);
      onClose();
    } catch (error) {
      console.error('Payment confirmation error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Select Payment Method</h2>
              <p className="text-sm text-slate-500 mt-1">
                Order #{orderId} • NPR {parseFloat(orderAmount).toFixed(2)}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition disabled:opacity-50"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-3">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                disabled={loading}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedMethod === method.id
                    ? `border-${method.color}-500 bg-${method.color}-50`
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="text-3xl mb-2">{method.icon}</div>
                <div className={`text-sm font-semibold ${
                  selectedMethod === method.id ? `text-${method.color}-700` : 'text-slate-700'
                }`}>
                  {method.label}
                </div>
              </button>
            ))}
          </div>

          {/* Amount Display */}
          <div className="mt-6 p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">Total Amount:</span>
              <span className="text-2xl font-bold text-slate-900">
                NPR {parseFloat(orderAmount).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedMethod || loading}
            className="flex-1 px-4 py-2.5 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>✓</span>
                <span>Confirm Payment</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodModal;
