// Shared thermal-printer (80mm) printing helpers used by POS, Reception and
// the admin Orders view. All printable HTML lives here so receipts / KOTs look
// identical no matter which screen triggers them.
import settingsService from '../services/settingsService';

// Restaurant identity for print headers, from public settings (white-label).
export const getRestaurantInfo = () => ({
  name: settingsService.get('business.name', 'Food Zone'),
  tagline: settingsService.get('business.tagline', ''),
  address: [
    settingsService.get('business.address_line1', ''),
    settingsService.get('business.city', ''),
  ].filter(Boolean).join(', '),
  phone: settingsService.get('business.phone', ''),
  currency: settingsService.get('locale.currency_symbol', 'Rs.'),
});

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));

// Open a hidden print surface: popup window first, iframe fallback when the
// popup is blocked (kiosk/PWA contexts often block window.open).
export const openPrintWindow = (html, { width = 320, height = 600 } = {}) => {
  try {
    const printWindow = window.open('', '_blank', `width=${width},height=${height}`);

    if (!printWindow) {
      const frame = document.createElement('iframe');
      frame.style.display = 'none';
      document.body.appendChild(frame);
      frame.contentDocument.write(html);
      frame.contentDocument.close();
      frame.contentWindow.focus();
      frame.contentWindow.print();
      setTimeout(() => document.body.removeChild(frame), 1000);
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      setTimeout(() => printWindow.close(), 500);
    }, 150);
  } catch (error) {
    console.error('Print error:', error);
    alert('Print failed. Please check if popups are allowed and try again.');
  }
};

const thermalStyles = `
  @page { size: 80mm auto; margin: 0; }
  body {
    font-family: 'Courier New', monospace;
    font-size: 11px;
    line-height: 1.3;
    margin: 0;
    padding: 3mm;
    width: 80mm;
    color: #000;
    background: #fff;
  }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .header { text-align: center; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 2px solid #000; }
  .restaurant-name { font-size: 16px; font-weight: bold; margin: 2px 0; letter-spacing: 1px; }
  .restaurant-info { font-size: 10px; margin: 1px 0; }
  .divider { border-bottom: 1px dashed #000; margin: 4px 0; height: 1px; }
  .order-section { margin: 6px 0; }
  .info-line { display: flex; justify-content: space-between; margin: 2px 0; font-size: 10px; }
  .info-label { font-weight: bold; min-width: 50px; }
  .items-header { text-align: center; font-weight: bold; margin: 4px 0; font-size: 12px; }
  .item-line { display: flex; justify-content: space-between; margin: 1px 0; font-size: 10px; }
  .item-name { flex: 1; padding-right: 6px; }
  .item-qty { min-width: 25px; text-align: center; }
  .item-price { min-width: 50px; text-align: right; font-weight: bold; }
  .item-note { font-size: 9px; font-style: italic; margin-left: 8px; }
  .total-section { border-top: 2px solid #000; padding-top: 4px; margin-top: 6px; }
  .total-line { display: flex; justify-content: space-between; font-size: 11px; margin: 1px 0; }
  .total-amount { font-size: 14px; font-weight: bold; margin: 2px 0; text-align: center; }
  .payment-info { font-size: 11px; font-weight: bold; margin: 2px 0; text-align: center; }
  .footer { text-align: center; margin-top: 6px; padding-top: 4px; border-top: 1px dashed #000; font-size: 9px; }
  .footer-line { margin: 1px 0; }
  .kot-title { font-size: 14px; font-weight: bold; margin: 5px 0; text-align: center; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`;

const orderTypeLabel = (order) => {
  if (order.order_type === 'delivery') return 'DELIVERY';
  if (order.order_type === 'takeaway') return 'TAKEAWAY';
  return 'DINE-IN';
};

