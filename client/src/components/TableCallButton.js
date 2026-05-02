import React, { useState } from 'react';
import { fetchApi } from '../services/apiService';
import VoiceCallInterface from './VoiceCallInterface';

const TableCallButton = ({ tableId, onCallSent, variant = 'floating' }) => {
  const [loading, setLoading] = useState(false);
  const [called, setCalled] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showCallInterface, setShowCallInterface] = useState(false);
  const [reason, setReason] = useState('Order');
  const isInline = variant === 'inline';

  const handleCall = async () => {
    try {
      setLoading(true);
      console.log('📞 TableCallButton: Initiating call from Table', tableId);
      
      // Send REST API call
      const response = await fetchApi.post('/api/table-calls', {
        tableId: parseInt(tableId),
        reason
      });
      console.log('✅ TableCallButton: REST API call sent');

      if (response.success) {
        console.log('✅ TableCallButton: Call registered, showing call interface');
        // VoiceCallInterface handles the socket.io initiateVoiceCall itself —
        // we must NOT emit a second one here or the admin sees duplicate calls.
        setShowCallInterface(true);

        setCalled(true);
        setShowMenu(false);
        if (onCallSent) onCallSent();

        // Reset the button label after 3 seconds
        setTimeout(() => setCalled(false), 3000);
      }
    } catch (error) {
      console.error('❌ TableCallButton: Error sending call:', error);
      alert('Failed to send call. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (showCallInterface) {
    return (
      <VoiceCallInterface 
        tableId={tableId} 
        onCallEnd={() => setShowCallInterface(false)}
      />
    );
  }

  // Wrapper + trigger-button styles depend on the variant.
  const wrapperClass = isInline
    ? 'relative inline-block'
    : 'fixed top-20 right-6 z-50';

  const triggerClass = isInline
    ? `flex items-center gap-1 h-8 px-2.5 rounded-lg font-semibold text-white text-xs shadow active:scale-95 transition ${
        called
          ? 'bg-gradient-to-br from-emerald-400 to-emerald-600'
          : loading
          ? 'bg-slate-400 cursor-not-allowed'
          : 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
      }`
    : `flex items-center justify-center w-14 h-14 rounded-full font-semibold text-white transition-all duration-300 shadow-2xl hover:shadow-2xl active:scale-95 ${
        called
          ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700'
          : loading
          ? 'bg-slate-400 cursor-not-allowed'
          : 'bg-gradient-to-br from-green-400 to-green-600 hover:from-green-500 hover:to-green-700'
      }`;

  const iconClass = isInline ? 'w-4 h-4' : 'w-7 h-7';

  return (
    <div className={wrapperClass}>
      <div className="relative">
        {/* Main Button */}
        <button
          onClick={() => setShowMenu(!showMenu)}
          disabled={loading || called}
          className={triggerClass}
          title="Call reception"
        >
          <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          {isInline && (
            <span className="hidden xs:inline">{called ? 'Called' : 'Call'}</span>
          )}
        </button>

        {/* Dropdown Menu */}
        {showMenu && !called && (
          <div className="absolute top-full right-0 mt-3 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 min-w-[220px] animate-in fade-in slide-in-from-top-2">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <label className="block text-xs font-bold text-slate-700 mb-3 uppercase tracking-wide">What do you need?</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-medium"
              >
                <option value="Order">🍽️ Order</option>
                <option value="Bill">💳 Bill</option>
                <option value="Water">💧 Water</option>
                <option value="Complaint">⚠️ Complaint</option>
                <option value="Other">❓ Other</option>
              </select>
            </div>
            <button
              onClick={handleCall}
              disabled={loading}
              className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 disabled:from-slate-400 disabled:to-slate-400 transition font-bold text-sm"
            >
              {loading ? '⏳ Sending...' : '✓ Send Call'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TableCallButton;
