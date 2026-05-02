import React, { useState, useEffect } from 'react';
import { fetchApi } from '../services/apiService';
import { io } from 'socket.io-client';

const TableCallsManager = () => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState(null);
  const [resolvingCall, setResolvingCall] = useState(null);
  const [notes, setNotes] = useState('');

  // Fetch calls on mount
  useEffect(() => {
    fetchCalls();
    
    // Setup socket.io listeners
    const socket = io();
    socket.on('tableCall', (call) => {
      console.log('📞 New table call:', call);
      fetchCalls();
    });
    socket.on('callResponded', (call) => {
      console.log('✅ Call responded:', call);
      fetchCalls();
    });
    socket.on('callResolved', (call) => {
      console.log('✅ Call resolved:', call);
      fetchCalls();
    });

    return () => socket.disconnect();
  }, []);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      const response = await fetchApi.get('/api/table-calls');
      setCalls(response.calls || []);
    } catch (error) {
      console.error('Error fetching calls:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (callId) => {
    try {
      setRespondingTo(callId);
      await fetchApi.put(`/api/table-calls/${callId}/respond`, {});
      fetchCalls();
    } catch (error) {
      console.error('Error responding to call:', error);
      alert('Failed to respond to call');
    } finally {
      setRespondingTo(null);
    }
  };

  const handleResolve = async (callId) => {
    try {
      setResolvingCall(null);
      await fetchApi.put(`/api/table-calls/${callId}/resolve`, { notes });
      setNotes('');
      fetchCalls();
    } catch (error) {
      console.error('Error resolving call:', error);
      alert('Failed to resolve call');
    }
  };

  const pendingCalls = calls.filter(c => c.status === 'pending');
  const respondedCalls = calls.filter(c => c.status === 'responded');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">📞 Table Calls</h2>

        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading calls...</div>
        ) : calls.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No active calls</div>
        ) : (
          <div className="space-y-4">
            {/* Pending Calls */}
            {pendingCalls.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-red-600 mb-3">
                  🔴 Pending ({pendingCalls.length})
                </h3>
                <div className="grid gap-3">
                  {pendingCalls.map((call) => (
                    <div
                      key={call.id}
                      className="bg-red-50 border-2 border-red-300 rounded-lg p-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-lg font-bold text-red-700">Table {call.table_id}</p>
                        <p className="text-sm text-red-600">{call.reason}</p>
                        <p className="text-xs text-red-500 mt-1">
                          {new Date(call.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRespond(call.id)}
                        disabled={respondingTo === call.id}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-slate-400 transition font-medium"
                      >
                        {respondingTo === call.id ? 'Responding...' : 'Respond'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Responded Calls */}
            {respondedCalls.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-yellow-600 mb-3">
                  🟡 Responded ({respondedCalls.length})
                </h3>
                <div className="grid gap-3">
                  {respondedCalls.map((call) => (
                    <div
                      key={call.id}
                      className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-lg font-bold text-yellow-700">Table {call.table_id}</p>
                          <p className="text-sm text-yellow-600">{call.reason}</p>
                        </div>
                        <button
                          onClick={() => setResolvingCall(call.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                        >
                          Resolve
                        </button>
                      </div>

                      {resolvingCall === call.id && (
                        <div className="bg-white p-3 rounded-lg border border-yellow-200">
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add notes (optional)"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mb-2"
                            rows="2"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleResolve(call.id)}
                              className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm"
                            >
                              Confirm Resolve
                            </button>
                            <button
                              onClick={() => setResolvingCall(null)}
                              className="flex-1 px-3 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition font-medium text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TableCallsManager;
