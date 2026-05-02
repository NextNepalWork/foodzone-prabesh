import React from 'react';

const InstallPrompt = ({ onInstall, onDismiss }) => (
  <div className="m-install-banner" role="alert">
    <div style={{ fontSize: 24 }}>📲</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 700 }}>Install Admin App</div>
      <div style={{ fontSize: 11, opacity: 0.85, marginTop: 1 }}>
        Add to home screen for full-screen app
      </div>
    </div>
    <button
      onClick={onInstall}
      style={{
        background: '#fff',
        color: 'var(--m-text)',
        border: 'none',
        borderRadius: 10,
        padding: '8px 14px',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      Install
    </button>
    <button
      onClick={onDismiss}
      style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', opacity: 0.7 }}
      aria-label="Dismiss"
    >
      ✕
    </button>
  </div>
);

export default InstallPrompt;
