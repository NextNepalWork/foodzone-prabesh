let googleMapsPromise = null;

export const loadGoogleMaps = () => {
  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      resolve(window.google.maps);
      return;
    }

    // Create script element
    const script = document.createElement('script');
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn('Google Maps API key is not set');
      reject(new Error('Google Maps API key is not set'));
      return;
    }

    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap`;
    script.async = true;
    script.defer = true;
    script.onerror = (error) => {
      console.error('Error loading Google Maps API:', error);
      reject(error);
    };

    // Set up the global callback
    window.initMap = () => {
      if (window.google && window.google.maps) {
        resolve(window.google.maps);
      } else {
        reject(new Error('Google Maps API loaded but not properly initialized'));
      }
    };

    // Add script to document
    document.head.appendChild(script);
  });

  return googleMapsPromise;
};

export const getGoogleMaps = () => {
  if (!window.google || !window.google.maps) {
    throw new Error('Google Maps API is not loaded. Call loadGoogleMaps() first.');
  }
  return window.google.maps;
};
