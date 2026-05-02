import React from 'react';

const PlaceholderScreen = ({ title, icon, message, onOpenDesktop }) => (
  <div style={{ padding: '20px 16px' }}>
    <div className="m-empty" style={{ padding: '80px 20px' }}>
      <div className="m-empty-icon">{icon || '🛠️'}</div>
      <div className="m-empty-title">{title}</div>
      <div className="m-empty-msg" style={{ marginBottom: 20 }}>
        {message || "This view is optimised on the desktop admin for now. We're bringing it to mobile soon."}
      </div>
      {onOpenDesktop && (
        <button className="m-btn-secondary" onClick={onOpenDesktop} style={{ margin: '0 auto' }}>
          🖥️ Open Desktop View
        </button>
      )}
    </div>
  </div>
);

export default PlaceholderScreen;
