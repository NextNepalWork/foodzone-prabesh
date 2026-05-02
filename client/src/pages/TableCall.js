import React, { useState } from 'react';
import TableCallButton from '../components/TableCallButton';
import { useTableCount } from '../hooks/useSettings';

const TableCall = () => {
  const [selectedTable, setSelectedTable] = useState(null);
  const [callSent, setCallSent] = useState(false);
  const tableCount = useTableCount();

  const tables = Array.from({ length: tableCount }, (_, i) => i + 1);

  const handleTableSelect = (tableId) => {
    setSelectedTable(tableId);
    setCallSent(false);
  };

  const handleCallSent = () => {
    setCallSent(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">📞 Call Service</h1>
          <p className="text-slate-600">Select your table number</p>
        </div>

        {/* Table Grid */}
        {!selectedTable ? (
          <div className="grid grid-cols-5 gap-4 mb-8">
            {tables.map((tableId) => (
              <button
                key={tableId}
                onClick={() => handleTableSelect(tableId)}
                className="aspect-square bg-white rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition flex items-center justify-center text-2xl font-bold text-slate-700 border-2 border-slate-200 hover:border-blue-500"
              >
                Table {tableId}
              </button>
            ))}
          </div>
        ) : (
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-slate-800 mb-2">Table {selectedTable}</h2>
              <p className="text-slate-600">What do you need?</p>
            </div>

            <TableCallButton
              tableId={selectedTable}
              onCallSent={handleCallSent}
            />

            {callSent && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                <p className="text-green-700 font-medium">✅ Your call has been sent!</p>
                <p className="text-green-600 text-sm mt-1">A waiter will be with you shortly.</p>
              </div>
            )}

            <button
              onClick={() => setSelectedTable(null)}
              className="w-full mt-6 px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition font-medium"
            >
              ← Back to Tables
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TableCall;
