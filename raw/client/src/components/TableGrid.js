import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { fetchApi } from '../services/apiService';
import { getSocketUrl } from '../config/api';

const TableGrid = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showTableDetails, setShowTableDetails] = useState(false);

  useEffect(() => {
    fetchTableStatuses();
    
    // Socket connection for real-time updates
    const socket = io(getSocketUrl());
    
    socket.on('tableOccupied', (data) => {
      console.log('🍽️ Table occupied:', data);
      fetchTableStatuses();
    });
    
    socket.on('tableCleared', (data) => {
      console.log('🧹 Table cleared:', data);
      fetchTableStatuses();
    });
    
    socket.on('tableStatusUpdate', (data) => {
      console.log('🔄 Table status update:', data);
      fetchTableStatuses();
    });
    
    socket.on('paymentCompleted', (data) => {
      console.log('💳 Payment completed:', data);
      fetchTableStatuses();
    });

    return () => socket.disconnect();
  }, []);

  const fetchTableStatuses = async () => {
    try {
      const data = await fetchApi.get('/api/tables/status');
      setTables(data);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error fetching table statuses:', error);
      setLoading(false);
    }
  };

  const clearTable = async (tableId) => {
    if (!window.confirm(`🧹 Clear Table ${tableId}? This will end the customer's session and clear all orders.`)) {
      return;
    }

    try {
      const result = await fetchApi.post(`/api/tables/${tableId}/clear`);
      alert(`✅ Table ${tableId} cleared successfully!\n${result.movedToHistory} orders moved to history.`);
      
      fetchTableStatuses();
    } catch (error) {
      console.error('❌ Error clearing table:', error);
      alert(`❌ Failed to clear table: ${error.message}`);
    }
  };

  const getTableStatusColor = (status) => {
    switch (status) {
      case 'empty': return 'bg-white border-gray-200 text-gray-700';
      case 'occupied': return 'bg-gray-50 border-gray-300 text-gray-800';
      case 'ordering': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'dining': return 'bg-gray-100 border-gray-300 text-gray-800';
      case 'payment_pending': return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'completed': return 'bg-gray-100 border-gray-300 text-gray-700';
      default: return 'bg-white border-gray-200 text-gray-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'empty': return '🟢';
      case 'occupied': return '🟡';
      case 'ordering': return '📝';
      case 'dining': return '🍽️';
      case 'payment_pending': return '💳';
      case 'completed': return '✅';
      default: return '❓';
    }
  };

  const formatDuration = (hours) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    }
    return `${Math.round(hours * 10) / 10}h`;
  };

  const openTableDetails = (table) => {
    setSelectedTable(table);
    setShowTableDetails(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading table statuses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-xl font-semibold text-gray-700">
            {tables.filter(t => t.status === 'empty').length}
          </div>
          <div className="text-sm text-gray-600">Empty Tables</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-xl font-semibold text-gray-700">
            {tables.filter(t => t.status !== 'empty').length}
          </div>
          <div className="text-sm text-gray-600">Occupied Tables</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-xl font-semibold text-gray-700">
            ${tables.reduce((sum, t) => sum + (t.total_amount || 0), 0).toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">Total Revenue</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-xl font-semibold text-gray-700">
            {tables.reduce((sum, t) => sum + (t.order_count || 0), 0)}
          </div>
          <div className="text-sm text-gray-600">Total Orders</div>
        </div>
      </div>

      {/* Table Grid */}
      <div className="grid grid-cols-5 gap-4">
        {tables.map((table) => (
          <div
            key={table.table_id}
            className={`
              relative p-3 rounded-lg border cursor-pointer transition-colors duration-150 hover:border-blue-300
              ${getTableStatusColor(table.status)}
            `}
            onClick={() => openTableDetails(table)}
          >
            {/* Table Number */}
            <div className="text-center">
              <div className="text-xl font-semibold mb-2">
                {getStatusIcon(table.status)} {table.table_id}
              </div>
              
              {/* Status */}
              <div className="text-xs font-medium uppercase tracking-wide mb-2">
                {table.status.replace('_', ' ')}
              </div>

              {/* Customer Info */}
              {table.customer_name && (
                <div className="text-xs space-y-1">
                  <div className="font-medium truncate">{table.customer_name}</div>
                  <div className="text-xs opacity-75">{table.customer_phone}</div>
                </div>
              )}

              {/* Timing */}
              {table.session_start && (
                <div className="text-xs mt-2 opacity-75">
                  {formatDuration(table.hours_occupied)}
                </div>
              )}

              {/* Amount */}
              {table.total_amount > 0 && (
                <div className="text-sm font-bold mt-1">
                  ${table.total_amount}
                </div>
              )}

              {/* Clear Button for Occupied Tables */}
              {table.status !== 'empty' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearTable(table.table_id);
                  }}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors"
                  title="Clear Table"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Table Details Modal */}
      {showTableDetails && selectedTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                {getStatusIcon(selectedTable.status)} Table {selectedTable.table_id} Details
              </h3>
              <button
                onClick={() => setShowTableDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <strong>Status:</strong> 
                <span className={`ml-2 px-2 py-1 rounded text-sm ${getTableStatusColor(selectedTable.status)}`}>
                  {selectedTable.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              {selectedTable.customer_name && (
                <>
                  <div><strong>Customer:</strong> {selectedTable.customer_name}</div>
                  <div><strong>Phone:</strong> {selectedTable.customer_phone}</div>
                </>
              )}

              {selectedTable.session_start && (
                <div>
                  <strong>Occupied Since:</strong> {new Date(selectedTable.session_start).toLocaleString()}
                </div>
              )}

              <div><strong>Duration:</strong> {formatDuration(selectedTable.hours_occupied)}</div>
              <div><strong>Orders:</strong> {selectedTable.order_count}</div>
              <div><strong>Total Amount:</strong> ${selectedTable.total_amount}</div>
              <div><strong>Payment Status:</strong> {selectedTable.payment_status}</div>

              {selectedTable.status !== 'empty' && (
                <button
                  onClick={() => {
                    clearTable(selectedTable.table_id);
                    setShowTableDetails(false);
                  }}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors"
                >
                  🧹 Clear Table
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableGrid;
