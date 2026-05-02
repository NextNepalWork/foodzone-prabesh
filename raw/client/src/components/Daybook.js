import React, { useState, useEffect } from 'react';
import { fetchApi } from '../services/apiService';

const Daybook = () => {
  const [daybookData, setDaybookData] = useState({
    opening_balance: 0,
    cash_payments: 0,
    online_payments: 0,
    card_payments: 0,
    total_sales: 0,
    cash_handovers: 0,
    expenses: 0,
    closing_balance: 0,
    transactions: []
  });
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    type: '',
    amount: '',
    description: '',
    category: ''
  });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchDaybookData();
  }, [selectedDate]);

  const fetchDaybookData = async () => {
    try {
      setLoading(true);
      const summaryResponse = await fetchApi.get(`/api/daybook/summary?date=${selectedDate}`);
      const transactionsResponse = await fetchApi.get(`/api/daybook/recent-transactions?limit=50`);
      
      const summaryData = summaryResponse.data || {};
      const transactionsData = transactionsResponse.data || [];
      
      // Filter transactions for selected date
      const dateTransactions = transactionsData.filter(transaction => {
        const transactionDate = new Date(transaction.created_at).toISOString().split('T')[0];
        return transactionDate === selectedDate;
      });

      setDaybookData({
        opening_balance: summaryData.opening_balance || 0,
        cash_payments: summaryData.cash_payments || 0,
        online_payments: summaryData.online_payments || 0,
        card_payments: summaryData.card_payments || 0,
        total_sales: summaryData.total_income || 0,
        cash_handovers: summaryData.cash_handovers || 0,
        expenses: summaryData.expenses || 0,
        closing_balance: summaryData.closing_balance || 0,
        calculated_closing_balance: summaryData.calculated_closing_balance || 0,
        transactions: dateTransactions
      });
    } catch (error) {
      console.error('Error fetching daybook data:', error);
      // Initialize with default data if API fails
      setDaybookData({
        opening_balance: 0,
        cash_payments: 0,
        online_payments: 0,
        card_payments: 0,
        total_sales: 0,
        cash_handovers: 0,
        expenses: 0,
        closing_balance: 0,
        transactions: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    try {
      const transactionData = {
        transaction_type: newTransaction.type,
        amount: parseFloat(newTransaction.amount),
        description: newTransaction.description,
        category: newTransaction.category,
        date: selectedDate
      };

      await fetchApi.post('/api/daybook/transaction', transactionData);
      
      // Reset form
      setNewTransaction({
        type: '',
        amount: '',
        description: '',
        category: ''
      });
      setShowAddTransaction(false);
      
      // Refresh data
      fetchDaybookData();
    } catch (error) {
      console.error('Error adding transaction:', error);
    }
  };

  const updateOpeningBalance = async (newBalance) => {
    try {
      await fetchApi.post('/api/daybook/opening-balance', {
        date: selectedDate,
        amount: parseFloat(newBalance)
      });
      fetchDaybookData();
    } catch (error) {
      console.error('Error updating opening balance:', error);
    }
  };

  const transactionTypes = [
    { value: 'cash_handover', label: 'Cash Handover', icon: '🤝', color: 'orange' },
    { value: 'expense', label: 'Expense', icon: '💸', color: 'red' },
    { value: 'cash_payment', label: 'Cash Payment', icon: '💵', color: 'green' },
    { value: 'online_payment', label: 'Online Payment', icon: '📱', color: 'blue' },
    { value: 'card_payment', label: 'Card Payment', icon: '💳', color: 'purple' },
    { value: 'opening_balance', label: 'Opening Balance', icon: '💰', color: 'green' },
    { value: 'closing_balance', label: 'Closing Balance', icon: '🏁', color: 'orange' }
  ];

  const expenseCategories = [
    'Food Supplies', 'Utilities', 'Staff Salary', 'Maintenance', 
    'Marketing', 'Transportation', 'Other'
  ];

  const handleSyncPayments = async () => {
    try {
      setSyncing(true);
      const response = await fetchApi.post('/api/daybook/sync-payments', { date: selectedDate });
      alert(`✅ Synced ${response.synced_count} payments totaling NPR ${response.synced_amount?.toLocaleString()}`);
      fetchDaybookData(); // Refresh data
    } catch (error) {
      console.error('Error syncing payments:', error);
      alert('Failed to sync payments. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const handleDownloadDaybook = async () => {
    try {
      setDownloading(true);
      const token = localStorage.getItem('adminToken') || localStorage.getItem('staffToken');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      
      // Download for selected date
      const url = `${apiUrl}/api/daybook/download?start_date=${selectedDate}&end_date=${selectedDate}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `daybook_${selectedDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      
      alert('✅ Daybook downloaded successfully!');
    } catch (error) {
      console.error('Error downloading daybook:', error);
      alert('Failed to download daybook. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-3 text-gray-600">Loading daybook...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">📊 Daily Daybook</h2>
          <div className="flex items-center space-x-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSyncPayments}
              disabled={syncing}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              title="Sync missing payments from orders to daybook"
            >
              <span>{syncing ? '⏳' : '🔄'}</span>
              <span>{syncing ? 'Syncing...' : 'Sync'}</span>
            </button>
            <button
              onClick={handleDownloadDaybook}
              disabled={downloading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              title="Download daybook as CSV for audit"
            >
              <span>{downloading ? '⏳' : '📥'}</span>
              <span>{downloading ? 'Downloading...' : 'Download'}</span>
            </button>
            <button
              onClick={() => setShowAddTransaction(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ➕ Add Transaction
            </button>
          </div>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              💰
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Opening Balance</p>
              <p className="text-2xl font-semibold text-gray-900">
                NPR {daybookData.opening_balance?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              💵
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Cash Payments</p>
              <p className="text-2xl font-semibold text-gray-900">
                NPR {daybookData.cash_payments?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
              💳
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Card Payments</p>
              <p className="text-2xl font-semibold text-gray-900">
                NPR {daybookData.card_payments?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              📱
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Online Payments</p>
              <p className="text-2xl font-semibold text-gray-900">
                NPR {daybookData.online_payments?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Second row with totals and calculations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-emerald-100 text-emerald-600">
              📊
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-2xl font-semibold text-gray-900">
                NPR {daybookData.total_sales?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100 text-orange-600">
              💸
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Cash Returned</p>
              <p className="text-2xl font-semibold text-gray-900">
                NPR {daybookData.cash_returned?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 text-red-600">
              💰
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Expenses</p>
              <p className="text-2xl font-semibold text-gray-900">
                NPR {daybookData.expenses?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-2 border-green-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              🏁
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Calculated Closing Balance</p>
              <p className="text-2xl font-semibold text-green-700">
                NPR {daybookData.calculated_closing_balance?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Flow Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Cash Handovers</p>
              <p className="text-2xl font-bold text-orange-600">NPR {daybookData.cash_handovers}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">🤝</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Expenses</p>
              <p className="text-2xl font-bold text-red-600">NPR {daybookData.expenses}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">💸</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Closing Balance</p>
              <p className="text-2xl font-bold text-slate-900">
                NPR {(daybookData.calculated_closing_balance || 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">Calculated balance</p>
            </div>
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">🏦</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Transactions</h3>
        
        {daybookData.transactions && daybookData.transactions.length > 0 ? (
          <div className="space-y-3">
            {daybookData.transactions.map((transaction, index) => {
              const typeInfo = transactionTypes.find(t => t.value === transaction.transaction_type) || 
                { icon: '📄', color: 'gray', label: transaction.transaction_type };
              
              return (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 bg-${typeInfo.color}-100 rounded-lg flex items-center justify-center`}>
                      <span className="text-lg">{typeInfo.icon}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{transaction.description || 'Transaction'}</p>
                      <p className="text-sm text-gray-500">
                        {typeInfo.label} • {new Date(transaction.created_at || Date.now()).toLocaleTimeString()}
                      </p>
                      {transaction.category && (
                        <p className="text-xs text-gray-400">{transaction.category}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      transaction.transaction_type === 'expense' || transaction.transaction_type === 'cash_handover' 
                        ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {transaction.transaction_type === 'expense' || transaction.transaction_type === 'cash_handover' ? '-' : '+'}
                      NPR {parseFloat(transaction.amount || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <span className="text-4xl mb-4 block">📝</span>
            <p className="text-gray-500">No transactions recorded for this date</p>
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      {showAddTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Add Transaction</h3>
            
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Type
                </label>
                <select
                  value={newTransaction.type}
                  onChange={(e) => setNewTransaction({ ...newTransaction, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select type</option>
                  {transactionTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (NPR)
                </label>
                <input
                  type="number"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter amount"
                  required
                />
              </div>

              {newTransaction.type === 'expense' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={newTransaction.category}
                    onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category</option>
                    {expenseCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter description"
                  rows="3"
                  required
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddTransaction(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Daybook;
