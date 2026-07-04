import React, { useState } from 'react';
import { apiService } from '../../services/apiService';
import useHaptics from '../hooks/useHaptics';

const NEXT_STATUS = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'completed',
};

const STATUS_LABEL = {
  pending: 'Accept · Start Preparing',
  preparing: 'Mark as Ready',
  ready: 'Mark as Completed',
};

const OrderDetailScreen = ({ order, onClose, onUpdated }) => {
  const [busy, setBusy] = useState(false);
  const haptics = useHaptics();
  if (!order) return null;
  const status = (order.status || 'pending').toLowerCase();
  const items = Array.isArray(order.items) ? order.items : [];
  const total = order.totalAmount || order.total_amount || order.total || 0;
  const tableId = order.tableId || order.table_id;
  const orderType = order.orderType || order.order_type;
  const customerName = order.customerName || order.customer_name;
  const customerPhone = order.phone || order.customerPhone || order.customer_phone;
  const deliveryAddress = order.delivery_address || order.address;
  const lat = order.delivery_latitude || order.latitude;
  const lng = order.delivery_longitude || order.longitude;
  const mapsUrl = (lat && lng) ? `https://www.google.com/maps?q=${lat},${lng}` : null;
  const orderNumber = order.order_number || order.orderNumber || order.id;
  const shareText = `📍 Delivery Location\nOrder: ${orderNumber}\n${customerName || ''}\n${customerPhone || ''}\n${deliveryAddress || ''}\n\n${mapsUrl || ''}`;
  const next = NEXT_STATUS[status];

  const copyLink = () => {
    if (!mapsUrl) return;
    navigator.clipboard.writeText(mapsUrl).then(() => {
      haptics.success();
      alert('✅ Location link copied to clipboard!');
    }).catch(() => alert('❌ Failed to copy link'));
  };

  const shareLocation = () => {
    if (!mapsUrl) return;
    if (navigator.share) {
      navigator.share({ title: `Delivery - Order ${orderNumber}`, text: shareText }).catch((err) => {
        if (err.name !== 'AbortError') console.log('Share failed:', err);
      });
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        alert('✅ Location details copied to clipboard!');
      }).catch(() => alert('Failed to copy'));
    }
  };

  const advance = async () => {
    if (!next || busy) return;
    setBusy(true);
    try {
      await apiService.updateOrderStatus(order.id || order._id, next);
      haptics.success();
      onUpdated && onUpdated({ ...order, status: next });
    } catch (_) {
      haptics.warn();
      alert('Failed to update status');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (busy) return;
    if (!window.confirm('Cancel this order?')) return;
    setBusy(true);
    try {
      await apiService.updateOrderStatus(order.id || order._id, 'cancelled');
      haptics.warn();
      onUpdated && onUpdated({ ...order, status: 'cancelled' });
    } catch (_) {
      alert('Failed to cancel');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: '10px 0 30px' }}>
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>
              {tableId ? `Table ${tableId}` : orderType === 'delivery' ? 'Delivery' : orderType === 'takeaway' ? 'Takeaway' : 'Dine-in'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--m-text-2)' }}>#{String(order.id || '').slice(-6)}</div>
          </div>
          <span className={`m-pill ${status}`}>{status}</span>
        </div>

        {(customerName || customerPhone) && (
          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--m-text-2)' }}>
            {customerName || 'Guest'}{customerPhone ? ` · ${customerPhone}` : ''}
          </div>
        )}

        {deliveryAddress && (
          <div style={{ marginTop: 8, fontSize: 13, color: 'var(--m-text-2)' }}>
            📍 {deliveryAddress}
          </div>
        )}
      </div>

      {mapsUrl && (
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="m-btn-secondary"
              style={{ flex: 1, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', background: 'var(--m-blue)', color: '#fff' }}
            >
              📍 View Location
            </a>
            <button
              onClick={copyLink}
              className="m-btn-secondary"
              style={{ flex: 1, height: 42 }}
            >
              📋 Copy Link
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={shareLocation}
              className="m-btn-secondary"
              style={{ flex: 1, height: 42, background: 'var(--m-green)', color: '#fff' }}
            >
              🔗 Share
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="m-btn-secondary"
              style={{ flex: 1, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', background: '#25D366', color: '#fff' }}
            >
              💬 WhatsApp
            </a>
            <a
              href={`sms:?body=${encodeURIComponent(shareText)}`}
              className="m-btn-secondary"
              style={{ flex: 1, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', background: 'var(--m-amber)', color: '#fff' }}
            >
              💬 SMS
            </a>
          </div>
        </div>
      )}

      <div className="m-section-label">Items</div>
      <div className="m-list">
        {items.length === 0 ? (
          <div style={{ padding: 16, color: 'var(--m-text-2)', fontSize: 14 }}>No items</div>
        ) : items.map((it, idx) => (
          <div key={idx} style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', borderTop: idx === 0 ? 'none' : '1px solid var(--m-border)' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{it.name}</div>
              <div style={{ fontSize: 12, color: 'var(--m-text-2)' }}>
                {it.quantity || 1}× {it.price ? `@ Rs. ${it.price}` : ''}
              </div>
            </div>
            <div style={{ fontWeight: 700 }}>
              Rs. {((it.price || 0) * (it.quantity || 1)).toFixed(0)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: 16, display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800 }}>
        <span>Total</span>
        <span style={{ color: 'var(--m-brand)' }}>Rs. {Number(total).toFixed(0)}</span>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {next && (
          <button className="m-btn-primary" onClick={advance} disabled={busy}>
            {busy ? 'Updating…' : STATUS_LABEL[status]}
          </button>
        )}
        {status !== 'completed' && status !== 'cancelled' && (
          <button
            className="m-btn-secondary"
            style={{ color: 'var(--m-red)', height: 50, borderRadius: 14, fontWeight: 700 }}
            onClick={cancel}
            disabled={busy}
          >
            Cancel Order
          </button>
        )}
        <button className="m-btn-secondary" onClick={onClose} style={{ height: 44 }}>
          Close
        </button>
      </div>
    </div>
  );
};

export default OrderDetailScreen;
