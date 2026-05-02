import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { loadGoogleMaps } from '../utils/googleMaps';

export const HeadManager = () => {
  useEffect(() => {
    // Load Google Maps API asynchronously
    loadGoogleMaps().catch(error => {
      console.error('Failed to load Google Maps:', error);
    });

    return () => {
      // Clean up
      const scripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
      scripts.forEach(script => script.remove());
      delete window.initMap;
      delete window.google;
    };
  }, []);

  return (
    <Helmet>
      <title>Food Zone - Restaurant Ordering System</title>
      <meta name="description" content="Food Zone Restaurant - Order delicious food online" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content="#f59e0b" />
      
      {/* PWA related tags */}
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="Food Zone" />
      
      {/* Favicon */}
      <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
      <link rel="apple-touch-icon" href="%PUBLIC_URL%/images/Food Zone Restaurant Logo.jpg" />
    </Helmet>
  );
};

export default HeadManager;
