import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import io from 'socket.io-client';
import { fetchApi } from '../services/apiService';
import { getApiUrl, getSocketUrl } from '../config/api';
import settingsService from '../services/settingsService';
import staffAuthService from '../utils/staffAuthService';
import soundManager from '../utils/soundManager';
import { printReceipt, printKOT, getRestaurantInfo } from '../utils/printing';
import POSItemGrid from '../components/pos/POSItemGrid';
import POSCart from '../components/pos/POSCart';
import POSPaymentPanel from '../components/pos/POSPaymentPanel';
import POSTransactions from '../components/pos/POSTransactions';
import PosOrdersTab from '../components/pos/PosOrdersTab';
import PosTablesTab from '../components/pos/PosTablesTab';
import PosVerifyTab from '../components/pos/PosVerifyTab';
import TableCallsManager from '../components/TableCallsManager';
import SoundEnableBanner from '../components/SoundEnableBanner';
import { ReceiptIcon, BookIcon, CheckIcon, XIcon, PrinterIcon } from '../components/pos/icons';

const POS_ROLES = ['Manager', 'Cashier'];

const emptyMeta = { tableId: '', customerName: '', phone: '', address: '' };

// The front-desk station: counter sales, the live orders board, tables,
// table calls, and QR payment verification — everything operational, so the
// admin panel can stay owner-only. Runs for Manager / Receptionist / admin.
const POS = () => {
  // ---- auth ----
  const getAuthState = () => {
    if (localStorage.getItem('adminToken')) return { ok: true, isManager: true, user: 'Admin' };
    const staff = staffAuthService.getUser?.() || null;
    const token = localStorage.getItem('staffToken');
    if (token && staff && POS_ROLES.includes(staff.role)) {
      return { ok: true, isManager: staff.role === 'Manager', user: staff.fullName || staff.username };
    }
    return { ok: false, unauthorizedRole: !!(token && staff), isManager: false, user: null };
  };

  const [auth, setAuth] = useState(getAuthState);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // ---- station state ----
  const [view, setView] = useState('sell');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [orderBadge, setOrderBadge] = useState(0);
  const [callBadge, setCallBadge] = useState(0);
  const [toasts, setToasts] = useState([]);
  const viewRef = useRef(view);
  viewRef.current = view;

  const pushToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  // ---- data ----
  const [menuItems, setMenuItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);

  // ---- sale state ----
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('takeaway');
  const [orderMeta, setOrderMeta] = useState(emptyMeta);
  const [discount, setDiscount] = useState('');
  const [discountMode, setDiscountMode] = useState('amount');
  const [showPayment, setShowPayment] = useState(false);
  const [showDaybook, setShowDaybook] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [lastSale, setLastSale] = useState(null);
  const [printKot, setPrintKot] = useState(true);

  const currency = settingsService.get?.('locale.currency_symbol', 'Rs.') || 'Rs.';

  useEffect(() => {
    settingsService.loadSettings?.().catch(() => {});
  }, []);

  useEffect(() => {
    if (!auth.ok) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingMenu(true);
        const response = await fetchApi.get('/api/menu');
        const data = response?.data || response;
        if (!cancelled && Array.isArray(data)) setMenuItems(data);
      } catch (err) {
        console.error('Failed to load menu:', err);
      } finally {
        if (!cancelled) setLoadingMenu(false);
      }
    })();
    return () => { cancelled = true; };
  }, [auth.ok]);

  // ---- live updates: one socket for the whole station ----
  useEffect(() => {
    if (!auth.ok) return;
    const socket = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('newOrder', (order) => {
      if (order?.order_type === 'delivery') soundManager.play('delivery-order', 'order-' + order.id);
      else soundManager.play('table-order', 'order-' + order.id);
      setRefreshTrigger((p) => p + 1);
      if (viewRef.current !== 'orders') setOrderBadge((p) => p + 1);
      const label = order?.table_id ? `Table ${order.table_id}` : (order?.order_type === 'delivery' ? 'Delivery' : 'Takeaway');
      pushToast(`New order — ${label}`, 'info');
    });
    socket.on('orderStatusUpdated', () => setRefreshTrigger((p) => p + 1));
    socket.on('orderUpdated', () => setRefreshTrigger((p) => p + 1));
    socket.on('orderDeleted', () => setRefreshTrigger((p) => p + 1));
    socket.on('tableCleared', () => setRefreshTrigger((p) => p + 1));
    socket.on('tableOccupied', () => setRefreshTrigger((p) => p + 1));
    socket.on('tableStatusUpdate', () => setRefreshTrigger((p) => p + 1));
    socket.on('orderAlert', (alert) => {
      soundManager.play('kitchen-alarm', 'alert-' + alert.orderId);
      pushToast(alert.body || 'An order is running late in the kitchen', 'warning');
    });
    socket.on('tableCall', (call) => {
      soundManager.play('table-order', 'call-' + (call?.id || Date.now()));
      if (viewRef.current !== 'calls') setCallBadge((p) => p + 1);
      pushToast(`Table ${call?.table_id || ''} is calling reception`, 'warning');
    });

    return () => {
      try { socket.removeAllListeners(); socket.close(); } catch (_) {}
    };
  }, [auth.ok, pushToast]);

  // Polling fallback so the board still converges while the socket is down
  useEffect(() => {
    if (!auth.ok) return;
    const t = setInterval(() => setRefreshTrigger((p) => p + 1), 45000);
    return () => clearInterval(t);
  }, [auth.ok]);

  // ---- cart ops ----
  const addItem = useCallback((item) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.id === item.id);
      if (existing) {
        return prev.map((l) => (l.id === item.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { id: item.id, name: item.name, category: item.category, price: parseFloat(item.price), quantity: 1 }];
    });
  }, []);

  const changeQty = useCallback((id, qty) => {
    setCart((prev) =>
      qty <= 0 ? prev.filter((l) => l.id !== id) : prev.map((l) => (l.id === id ? { ...l, quantity: qty } : l))
    );
  }, []);

  const removeItem = useCallback((id) => setCart((prev) => prev.filter((l) => l.id !== id)), []);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, l) => sum + l.price * l.quantity, 0);
    const raw = parseFloat(discount) || 0;
    const discountAmount = Math.min(
      discountMode === 'percent' ? (subtotal * Math.min(raw, 100)) / 100 : raw,
      subtotal
    );
    return { subtotal, discount: discountAmount, total: subtotal - discountAmount };
  }, [cart, discount, discountMode]);

  const resetSale = () => {
    setCart([]);
    setOrderMeta(emptyMeta);
    setDiscount('');
    setShowPayment(false);
    setPaymentError('');
  };

  // ---- checkout ----
  const handleCheckout = () => {
    setPaymentError('');
    if (orderType === 'dine-in' && !orderMeta.tableId) {
      alert('Enter the table number for a dine-in sale.');
      return;
    }
    if (orderType === 'delivery' && (!orderMeta.phone.trim() || !orderMeta.address.trim())) {
      alert('Delivery sales need a phone number and address.');
      return;
    }
    setShowPayment(true);
  };

  const handleConfirmPayment = async (payment) => {
    setProcessing(true);
    setPaymentError('');
    try {
      // 1. Create the order
      const orderRes = await fetchApi.post('/api/order', {
        orderType,
        tableId: orderType === 'dine-in' ? parseInt(orderMeta.tableId) : (orderType === 'delivery' ? 'Delivery' : null),
        customerName: orderMeta.customerName.trim() || undefined,
        phone: orderMeta.phone.trim() || undefined,
        address: orderType === 'delivery' ? orderMeta.address.trim() : undefined,
        items: cart.map((l) => ({ id: l.id, name: l.name, category: l.category, price: l.price, quantity: l.quantity })),
        totalAmount: totals.total,
        discount: totals.discount,
        source: 'pos',
      });
      const order = orderRes?.order || orderRes?.data?.order;
      if (!order) throw new Error('Order creation failed');

      // 2. Record the payment (also marks order paid + writes daybook)
      const paymentRes = await fetchApi.post('/api/payments', {
        order_id: order.id,
        ...payment,
      });
      const paymentRecord = paymentRes?.payment || payment;

      // 3. Reset the register first, then print — window.print() can block
      // the UI thread and must never hold up the next sale.
      const restaurant = getRestaurantInfo();
      const printableOrder = { ...order, items: cart, payment_status: 'paid', payment_method: payment.payment_method };
      setLastSale({ orderNumber: order.order_number, total: totals.total, method: payment.payment_method });
      resetSale();
      setTimeout(() => {
        printReceipt(printableOrder, paymentRecord, restaurant);
        if (printKot) {
          setTimeout(() => printKOT(printableOrder, restaurant), 800);
        }
      }, 100);
    } catch (err) {
      console.error('POS checkout failed:', err);
      setPaymentError(err?.response?.data?.error || err.message || 'Checkout failed — try again.');
    } finally {
      setProcessing(false);
    }
  };

  // ---- login ----
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError('');
    try {
      const response = await fetch(`${getApiUrl()}/api/staff/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await response.json();
      if (data.success && POS_ROLES.includes(data.user?.role)) {
        localStorage.setItem('staffToken', data.token);
        localStorage.setItem('staffUser', JSON.stringify(data.user));
        localStorage.setItem('staffAuthenticated', 'true');
        setAuth(getAuthState());
      } else if (data.success) {
        setLoginError(`Role "${data.user?.role}" cannot use the POS. Ask a Manager or Receptionist.`);
      } else {
        setLoginError(data.message || 'Login failed');
      }
    } catch (err) {
      setLoginError('Network error — check the connection and try again.');
    } finally {
      setLoggingIn(false);
    }
  };

  const switchView = (v) => {
    setView(v);
    if (v === 'orders') setOrderBadge(0);
    if (v === 'calls') setCallBadge(0);
  };

  const TABS = [
    { id: 'sell', label: 'Sell', emoji: '🧾' },
    { id: 'orders', label: 'Orders', emoji: '📋', badge: orderBadge },
    { id: 'tables', label: 'Tables', emoji: '🪑' },
    { id: 'calls', label: 'Calls', emoji: '🔔', badge: callBadge },
    { id: 'verify', label: 'Verify', emoji: '🧾' },
  ];

  // ---- render ----
  if (!auth.ok) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white rounded-3xl shadow-2xl p-7 w-full max-w-sm space-y-4">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-600 flex items-center justify-center text-white">
              <ReceiptIcon size={26} />
            </div>
            <h1 className="text-[20px] font-extrabold text-slate-900">Point of Sale</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">Sign in as Manager or Receptionist</p>
          </div>
          <div className="space-y-2.5">
            <div>
              <label htmlFor="pos-username" className="block text-[12px] font-semibold text-slate-500 mb-1">Username</label>
              <input
                id="pos-username"
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                autoComplete="username"
                className="w-full h-12 px-4 border-2 border-slate-200 rounded-xl text-[15px] text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-colors"
              />
            </div>
            <div>
              <label htmlFor="pos-password" className="block text-[12px] font-semibold text-slate-500 mb-1">Password</label>
              <input
                id="pos-password"
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                autoComplete="current-password"
                className="w-full h-12 px-4 border-2 border-slate-200 rounded-xl text-[15px] text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-colors"
              />
            </div>
          </div>
          {loginError && <div role="alert" className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{loginError}</div>}
          <button
            type="submit"
            disabled={loggingIn}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-extrabold text-[15px] cursor-pointer transition-colors disabled:opacity-50"
          >
            {loggingIn ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] lg:h-screen flex flex-col bg-slate-100">
      <SoundEnableBanner />
      {/* Header — dark POS chrome */}
      <header className="bg-slate-900 text-white px-4 h-14 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
            <ReceiptIcon size={17} />
          </div>
          <div className="min-w-0">
            <h1 className="text-[15px] font-bold leading-tight truncate">Food Zone POS</h1>
            <p className="text-[11px] text-slate-400 leading-tight truncate">{auth.user}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPrintKot(!printKot)}
            aria-pressed={printKot}
            title="Also print a kitchen ticket after each sale"
            className={`h-10 px-3 flex items-center gap-1.5 rounded-lg text-[12.5px] font-semibold cursor-pointer transition-colors ${
              printKot ? 'bg-emerald-600/20 text-emerald-300' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <PrinterIcon size={15} />
            <span className="hidden sm:inline">KOT</span>
            {printKot && <CheckIcon size={13} />}
          </button>
          <button
            onClick={() => setShowDaybook(true)}
            className="h-10 px-3 flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[12.5px] font-semibold text-slate-200 cursor-pointer transition-colors"
          >
            <BookIcon size={15} />
            <span className="hidden sm:inline">Daybook</span>
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="bg-slate-900 border-t border-slate-800 px-2 flex flex-shrink-0 overflow-x-auto no-scrollbar" aria-label="POS sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => switchView(t.id)}
            aria-current={view === t.id ? 'page' : undefined}
            className={`relative h-11 px-4 flex items-center gap-1.5 text-[13px] font-bold whitespace-nowrap transition-colors border-b-2 ${
              view === t.id
                ? 'text-emerald-300 border-emerald-400'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            <span aria-hidden="true">{t.emoji}</span>
            {t.label}
            {t.badge > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {t.badge > 9 ? '9+' : t.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Toasts */}
      <div className="fixed top-16 right-4 z-[60] space-y-2 max-w-xs" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-3.5 py-2.5 rounded-xl shadow-lg text-[13px] font-semibold text-white ${
              t.type === 'error' ? 'bg-red-600' : t.type === 'warning' ? 'bg-amber-600' : t.type === 'info' ? 'bg-blue-600' : 'bg-emerald-600'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Success banner after a sale */}
      {lastSale && view === 'sell' && (
        <div role="status" className="bg-emerald-600 text-white text-[13px] px-4 py-2 flex items-center justify-between flex-shrink-0">
          <span className="flex items-center gap-2">
            <CheckIcon size={15} />
            Sale complete — {lastSale.orderNumber} · {currency}{lastSale.total.toFixed(0)} ({lastSale.method})
          </span>
          <button onClick={() => setLastSale(null)} aria-label="Dismiss" className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white cursor-pointer">
            <XIcon size={15} />
          </button>
        </div>
      )}

      {/* Content */}
      {view === 'sell' && (
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 lg:overflow-hidden">
          <div className="flex-1 min-w-0 lg:overflow-hidden">
            {loadingMenu ? (
              <div className="h-full min-h-[160px] flex items-center justify-center text-slate-400">Loading menu…</div>
            ) : (
              <POSItemGrid menuItems={menuItems} onAddItem={addItem} currency={currency} />
            )}
          </div>
          <div className="w-full lg:w-[380px] flex-shrink-0 min-h-0 lg:overflow-hidden">
            <POSCart
              cart={cart}
              onChangeQty={changeQty}
              onRemoveItem={removeItem}
              onClearCart={() => setCart([])}
              orderType={orderType}
              onOrderTypeChange={setOrderType}
              orderMeta={orderMeta}
              onOrderMetaChange={setOrderMeta}
              discount={discount}
              discountMode={discountMode}
              onDiscountChange={setDiscount}
              onDiscountModeChange={setDiscountMode}
              totals={totals}
              onCheckout={handleCheckout}
              processing={processing}
              currency={currency}
            />
          </div>
        </div>
      )}

      {view === 'orders' && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <PosOrdersTab
            refreshTrigger={refreshTrigger}
            onRefresh={() => setRefreshTrigger((p) => p + 1)}
            menuItems={menuItems}
            currency={currency}
            onToast={pushToast}
          />
        </div>
      )}

      {view === 'tables' && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <PosTablesTab refreshTrigger={refreshTrigger} currency={currency} onToast={pushToast} />
        </div>
      )}

      {view === 'calls' && (
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <TableCallsManager />
        </div>
      )}

      {view === 'verify' && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <PosVerifyTab refreshTrigger={refreshTrigger} currency={currency} onToast={pushToast} />
        </div>
      )}

      {showPayment && (
        <POSPaymentPanel
          total={totals.total}
          onConfirm={handleConfirmPayment}
          onCancel={() => setShowPayment(false)}
          processing={processing}
          error={paymentError}
          currency={currency}
        />
      )}

      <POSTransactions
        open={showDaybook}
        onClose={() => setShowDaybook(false)}
        isManager={auth.isManager}
        currency={currency}
      />
    </div>
  );
};

export default POS;
