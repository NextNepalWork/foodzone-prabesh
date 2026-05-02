import React, { useEffect, useState } from 'react';
import { fetchApi } from '../../services/apiService';
import Sheet from '../components/Sheet';
import useHaptics from '../hooks/useHaptics';

const ROLES = ['admin', 'manager', 'chef', 'waiter', 'cashier'];
const ROLE_COLORS = {
  admin:   '#7c3aed',
  manager: '#e11d48',
  chef:    '#d97706',
  waiter:  '#2563eb',
  cashier: '#16a34a',
};

const blank = { username: '', password: '', fullName: '', email: '', phone: '', role: 'waiter' };

const StaffScreen = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // 'new' or staff obj
  const [draft, setDraft] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [resetSheet, setResetSheet] = useState(null);
  const [newPwd, setNewPwd] = useState('');
  const haptics = useHaptics();

  const load = async () => {
    setLoading(true);
    try {
      const resp = await fetchApi.get('/api/admin/staff');
      setList(resp?.staff || []);
    } catch (e) {
      setList([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setDraft(blank); setEditing('new'); };
  const openEdit = (s) => {
    setDraft({
      username: s.username || '',
      password: '',
      fullName: s.full_name || '',
      email: s.email || '',
      phone: s.phone || '',
      role: s.role || 'waiter',
      isActive: s.is_active,
    });
    setEditing(s);
  };
  const setF = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    if (!draft.username || !draft.fullName || !draft.role) {
      alert('Username, full name and role are required');
      return;
    }
    if (editing === 'new' && !draft.password) {
      alert('Password is required for new staff');
      return;
    }
    setBusy(true);
    try {
      if (editing === 'new') {
        await fetchApi.post('/api/admin/staff', draft);
      } else {
        const payload = { ...draft };
        if (!payload.password) delete payload.password;
        await fetchApi.put(`/api/admin/staff/${editing.id}`, payload);
      }
      haptics.success();
      setEditing(null);
      load();
    } catch (e) {
      haptics.warn();
      alert('Failed to save staff: ' + (e.message || ''));
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (s) => {
    try {
      await fetchApi.put(`/api/admin/staff/${s.id}`, { isActive: !s.is_active });
      haptics.tap();
      load();
    } catch (e) {
      alert('Failed to toggle');
    }
  };

  const remove = async () => {
    if (!editing || editing === 'new') return;
    if (!window.confirm(`Deactivate "${editing.full_name || editing.username}"?`)) return;
    setBusy(true);
    try {
      await fetchApi.delete(`/api/admin/staff/${editing.id}`);
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

  const resetPassword = async () => {
    if (!resetSheet || !newPwd) return;
    setBusy(true);
    try {
      await fetchApi.post(`/api/admin/staff/${resetSheet.id}/reset-password`, { newPassword: newPwd });
      haptics.success();
      setResetSheet(null);
      setNewPwd('');
      alert('Password reset');
    } catch (e) {
      haptics.warn();
      alert('Failed to reset password');
    } finally {
      setBusy(false);
    }
  };

  const active = list.filter((s) => s.is_active);
  const inactive = list.filter((s) => !s.is_active);

  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ padding: '14px 16px 4px' }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>Staff</div>
        <div style={{ fontSize: 13, color: 'var(--m-text-2)' }}>
          {active.length} active · {inactive.length} inactive
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '12px 12px 0' }}>
          {[1,2,3,4].map((i) => <div key={i} className="m-skeleton" style={{ height: 64, marginBottom: 8, borderRadius: 14 }} />)}
        </div>
      ) : list.length === 0 ? (
        <div className="m-empty">
          <div className="m-empty-icon">🧑‍🍳</div>
          <div className="m-empty-title">No staff yet</div>
          <div className="m-empty-msg">Tap + to add a staff member</div>
        </div>
      ) : (
        <>
          {[
            ['Active', active],
            ['Inactive', inactive],
          ].map(([title, group]) => group.length > 0 && (
            <React.Fragment key={title}>
              <div className="m-section-label">{title}</div>
              <div style={{ padding: '0 12px' }}>
                {group.map((s) => (
                  <div
                    key={s.id}
                    className="m-card"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 8,
                      opacity: s.is_active ? 1 : 0.55,
                    }}
                  >
                    <div style={{
                      width: 42, height: 42, borderRadius: 21, background: ROLE_COLORS[s.role] || '#64748b',
                      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800,
                    }}>
                      {(s.full_name || s.username || '?').charAt(0).toUpperCase()}
                    </div>
                    <button
                      onClick={() => openEdit(s)}
                      style={{ flex: 1, textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, minWidth: 0 }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.full_name || s.username}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--m-text-2)', marginTop: 2 }}>
                        @{s.username} · <span style={{ color: ROLE_COLORS[s.role] || '#64748b', fontWeight: 700 }}>{s.role}</span>
                      </div>
                    </button>
                    <button
                      onClick={() => toggleActive(s)}
                      style={{
                        width: 50, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
                        background: s.is_active ? 'var(--m-green)' : '#cbd5e1',
                        position: 'relative', transition: 'background 0.2s',
                      }}
                    >
                      <span style={{
                        position: 'absolute', top: 2, left: s.is_active ? 24 : 2,
                        width: 24, height: 24, borderRadius: '50%', background: '#fff',
                        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                      }} />
                    </button>
                  </div>
                ))}
              </div>
            </React.Fragment>
          ))}
        </>
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

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New Staff' : 'Edit Staff'}>
        <div style={{ padding: '0 16px 16px' }}>
          <Field label="Full name *">
            <input className="m-input" value={draft.fullName} onChange={(e) => setF('fullName', e.target.value)} />
          </Field>
          <Field label="Username *">
            <input className="m-input" value={draft.username} onChange={(e) => setF('username', e.target.value)} />
          </Field>
          {editing === 'new' && (
            <Field label="Password *">
              <input className="m-input" type="password" value={draft.password} onChange={(e) => setF('password', e.target.value)} />
            </Field>
          )}
          <Field label="Role *">
            <select className="m-input" value={draft.role} onChange={(e) => setF('role', e.target.value)} style={{ height: 42 }}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Email">
            <input className="m-input" type="email" value={draft.email} onChange={(e) => setF('email', e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className="m-input" type="tel" value={draft.phone} onChange={(e) => setF('phone', e.target.value)} />
          </Field>

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="m-btn-secondary" style={{ flex: 1 }} onClick={() => setEditing(null)}>Cancel</button>
            <button className="m-btn-primary" style={{ flex: 1 }} onClick={save} disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>

          {editing && editing !== 'new' && (
            <>
              <button
                onClick={() => { setResetSheet(editing); setEditing(null); setNewPwd(''); }}
                style={{ width: '100%', marginTop: 10, height: 44, border: 'none', borderRadius: 12, background: 'transparent', color: 'var(--m-blue)', fontWeight: 600, cursor: 'pointer' }}
              >🔑 Reset Password</button>
              <button
                onClick={remove}
                disabled={busy}
                style={{ width: '100%', marginTop: 6, height: 44, border: 'none', borderRadius: 12, background: 'transparent', color: 'var(--m-red)', fontWeight: 600, cursor: 'pointer' }}
              >🗑️ Deactivate Staff</button>
            </>
          )}
        </div>
      </Sheet>

      <Sheet open={!!resetSheet} onClose={() => setResetSheet(null)} title={`Reset password — ${resetSheet?.username || ''}`}>
        <div style={{ padding: '0 16px 16px' }}>
          <Field label="New password">
            <input className="m-input" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} autoFocus />
          </Field>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className="m-btn-secondary" style={{ flex: 1 }} onClick={() => setResetSheet(null)}>Cancel</button>
            <button className="m-btn-primary" style={{ flex: 1 }} onClick={resetPassword} disabled={busy || !newPwd}>
              {busy ? 'Saving…' : 'Reset'}
            </button>
          </div>
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

export default StaffScreen;
