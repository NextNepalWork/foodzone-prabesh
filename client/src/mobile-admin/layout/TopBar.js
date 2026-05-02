import React from 'react';

const TopBar = ({ title, leftIcon, onLeft, rightIcon, onRight, subtitle }) => (
  <div className="m-topbar">
    <div className="m-topbar-inner">
      <div style={{ width: 36, display: 'flex', justifyContent: 'flex-start' }}>
        {leftIcon ? (
          <button className="m-topbar-btn" onClick={onLeft} aria-label="Back">
            {leftIcon}
          </button>
        ) : null}
      </div>
      <div className="m-topbar-title">
        <div>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--m-text-2)', marginTop: -2 }}>
            {subtitle}
          </div>
        )}
      </div>
      <div style={{ width: 36, display: 'flex', justifyContent: 'flex-end' }}>
        {rightIcon ? (
          <button className="m-topbar-btn" onClick={onRight} aria-label="Action">
            {rightIcon}
          </button>
        ) : null}
      </div>
    </div>
  </div>
);

export default TopBar;
