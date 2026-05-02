import React from 'react';
import ListRow from '../components/ListRow';

const SECTIONS = [
  {
    label: 'Operations',
    rows: [
      { id: 'menu',      icon: '🍔', bg: '#f59e0b', label: 'Menu' },
      { id: 'inventory', icon: '📦', bg: '#0891b2', label: 'Inventory' },
      { id: 'calls',     icon: '🔔', bg: '#dc2626', label: 'Table Calls' },
    ],
  },
  {
    label: 'Insights',
    rows: [
      { id: 'customers', icon: '👥', bg: '#7c3aed', label: 'Customers' },
      { id: 'reports',   icon: '📊', bg: '#2563eb', label: 'Reports' },
      { id: 'daybook',   icon: '📒', bg: '#059669', label: 'Daybook' },
    ],
  },
  {
    label: 'Configuration',
    rows: [
      { id: 'staff',    icon: '🧑‍🍳', bg: '#64748b', label: 'Staff' },
      { id: 'settings', icon: '⚙️', bg: '#475569', label: 'Settings' },
    ],
  },
  {
    label: 'Account',
    rows: [
      { id: 'desktop', icon: '🖥️', bg: '#64748b', label: 'Open Desktop View', value: 'Switch' },
      { id: 'logout', icon: '🚪', bg: '#dc2626', label: 'Sign Out', danger: true, chevron: false },
    ],
  },
];

const MoreScreen = ({ onNavigate, onLogout, onDesktop, user }) => {
  const handle = (id) => {
    if (id === 'logout') return onLogout && onLogout();
    if (id === 'desktop') return onDesktop && onDesktop();
    onNavigate && onNavigate(id);
  };

  return (
    <div style={{ paddingBottom: 30 }}>
      <div style={{ padding: '20px 16px 4px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px' }}>More</div>
        {user && (
          <div style={{ fontSize: 13, color: 'var(--m-text-2)', marginTop: 2 }}>
            Signed in as <b style={{ color: 'var(--m-text)' }}>{user}</b>
          </div>
        )}
      </div>

      {SECTIONS.map((s) => (
        <div key={s.label}>
          <div className="m-section-label">{s.label}</div>
          <div className="m-list">
            {s.rows.map((r) => (
              <ListRow
                key={r.id}
                icon={r.icon}
                iconBg={r.bg}
                label={r.label}
                value={r.value}
                chevron={r.chevron !== false}
                danger={r.danger}
                onClick={() => handle(r.id)}
              />
            ))}
          </div>
        </div>
      ))}

      <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: 'var(--m-text-2)' }}>
        Food Zone · Duwakot · v1.0
      </div>
    </div>
  );
};

export default MoreScreen;
