import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { fetchApi } from '../services/apiService';
import { getSocketUrl } from '../config/api';

const AdminSettings = () => {
  const [tableCount, setTableCount] = useState(25); // Default 25 tables
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [newTableCount, setNewTableCount] = useState(25);
  const [happyHourEnabled, setHappyHourEnabled] = useState(true);
  const [happyHourLoading, setHappyHourLoading] = useState(false);

  useEffect(() => {
    fetchTableSettings();
    fetchHappyHourSettings();
  }, []);

  const fetchTableSettings = async () => {
    try {
      const data = await fetchApi.get('/api/settings/tables');
      setTableCount(data.tableCount || 25);
      setNewTableCount(data.tableCount || 25);
    } catch (error) {
      console.error('Error fetching table settings:', error);
      // Use default if API fails
      setTableCount(25);
      setNewTableCount(25);
    }
  };

  const fetchHappyHourSettings = async () => {
    try {
      const data = await fetchApi.get('/api/settings/happy-hour');
      setHappyHourEnabled(data.enabled !== false); // Default to true if not set
    } catch (error) {
      console.error('Error fetching happy hour settings:', error);
      setHappyHourEnabled(true); // Default to enabled
    }
  };

  const handleToggleHappyHour = async () => {
    setHappyHourLoading(true);
    try {
      const newStatus = !happyHourEnabled;
      await fetchApi.post('/api/settings/happy-hour', { enabled: newStatus });
      setHappyHourEnabled(newStatus);
      setMessage(`✅ Happy Hour ${newStatus ? 'enabled' : 'disabled'} successfully!`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error toggling happy hour:', error);
      setMessage('❌ Failed to update Happy Hour settings');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setHappyHourLoading(false);
    }
  };

  const handleUpdateTables = async () => {
    if (newTableCount < 1 || newTableCount > 100) {
      setMessage('Table count must be between 1 and 100');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setLoading(true);
    try {
      const socket = io(getSocketUrl());
      await socket.emit('update-tables', {
        tableCount: newTableCount
      });
      
      setMessage(`✅ Successfully updated to ${newTableCount} tables`);
      setShowConfirm(false);
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      const socket2 = io(getSocketUrl());
      socket2.emit('clear-all-sessions');
      
      setMessage('🧹 All table sessions cleared!');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newTableCount !== tableCount) {
      setShowConfirm(true);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl">⚙️</span>
        <h2 className="text-xl font-semibold">Restaurant Settings</h2>
      </div>

      <div className="space-y-6">
        {/* Happy Hour Configuration */}
        <div className="border rounded-lg p-4 bg-gradient-to-r from-yellow-50 to-orange-50">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <span>🎉</span>
            Happy Hour Configuration
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-gray-800">Happy Hour Status</p>
                <p className="text-sm text-gray-600 mt-1">
                  Automatically runs 11:00 AM - 2:00 PM (Sunday to Friday)
                </p>
                <p className="text-sm text-gray-600">
                  Applies 10% discount on all menu items during happy hour
                </p>
              </div>
              
              <button
                onClick={handleToggleHappyHour}
                disabled={happyHourLoading}
                className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  happyHourEnabled 
                    ? 'bg-green-500 focus:ring-green-500' 
                    : 'bg-gray-300 focus:ring-gray-400'
                } ${happyHourLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    happyHourEnabled ? 'translate-x-9' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <div className={`p-3 rounded-lg ${
              happyHourEnabled 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-gray-50 border border-gray-200'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{happyHourEnabled ? '✅' : '❌'}</span>
                <div>
                  <p className={`font-medium ${
                    happyHourEnabled ? 'text-green-700' : 'text-gray-600'
                  }`}>
                    {happyHourEnabled ? 'Happy Hour is ENABLED' : 'Happy Hour is DISABLED'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {happyHourEnabled 
                      ? 'Customers will see happy hour specials during active hours' 
                      : 'Happy hour section will be hidden from customers'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table Configuration */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <span>🪑</span>
            Table Configuration
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Tables
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newTableCount}
                  onChange={(e) => setNewTableCount(parseInt(e.target.value) || 1)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-24 text-center focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm text-gray-600">
                  Currently: {tableCount} tables (Table 1 - Table {tableCount})
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Customers can access tables via /{'{'}tableNumber{'}'} (e.g., /1, /2, /3...)
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || newTableCount === tableCount}
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : 'Update Tables'}
              </button>
              
              {newTableCount !== tableCount && (
                <button
                  type="button"
                  onClick={() => setNewTableCount(tableCount)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Current Status */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
            <span>📊</span>
            Current Status
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Active Tables:</span>
              <span className="ml-2 text-green-600">{tableCount} tables</span>
            </div>
            <div>
              <span className="font-medium">Table Range:</span>
              <span className="ml-2 text-blue-600">Table 1 - Table {tableCount}</span>
            </div>
            <div>
              <span className="font-medium">QR Code URLs:</span>
              <span className="ml-2 text-purple-600">/{'{'}1-{tableCount}{'}'}</span>
            </div>
            <div>
              <span className="font-medium">Access Method:</span>
              <span className="ml-2 text-gray-600">Direct URL or QR scan</span>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`p-3 rounded-lg text-sm ${
            message.includes('✅') 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold mb-2">Update Table Configuration?</h3>
              <p className="text-gray-600 mb-6">
                This will change the number of available tables from <strong>{tableCount}</strong> to <strong>{newTableCount}</strong>.
                {newTableCount < tableCount && (
                  <span className="block mt-2 text-red-600 text-sm">
                    ⚠️ Reducing tables may affect existing orders for tables {newTableCount + 1}-{tableCount}
                  </span>
                )}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateTables}
                  disabled={loading}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Confirm Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
