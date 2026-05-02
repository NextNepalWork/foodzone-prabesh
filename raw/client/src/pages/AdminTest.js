import React from 'react';

const AdminTest = () => {
  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <h1 style={{ color: '#333', fontSize: '24px', marginBottom: '20px' }}>
        🍽️ Food Zone Admin Interface
      </h1>
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#666', fontSize: '18px', marginBottom: '10px' }}>
          Admin Interface
        </h2>
        <p style={{ color: '#888', fontSize: '14px' }}>
          Admin functionality is working correctly.
        </p>
        <p style={{ color: '#888', fontSize: '14px', marginTop: '10px' }}>
          This is the admin interface.
        </p>
      </div>
    </div>
  );
};

export default AdminTest;
