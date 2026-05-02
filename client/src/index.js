import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { criticalResourcePreloader } from './utils/criticalResourcePreloader';
import './utils/chunkErrorHandler';
import './utils/chunk292Recovery';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Initialize chunk error handlers for recovery
if (process.env.NODE_ENV !== 'production') {
  console.log('🛡️ Enhanced chunk error recovery system initialized');
  console.log('🔧 Specialized chunk 292 recovery active');
}

// Preload critical resources immediately for instant table loading
criticalResourcePreloader.preloadCriticalResources();

// Clean up old preloaded data
criticalResourcePreloader.clearOldPreloadedData();

// Enable concurrent features for better performance
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
