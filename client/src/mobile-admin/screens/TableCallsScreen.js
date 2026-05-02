import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { fetchApi, getSocketUrl } from '../../services/apiService';
import useHaptics from '../hooks/useHaptics';

const fmtTime = (d) => {
  if (!d) return '';
  const t = new Date(d);
  return t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
const elapsed = (d) => {
  if (!d) return '';
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
};

const TableCallsScreen = () => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const haptics = useHaptics();

  const load = async () => {
    setLoading(true);
    try {
      const resp = await fetchApi.get('/api/table-calls');
      setCalls(resp?.calls || []);
    } catch (e) {
      setCalls([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Listen for new calls in real time
  useEffect(() => {
    let socket;
    try {
      socket = io(getSocketUrl(), { transports: ['websocket', 'polling'] });
      socket.on('tableCall', (call) => {
        haptics.tap(40);
        setCalls((prev) => {
          if (prev.some((c) => c.id === call.id)) return prev;
          return [{ ...call, table_id: call.tableId, created_at: call.createdAt }, ...prev];
        });
      });
      socket.on('callResponded', (call) => {
        setCalls((prev) => prev.map((c) => c.id === call.id ? { ...c, status: 'responded' } : c));
      });
      socket.on('callResolved', (call) => {
        setCalls((prev) => prev.filter((c) => c.id !== call.id));
      });
    } catch (_) {}
    return () => { try { socket && socket.disconnect(); } catch (_) {} };
  }, [haptics]);

  const respond = async (call) => {
    setBusyId(call.id);
    try {
      await fetchApi.put(`/api/table-calls/${call.id}/respond`, {});
      haptics.success();
      setCalls((prev) => prev.map((c) => c.id === call.id ? { ...c, status: 'responded' } : c));
    } catch (e) {
      haptics.warn();
      alert('Failed to respond');
    } finally {
      setBusyId(null);
    }
  };

  const resolve = async (call) => {
    setBusyId(call.id);
    try {
      await fetchApi.put(`/api/table-calls/${call.id}/resolve`, {});
      haptics.success();
      setCalls((prev) => prev.filter((c) => c.id !== call.id));
    } catch (e) {
      haptics.warn();
      alert('Failed to resolve');
    } finally {
      setBusyId(null);
    }
  };

  const pending = calls.filter((c) => c.status === 'pending');
  const responded = calls.filter((c) => c.status === 'responded');

  return (
    <div style={{ paddingBottom: 30 }}>
      <div style={{ padding: '14px 16px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Table Calls</div>
          <div style={{ fontSize: 13, color: 'var(--m-text-2)' }}>
            {pending.length} pending, {responded.length} in progress
          </div>
        </div>
        <button onClick={() => { haptics.tap(); load(); }} className="m-btn-secondary" style={{ height: 36, fontSize: 13 }}>↻</button>
      </div>

      {loading ? (
        <div style={{ padding: '0 12px' }}>
          {[1,2,3].map((i) => <div key={i} className="m-skeleton" style={{ height: 80, marginBottom: 10, borderRadius: 14 }} />)}
        </div>
      ) : calls.length === 0 ? (
        <div className="m-empty">
          <div className="m-empty-icon">🔕</div>
          <div className="m-empty-title">No active calls</div>
          <div className="m-empty-msg">Table requests will appear here in real-time</div>
        </div>
      ) : (
        <div style={{ padding: '4px 12px' }}>
          {calls.map((call) => {
            const isPending = call.status === 'pending';
            const tableId = call.table_id || call.tableId;
            return (
              <div
                key={call.id}
                className="m-card"
                style={{
                  padding: 14, marginBottom: 10,
                  borderLeft: `4px solid ${isPending ? 'var(--m-red)' : 'var(--m-amber)'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800 }}>🔔 Table {tableId}</div>
                    <div style={{ fontSize: 13, color: 'var(--m-text-2)', marginTop: 2 }}>
                      {call.reason || 'Service requested'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 8,
                      background: isPending ? '#fee2e2' : '#fef3c7',
                      color: isPending ? '#dc2626' : '#d97706',
                    }}>{call.status}</span>
                    <div style={{ fontSize: 11, color: 'var(--m-text-2)', marginTop: 4 }}>
                      {fmtTime(call.created_at)} · {elapsed(call.created_at)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {isPending && (
                    <button
                      className="m-btn-secondary"
                      style={{ flex: 1, height: 38 }}
                      onClick={() => respond(call)}
                      disabled={busyId === call.id}
                    >
                      ✋ Respond
                    </button>
                  )}
                  <button
                    className="m-btn-primary"
                    style={{ flex: 1, height: 38, background: 'var(--m-green)' }}
                    onClick={() => resolve(call)}
                    disabled={busyId === call.id}
                  >
                    ✓ Resolve
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TableCallsScreen;
