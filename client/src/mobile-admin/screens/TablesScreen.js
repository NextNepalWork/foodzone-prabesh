import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/apiService';
import TableTile from '../components/TableTile';
import Sheet from '../components/Sheet';
import useHaptics from '../hooks/useHaptics';

const TablesScreen = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tableCount, setTableCount] = useState(25);
  const haptics = useHaptics();

  const load = async () => {
    setLoading(true);
    try {
      const [tSettings, tStatuses] = await Promise.allSettled([
        apiService.getTableSettings(),
        apiService.getTableStatuses(),
      ]);
      if (tSettings.status === 'fulfilled') {
        const v = tSettings.value?.data || tSettings.value || {};
        setTableCount(v.tableCount || v.count || 25);
      }
      if (tStatuses.status === 'fulfilled') {
        const list = tStatuses.value?.data || tStatuses.value || [];
        setTables(Array.isArray(list) ? list : list.tables || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const tableById = new Map(tables.map((t) => [String(t.id || t.tableId), t]));
  const tiles = Array.from({ length: tableCount }, (_, i) => {
    const id = i + 1;
    const t = tableById.get(String(id)) || { id, status: 'empty', orderCount: 0 };
    return t;
  });

  const onClearTable = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await apiService.clearTableAdmin(selected.id || selected.tableId);
      haptics.success();
      setSelected(null);
      load();
    } catch (e) {
      haptics.warn();
      alert('Failed to clear table');
    } finally {
      setBusy(false);
    }
  };

  const stats = {
    occupied: tables.filter((t) => (t.status || '').toLowerCase() !== 'empty').length,
    total: tableCount,
  };

  return (
    <div>
      <div style={{ padding: '14px 16px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px' }}>Tables</div>
          <div style={{ fontSize: 13, color: 'var(--m-text-2)', marginTop: 2 }}>
            {stats.occupied} of {stats.total} occupied
          </div>
        </div>
        <button
          onClick={() => { haptics.tap(); load(); }}
          className="m-btn-secondary"
          style={{ height: 36, fontSize: 13 }}
        >↻</button>
      </div>

      {loading ? (
        <div className="m-table-grid">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="m-skeleton" style={{ aspectRatio: '1/1', borderRadius: 14 }} />
          ))}
        </div>
      ) : (
        <div className="m-table-grid">
          {tiles.map((t) => (
            <TableTile
              key={t.id || t.tableId}
              tableId={t.id || t.tableId}
              status={t.status || 'empty'}
              orderCount={t.orderCount || t.activeOrders || 0}
              onClick={() => { haptics.tap(); setSelected(t); }}
            />
          ))}
        </div>
      )}

      <div style={{ padding: '12px 16px', display: 'flex', gap: 16, fontSize: 11, color: 'var(--m-text-2)', flexWrap: 'wrap' }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'var(--m-amber)', marginRight: 6 }} />Occupied</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'var(--m-blue)', marginRight: 6 }} />Ordering</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'var(--m-green)', marginRight: 6 }} />Dining</span>
      </div>

      <Sheet open={!!selected} onClose={() => setSelected(null)} title={selected ? `Table ${selected.id || selected.tableId}` : ''}>
        {selected && (
          <div style={{ padding: '0 16px' }}>
            <div style={{ fontSize: 13, color: 'var(--m-text-2)', textAlign: 'center', marginBottom: 16 }}>
              Status: <b style={{ color: 'var(--m-text)' }}>{selected.status || 'empty'}</b>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                className="m-btn-primary"
                style={{ background: 'var(--m-red)' }}
                onClick={onClearTable}
                disabled={busy}
              >
                {busy ? 'Clearing…' : '🧹 Clear Table'}
              </button>
              <button className="m-btn-secondary" onClick={() => setSelected(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
};

export default TablesScreen;
