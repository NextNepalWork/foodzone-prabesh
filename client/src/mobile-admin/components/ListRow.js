import React from 'react';

const ListRow = ({ icon, iconBg = '#64748b', label, value, onClick, chevron = true, danger }) => (
  <button className="m-list-row" onClick={onClick} style={danger ? { color: 'var(--m-red)' } : undefined}>
    {icon && (
      <span className="m-list-row-icon" style={{ background: iconBg }}>
        {icon}
      </span>
    )}
    <span className="m-list-row-label">{label}</span>
    {value !== undefined && <span className="m-list-row-value">{value}</span>}
    {chevron && <span className="m-list-row-chevron">›</span>}
  </button>
);

export default ListRow;
