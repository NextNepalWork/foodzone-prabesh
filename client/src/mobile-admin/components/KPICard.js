import React from 'react';

const KPICard = ({ label, value, sub, trend, loading }) => (
  <div className="m-kpi">
    <div className="m-kpi-label">{label}</div>
    {loading ? (
      <div className="m-skeleton" style={{ height: 26, marginTop: 4, width: '70%' }} />
    ) : (
      <div className="m-kpi-value">{value}</div>
    )}
    {sub && !loading && (
      <div className={`m-kpi-sub ${trend === 'up' ? 'up' : trend === 'down' ? 'down' : ''}`}>
        {trend === 'up' ? '↑ ' : trend === 'down' ? '↓ ' : ''}
        {sub}
      </div>
    )}
  </div>
);

export default KPICard;
