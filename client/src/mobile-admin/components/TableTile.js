import React from 'react';

const TableTile = ({ tableId, status = 'empty', orderCount, onClick }) => {
  const s = (status || 'empty').toLowerCase();
  const statusLabel = {
    empty: 'Empty',
    occupied: 'Occupied',
    ordering: 'Ordering',
    dining: 'Dining',
    payment_pending: 'Billing',
  }[s] || s;

  return (
    <button className={`m-table-tile ${s}`} onClick={onClick}>
      <div className="m-table-tile-num">{tableId}</div>
      <div className="m-table-tile-status">{statusLabel}</div>
      {orderCount > 0 && (
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--m-brand)' }}>
          {orderCount} order{orderCount !== 1 ? 's' : ''}
        </div>
      )}
    </button>
  );
};

export default TableTile;
