import React, { useState, useEffect } from 'react';
import { fetchApi } from '../services/apiService';

const PaymentReceiptsManager = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'verified', 'rejected'
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    fetchReceipts();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchReceipts, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/payment-qr/receipts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setReceipts(data.receipts || []);
      }
    } catch (error) {
      console.error('Error fetching receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (receiptId, status) => {
    if (!window.confirm(`Are you sure you want to ${status} this payment?`)) {
      return;
    }

    setIsVerifying(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/payment-qr/receipts/${receiptId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status,
          notes: verifyNotes
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(`Payment ${status} successfully!`);
        setSelectedReceipt(null);
        setVerifyNotes('');
        fetchReceipts();
      } else {
        alert('Failed to verify payment: ' + data.error);
      }
    } catch (error) {
      alert('Error verifying payment: ' + error.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const filteredReceipts = receipts.filter(receipt => {
    if (filter === 'all') return true;
    return receipt.status === filter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'verified':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const counts = {
    all: receipts.length,
    pending: receipts.filter(r => r.status === 'pending').length,
    verified: receipts.filter(r => r.status === 'verified').length,
    rejected: receipts.filter(r => r.status === 'rejected').length,
  };

  return (
    <div className="space-y-4">
      {/* Header with Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Payment Receipts</h2>
          <button
            onClick={fetchReceipts}
            disabled={loading}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Pending' },
            { key: 'verified', label: 'Verified' },
            { key: 'rejected', label: 'Rejected' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label} ({counts[key]})
            </button>
          ))}
        </div>
      </div>

      {/* Receipts List */}
      {loading && receipts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading receipts...</p>
        </div>
      ) : filteredReceipts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-600">No {filter !== 'all' ? filter : ''} receipts found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReceipts.map((receipt) => (
            <div
              key={receipt.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Receipt Header */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-900">
                    Table {receipt.table_id}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(receipt.status)}`}>
                    {receipt.status}
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  {new Date(receipt.created_at).toLocaleString()}
                </div>
              </div>

              {/* Receipt Image */}
              <div className="p-4">
                <img
                  src={receipt.receipt_image_url}
                  alt="Payment Receipt"
                  className="w-full h-48 object-contain bg-gray-50 rounded border border-gray-200 cursor-pointer"
                  onClick={() => setSelectedReceipt(receipt)}
                />
              </div>

              {/* Receipt Details */}
              <div className="px-4 pb-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold text-gray-900">Rs. {parseFloat(receipt.total_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Method:</span>
                  <span className="font-medium text-gray-900 capitalize">{receipt.payment_method}</span>
                </div>
                {receipt.customer_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer:</span>
                    <span className="text-gray-900">{receipt.customer_name}</span>
                  </div>
                )}
                {receipt.customer_phone && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="text-gray-900">{receipt.customer_phone}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              {receipt.status === 'pending' && (
                <div className="px-4 pb-4 flex gap-2">
                  <button
                    onClick={() => handleVerify(receipt.id, 'verified')}
                    disabled={isVerifying}
                    className="flex-1 bg-green-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    ✓ Verify
                  </button>
                  <button
                    onClick={() => handleVerify(receipt.id, 'rejected')}
                    disabled={isVerifying}
                    className="flex-1 bg-red-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    ✕ Reject
                  </button>
                </div>
              )}

              {receipt.status !== 'pending' && receipt.verified_by_name && (
                <div className="px-4 pb-4 text-xs text-gray-600">
                  {receipt.status === 'verified' ? 'Verified' : 'Rejected'} by {receipt.verified_by_name}
                  {receipt.verified_at && ` on ${new Date(receipt.verified_at).toLocaleString()}`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Receipt Detail Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Receipt Details</h3>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4">
              <img
                src={selectedReceipt.receipt_image_url}
                alt="Payment Receipt"
                className="w-full max-h-96 object-contain bg-gray-50 rounded border border-gray-200 mb-4"
              />

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Table:</span>
                  <span className="font-semibold">Table {selectedReceipt.table_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold">Rs. {parseFloat(selectedReceipt.total_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="font-medium capitalize">{selectedReceipt.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(selectedReceipt.status)}`}>
                    {selectedReceipt.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Submitted:</span>
                  <span>{new Date(selectedReceipt.created_at).toLocaleString()}</span>
                </div>
                {selectedReceipt.customer_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer:</span>
                    <span>{selectedReceipt.customer_name}</span>
                  </div>
                )}
                {selectedReceipt.customer_phone && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span>{selectedReceipt.customer_phone}</span>
                  </div>
                )}
              </div>

              {selectedReceipt.status === 'pending' && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={verifyNotes}
                      onChange={(e) => setVerifyNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows="3"
                      placeholder="Add any notes about this payment..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleVerify(selectedReceipt.id, 'verified')}
                      disabled={isVerifying}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      ✓ Verify Payment
                    </button>
                    <button
                      onClick={() => handleVerify(selectedReceipt.id, 'rejected')}
                      disabled={isVerifying}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                      ✕ Reject Payment
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentReceiptsManager;
