import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { getSocketUrl } from '../config/api';

import './mobile-admin.css';

import AppShell from './layout/AppShell';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import OrdersScreen from './screens/OrdersScreen';
import TablesScreen from './screens/TablesScreen';
import MoreScreen from './screens/MoreScreen';
import SettingsScreen from './screens/SettingsScreen';
import OrderDetailScreen from './screens/OrderDetailScreen';
import MenuScreen from './screens/MenuScreen';
import InventoryScreen from './screens/InventoryScreen';
import TableCallsScreen from './screens/TableCallsScreen';
import CustomersScreen from './screens/CustomersScreen';
import ReportsScreen from './screens/ReportsScreen';
import DaybookScreen from './screens/DaybookScreen';
import StaffScreen from './screens/StaffScreen';
import Sheet from './components/Sheet';
import InstallPrompt from './components/InstallPrompt';
import useInstallPrompt from './hooks/useInstallPrompt';
import useHaptics from './hooks/useHaptics';

// Which tab label lives in the top bar
const TAB_TITLES = {
  dashboard: { title: 'Dashboard' },
  orders:    { title: 'Orders' },
  tables:    { title: 'Tables' },
  more:      { title: 'More' },
};

const SECONDARY_TITLES = {
  settings:  'Settings',
  menu:      'Menu',
  inventory: 'Inventory',
  calls:     'Table Calls',
  customers: 'Customers',
  reports:   'Reports',
  daybook:   'Daybook',
  staff:     'Staff',
};

