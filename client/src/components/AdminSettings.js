import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { fetchApi } from '../services/apiService';
import settingsService from '../services/settingsService';

/* =============================================================
   Comprehensive Admin Settings
   - Loads full catalog from the server (sections + fields + values)
   - Left sidebar: sections. Right: fields for the active section.
   - Tracks dirty state and batches saves via PUT /api/settings.
   - Special sections (hours, delivery zones, payment methods, tenant)
     render custom editors in addition to the key/value fields.
   - All UI dimensions and limits are now dynamic from settings.
   ============================================================= */

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Default UI settings (fallback if settings not loaded)
const DEFAULT_UI_SETTINGS = {
  image_upload_max_mb: 2,
  sidebar_width_px: 256,
  image_preview_size_px: 80,
  header_height_px: 100,
};

const AdminSettings = () => {
  const [catalog, setCatalog] = useState([]);
  const [values, setValues] = useState({});
  const [initial, setInitial] = useState({});
  const [activeSection, setActiveSection] = useState('business');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const [hours, setHours] = useState([]);
  const [zones, setZones] = useState([]);
  const [methods, setMethods] = useState([]);
  const [tenant, setTenant] = useState(null);

  // UI settings
  const [uiSettings, setUiSettings] = useState(DEFAULT_UI_SETTINGS);

  const flash = useCallback((message, tone = 'success') => {
    const timeouts = settingsService.getTimeoutSettings();
    setToast({ message, tone });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), timeouts.toastDurationMs);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cat, hoursRes, zonesRes, methodsRes, tenantRes] = await Promise.all([
        fetchApi.get('/api/settings'),
        fetchApi.get('/api/settings/operating-hours').catch(() => ({ hours: [] })),
        fetchApi.get('/api/settings/delivery-zones').catch(() => ({ zones: [] })),
        fetchApi.get('/api/settings/payment-methods').catch(() => ({ methods: [] })),
        fetchApi.get('/api/settings/tenant').catch(() => null),
      ]);

      const sections = cat?.sections || [];
      const flat = {};
      sections.forEach(s => s.fields.forEach(f => { flat[f.key] = f.value; }));

      setCatalog(sections);
      setValues(flat);
      setInitial(flat);
      setHours(hoursRes?.hours || []);
      setZones(zonesRes?.zones || []);
      setMethods(methodsRes?.methods || []);
      setTenant(tenantRes);

      // Extract UI settings
      const ui = {
        image_upload_max_mb: flat['ui.image_upload_max_mb'] ?? DEFAULT_UI_SETTINGS.image_upload_max_mb,
        sidebar_width_px: flat['ui.sidebar_width_px'] ?? DEFAULT_UI_SETTINGS.sidebar_width_px,
        image_preview_size_px: flat['ui.image_preview_size_px'] ?? DEFAULT_UI_SETTINGS.image_preview_size_px,
        header_height_px: flat['ui.header_height_px'] ?? DEFAULT_UI_SETTINGS.header_height_px,
      };
      setUiSettings(ui);
    } catch (e) {
      console.error(e);
      flash('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  }, [flash]);

  useEffect(() => { load(); }, [load]);

  const section = catalog.find(s => s.id === activeSection) || catalog[0];

  const dirtyKeys = useMemo(() => {
    const out = [];
    for (const k of Object.keys(values)) {
      if (JSON.stringify(values[k]) !== JSON.stringify(initial[k])) out.push(k);
    }
    return out;
  }, [values, initial]);

  const update = (key, value) => setValues(v => ({ ...v, [key]: value }));

  const saveAll = async () => {
    if (!dirtyKeys.length) return flash('Nothing to save', 'info');
    setSaving(true);
    try {
      const items = dirtyKeys.map(k => ({ key: k, value: values[k] }));
      await fetchApi.put('/api/settings', { items });
      setInitial({ ...values });
      flash(`Saved ${items.length} setting${items.length === 1 ? '' : 's'}`);
    } catch (e) {
      flash(e.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetSection = async () => {
    if (!section) return;
    if (!window.confirm(`Reset "${section.label}" to default values?`)) return;
    try {
      await fetchApi.post(`/api/settings/reset/${section.id}`);
      flash('Section reset');
      load();
    } catch (e) {
      flash(e.message || 'Reset failed', 'error');
    }
  };

  const revertSection = () => {
    if (!section) return;
    setValues(v => {
      const next = { ...v };
      section.fields.forEach(f => { next[f.key] = initial[f.key]; });
      return next;
    });
    flash('Reverted unsaved changes in this section');
  };

  return (
    <div className="flex flex-col" style={{ height: `calc(100vh - ${uiSettings.header_height_px}px)` }}>
      {/* Top bar */}
      <div className="flex-shrink-0 bg-white rounded-2xl ring-1 ring-slate-200 px-4 py-3 flex items-center flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">⚙️ Settings</h2>
          <div className="text-xs text-slate-500 mt-0.5">Control everything about your restaurant — from branding to hours to delivery</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {dirtyKeys.length > 0 && (
            <div className="text-xs font-semibold text-amber-700 bg-amber-50 ring-1 ring-amber-200 px-2 py-1 rounded-md">
              {dirtyKeys.length} unsaved
            </div>
          )}
          <button onClick={revertSection}
            className="px-3 py-2 rounded-lg ring-1 ring-slate-200 text-sm hover:bg-slate-50">
            Revert section
          </button>
          <button onClick={resetSection}
            className="px-3 py-2 rounded-lg ring-1 ring-rose-200 text-sm text-rose-700 hover:bg-rose-50">
            Reset to defaults
          </button>
          <button disabled={saving || !dirtyKeys.length} onClick={saveAll}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Saving…' : `Save ${dirtyKeys.length ? `(${dirtyKeys.length})` : 'all'}`}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <div className="flex-1 min-h-0 mt-4 flex gap-4 overflow-hidden">
          {/* Sidebar */}
          <aside className="flex-shrink-0 overflow-y-auto bg-white rounded-2xl ring-1 ring-slate-200 p-2" style={{ width: `${uiSettings.sidebar_width_px}px` }}>
            {catalog.map(s => {
              const active = s.id === activeSection;
              const sectionDirty = s.fields.some(f => JSON.stringify(values[f.key]) !== JSON.stringify(initial[f.key]));
              return (
                <button key={s.id} onClick={() => setActiveSection(s.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 mb-0.5 transition-colors ${
                    active ? 'bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200' : 'hover:bg-slate-50 text-slate-700'
                  }`}>
                  <span className="text-lg">{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{s.label}</div>
                    <div className="text-[11px] text-slate-500 truncate">{s.description}</div>
                  </div>
                  {sectionDirty && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                </button>
              );
            })}
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0 overflow-y-auto pr-1">
            {!section ? null : (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-xl">{section.icon}</div>
                    <div>
                      <div className="text-lg font-bold text-slate-900">{section.label}</div>
                      <div className="text-xs text-slate-500">{section.description}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {section.fields.map(f => (
                      <FieldRenderer key={f.key} field={f} value={values[f.key]} onChange={v => update(f.key, v)} uiSettings={uiSettings} />
                    ))}
                  </div>
                </div>

                {/* Linked editors */}
                {section.linked?.weekly && (
                  <WeeklyHoursEditor hours={hours} setHours={setHours} flash={flash} />
                )}
                {section.linked?.zones && (
                  <DeliveryZonesEditor zones={zones} setZones={setZones} flash={flash} values={values} />
                )}
                {section.id === 'integrations' && (
                  <PaymentMethodsEditor methods={methods} setMethods={setMethods} flash={flash} />
                )}
                {section.linked?.tenant && (
                  <TenantEditor tenant={tenant} setTenant={setTenant} flash={flash} />
                )}
                {section.id === 'tables' && (
                  <QRCodeUploadEditor values={values} update={update} flash={flash} uiSettings={uiSettings} />
                )}

                {/* Floating save reminder */}
                {dirtyKeys.length > 0 && (
                  <div className="sticky bottom-2 bg-slate-900 text-white px-4 py-3 rounded-2xl flex items-center justify-between shadow-lg">
                    <div className="text-sm">
                      You have <b>{dirtyKeys.length}</b> unsaved change{dirtyKeys.length === 1 ? '' : 's'}.
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setValues({ ...initial })} className="text-xs px-3 py-1.5 rounded-lg ring-1 ring-white/20 hover:bg-white/5">Discard all</button>
                      <button disabled={saving} onClick={saveAll}
                        className="text-sm px-4 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 font-semibold disabled:opacity-50">
                        {saving ? 'Saving…' : 'Save changes'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg text-sm font-semibold text-white z-50 ${
          toast.tone === 'error' ? 'bg-rose-600' : toast.tone === 'info' ? 'bg-slate-700' : 'bg-emerald-600'
        }`}>{toast.message}</div>
      )}
    </div>
  );
};

/* ============================================================
   Field renderer — one component per field type
   ============================================================ */
const inp = 'w-full px-3 py-2 rounded-lg ring-1 ring-slate-200 text-sm focus:ring-indigo-400 focus:outline-none bg-white';

const FieldWrap = ({ field, children }) => (
  <div className={field.type === 'text' || field.type === 'image' ? 'md:col-span-2' : ''}>
    <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1 flex items-center gap-2">
      <span>{field.label}</span>
      {field.public && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-200">public</span>}
    </label>
    {children}
    {field.help && <div className="text-[11px] text-slate-500 mt-1">{field.help}</div>}
  </div>
);

const FieldRenderer = ({ field, value, onChange, uiSettings = DEFAULT_UI_SETTINGS }) => {
  const type = field.type;

  if (type === 'bool') {
    return (
      <FieldWrap field={field}>
        <label className="inline-flex items-center gap-3 cursor-pointer select-none">
          <span className={`relative inline-block w-11 h-6 rounded-full transition-colors ${value ? 'bg-indigo-600' : 'bg-slate-300'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
          </span>
          <input type="checkbox" className="sr-only" checked={!!value} onChange={e => onChange(e.target.checked)} />
          <span className="text-sm text-slate-700">{value ? 'Enabled' : 'Disabled'}</span>
        </label>
      </FieldWrap>
    );
  }

  if (type === 'number') {
    return (
      <FieldWrap field={field}>
        <div className="flex items-stretch">
          <input type="number" step={field.step || 1} min={field.min} max={field.max}
            value={value ?? ''} onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            className={`${inp} ${field.unit ? 'rounded-r-none' : ''}`} />
          {field.unit && <span className="px-3 inline-flex items-center bg-slate-50 text-xs text-slate-600 ring-1 ring-slate-200 rounded-r-lg border-l-0">{field.unit}</span>}
        </div>
      </FieldWrap>
    );
  }

  if (type === 'select') {
    return (
      <FieldWrap field={field}>
        <select value={value ?? ''} onChange={e => onChange(e.target.value)} className={inp}>
          {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </FieldWrap>
    );
  }

  if (type === 'color') {
    return (
      <FieldWrap field={field}>
        <div className="flex items-center gap-2">
          <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)} className="w-10 h-10 rounded-lg ring-1 ring-slate-200 cursor-pointer" />
          <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} className={inp} />
        </div>
      </FieldWrap>
    );
  }

  if (type === 'time') {
    return (
      <FieldWrap field={field}>
        <input type="time" value={value || ''} onChange={e => onChange(e.target.value)} className={inp} />
      </FieldWrap>
    );
  }

  if (type === 'text') {
    return (
      <FieldWrap field={field}>
        <textarea rows={3} value={value ?? ''} onChange={e => onChange(e.target.value)} className={inp} />
      </FieldWrap>
    );
  }

  if (type === 'password') {
    return (
      <FieldWrap field={field}>
        <input type="password" value={value ?? ''} onChange={e => onChange(e.target.value)} className={inp} autoComplete="new-password" />
      </FieldWrap>
    );
  }

  if (type === 'weekdays') {
    const days = Array.isArray(value) ? value : [];
    const toggle = (d) => {
      const has = days.includes(d);
      onChange(has ? days.filter(x => x !== d) : [...days, d].sort((a, b) => a - b));
    };
    return (
      <FieldWrap field={field}>
        <div className="flex gap-1 flex-wrap">
          {DAY_LABELS.map((lbl, i) => {
            const on = days.includes(i);
            return (
              <button key={i} type="button" onClick={() => toggle(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ring-1 transition-colors ${
                  on ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
                }`}>{lbl}</button>
            );
          })}
        </div>
      </FieldWrap>
    );
  }

  if (type === 'image') {
    return (
      <FieldWrap field={field}>
        <ImageField value={value} onChange={onChange} maxMb={uiSettings.image_upload_max_mb} previewSizePx={uiSettings.image_preview_size_px} />
      </FieldWrap>
    );
  }

  // default string
  return (
    <FieldWrap field={field}>
      <input type="text" value={value ?? ''} placeholder={field.placeholder}
        onChange={e => onChange(e.target.value)} className={inp} />
    </FieldWrap>
  );
};

const ImageField = ({ value, onChange, maxMb = DEFAULT_UI_SETTINGS.image_upload_max_mb, previewSizePx = DEFAULT_UI_SETTINGS.image_preview_size_px }) => {
  const inputRef = useRef(null);
  const pickFile = () => inputRef.current?.click();
  const onFile = (file) => {
    if (!file) return;
    const maxBytes = maxMb * 1024 * 1024;
    if (file.size > maxBytes) {
      alert(`Image too large. Max ${maxMb}MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result); // stored as data URL
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="rounded-xl ring-1 ring-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden" style={{ width: `${previewSizePx}px`, height: `${previewSizePx}px` }}>
        {value ? (
          <img src={value} alt="preview" className="w-full h-full object-contain" />
        ) : (
          <span className="text-slate-300 text-2xl">🖼️</span>
        )}
      </div>
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex gap-2">
          <button type="button" onClick={pickFile}
            className="px-3 py-1.5 rounded-lg ring-1 ring-slate-200 text-sm hover:bg-slate-50">Upload image</button>
          {value && <button type="button" onClick={() => onChange('')}
            className="px-3 py-1.5 rounded-lg ring-1 ring-rose-200 text-sm text-rose-700 hover:bg-rose-50">Remove</button>}
        </div>
        <input type="text" placeholder="or paste an image URL…" value={value || ''}
          onChange={e => onChange(e.target.value)} className={inp} />
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => onFile(e.target.files?.[0])} />
    </div>
  );
};

/* ============================================================
   Weekly hours editor
   ============================================================ */
const WeeklyHoursEditor = ({ hours, setHours, flash }) => {
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hours?.length) return;
    setRows(hours.map(h => ({
      weekday: h.weekday,
      is_open: h.is_open,
      open_time: (h.open_time || '09:00').slice(0, 5),
      close_time: (h.close_time || '22:00').slice(0, 5),
      break_start: h.break_start ? h.break_start.slice(0, 5) : '',
      break_end: h.break_end ? h.break_end.slice(0, 5) : '',
    })));
  }, [hours]);

  const updateRow = (idx, patch) => setRows(r => r.map((row, i) => i === idx ? { ...row, ...patch } : row));

  const save = async () => {
    setSaving(true);
    try {
      await fetchApi.put('/api/settings/operating-hours', {
        hours: rows.map(r => ({
          weekday: r.weekday,
          is_open: !!r.is_open,
          open_time: r.open_time,
          close_time: r.close_time,
          break_start: r.break_start || null,
          break_end: r.break_end || null,
        })),
      });
      setHours(rows.map(r => ({ ...r })));
      flash('Weekly hours saved');
    } catch (e) {
      flash(e.message || 'Failed to save hours', 'error');
    } finally {
      setSaving(false);
    }
  };

  const copyToAll = (idx) => {
    const src = rows[idx];
    setRows(r => r.map(row => ({
      ...row,
      is_open: src.is_open,
      open_time: src.open_time,
      close_time: src.close_time,
      break_start: src.break_start,
      break_end: src.break_end,
    })));
    flash('Copied to all days');
  };

  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-bold text-slate-900">Weekly opening hours</div>
          <div className="text-xs text-slate-500">Times customers can order. Use breaks if you close for lunch.</div>
        </div>
        <button disabled={saving} onClick={save}
          className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save hours'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
              <th className="px-2 py-2 w-20">Day</th>
              <th className="px-2 py-2 w-24">Open?</th>
              <th className="px-2 py-2">Open</th>
              <th className="px-2 py-2">Close</th>
              <th className="px-2 py-2">Break start</th>
              <th className="px-2 py-2">Break end</th>
              <th className="px-2 py-2 w-28"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.weekday} className="border-t border-slate-100">
                <td className="px-2 py-2 font-semibold text-slate-700">{DAY_LABELS[r.weekday]}</td>
                <td className="px-2 py-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!r.is_open} onChange={e => updateRow(i, { is_open: e.target.checked })} />
                    <span className={`text-xs font-semibold ${r.is_open ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {r.is_open ? 'Open' : 'Closed'}
                    </span>
                  </label>
                </td>
                <td className="px-2 py-2"><input type="time" disabled={!r.is_open} value={r.open_time} onChange={e => updateRow(i, { open_time: e.target.value })} className={inp} /></td>
                <td className="px-2 py-2"><input type="time" disabled={!r.is_open} value={r.close_time} onChange={e => updateRow(i, { close_time: e.target.value })} className={inp} /></td>
                <td className="px-2 py-2"><input type="time" disabled={!r.is_open} value={r.break_start} onChange={e => updateRow(i, { break_start: e.target.value })} className={inp} /></td>
                <td className="px-2 py-2"><input type="time" disabled={!r.is_open} value={r.break_end} onChange={e => updateRow(i, { break_end: e.target.value })} className={inp} /></td>
                <td className="px-2 py-2 text-right">
                  <button onClick={() => copyToAll(i)} className="text-xs text-indigo-600 hover:underline">Copy to all</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ============================================================
   Delivery zones editor
   ============================================================ */
const DeliveryZonesEditor = ({ zones, setZones, flash, values = {} }) => {
  // Get defaults from settings
  const defaultMinOrder = values['delivery.min_order_delivery'] ?? 0;
  const defaultEstimatedMin = values['delivery.estimated_min'] ?? 30;
  
  const [form, setForm] = useState({ name: '', max_distance_km: '', fee: '', min_order_amount: defaultMinOrder, estimated_minutes: defaultEstimatedMin, is_active: true });

  const add = async () => {
    if (!form.name || form.max_distance_km === '' || form.fee === '') {
      return flash('Name, radius and fee required', 'error');
    }
    try {
      const row = await fetchApi.post('/api/settings/delivery-zones', {
        ...form,
        max_distance_km: Number(form.max_distance_km),
        fee: Number(form.fee),
        min_order_amount: Number(form.min_order_amount || 0),
        estimated_minutes: Number(form.estimated_minutes || 30),
      });
      setZones(z => [...z, row]);
      setForm({ name: '', max_distance_km: '', fee: '', min_order_amount: defaultMinOrder, estimated_minutes: defaultEstimatedMin, is_active: true });
      flash('Zone added');
    } catch (e) {
      flash(e.message || 'Failed to add zone', 'error');
    }
  };

  const update = async (id, patch) => {
    try {
      const row = await fetchApi.put(`/api/settings/delivery-zones/${id}`, patch);
      setZones(z => z.map(x => x.id === id ? row : x));
    } catch (e) {
      flash(e.message || 'Update failed', 'error');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this zone?')) return;
    try {
      await fetchApi.delete(`/api/settings/delivery-zones/${id}`);
      setZones(z => z.filter(x => x.id !== id));
      flash('Zone deleted');
    } catch (e) {
      flash(e.message || 'Delete failed', 'error');
    }
  };

  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-5">
      <div className="mb-3">
        <div className="text-sm font-bold text-slate-900">Delivery zones</div>
        <div className="text-xs text-slate-500">Distance bands with their own fees and minimum order amounts. Zones take priority over base/per-km fees.</div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
              <th className="px-2 py-2">Name</th>
              <th className="px-2 py-2">Max km</th>
              <th className="px-2 py-2">Fee (Rs.)</th>
              <th className="px-2 py-2">Min order</th>
              <th className="px-2 py-2">ETA (min)</th>
              <th className="px-2 py-2">Active</th>
              <th className="px-2 py-2 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {zones.map(z => (
              <tr key={z.id} className="border-t border-slate-100">
                <td className="px-2 py-2"><input value={z.name} onChange={e => update(z.id, { name: e.target.value })} className={inp} /></td>
                <td className="px-2 py-2"><input type="number" step="0.1" value={z.max_distance_km} onChange={e => update(z.id, { max_distance_km: Number(e.target.value) })} className={inp} /></td>
                <td className="px-2 py-2"><input type="number" value={z.fee} onChange={e => update(z.id, { fee: Number(e.target.value) })} className={inp} /></td>
                <td className="px-2 py-2"><input type="number" value={z.min_order_amount || 0} onChange={e => update(z.id, { min_order_amount: Number(e.target.value) })} className={inp} /></td>
                <td className="px-2 py-2"><input type="number" value={z.estimated_minutes || 30} onChange={e => update(z.id, { estimated_minutes: Number(e.target.value) })} className={inp} /></td>
                <td className="px-2 py-2"><input type="checkbox" checked={!!z.is_active} onChange={e => update(z.id, { is_active: e.target.checked })} /></td>
                <td className="px-2 py-2 text-right"><button onClick={() => remove(z.id)} className="text-rose-600 hover:text-rose-800">✕</button></td>
              </tr>
            ))}
            {/* Add row */}
            <tr className="border-t-2 border-slate-200 bg-slate-50/50">
              <td className="px-2 py-2"><input placeholder="e.g. Inside ring road" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inp} /></td>
              <td className="px-2 py-2"><input type="number" step="0.1" placeholder="3.0" value={form.max_distance_km} onChange={e => setForm(f => ({ ...f, max_distance_km: e.target.value }))} className={inp} /></td>
              <td className="px-2 py-2"><input type="number" placeholder="100" value={form.fee} onChange={e => setForm(f => ({ ...f, fee: e.target.value }))} className={inp} /></td>
              <td className="px-2 py-2"><input type="number" placeholder={String(defaultMinOrder)} value={form.min_order_amount} onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value }))} className={inp} /></td>
              <td className="px-2 py-2"><input type="number" placeholder={String(defaultEstimatedMin)} value={form.estimated_minutes} onChange={e => setForm(f => ({ ...f, estimated_minutes: e.target.value }))} className={inp} /></td>
              <td className="px-2 py-2"><input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} /></td>
              <td className="px-2 py-2 text-right"><button onClick={add} className="text-sm px-2 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Add</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ============================================================
   Payment methods editor
   ============================================================ */
const PaymentMethodsEditor = ({ methods, setMethods, flash }) => {
  const update = async (id, patch) => {
    try {
      const row = await fetchApi.put(`/api/settings/payment-methods/${id}`, patch);
      setMethods(m => m.map(x => x.id === id ? row : x));
      flash('Payment method updated');
    } catch (e) {
      flash(e.message || 'Failed', 'error');
    }
  };

  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-5">
      <div className="mb-3">
        <div className="text-sm font-bold text-slate-900">Payment methods</div>
        <div className="text-xs text-slate-500">Toggle which tender types are offered and set optional surcharges.</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {methods.map(m => (
          <div key={m.id} className="ring-1 ring-slate-200 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{m.icon || '💰'}</span>
              <input value={m.display_name} onChange={e => update(m.id, { display_name: e.target.value })}
                className="font-semibold text-slate-800 text-sm bg-transparent focus:outline-none flex-1 min-w-0" />
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <span className={`relative inline-block w-9 h-5 rounded-full transition-colors ${m.is_enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${m.is_enabled ? 'translate-x-4' : ''}`} />
                </span>
                <input type="checkbox" className="sr-only" checked={m.is_enabled} onChange={e => update(m.id, { is_enabled: e.target.checked })} />
              </label>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Surcharge</span>
              <input type="number" step="0.1" value={m.surcharge_percent || 0}
                onChange={e => update(m.id, { surcharge_percent: Number(e.target.value) })}
                className={`${inp} py-1.5`} />
              <span className="text-xs text-slate-500">%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============================================================
   QR Code Upload Editor for Payment Methods
   ============================================================ */
const QRCodeUploadEditor = ({ values, update, flash, uiSettings = DEFAULT_UI_SETTINGS }) => {
  const paymentMethods = [
    { id: 'esewa', label: 'eSewa', icon: '💳' },
    { id: 'khalti', label: 'Khalti', icon: '💰' },
    { id: 'fonepay', label: 'Fonepay', icon: '📱' },
  ];

  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-5">
      <div className="mb-4">
        <div className="text-sm font-bold text-slate-900">Payment QR Codes</div>
        <div className="text-xs text-slate-500">
          Upload QR codes for digital payment methods. Customers will see these when they choose "Pay with QR Code" at their table.
        </div>
      </div>

      <div className="space-y-6">
        {paymentMethods.map(method => {
          const imageKey = `payment.qr.${method.id}.image`;
          const nameKey = `payment.qr.${method.id}.name`;
          const numberKey = `payment.qr.${method.id}.number`;
          
          const imageValue = values[imageKey] || '';
          const nameValue = values[nameKey] || '';
          const numberValue = values[numberKey] || '';

          return (
            <div key={method.id} className="border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{method.icon}</span>
                <h3 className="text-sm font-semibold text-slate-900">{method.label}</h3>
              </div>

              <div className="space-y-3">
                {/* QR Code Image Upload */}
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
                    QR Code Image
                  </label>
                  <ImageField 
                    value={imageValue} 
                    onChange={v => update(imageKey, v)} 
                    maxMb={uiSettings.image_upload_max_mb} 
                    previewSizePx={uiSettings.image_preview_size_px} 
                  />
                </div>

                {/* Account Name */}
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
                    Account Name (Optional)
                  </label>
                  <input 
                    type="text" 
                    value={nameValue} 
                    onChange={e => update(nameKey, e.target.value)}
                    placeholder={`e.g. Food Zone ${method.label}`}
                    className={inp}
                  />
                </div>

                {/* Account Number */}
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
                    Account Number (Optional)
                  </label>
                  <input 
                    type="text" 
                    value={numberValue} 
                    onChange={e => update(numberKey, e.target.value)}
                    placeholder={`e.g. 98XXXXXXXX`}
                    className={inp}
                  />
                </div>

                {/* Status indicator */}
                {imageValue && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>QR code configured - customers can use this payment method</span>
                  </div>
                )}
                {!imageValue && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>No QR code uploaded - this payment method won't be available to customers</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">How to use:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Get your QR code from your payment provider (eSewa, Khalti, or Fonepay)</li>
              <li>Upload the QR code image above (or paste the image URL)</li>
              <li>Optionally add your account name and number for customer reference</li>
              <li>Click "Save" at the top to apply changes</li>
              <li>Customers will see these QR codes when they click "Pay with QR Code" at their table</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   Tenant / Subscription
   ============================================================ */
const TenantEditor = ({ tenant, setTenant, flash }) => {
  const [form, setForm] = useState(null);
  useEffect(() => { if (tenant) setForm({ ...tenant }); }, [tenant]);

  if (!form) return null;

  const save = async () => {
    try {
      const row = await fetchApi.put('/api/settings/tenant', form);
      setTenant(row);
      flash('Subscription info saved');
    } catch (e) {
      flash(e.message || 'Failed', 'error');
    }
  };

  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-5">
      <div className="mb-3">
        <div className="text-sm font-bold text-slate-900">Subscription</div>
        <div className="text-xs text-slate-500">Plan, status, and billing email. Used when this software runs as SaaS.</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Plan</label>
          <select value={form.plan || 'standard'} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))} className={inp}>
            {['free', 'starter', 'standard', 'pro', 'enterprise'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Status</label>
          <select value={form.subscription_status || 'active'} onChange={e => setForm(f => ({ ...f, subscription_status: e.target.value }))} className={inp}>
            {['active', 'trialing', 'past_due', 'canceled'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Trial ends</label>
          <input type="date" value={(form.trial_ends_at || '').split('T')[0]} onChange={e => setForm(f => ({ ...f, trial_ends_at: e.target.value }))} className={inp} />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Billing email</label>
          <input type="email" value={form.billing_email || ''} onChange={e => setForm(f => ({ ...f, billing_email: e.target.value }))} className={inp} />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button onClick={save} className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
          Save subscription
        </button>
      </div>
    </div>
  );
};

export default AdminSettings;
