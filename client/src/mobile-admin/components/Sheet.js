import React, { useEffect } from 'react';

const Sheet = ({ open, onClose, title, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="m-sheet-backdrop" onClick={onClose} />
      <div className="m-sheet" role="dialog" aria-modal="true">
        <div className="m-sheet-handle" />
        {title && (
          <div style={{ padding: '0 20px 12px', fontSize: 17, fontWeight: 700, textAlign: 'center' }}>
            {title}
          </div>
        )}
        {children}
      </div>
    </>
  );
};

export default Sheet;
