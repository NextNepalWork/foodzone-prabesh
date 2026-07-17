import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getApiUrl, getSocketUrl } from '../config/api';
import io from 'socket.io-client';
import soundManager from '../utils/soundManager';
import SoundEnableBanner from '../components/SoundEnableBanner';

const ORDER_WINDOW_MINUTES = 30; // Kitchen TV only shows orders placed within this window

const KitchenTV = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [now, setNow] = useState(new Date());
  const [userRole, setUserRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('adminToken') || localStorage.getItem('staffToken');
  });
  const [busyOrderId, setBusyOrderId] = useState(null);
  const socketRef = useRef(null);

  const getUserRole = () => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('staffToken');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role;
    } catch (e) {
      return null;
    }
  };

  const isAllowedRole = (role) => {
    return ['admin', 'Manager', 'Chef', 'Kitchen Helper'].includes(role);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('staffToken');
    localStorage.removeItem('adminAuthenticated');
    window.location.href = '/admin?redirect=/kitchen-tv';
  };

  const playChime = useCallback((orderId) => {
    soundManager.play('kitchen-alarm', orderId ? `order-${orderId}` : undefined);
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      setError(null);
      const token = localStorage.getItem('adminToken') || localStorage.getItem('staffToken');
      const response = await fetch(`${getApiUrl()}/api/orders`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });

      if (response.status === 401) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('staffToken');
        setIsAuthenticated(false);
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const list = Array.isArray(data?.orders) ? data.orders : Array.isArray(data) ? data : [];
      setOrders(list);
    } catch (e) {
      console.error('KitchenTV: failed to fetch orders', e);
      setError('Failed to load orders. Retrying…');
    } finally {
      setLoading(false);
    }
  }, []);

  // Tick the clock every 15s so elapsed-time badges and the 30-min window stay current
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/admin?redirect=/kitchen-tv';
      return;
    }

    const role = getUserRole();
    setUserRole(role);
    if (!role) {
      // Malformed token or no role claim — force a clean re-login instead of hanging on the spinner
      localStorage.removeItem('adminToken');
      localStorage.removeItem('staffToken');
      window.location.href = '/admin?redirect=/kitchen-tv';
      return;
    }
    if (!isAllowedRole(role)) {
      setLoading(false);
      return; // render access-denied below, don't bother connecting
    }

    fetchOrders();

    const token = localStorage.getItem('adminToken') || localStorage.getItem('staffToken');
    const socket = io(getSocketUrl(), { auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => setIsOnline(true));
    socket.on('disconnect', () => setIsOnline(false));

    socket.on('newOrder', (order) => {
      setOrders((prev) => [order, ...prev]);
      playChime(order?.id);
    });

    socket.on('orderStatusUpdated', ({ orderId, status }) => {
      // orderId comes off the socket as a string; local ids are numeric — coerce both sides
      setOrders((prev) => prev.map((o) => (String(o.id) === String(orderId) ? { ...o, status } : o)));
    });

    socket.on('orderDeleted', ({ orderId }) => {
      setOrders((prev) => prev.filter((o) => String(o.id) !== String(orderId)));
    });

    const pollInterval = setInterval(fetchOrders, 30000);

    return () => {
      clearInterval(pollInterval);
      socket.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const updateOrderStatus = async (orderId, newStatus) => {
    setBusyOrderId(orderId);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('staffToken');
      const response = await fetch(`${getApiUrl()}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.status === 401) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('staffToken');
        setIsAuthenticated(false);
        return;
      }
      if (!response.ok) throw new Error('Failed to update order status');
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
    } catch (e) {
      console.error('KitchenTV: failed to update order status', e);
      setError('Could not update order — check connection.');
    } finally {
      setBusyOrderId(null);
    }
  };

  if (!isAuthenticated) return null;

  if (userRole && !isAllowedRole(userRole)) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold mb-2">Kitchen Access Only</h2>
          <p className="text-slate-400 mb-6">This screen is for kitchen staff (Chef / Kitchen Helper).</p>
          <button onClick={handleLogout} className="px-6 py-3 bg-slate-700 rounded-xl font-bold">Logout</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-4"></div>
          <p className="text-slate-300 text-xl">Loading kitchen orders…</p>
        </div>
      </div>
    );
  }

  const visibleOrders = (Array.isArray(orders) ? orders : []).filter((order) => {
    if (!['pending', 'preparing', 'ready'].includes(order.status)) return false;
    const createdAt = new Date(order.created_at);
    // If the timestamp is missing/unparseable, show the order rather than silently hiding it
    if (isNaN(createdAt.getTime())) return true;
    const minutesElapsed = (now - createdAt) / 60000;
    return minutesElapsed <= ORDER_WINDOW_MINUTES;
  });

  const columns = [
    { key: 'pending', title: 'NEW', emoji: '⏳', accent: 'border-amber-500', headBg: 'bg-amber-500' },
    { key: 'preparing', title: 'PREPARING', emoji: '🔥', accent: 'border-blue-500', headBg: 'bg-blue-500' },
    { key: 'ready', title: 'READY', emoji: '✅', accent: 'border-emerald-500', headBg: 'bg-emerald-500' },
  ];

  const orderCard = (order) => {
    const createdAt = new Date(order.created_at);
    const validTime = !isNaN(createdAt.getTime());
    const minutesElapsed = validTime ? Math.max(0, Math.floor((now - createdAt) / 60000)) : 0;
    const isUrgent = order.status === 'pending' ? minutesElapsed >= 10 : minutesElapsed >= 25;
    const isCritical = order.status === 'pending' ? minutesElapsed >= 15 : minutesElapsed >= 30;
    const isBusy = busyOrderId === order.id;

    return (
      <div
        key={order.id}
        className={`rounded-2xl bg-slate-800 border-4 p-5 shadow-xl transition-all ${
          isCritical ? 'border-red-500 animate-pulse' : isUrgent ? 'border-orange-400' : 'border-slate-700'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-3xl font-black text-white">#{order.id}</span>
          <span className={`px-3 py-1.5 rounded-full text-base font-bold ${
            isCritical ? 'bg-red-500 text-white' : isUrgent ? 'bg-orange-400 text-slate-900' : 'bg-slate-700 text-slate-200'
          }`}>
            ⏱ {validTime ? `${minutesElapsed}m` : '—'}
          </span>
        </div>

        <div className="mb-3">
          {order.table_id ? (
            <span className="inline-flex items-center px-3 py-1 rounded-lg text-lg font-bold bg-indigo-500/20 text-indigo-300">
              🪑 Table {order.table_id}
            </span>
          ) : order.order_type === 'delivery' ? (
            <span className="inline-flex items-center px-3 py-1 rounded-lg text-lg font-bold bg-emerald-500/20 text-emerald-300">
              🚚 Delivery
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-lg text-lg font-bold bg-slate-600/40 text-slate-200">
              🥡 Takeaway
            </span>
          )}
          {order.customer_name && (
            <span className="ml-2 text-slate-400 text-base">{order.customer_name}</span>
          )}
        </div>

        <div className="space-y-1.5 mb-4 max-h-56 overflow-y-auto pr-1">
          {order.items && order.items.length > 0 ? (
            order.items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-slate-900/60 rounded-xl px-3 py-2">
                <span className="flex items-center justify-center w-9 h-9 rounded-full bg-orange-500 text-white font-black text-lg shrink-0">
                  {item.quantity}
                </span>
                <span className="text-white font-semibold text-lg leading-tight">
                  {item.menu_item_name || item.name}
                </span>
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-center py-2">No items listed</p>
          )}
        </div>

        {order.status === 'pending' && (
          <button
            onClick={() => updateOrderStatus(order.id, 'preparing')}
            disabled={isBusy}
            className="w-full py-5 rounded-xl bg-blue-600 active:bg-blue-800 text-white text-2xl font-black tracking-wide shadow-lg disabled:opacity-50"
          >
            {isBusy ? '…' : '🔥 START PREPARING'}
          </button>
        )}
        {order.status === 'preparing' && (
          <button
            onClick={() => updateOrderStatus(order.id, 'ready')}
            disabled={isBusy}
            className="w-full py-5 rounded-xl bg-emerald-600 active:bg-emerald-800 text-white text-2xl font-black tracking-wide shadow-lg disabled:opacity-50"
          >
            {isBusy ? '…' : '✅ MARK READY'}
          </button>
        )}
        {order.status === 'ready' && (
          <div className="w-full py-5 rounded-xl bg-emerald-900/50 border-2 border-emerald-500 text-emerald-300 text-xl font-black text-center tracking-wide">
            READY — AWAITING PICKUP
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <SoundEnableBanner />
      <div className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b-2 border-slate-700">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-black text-white">👨‍🍳 Kitchen TV</h1>
          <span className="text-slate-400 text-lg">Orders placed within last {ORDER_WINDOW_MINUTES} min</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-300 text-xl font-mono">
            {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className={`flex items-center gap-2 px-4 py-2 rounded-lg text-base font-bold ${
            isOnline ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white animate-pulse'
          }`}>
            {isOnline ? '🟢 LIVE' : '🔴 OFFLINE'}
          </span>
          <button onClick={handleLogout} className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 text-base font-bold">
            Logout
          </button>
        </div>
      </div>

      {error && (
        <div className="px-6 py-2 bg-red-900/60 text-red-200 text-center text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 p-5">
        {columns.map((col) => {
          const colOrders = visibleOrders
            .filter((o) => o.status === col.key)
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          return (
            <div key={col.key} className="flex flex-col">
              <div className={`flex items-center justify-between px-4 py-3 rounded-t-xl ${col.headBg}`}>
                <span className="text-xl font-black text-white">{col.emoji} {col.title}</span>
                <span className="px-3 py-1 rounded-full bg-black/20 text-white font-black text-lg">{colOrders.length}</span>
              </div>
              <div className="flex-1 space-y-4 p-3 bg-slate-900/40 rounded-b-xl min-h-[200px]">
                {colOrders.length === 0 ? (
                  <p className="text-slate-600 text-center py-10 text-lg">No orders</p>
                ) : (
                  colOrders.map(orderCard)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KitchenTV;
