import React from 'react';

const fmtTime = (iso) => {
  try {
    const d = new Date(iso);
    const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const hrs = Math.floor(diffMin / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return d.toLocaleDateString();
  } catch (_) {
    return '';
  }
};

const OrderCard = ({ order, onClick, currencySymbol = 'Rs.' }) => {
  const status = (order.status || 'pending').toLowerCase();
  const items = Array.isArray(order.items) ? order.items : [];
  const itemPreview = items.slice(0, 2).map((i) => `${i.quantity || 1}× ${i.name}`).join(', ');
  const extraCount = items.length - 2;
  const total = order.totalAmount || order.total || 0;

  return (
    <div className="m-order-card" onClick={onClick}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 15 }}>
            {order.tableId ? `Table ${order.tableId}` : order.orderType === 'delivery' ? 'Delivery' : 'Takeaway'}
          </span>
          <span style={{ fontSize: 12, color: 'var(--m-text-2)' }}>
            #{String(order.id || '').slice(-4)}
          </span>
        </div>
        <span className={`m-pill ${status}`}>{status}</span>
      </div>

      <div style={{ fontSize: 13, color: 'var(--m-text-2)', marginBottom: 8, lineHeight: 1.4 }}>
        {itemPreview || 'No items'}
        {extraCount > 0 && <span> +{extraCount} more</span>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--m-text-2)', fontWeight: 600 }}>
          {fmtTime(order.createdAt || order.created_at || order.timestamp)}
        </span>
        <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--m-brand)' }}>
          {currencySymbol} {Number(total).toFixed(0)}
        </span>
      </div>
    </div>
  );
};

export default OrderCard;
