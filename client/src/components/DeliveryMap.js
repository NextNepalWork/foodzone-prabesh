import React, { useEffect, useRef, useState } from 'react';

// Food Zone coordinates
const FOOD_ZONE_COORDS = {
  lat: 27.6710,
  lng: 85.4298
};

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
};

// Get delivery zone and estimated time based on distance
const getDeliveryInfo = (distance) => {
  if (distance <= 1) {
    return {
      zone: 'Very Close',
      time: '10-15 mins',
      fee: 'Free',
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    };
  } else if (distance <= 2) {
    return {
      zone: 'Nearby',
      time: '15-20 mins',
      fee: 'NPR 30',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    };
  } else if (distance <= 5) {
    return {
      zone: 'Local Area',
      time: '20-30 mins',
      fee: 'NPR 50',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    };
  } else if (distance <= 10) {
    return {
      zone: 'Extended Area',
      time: '30-45 mins',
      fee: 'NPR 80',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    };
  } else {
    return {
      zone: 'Far Distance',
      time: '45+ mins',
      fee: 'NPR 120',
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    };
  }
};

// Enhanced location description with more landmarks and better accuracy
const getLocationDescription = (lat, lng) => {
  // Comprehensive Kathmandu Valley landmarks with accurate coordinates
  const landmarks = [
    // Food Zone and immediate area
    { name: 'Food Zone (Restaurant)', lat: 27.6710, lng: 85.4298, radius: 0.1 },
    { name: 'Hospital Area', lat: 27.6710, lng: 85.4298, radius: 0.5 },
    { name: 'Main Chowk', lat: 27.6720, lng: 85.4290, radius: 0.3 },
    
    // Local area
    { name: 'Heritage Square', lat: 27.6722, lng: 85.4276, radius: 0.8 },
    { name: 'Pottery Square', lat: 27.6728, lng: 85.4297, radius: 0.5 },
    { name: 'Nyatapola Temple Area', lat: 27.6719, lng: 85.4281, radius: 0.4 },
    { name: 'Bus Park', lat: 27.6698, lng: 85.4321, radius: 0.3 },
    
    // Nearby areas
    { name: 'Sallaghari', lat: 27.6650, lng: 85.4350, radius: 0.8 },
    { name: 'Lokanthali', lat: 27.6800, lng: 85.4200, radius: 1.0 },
    { name: 'Thimi', lat: 27.6789, lng: 85.3889, radius: 1.2 },
    { name: 'Madhyapur Thimi', lat: 27.6833, lng: 85.4167, radius: 1.0 },
    { name: 'Sipadol', lat: 27.6600, lng: 85.4400, radius: 0.8 },
    { name: 'Katunje', lat: 27.6580, lng: 85.4480, radius: 0.6 },
    
    // Extended Kathmandu Valley
    { name: 'Gatthaghar', lat: 27.6900, lng: 85.3800, radius: 1.0 },
    { name: 'Bode', lat: 27.6850, lng: 85.3950, radius: 0.8 },
    { name: 'Nagarkot Road', lat: 27.6950, lng: 85.5200, radius: 2.0 },
    { name: 'Changunarayan', lat: 27.7150, lng: 85.4350, radius: 1.5 },
    
    // Kathmandu areas
    { name: 'Koteshwor', lat: 27.6769, lng: 85.3475, radius: 1.0 },
    { name: 'Jadibuti', lat: 27.6850, lng: 85.3600, radius: 0.8 },
    { name: 'Tinkune', lat: 27.6900, lng: 85.3450, radius: 0.5 },
    { name: 'Airport Area (TIA)', lat: 27.6966, lng: 85.3591, radius: 1.5 }
  ];

  // Find closest landmark
  let closestLandmark = null;
  let minDistance = Infinity;

  landmarks.forEach(landmark => {
    const distance = calculateDistance(lat, lng, landmark.lat, landmark.lng);
    if (distance <= landmark.radius && distance < minDistance) {
      minDistance = distance;
      closestLandmark = landmark;
    }
  });

  if (closestLandmark) {
    const distance = calculateDistance(lat, lng, closestLandmark.lat, closestLandmark.lng);
    if (distance < 0.1) {
      return closestLandmark.name;
    } else {
      return `Near ${closestLandmark.name} (${distance.toFixed(1)}km away)`;
    }
  }

  // Enhanced area classification with more precision
  if (lat >= 27.665 && lat <= 27.675 && lng >= 85.425 && lng <= 85.435) {
    return 'Local Area';
  } else if (lat >= 27.670 && lat <= 27.675 && lng >= 85.425 && lng <= 85.430) {
    return 'Heritage Area';
  } else if (lat >= 27.650 && lat <= 27.690 && lng >= 85.380 && lng <= 85.450) {
    return 'Local District';
  } else if (lat >= 27.680 && lat <= 27.720 && lng >= 85.300 && lng <= 85.380) {
    return 'Kathmandu East Area';
  } else if (lat >= 27.650 && lat <= 27.750 && lng >= 85.250 && lng <= 85.500) {
    return 'Kathmandu Valley';
  } else {
    return 'Outside Delivery Area';
  }
};

