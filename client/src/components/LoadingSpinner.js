import React from 'react';

const LoadingSpinner = ({ message = "Loading..." }) => {
  return (
    <div className="loading-spinner-container">
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p className="loading-text">{message}</p>
      </div>
      <style jsx>{`
        .loading-spinner-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 200px;
          padding: 20px;
        }
        
        .loading-spinner {
          text-align: center;
        }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #2563eb;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 15px;
        }
        
        .loading-text {
          color: #666;
          font-size: 16px;
          margin: 0;
          font-weight: 500;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;
