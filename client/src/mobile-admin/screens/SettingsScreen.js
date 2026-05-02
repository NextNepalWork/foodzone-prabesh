import React, { useEffect, useState } from 'react';
import { getApiUrl } from '../../config/api';
import ListRow from '../components/ListRow';
import Sheet from '../components/Sheet';
import useHaptics from '../hooks/useHaptics';

// Fetches the server's settings catalog and values, groups them into
// iOS-style list sections. Tap a section → edit sheet with fields.

const SettingsScreen = ({ onBack }) => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // section obj
  const [draft, setDraft] = useState({});       // { key: value }
  const [saving, setSaving] = useState(false);
  const haptics = useHaptics();

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const resp = await fetch(`${getApiUrl()}/api/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      setSections(data.sections || []);
    } catch (e) {
      setSections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openSection = (section) => {
    const d = {};
    section.fields.forEach((f) => { d[f.key] = f.value ?? f.default; });
    setDraft(d);
    setEditing(section);
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const items = Object.entries(draft).map(([key, value]) => ({ key, value }));
      const token = localStorage.getItem('adminToken');
      const resp = await fetch(`${getApiUrl()}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items }),
      });
      if (!resp.ok) throw new Error('save failed');
      haptics.success();
      setEditing(null);
      load();
    } catch (e) {
      haptics.warn();
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const setField = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  const renderField = (f) => {
    const v = draft[f.key];
    if (f.type === 'bool') {
      return (
        <label key={f.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--m-border)' }}>
          <span style={{ fontSize: 15 }}>{f.label}</span>
          <input
            type="checkbox"
            checked={!!v}
            onChange={(e) => setField(f.key, e.target.checked)}
            style={{ width: 20, height: 20 }}
          />
        </label>
      );
    }
    if (f.type === 'select') {
      return (
        <div key={f.key} style={{ padding: '10px 16px', borderTop: '1px solid var(--m-border)' }}>
          <div style={{ fontSize: 12, color: 'var(--m-text-2)', marginBottom: 4 }}>{f.label}</div>
          <select
            value={v ?? ''}
            onChange={(e) => setField(f.key, e.target.value)}
            className="m-input"
            style={{ height: 42 }}
          >
            {(f.options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      );
    }
    if (f.type === 'number') {
      return (
        <div key={f.key} style={{ padding: '10px 16px', borderTop: '1px solid var(--m-border)' }}>
          <div style={{ fontSize: 12, color: 'var(--m-text-2)', marginBottom: 4 }}>
            {f.label} {f.unit && <span>({f.unit})</span>}
          </div>
          <input
            type="number"
            value={v ?? ''}
            step={f.step || 1}
            min={f.min}
            max={f.max}
            onChange={(e) => setField(f.key, e.target.value)}
            className="m-input"
            style={{ height: 42 }}
          />
        </div>
      );
    }
    if (f.type === 'text') {
      return (
        <div key={f.key} style={{ padding: '10px 16px', borderTop: '1px solid var(--m-border)' }}>
          <div style={{ fontSize: 12, color: 'var(--m-text-2)', marginBottom: 4 }}>{f.label}</div>
          <textarea
            value={v ?? ''}
            onChange={(e) => setField(f.key, e.target.value)}
            className="m-input"
            style={{ height: 80, padding: 10, resize: 'none' }}
          />
        </div>
      );
    }
    // default: string/time/color/password/image
    return (
      <div key={f.key} style={{ padding: '10px 16px', borderTop: '1px solid var(--m-border)' }}>
        <div style={{ fontSize: 12, color: 'var(--m-text-2)', marginBottom: 4 }}>{f.label}</div>
        <input
          type={f.type === 'password' ? 'password' : f.type === 'time' ? 'time' : f.type === 'color' ? 'color' : 'text'}
          value={v ?? ''}
          placeholder={f.placeholder}
          onChange={(e) => setField(f.key, e.target.value)}
          className="m-input"
          style={{ height: 42 }}
        />
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: 30 }}>
      <div style={{ padding: '14px 16px 4px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px' }}>Settings</div>
        <div style={{ fontSize: 13, color: 'var(--m-text-2)', marginTop: 2 }}>
          System-wide restaurant configuration
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 16 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="m-skeleton" style={{ height: 54, marginBottom: 8, borderRadius: 12 }} />
          ))}
        </div>
      ) : sections.length === 0 ? (
        <div className="m-empty">
          <div className="m-empty-icon">⚙️</div>
          <div className="m-empty-title">Couldn't load settings</div>
          <div className="m-empty-msg">Check connection and try again</div>
        </div>
      ) : (
        <div className="m-list" style={{ marginTop: 10 }}>
          {sections.map((s) => (
            <ListRow
              key={s.id}
              icon={s.icon || '⚙️'}
              iconBg="#475569"
              label={s.label}
              value={`${s.fields?.length || 0} options`}
              onClick={() => { haptics.tap(); openSection(s); }}
            />
          ))}
        </div>
      )}

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing?.label}>
        {editing && (
          <>
            {editing.description && (
              <div style={{ padding: '0 16px 12px', fontSize: 13, color: 'var(--m-text-2)', textAlign: 'center' }}>
                {editing.description}
              </div>
            )}
            <div>
              {editing.fields.map(renderField)}
            </div>
            <div style={{ padding: '16px', display: 'flex', gap: 10 }}>
              <button className="m-btn-secondary" style={{ flex: 1 }} onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="m-btn-primary" style={{ flex: 1, height: 44 }} onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
};

export default SettingsScreen;