// Helper function to parse coordinates from various formats
const parseCoordinates = (coordString) => {
  if (!coordString) return null;
  
  try {
    // Handle different coordinate formats
    if (typeof coordString === 'object' && coordString.lat && coordString.lng) {
      return { lat: parseFloat(coordString.lat), lng: parseFloat(coordString.lng) };
    }
    
    if (typeof coordString === 'string') {
      // Handle "lat,lng" format
      if (coordString.includes(',')) {
        const [lat, lng] = coordString.split(',').map(s => parseFloat(s.trim()));
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      }
      
      // Handle JSON string format
      try {
        const parsed = JSON.parse(coordString);
        if (parsed.lat && parsed.lng) {
          return { lat: parseFloat(parsed.lat), lng: parseFloat(parsed.lng) };
        }
      } catch (e) {
        // Not JSON, continue
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing coordinates:', error);
    return null;
  }
};

const DeliveryMap = ({ deliveryOrders = [] }) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Process delivery orders with coordinates - add null check
  const processedOrders = (deliveryOrders || []).map(order => {
    const coordinates = parseCoordinates(order.delivery_coordinates || order.coordinates);
    const distance = coordinates ? calculateDistance(
      FOOD_ZONE_COORDS.lat, 
      FOOD_ZONE_COORDS.lng, 
      coordinates.lat, 
      coordinates.lng
    ) : null;
    
    const deliveryInfo = distance ? getDeliveryInfo(distance) : null;
    const locationDescription = coordinates ? getLocationDescription(coordinates.lat, coordinates.lng) : '';
    
    return {
      ...order,
      coordinates,
      distance,
      deliveryInfo,
      locationDescription
    };
  });

  // Initialize map with proper null checks
  useEffect(() => {
    if (!window.google || !window.google.maps || !mapRef.current) {
      // If Google Maps is not loaded or mapRef is not available, skip initialization
      return;
    }

    try {
      const mapInstance = new window.google.maps.Map(mapRef.current, {
        center: FOOD_ZONE_COORDS, // Center on Food Zone
        zoom: 13,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      setMap(mapInstance);
    } catch (error) {
      console.error('Error initializing Google Maps:', error);
      // If map initialization fails, component will fall back to list view
    }
  }, []);

  // Update markers when orders change with proper error handling
  useEffect(() => {
    if (!map || !deliveryOrders || !window.google || !window.google.maps) return;

    try {
      // Clear existing markers
      markers.forEach(marker => {
        if (marker && marker.setMap) {
          marker.setMap(null);
        }
      });
      
      const newMarkers = [];
      
      processedOrders.forEach((order, index) => {
        if (order.coordinates && order.coordinates.lat && order.coordinates.lng) {
          try {
            const marker = new window.google.maps.Marker({
              position: { lat: order.coordinates.lat, lng: order.coordinates.lng },
              map: map,
              title: `Order #${order.id} - ${order.customer_name}`,
              icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 0C6.7 0 0 6.7 0 15c0 8.3 15 25 15 25s15-16.7 15-25C30 6.7 23.3 0 15 0z" fill="#10B981"/>
                    <circle cx="15" cy="15" r="8" fill="white"/>
                    <text x="15" y="19" text-anchor="middle" font-size="10" fill="#10B981" font-weight="bold">${index + 1}</text>
                  </svg>
                `),
                scaledSize: new window.google.maps.Size(30, 40),
                anchor: new window.google.maps.Point(15, 40)
              }
            });

            marker.addListener('click', () => {
              setSelectedOrder(order);
            });

            newMarkers.push(marker);
          } catch (markerError) {
            console.error('Error creating marker for order:', order.id, markerError);
          }
        }
      });
      
      setMarkers(newMarkers);
      
      // Auto-fit bounds to show all markers
      if (newMarkers.length > 0) {
        try {
          const bounds = new window.google.maps.LatLngBounds();
          
          // Add Food Zone location to bounds
          bounds.extend(new window.google.maps.LatLng(FOOD_ZONE_COORDS.lat, FOOD_ZONE_COORDS.lng));
          
          // Add all delivery locations to bounds
          newMarkers.forEach(marker => {
            if (marker && marker.getPosition) {
              bounds.extend(marker.getPosition());
            }
          });
          
          map.fitBounds(bounds);
          
          // Prevent over-zooming for single markers
          if (newMarkers.length === 1) {
            map.setZoom(Math.min(map.getZoom(), 15));
          }
        } catch (boundsError) {
          console.error('Error setting map bounds:', boundsError);
        }
      }
    } catch (error) {
      console.error('Error updating markers:', error);
    }
  }, [map, processedOrders, deliveryOrders, markers]);

  // Enhanced fallback view when Google Maps is not available
  if (!window.google || !map) {
    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b bg-gradient-to-r from-green-50 to-blue-50">
          <h3 className="text-lg font-semibold flex items-center">
            <span className="mr-2">🗺️</span>
            Delivery Locations Map
          </h3>
          <p className="text-sm text-gray-600">
            {processedOrders.length} active delivery orders • Distance calculated from Food Zone
          </p>
          <div className="mt-2 text-xs text-gray-500">
            📍 Food Zone Location: {FOOD_ZONE_COORDS.lat.toFixed(4)}, {FOOD_ZONE_COORDS.lng.toFixed(4)}
          </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {processedOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-2">🚚</div>
              <p>No active delivery orders</p>
              <p className="text-sm mt-1">Delivery orders with coordinates will appear here</p>
            </div>
          ) : (
            <div className="divide-y">
              {processedOrders.map((order, index) => (
                <div key={order.id || index} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg flex items-center">
                        <span className="mr-2">🚚</span>
                        Order #{order.order_number || order.id}
                      </h4>
                      <p className="text-gray-600 mt-1">
                        👤 {order.customer_name} • 📞 {order.customer_phone}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        📍 {order.delivery_address || order.address || 'Address not specified'}
                      </p>
                      
                      {/* Enhanced Location Information */}
                      {order.locationDescription && (
                        <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                          <p className="text-sm font-medium text-blue-800">
                            {order.locationDescription}
                          </p>
                        </div>
                      )}
                      {order.coordinates && (
                        <p className="text-xs text-blue-600 mt-1">
                          📍 Coordinates: {order.coordinates.lat.toFixed(4)}, {order.coordinates.lng.toFixed(4)}
                        </p>
                      )}
                    </div>
                    
                    <div className="text-right ml-4">
                      <div className="text-lg font-bold text-green-600">
                        NPR {order.total || order.totalAmount || 0}/-
                      </div>
                      {order.deliveryInfo && (
                        <div className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium ${order.deliveryInfo.bgColor} ${order.deliveryInfo.color}`}>
                          {order.deliveryInfo.zone}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Distance and Delivery Information */}
                  {order.distance && order.deliveryInfo && (
                    <div className="grid grid-cols-3 gap-3 mt-3 mb-3">
                      <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                        <div className="font-bold text-xl text-blue-600">{order.distance.toFixed(1)} km</div>
                        <div className="text-xs text-gray-600 font-medium">Distance from Food Zone</div>
                      </div>
                      <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                        <div className="font-bold text-xl text-green-600">{order.deliveryInfo.time}</div>
                        <div className="text-xs text-gray-600 font-medium">Estimated Time</div>
                      </div>
                      <div className="text-center p-3 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg">
                        <div className="font-bold text-xl text-yellow-600">{order.deliveryInfo.fee}</div>
                        <div className="text-xs text-gray-600 font-medium">Delivery Fee</div>
                      </div>
                    </div>
                  )}
                  
                  
                  {/* Google Maps Link */}
                  {order.coordinates && (
                    <div className="mt-3 flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-600">
                        🧭 Navigate from Food Zone to delivery location
                      </div>
                      <a
                        href={`https://www.google.com/maps/dir/${FOOD_ZONE_COORDS.lat},${FOOD_ZONE_COORDS.lng}/${order.coordinates.lat},${order.coordinates.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                      >
                        🗺️ Open Route in Maps
                      </a>
                    </div>
                  )}
                  
                  {/* Order Items */}
                  <div className="border-t pt-3 mt-3">
                    <h5 className="font-medium text-gray-700 mb-2 flex items-center">
                      <span className="mr-2">🍽️</span>
                      Order Items ({order.items ? order.items.length : 0} items)
                    </h5>
                    <div className="space-y-2">
                      {order.items && order.items.length > 0 ? order.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                          <div className="flex items-center">
                            <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold mr-2">
                              {item.quantity}
                            </div>
                            <span className="font-medium">{item.name}</span>
                            {item.instructions && (
                              <span className="ml-2 text-xs text-yellow-600">(Special: {item.instructions})</span>
                            )}
                          </div>
                          <span className="text-gray-600 font-medium">NPR {(item.price * item.quantity)}/-</span>
                        </div>
                      )) : (
                        <p className="text-sm text-gray-500 italic">No items found</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 bg-gray-50 border-t">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span>Active Delivery Orders</span>
            </div>
            <div>
              💡 <strong>Tip:</strong> Add Google Maps API key to enable interactive map view
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">🗺️ Delivery Locations Map</h3>
        <p className="text-sm text-gray-600">
          Showing {deliveryOrders.filter(order => order.coordinates).length} delivery locations
        </p>
      </div>
      
      <div className="relative">
        <div 
          ref={mapRef} 
          className="w-full h-96"
          style={{ minHeight: '400px' }}
        />
        
        {/* Order details popup */}
        {selectedOrder && (
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-10">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold">Order #{selectedOrder.id}</h4>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="space-y-1 text-sm">
              <p><strong>Customer:</strong> {selectedOrder.customerName}</p>
              <p><strong>Phone:</strong> {selectedOrder.phone}</p>
              <p><strong>Address:</strong> {selectedOrder.address}</p>
              <p><strong>Total:</strong> NPR {selectedOrder.totalAmount}/-</p>
              <p><strong>Items:</strong> {selectedOrder.items.length} items</p>
              {selectedOrder.deliveryNotes && (
                <p><strong>Notes:</strong> {selectedOrder.deliveryNotes}</p>
              )}
              <p className="text-gray-500">
                <strong>Coordinates:</strong> {selectedOrder.coordinates.lat.toFixed(4)}, {selectedOrder.coordinates.lng.toFixed(4)}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="p-4 bg-gray-50 border-t">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              📍
            </div>
            <span>Delivery Location</span>
          </div>
          <div className="text-gray-600">
            Click markers to view order details
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryMap;
