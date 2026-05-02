import React, { Suspense } from 'react';
import useIsMobile from './hooks/useIsMobile';

const MobileAdminApp = React.lazy(() =>
  import(/* webpackChunkName: "mobile-admin" */ './MobileAdminApp')
);

// Wraps the desktop admin page; switches to MobileAdminApp on phones.
// The user can force desktop by setting localStorage.m-admin-force-desktop = '1'.
const AdminRouter = ({ DesktopAdmin }) => {
  const isMobile = useIsMobile();
  const forceDesktop =
    typeof window !== 'undefined' &&
    localStorage.getItem('m-admin-force-desktop') === '1';

  if (isMobile && !forceDesktop) {
    return (
      <Suspense fallback={
        <div style={{ position: 'fixed', inset: 0, background: '#f7f7fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e11d48', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
            <div style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>Loading Admin…</div>
          </div>
        </div>
      }>
        <MobileAdminApp />
      </Suspense>
    );
  }
  return <DesktopAdmin />;
};

export default AdminRouter;