// Customer receipt (80mm thermal). `payment` is optional — pass it right after
// checkout so the receipt shows tendered cash / change.
export const printReceipt = (order, payment = null, restaurant = null) => {
  const info = restaurant || getRestaurantInfo();
  const cur = info.currency || 'Rs.';
  const subtotal = parseFloat(order.subtotal || 0);
  const discount = parseFloat(order.discount || 0);
  const deliveryFee = parseFloat(order.delivery_fee || 0);
  const total = parseFloat(order.total || order.total_amount || 0);
  const isPaid = payment || order.payment_status === 'paid';
  const paymentMethod = (payment?.payment_method || order.payment_method || 'cash').toUpperCase();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Receipt - ${escapeHtml(order.order_number || order.id)}</title>
      <style>${thermalStyles}</style>
    </head>
    <body>
      <div class="header">
        <div class="restaurant-name">${escapeHtml(info.name).toUpperCase()}</div>
        ${info.address ? `<div class="restaurant-info">${escapeHtml(info.address)}</div>` : ''}
        ${info.phone ? `<div class="restaurant-info">Phone: ${escapeHtml(info.phone)}</div>` : ''}
        <div class="restaurant-info">ORDER RECEIPT</div>
      </div>

      <div class="order-section">
        <div class="info-line"><span class="info-label">Order:</span><span>${escapeHtml(order.order_number || `#${order.id}`)}</span></div>
        <div class="info-line"><span class="info-label">Date:</span><span>${new Date(order.created_at || Date.now()).toLocaleDateString('en-GB')}</span></div>
        <div class="info-line"><span class="info-label">Time:</span><span>${new Date(order.created_at || Date.now()).toLocaleTimeString('en-GB', { hour12: false })}</span></div>
        <div class="info-line"><span class="info-label">Type:</span><span>${orderTypeLabel(order)}</span></div>
        ${order.table_id ? `<div class="info-line"><span class="info-label">Table:</span><span>${escapeHtml(order.table_id)}</span></div>` : ''}
        ${order.customer_name ? `<div class="info-line"><span class="info-label">Customer:</span><span>${escapeHtml(order.customer_name)}</span></div>` : ''}
        ${order.customer_phone || order.phone ? `<div class="info-line"><span class="info-label">Phone:</span><span>${escapeHtml(order.customer_phone || order.phone)}</span></div>` : ''}
        ${order.delivery_address ? `<div class="info-line"><span class="info-label">Address:</span><span>${escapeHtml(order.delivery_address)}</span></div>` : ''}
      </div>

      <div class="divider"></div>

      <div class="items-header">ORDER ITEMS</div>
      ${(order.items || []).map((item) => `
        <div class="item-line">
          <div class="item-name">${escapeHtml(item.menu_item_name || item.name || 'Item')}</div>
          <div class="item-qty">x${item.quantity || 1}</div>
          <div class="item-price">${cur}${parseFloat(item.subtotal || (item.price * item.quantity) || 0).toFixed(0)}</div>
        </div>
      `).join('') || '<div class="center">No items found</div>'}

      <div class="total-section">
        ${subtotal ? `<div class="total-line"><span>Subtotal:</span><span>${cur}${subtotal.toFixed(0)}</span></div>` : ''}
        ${discount > 0 ? `<div class="total-line"><span>Discount:</span><span>- ${cur}${discount.toFixed(0)}</span></div>` : ''}
        ${deliveryFee > 0 ? `<div class="total-line"><span>Delivery Fee:</span><span>${cur}${deliveryFee.toFixed(0)}</span></div>` : ''}
        <div class="total-amount">TOTAL: ${cur}${total.toFixed(0)}</div>
        <div class="payment-info">${isPaid ? `PAID - ${escapeHtml(paymentMethod)}` : 'PAYMENT PENDING'}</div>
        ${payment && payment.amount_received ? `
          <div class="total-line"><span>Received:</span><span>${cur}${parseFloat(payment.amount_received).toFixed(0)}</span></div>
          <div class="total-line"><span>Change:</span><span>${cur}${parseFloat(payment.change_given || 0).toFixed(0)}</span></div>
        ` : ''}
      </div>

      <div class="divider"></div>

      <div class="footer">
        <div class="footer-line bold">Thank you for choosing ${escapeHtml(info.name)}!</div>
        ${info.tagline ? `<div class="footer-line">${escapeHtml(info.tagline)}</div>` : ''}
        <div class="footer-line">Visit us again soon!</div>
        <div class="footer-line">Printed: ${new Date().toLocaleString('en-GB')}</div>
      </div>
    </body>
    </html>
  `;

  openPrintWindow(html);
};

// Kitchen Order Ticket — items + notes only, no prices.
export const printKOT = (order, restaurant = null) => {
  const info = restaurant || getRestaurantInfo();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>KOT - ${escapeHtml(order.order_number || order.id)}</title>
      <style>${thermalStyles}</style>
    </head>
    <body>
      <div class="header">
        <div class="restaurant-name">${escapeHtml(info.name).toUpperCase()}</div>
        <div class="restaurant-info">Kitchen Order Ticket</div>
        <div class="kot-title">*** KOT ***</div>
      </div>

      <div class="order-section">
        <div class="info-line"><span class="info-label">Order #:</span><span>${escapeHtml(order.order_number || `#${order.id}`)}</span></div>
        <div class="info-line"><span class="info-label">For:</span><span>${order.table_id ? `Table ${escapeHtml(order.table_id)}` : orderTypeLabel(order)}</span></div>
        ${order.customer_name ? `<div class="info-line"><span class="info-label">Customer:</span><span>${escapeHtml(order.customer_name)}</span></div>` : ''}
        <div class="info-line"><span class="info-label">Time:</span><span>${new Date(order.created_at || Date.now()).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span></div>
      </div>

      <div class="divider"></div>

      <div class="items-header">ITEMS TO PREPARE</div>
      ${(order.items || []).map((item) => `
        <div class="item-line">
          <div class="item-name bold">${escapeHtml(item.menu_item_name || item.name || 'Item')}</div>
          <div class="item-qty">x${item.quantity || 1}</div>
        </div>
        ${item.special_instructions || item.instructions ? `<div class="item-note">Note: ${escapeHtml(item.special_instructions || item.instructions)}</div>` : ''}
      `).join('') || '<div class="center">No items found</div>'}

      ${order.notes ? `
        <div class="divider"></div>
        <div class="item-note bold">Order note: ${escapeHtml(order.notes)}</div>
      ` : ''}

      <div class="footer">
        <div class="footer-line">Printed: ${new Date().toLocaleString('en-GB')}</div>
      </div>
    </body>
    </html>
  `;

  openPrintWindow(html);
};

const printing = { printReceipt, printKOT, openPrintWindow, getRestaurantInfo };
export default printing;
