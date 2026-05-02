import React, { useEffect, useMemo, useState } from 'react';
import { fetchApi } from '../../services/apiService';
import Sheet from '../components/Sheet';
import useHaptics from '../hooks/useHaptics';

const blank = {
  name: '',
  price: '',
  category: '',
  description: '',
  is_available: true,
  is_vegetarian: false,
  is_spicy: false,
  preparation_time: '',
};

const MenuScreen = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [editing, setEditing] = useState(null); // item or 'new'
  const [draft, setDraft] = useState(blank);
  const [busy, setBusy] = useState(false);
  const haptics = useHaptics();

  const load = async () => {
    setLoading(true);
    try {
      // Bypass cache for admin
      sessionStorage.removeItem('menuCache');
      sessionStorage.removeItem('menuCacheTime');
      const data = await fetchApi.get('/api/menu');
      const list = Array.isArray(data) ? data : data.items || [];
      setItems(list);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (filterCat !== 'all' && i.category !== filterCat) return false;
      if (q && !(i.name || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, filterCat, search]);

  const openNew = () => {
    setDraft({ ...blank, category: filterCat !== 'all' ? filterCat : '' });
    setEditing('new');
  };

  const openEdit = (item) => {
    setDraft({
      name: item.name || '',
      price: item.price ?? '',
      category: item.category || '',
      description: item.description || '',
      is_available: !!item.is_available,
      is_vegetarian: !!item.is_vegetarian,
      is_spicy: !!item.is_spicy,
      preparation_time: item.preparation_time ?? '',
    });
    setEditing(item);
  };

  const setF = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    if (!draft.name || !draft.price || !draft.category) {
      alert('Name, price and category are required');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...draft,
        price: Number(draft.price),
        preparation_time: draft.preparation_time === '' ? null : Number(draft.preparation_time),
      };
      if (editing === 'new') {
        await fetchApi.post('/api/menu', payload);
      } else {
        await fetchApi.put(`/api/menu/${editing.id}`, payload);
      }
      haptics.success();
      setEditing(null);
      load();
    } catch (e) {
      haptics.warn();
      alert('Failed to save: ' + (e.message || ''));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (item) => {
    haptics.tap();
    try {
      await fetchApi.patch(`/api/menu/${item.id}/toggle`, {});
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, is_available: !i.is_available } : i));
    } catch (e) {
      alert('Failed to toggle');
    }
  };

  const remove = async () => {
    if (!editing || editing === 'new') return;
    if (!window.confirm(`Delete "${editing.name}"?`)) return;
    setBusy(true);
    try {
      await fetchApi.delete(`/api/menu/${editing.id}`);
      haptics.success();
      setEditing(null);
      load();
    } catch (e) {
      haptics.warn();
      alert('Failed to delete');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ padding: '12px 16px 8px', position: 'sticky', top: 0, zIndex: 2, background: 'var(--m-bg)' }}>
        <input
          className="m-input"
          placeholder="🔍 Search menu items"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ height: 42 }}
        />
      </div>

      <div className="m-chip-row" style={{ position: 'sticky', top: 60, background: 'var(--m-bg)', zIndex: 2 }}>
        {categories.map((c) => (
          <button
            key={c}
            className={`m-chip ${filterCat === c ? 'active' : ''}`}
            onClick={() => { haptics.tap(); setFilterCat(c); }}
          >
            {c === 'all' ? 'All' : c} {c !== 'all' && <span style={{ opacity: 0.7 }}>· {items.filter(i => i.category === c).length}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '0 12px' }}>
          {[1,2,3,4].map((i) => <div key={i} className="m-skeleton" style={{ height: 64, marginBottom: 8, borderRadius: 14 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="m-empty">
          <div className="m-empty-icon">🍔</div>
          <div className="m-empty-title">No menu items</div>
          <div className="m-empty-msg">Tap + to add your first dish</div>
        </div>
      ) : (
        <div style={{ padding: '4px 12px' }}>
          {filtered.map((item) => (
            <div
              key={item.id}
              className="m-card"
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 8 }}
            >
              <button
                onClick={() => openEdit(item)}
                style={{ flex: 1, textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {item.name}
                  {item.is_vegetarian && <span style={{ marginLeft: 6 }}>🌿</span>}
                  {item.is_spicy && <span style={{ marginLeft: 4 }}>🌶️</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--m-text-2)', marginTop: 2 }}>
                  {item.category} · Rs. {Number(item.price).toFixed(0)}
                </div>
              </button>
              <button
                onClick={() => toggle(item)}
                style={{
                  width: 50, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: item.is_available ? 'var(--m-green)' : '#cbd5e1',
                  position: 'relative', transition: 'background 0.2s',
                }}
                title={item.is_available ? 'Available' : 'Unavailable'}
              >
                <span style={{
                  position: 'absolute', top: 2, left: item.is_available ? 24 : 2,
                  width: 24, height: 24, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => { haptics.tap(); openNew(); }}
        style={{
          position: 'fixed', right: 20, bottom: 'calc(var(--tabbar-h) + var(--sa-bottom) + 20px)',
          width: 56, height: 56, borderRadius: 28, border: 'none',
          background: 'var(--m-brand)', color: '#fff', fontSize: 28,
          boxShadow: '0 6px 20px rgba(225,29,72,0.4)', cursor: 'pointer', zIndex: 5,
        }}
      >+</button>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New Menu Item' : 'Edit Item'}>
        <div style={{ padding: '0 16px 16px' }}>
          <Field label="Name *">
            <input className="m-input" value={draft.name} onChange={(e) => setF('name', e.target.value)} />
          </Field>
          <Field label="Category *">
            <input className="m-input" value={draft.category} onChange={(e) => setF('category', e.target.value)} list="cat-list" />
            <datalist id="cat-list">
              {categories.filter((c) => c !== 'all').map((c) => <option key={c} value={c} />)}
            </datalist>
          </Field>
          <Field label="Price (Rs) *">
            <input className="m-input" type="number" value={draft.price} onChange={(e) => setF('price', e.target.value)} />
          </Field>
          <Field label="Prep time (min)">
            <input className="m-input" type="number" value={draft.preparation_time} onChange={(e) => setF('preparation_time', e.target.value)} />
          </Field>
          <Field label="Description">
            <textarea className="m-input" value={draft.description} onChange={(e) => setF('description', e.target.value)}
              style={{ height: 70, padding: 10, resize: 'none' }} />
          </Field>
          <Toggle label="Available" value={draft.is_available} onChange={(v) => setF('is_available', v)} />
          <Toggle label="Vegetarian" value={draft.is_vegetarian} onChange={(v) => setF('is_vegetarian', v)} />
          <Toggle label="Spicy" value={draft.is_spicy} onChange={(v) => setF('is_spicy', v)} />

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="m-btn-secondary" style={{ flex: 1 }} onClick={() => setEditing(null)}>Cancel</button>
            <button className="m-btn-primary" style={{ flex: 1 }} onClick={save} disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
          {editing && editing !== 'new' && (
            <button
              onClick={remove}
              disabled={busy}
              style={{
                width: '100%', marginTop: 10, height: 44, border: 'none', borderRadius: 12,
                background: 'transparent', color: 'var(--m-red)', fontWeight: 600, cursor: 'pointer'
              }}
            >🗑️ Delete Item</button>
          )}
        </div>
      </Sheet>
    </div>
  );
};

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 10 }}>
    <div style={{ fontSize: 12, color: 'var(--m-text-2)', marginBottom: 4 }}>{label}</div>
    {children}
  </div>
);

const Toggle = ({ label, value, onChange }) => (
  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--m-border)' }}>
    <span style={{ fontSize: 14 }}>{label}</span>
    <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} style={{ width: 20, height: 20 }} />
  </label>
);

export default MenuScreen;