const MobileAdminApp = () => {
  // --- Auth ------------------------------------------------------------
  const [isAuthed, setIsAuthed] = useState(() => {
    return (
      localStorage.getItem('adminAuthenticated') === 'true' &&
      !!localStorage.getItem('adminToken')
    );
  });

  // --- Navigation (stack over a primary tab) ---------------------------
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stack, setStack] = useState([]); // e.g. ['settings']
  const currentScreen = stack[stack.length - 1] || activeTab;

  // --- Live data -------------------------------------------------------
  const [liveOrders, setLiveOrders] = useState([]);
  const [badges, setBadges] = useState({ orders: 0, tables: 0 });

  // --- UI state --------------------------------------------------------
  const [orderDetail, setOrderDetail] = useState(null);
  const [offline, setOffline] = useState(!navigator.onLine);
  const install = useInstallPrompt();
  const haptics = useHaptics();

  // --- Auth handlers ---------------------------------------------------
  const onAuthed = () => setIsAuthed(true);
  const onLogout = () => {
    localStorage.removeItem('adminAuthenticated');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('staffToken');
    setIsAuthed(false);
    setActiveTab('dashboard');
    setStack([]);
  };
  const onDesktop = () => {
    // Navigate to the desktop admin (bypass mobile-admin routing)
    try {
      localStorage.setItem('m-admin-force-desktop', '1');
    } catch (_) {}
    window.location.reload();
  };

  // --- Auth expiry (fired by apiService on a 401) ---------------------
  useEffect(() => {
    const onExpired = () => {
      setIsAuthed(false);
      setActiveTab('dashboard');
      setStack([]);
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  // --- Online/offline --------------------------------------------------
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // --- Match iOS status bar to brand while this app is mounted --------
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const prev = meta ? meta.getAttribute('content') : null;
    if (meta) meta.setAttribute('content', '#ffffff');
    return () => { if (meta && prev !== null) meta.setAttribute('content', prev); };
  }, []);

  // --- Socket.io: live orders + table updates --------------------------
  useEffect(() => {
    if (!isAuthed) return;
    let socket;
    try {
      socket = io(getSocketUrl(), { transports: ['websocket', 'polling'] });
    } catch (_) {
      return;
    }
    socket.on('newOrder', (order) => {
      haptics.tap(20);
      setLiveOrders((prev) => [order, ...prev].slice(0, 50));
      setBadges((b) => ({ ...b, orders: (b.orders || 0) + 1 }));
    });
    socket.on('orderUpdated', (order) => {
      setLiveOrders((prev) => {
        const i = prev.findIndex((o) => (o.id || o._id) === (order.id || order._id));
        if (i === -1) return [order, ...prev].slice(0, 50);
        const copy = prev.slice();
        copy[i] = order;
        return copy;
      });
    });
    socket.on('tableCleared', () => {
      setBadges((b) => ({ ...b, tables: 0 }));
    });
    return () => { try { socket.disconnect(); } catch (_) {} };
  }, [isAuthed, haptics]);

  // Clear orders badge when user opens Orders tab
  useEffect(() => {
    if (activeTab === 'orders') setBadges((b) => ({ ...b, orders: 0 }));
  }, [activeTab]);

  // --- Navigation helpers ---------------------------------------------
  const push = (screen) => { haptics.tap(); setStack((s) => [...s, screen]); };
  const pop = () => { haptics.tap(); setStack((s) => s.slice(0, -1)); };
  const onTabChange = (id) => { haptics.tap(); setActiveTab(id); setStack([]); };

  // --- Render ----------------------------------------------------------
  if (!isAuthed) {
    return (
      <div className="m-admin">
        <LoginScreen onAuthed={onAuthed} />
      </div>
    );
  }

  const inSecondary = stack.length > 0;
  const title = inSecondary
    ? SECONDARY_TITLES[currentScreen] || currentScreen
    : TAB_TITLES[activeTab]?.title || 'Admin';

  let body;
  if (inSecondary) {
    switch (currentScreen) {
      case 'settings':
        body = <SettingsScreen onBack={pop} />;
        break;
      case 'menu':
        body = <MenuScreen />;
        break;
      case 'inventory':
        body = <InventoryScreen />;
        break;
      case 'calls':
        body = <TableCallsScreen />;
        break;
      case 'customers':
        body = <CustomersScreen />;
        break;
      case 'reports':
        body = <ReportsScreen />;
        break;
      case 'daybook':
        body = <DaybookScreen />;
        break;
      case 'staff':
        body = <StaffScreen />;
        break;
      default:
        body = null;
    }
  } else {
    switch (activeTab) {
      case 'dashboard':
        body = (
          <DashboardScreen
            onOpenOrder={setOrderDetail}
            onGoToOrders={() => onTabChange('orders')}
            onGoToTables={() => onTabChange('tables')}
          />
        );
        break;
      case 'orders':
        body = <OrdersScreen onOpenOrder={setOrderDetail} liveOrders={liveOrders} />;
        break;
      case 'tables':
        body = <TablesScreen />;
        break;
      case 'more':
        body = (
          <MoreScreen
            onNavigate={push}
            onLogout={onLogout}
            onDesktop={onDesktop}
            user={localStorage.getItem('username') || 'Admin'}
          />
        );
        break;
      default:
        body = null;
    }
  }

  return (
    <div className="m-admin">
      <AppShell
        title={title}
        leftIcon={inSecondary ? '‹' : null}
        onLeft={inSecondary ? pop : null}
        rightIcon={!inSecondary && activeTab === 'dashboard' ? '🔄' : null}
        onRight={!inSecondary && activeTab === 'dashboard' ? () => window.location.reload() : null}
        activeTab={inSecondary ? null : activeTab}
        onTabChange={onTabChange}
        badges={badges}
        hideTabBar={inSecondary}
        offline={offline}
      >
        {body}
      </AppShell>

      <Sheet open={!!orderDetail} onClose={() => setOrderDetail(null)} title="Order Details">
        <OrderDetailScreen
          order={orderDetail}
          onClose={() => setOrderDetail(null)}
          onUpdated={(updated) => {
            setOrderDetail(updated);
            setLiveOrders((prev) => {
              const i = prev.findIndex((o) => (o.id || o._id) === (updated.id || updated._id));
              if (i === -1) return prev;
              const copy = prev.slice(); copy[i] = updated; return copy;
            });
          }}
        />
      </Sheet>

      {install.canInstall && (
        <InstallPrompt onInstall={install.prompt} onDismiss={install.dismiss} />
      )}
    </div>
  );
};

export default MobileAdminApp;
