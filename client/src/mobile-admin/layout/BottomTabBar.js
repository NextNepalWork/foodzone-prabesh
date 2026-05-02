import React from 'react';
import useHaptics from '../hooks/useHaptics';

const TABS = [
  { id: 'dashboard', label: 'Home',   icon: '🏠' },
  { id: 'orders',    label: 'Orders', icon: '📋' },
  { id: 'tables',    label: 'Tables', icon: '🪑' },
  { id: 'more',      label: 'More',   icon: '⋯' },
];

const BottomTabBar = ({ active, onChange, badges = {} }) => {
  const { tap } = useHaptics();
  return (
    <nav className="m-tabbar" role="tablist">
      {TABS.map((t) => {
        const isActive = active === t.id;
        const badge = badges[t.id];
        return (
          <button
            key={t.id}
            className={`m-tab ${isActive ? 'active' : ''}`}
            onClick={() => { tap(6); onChange(t.id); }}
            role="tab"
            aria-selected={isActive}
          >
            <span className="m-tab-icon">{t.icon}</span>
            <span className="m-tab-label">{t.label}</span>
            {badge ? <span className="m-tab-badge">{badge > 99 ? '99+' : badge}</span> : null}
          </button>
        );
      })}
    </nav>
  );
};

export default BottomTabBar;
export { TABS };
