import React, { Suspense, useEffect } from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import TableBanner from './components/TableBanner';
import FloatingCart from './components/FloatingCart';
// import ChunkErrorBoundary from './components/ChunkErrorBoundary'; // Removed - was blocking order submissions
import { CartProvider } from './context/CartContext';
import { DeliveryCartProvider } from './context/DeliveryCartContext';
import { initializeBundleOptimizations } from './utils/bundleOptimizer';
import AdminRouter from './mobile-admin/AdminRouter';

// Import critical components directly to prevent chunk loading errors
import Menu from './pages/Menu';
import Homepage from './pages/Homepage';
import Tables from './pages/Tables';
import TableOrder from './pages/TableOrder';

// Non-critical components (lower priority)
const DeliveryCart = React.lazy(() => 
  import(/* webpackChunkName: "delivery" */ './pages/DeliveryCart')
);
const Admin = React.lazy(() => 
  import(/* webpackChunkName: "admin" */ './pages/Admin')
);
const AdminMobile = React.lazy(() => 
  import(/* webpackChunkName: "admin" */ './pages/AdminMobile')
);
const AdminPremium = React.lazy(() =>
  import(/* webpackChunkName: "admin" */ './pages/AdminPremium')
);
const StaffDashboard = React.lazy(() => 
  import(/* webpackChunkName: "staff" */ './pages/StaffDashboard')
);
const Reception = React.lazy(() => 
  import(/* webpackChunkName: "staff" */ './pages/Reception')
);
const TableCall = React.lazy(() => 
  import(/* webpackChunkName: "table-call" */ './pages/TableCall')
);
const TableDashboard = React.lazy(() => 
  import(/* webpackChunkName: "table-dashboard" */ './pages/TableDashboard')
);
const SettingsTest = React.lazy(() => 
  import(/* webpackChunkName: "test" */ './components/SettingsTest')
);

// Ultra-minimal loading component for instant render
const LoadingSpinner = React.memo(() => (
  <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',backgroundColor:'#f9fafb'}}>
    <div style={{textAlign:'center'}}>
      <div style={{display:'inline-block',animation:'spin 1s linear infinite',borderRadius:'50%',width:'32px',height:'32px',borderBottom:'2px solid #d97706',marginBottom:'8px'}}></div>
      <div style={{fontSize:'14px',color:'#4b5563'}}>Loading...</div>
    </div>
  </div>
));

const AppContent = React.memo(() => {
  const location = useLocation();
  
  // Memoize page type checks to prevent re-calculations
  const pageType = React.useMemo(() => {
    const path = location.pathname;
    // Table order pages use the dynamic `/:tableId` route, e.g. `/5`.
    // They now have their own thin in-page header, so we hide the
    // global sticky Header, TableBanner, and FloatingCart for them.
    const isTableOrderPage = /^\/\d+\/?$/.test(path);
    const isTableDashboardPage = /^\/table\/\d+\/dashboard\/?$/.test(path);
    return {
      isAdminPage: path.startsWith('/admin'),
      isStaffPage: path.startsWith('/staff'),
      isReceptionPage: path.startsWith('/reception'),
      isTableOrderPage,
      isTableDashboardPage,
    };
  }, [location.pathname]);

  const showHeaderAndCart =
    !pageType.isAdminPage &&
    !pageType.isStaffPage &&
    !pageType.isReceptionPage &&
    !pageType.isTableOrderPage &&
    !pageType.isTableDashboardPage;
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Only show Header and TableBanner on customer pages */}
      {showHeaderAndCart && (
        <>
          <Header />
          <TableBanner />
        </>
      )}
      
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/tables" element={<Tables />} />
          <Route path="/delivery-cart" element={<DeliveryCart />} />
          <Route path="/call" element={<TableCall />} />
          <Route path="/settings-test" element={<SettingsTest />} />
          
          {/* Staff Role-Based Pages */}
          <Route path="/staff" element={<StaffDashboard />} /> {/* Chef & Waiter Dashboard */}
          <Route path="/reception" element={<Reception />} /> {/* Cashier Dashboard */}
          <Route path="/admin" element={<AdminRouter DesktopAdmin={AdminPremium} />} /> {/* Manager Dashboard */}
          
          {/* Legacy Admin Routes */}
          <Route path="/admin-premium" element={<AdminPremium />} />
          <Route path="/admin-mobile" element={<AdminMobile />} />
          <Route path="/admin-legacy" element={<Admin />} />
          
          {/* Dynamic Table Routes */}
          <Route path="/table/:tableId/dashboard" element={<TableDashboard />} />
          <Route path="/:tableId" element={<TableOrder />} />
        </Routes>
      </Suspense>
      
      {/* Only show Floating Cart on customer pages */}
      {showHeaderAndCart && <FloatingCart />}
    </div>
  );
});

function App() {
  // Initialize bundle optimizations for instant table loading
  useEffect(() => {
    initializeBundleOptimizations();
  }, []);

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CartProvider>
        <DeliveryCartProvider>
          <AppContent />
        </DeliveryCartProvider>
      </CartProvider>
    </Router>
  );
}

export default App;
