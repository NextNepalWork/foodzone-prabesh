import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDeliveryCart } from '../context/DeliveryCartContext';
import { apiService } from '../services/apiService';

const DeliveryCart = () => {
  const { 
    deliveryCartItems, 
    removeFromDeliveryCart, 
    updateDeliveryQuantity, 
    clearDeliveryCart, 
    getDeliveryTotalPrice 
  } = useDeliveryCart();

  const [showCheckout, setShowCheckout] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    address: '',
    deliveryNotes: '',
    coordinates: null
  });
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // Show notification helper
  const showNotification = (message, type = 'error') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 5000);
  };

  // Get user's current location
  const getCurrentLocation = () => {
    console.log('Location button clicked'); // Debug log
    setLocationError('');
    
    if (!navigator.geolocation) {
      console.log('Geolocation not supported'); // Debug log
      setLocationError('❌ Geolocation is not supported by this browser.');
      return;
    }

    // Show loading state
    console.log('Requesting location...'); // Debug log
    setLocationError('📍 Getting your location...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Location success:', position); // Debug log
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setCustomerInfo(prev => ({ ...prev, coordinates: coords }));
        setLocationError('✅ Location detected successfully!');
        
        // Reverse geocode to get address
        reverseGeocode(coords);
        
        // Clear success message after 3 seconds
        setTimeout(() => setLocationError(''), 3000);
      },
      (error) => {
        console.log('Location error:', error); // Debug log
        let errorMessage = '';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '❌ Location access denied. Please enable location permissions in your browser and try again, or enter your address manually.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = '❌ Location information unavailable. Please enter your address manually.';
            break;
          case error.TIMEOUT:
            errorMessage = '❌ Location request timed out. Please try again or enter your address manually.';
            break;
          default:
            errorMessage = `❌ Unable to get your location (Error ${error.code}). Please enter address manually.`;
            break;
        }
        setLocationError(errorMessage);
        console.error('Location error details:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Increased timeout to 15 seconds
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  // Simple reverse geocoding (you can integrate with Google Maps API)
  const reverseGeocode = async (coords) => {
    try {
      // For now, set coordinates as address. In production, use Google Maps Geocoding API
      const locationString = `GPS Location: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
      setCustomerInfo(prev => ({
        ...prev,
        address: prev.address ? `${prev.address}\n${locationString}` : locationString
      }));
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  };

  const handleSubmitOrder = async () => {
    if (!customerInfo.name || !customerInfo.phone || !customerInfo.address) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const orderData = {
        tableId: 'Delivery',
        customerName: customerInfo.name,
        phone: customerInfo.phone,
        address: customerInfo.address,
        deliveryNotes: customerInfo.deliveryNotes,
        coordinates: customerInfo.coordinates,
        items: deliveryCartItems,
        orderType: 'delivery',
        totalAmount: getDeliveryTotalPrice()
      };

      await apiService.createOrder(orderData);
      
      setOrderSubmitted(true);
      clearDeliveryCart();
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setOrderSubmitted(false);
        setShowCheckout(false);
        setCustomerInfo({ 
          name: '', 
          phone: '', 
          address: '', 
          deliveryNotes: '', 
          coordinates: null 
        });
      }, 3000);
    } catch (error) {
      console.error('Error submitting order:', error);
      showNotification('Failed to submit order. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderSubmitted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-8 text-center shadow-lg">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-800 mb-4">Order Submitted Successfully!</h2>
          <p className="text-gray-700 mb-6">
            Thank you for your order! We'll prepare your food and deliver it to your location.
            You'll receive updates via SMS.
          </p>
          <Link 
            to="/menu"
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Order More Items
          </Link>
        </div>
      </div>
    );
  }

  if (deliveryCartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="text-2xl font-semibold text-gray-600 mb-2">Your Delivery Cart is Empty</h2>
          <p className="text-gray-500 mb-6">Add some delicious items from our menu!</p>
          <Link 
            to="/menu"
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            Browse Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
          notification.type === 'error' 
            ? 'bg-red-100 border border-red-400 text-red-700'
            : notification.type === 'success'
            ? 'bg-green-100 border border-green-400 text-green-700'
            : 'bg-blue-100 border border-blue-400 text-blue-700'
        }`}>
          <div className="flex justify-between items-start">
            <p className="text-sm font-medium">{notification.message}</p>
            <button 
              onClick={() => setNotification({ show: false, message: '', type: '' })}
              className="ml-2 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Prominent Menu Banner */}
      <div className="bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 rounded-2xl p-8 mb-8 text-center shadow-2xl transform hover:scale-105 transition-all duration-300 animate-pulse hover:animate-none">
        <div className="flex items-center justify-center space-x-6">
          <span className="text-6xl animate-bounce">🍽️</span>
          <div>
            <h2 className="text-3xl font-extrabold text-white mb-3">🌟 BROWSE FULL MENU 🌟</h2>
            <p className="text-lg text-white mb-4 opacity-90">Discover more delicious items to add to your order!</p>
            <Link 
              to="/menu"
              className="bg-white text-orange-600 px-8 py-4 rounded-xl hover:bg-gray-100 transition-all duration-300 font-extrabold text-xl shadow-lg hover:shadow-xl transform hover:scale-110 inline-flex items-center space-x-3"
            >
              <span className="text-2xl">📋</span>
              <span>Browse Full Menu</span>
            </Link>
          </div>
        </div>
      </div>
      
      <h1 className="text-3xl font-bold text-center mb-8">🚚 Delivery Order</h1>

      {/* Delivery Cart Items */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Your Items</h2>
          <button
            onClick={() => {
              clearDeliveryCart();
            }}
            className="text-red-600 hover:text-red-700 text-sm font-medium underline"
          >
            Clear Cart
          </button>
        </div>
        
        {deliveryCartItems.map(item => (
          <div key={item.id} className="flex justify-between items-center py-3 border-b">
            <div className="flex-1">
              <span className="font-medium">{item.name}</span>
              <div className="text-sm text-gray-600 mt-1">
                {item.quantity}x @ NPR {item.price}/-
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="font-semibold text-green-600">
                NPR {(item.price * item.quantity)}/-
              </span>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateDeliveryQuantity(item.id, item.quantity - 1)}
                  className="bg-gray-200 text-gray-700 w-7 h-7 rounded-full hover:bg-gray-300 transition-colors text-sm flex items-center justify-center"
                >
                  -
                </button>
                <span className="w-8 text-center font-medium">{item.quantity}</span>
                <button
                  onClick={() => updateDeliveryQuantity(item.id, item.quantity + 1)}
                  className="bg-green-600 text-white w-7 h-7 rounded-full hover:bg-green-700 transition-colors text-sm flex items-center justify-center"
                >
                  +
                </button>
              </div>
              
              <button
                onClick={() => removeFromDeliveryCart(item.id)}
                className="text-red-500 hover:text-red-700 ml-2 p-1"
                title="Remove item"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
        
        <div className="flex justify-between items-center pt-4 text-lg font-bold border-t">
          <span>Total:</span>
          <span>NPR {getDeliveryTotalPrice()}/-</span>
        </div>
      </div>

      {/* Checkout Section */}
      {!showCheckout ? (
        <div className="text-center">
          <button
            onClick={() => setShowCheckout(true)}
            className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold text-lg"
          >
            Proceed to Delivery Details
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-6">Delivery Information</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Name *
              </label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                placeholder="Your contact number"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Address *
              </label>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={getCurrentLocation}
                  disabled={locationError.includes('📍')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {locationError.includes('📍') ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Getting Location...
                    </>
                  ) : (
                    <>
                      📍 Use My Location
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLocationError('');
                    setCustomerInfo(prev => ({ ...prev, coordinates: null, address: '' }));
                  }}
                  className="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                >
                  Clear
                </button>
              </div>
              {locationError && (
                <div className={`text-sm mb-2 p-2 rounded ${
                  locationError.includes('✅') 
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : locationError.includes('📍') 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {locationError}
                </div>
              )}
              <textarea
                placeholder="Enter your complete delivery address with landmarks"
                value={customerInfo.address}
                onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
              {customerInfo.coordinates && (
                <p className="text-sm text-green-600 mt-1">
                  ✅ Location detected: {customerInfo.coordinates.latitude.toFixed(4)}, {customerInfo.coordinates.longitude.toFixed(4)}
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Special Instructions (Optional)
              </label>
              <textarea
                placeholder="Any special instructions for delivery..."
                value={customerInfo.deliveryNotes}
                onChange={(e) => setCustomerInfo({ ...customerInfo, deliveryNotes: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 h-16 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowCheckout(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Back to Cart
              </button>
              <button
                onClick={handleSubmitOrder}
                disabled={isSubmitting}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {isSubmitting ? 'Placing Order...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryCart;
