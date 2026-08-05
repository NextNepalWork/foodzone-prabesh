import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDeliveryCart } from '../context/DeliveryCartContext';
import { apiService } from '../services/apiService';
import { deliveryFeeCalculator } from '../utils/deliveryFeeCalculator';
import settingsService from '../services/settingsService';

/* Small inline SVG icons (Heroicons outline, 24x24 viewBox) */
const IconMinus = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true" {...props}>
    <path strokeLinecap="round" d="M5 12h14" />
  </svg>
);
const IconPlus = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true" {...props}>
    <path strokeLinecap="round" d="M12 5v14M5 12h14" />
  </svg>
);
const IconTrash = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L5.772 5.79m13.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);
const IconLocation = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
);
const IconBag = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
  </svg>
);
const IconCheckCircle = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconArrowLeft = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);
const IconSpinner = (props) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="animate-spin" {...props}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
    <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

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
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryFeeBreakdown, setDeliveryFeeBreakdown] = useState('');
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState(0);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // Show notification helper
  const showNotification = (message, type = 'error') => {
    const timeouts = settingsService.getTimeoutSettings();
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), timeouts.notificationDurationMs);
  };

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Calculate delivery fee when coordinates are set
  const calculateDeliveryFee = async (coords) => {
    try {
      // Restaurant coordinates (from settings or defaults)
      const restaurantLat = 27.6710;
      const restaurantLng = 85.4298;

      const distance = calculateDistance(restaurantLat, restaurantLng, coords.latitude, coords.longitude);

      // Validate delivery location
      const validation = await deliveryFeeCalculator.validateDeliveryLocation(distance);
      if (!validation.valid) {
        showNotification(validation.reason, 'error');
        setDeliveryFee(0);
        setDeliveryFeeBreakdown(validation.reason);
        return;
      }

      // Calculate fee
      const feeResult = await deliveryFeeCalculator.calculateFee(distance, getDeliveryTotalPrice());
      setDeliveryFee(feeResult.fee || 0);
      setDeliveryFeeBreakdown(feeResult.breakdown);

      // Get estimated time
      const estimatedTime = await deliveryFeeCalculator.getEstimatedTime(distance);
      setEstimatedDeliveryTime(estimatedTime);
    } catch (error) {
      console.error('Error calculating delivery fee:', error);
      setDeliveryFee(0);
    }
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

        // Calculate delivery fee based on location
        calculateDeliveryFee(coords);

        // Reverse geocode to get address
        reverseGeocode(coords);

        // Clear success message after dynamic delay
        const timeouts = settingsService.getTimeoutSettings();
        setTimeout(() => setLocationError(''), timeouts.locationErrorClearMs);
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
        timeout: settingsService.getTimeoutSettings().geolocationTimeoutMs,
        maximumAge: settingsService.getTimeoutSettings().geolocationMaxAgeMs
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
        totalAmount: getDeliveryTotalPrice(),
        deliveryFee: deliveryFee // Include calculated delivery fee
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
        setDeliveryFee(0);
        setDeliveryFeeBreakdown('');
        setEstimatedDeliveryTime(0);
      }, 3000);
    } catch (error) {
      console.error('Error submitting order:', error);
      showNotification('Failed to submit order. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const subtotal = getDeliveryTotalPrice();
  const grandTotal = subtotal + deliveryFee;

  if (orderSubmitted) {
    return (
      <div className="min-h-dvh bg-slate-50 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
          <IconCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Order placed!</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            Thank you for your order. We'll prepare your food and deliver it to
            your location. You'll receive updates via SMS.
          </p>
          <Link
            to="/menu"
            className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-semibold transition"
          >
            Order more items
          </Link>
        </div>
      </div>
    );
  }

  if (deliveryCartItems.length === 0) {
    return (
      <div className="min-h-dvh bg-slate-50 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <IconBag className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Your delivery cart is empty</h2>
          <p className="text-sm text-slate-500 mb-6">Add some delicious items from our menu!</p>
          <Link
            to="/menu"
            className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-semibold transition"
          >
            Browse Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      {/* Toast notification */}
      {notification.show && (
        <div
          role="alert"
          aria-live="polite"
          className={`fixed top-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:max-w-sm z-50 p-3.5 rounded-xl shadow-lg border text-sm font-medium flex items-start gap-2 ${
            notification.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : notification.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}
        >
          <p className="flex-1">{notification.message}</p>
          <button
            onClick={() => setNotification({ show: false, message: '', type: '' })}
            aria-label="Dismiss notification"
            className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-current/60 hover:bg-black/5"
          >
            ✕
          </button>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 pt-4 pb-36">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Delivery Order</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {deliveryCartItems.length} {deliveryCartItems.length === 1 ? 'item' : 'items'} in your cart
            </p>
          </div>
          <Link
            to="/menu"
            className="shrink-0 inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-700 text-sm font-semibold hover:bg-amber-100 active:scale-[0.98] transition"
          >
            <IconPlus className="w-4 h-4" />
            Add items
          </Link>
        </div>

        {!showCheckout ? (
          <>
            {/* Cart items */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-4">
              <div className="flex items-center justify-between px-4 pt-4 pb-1">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Your items</h2>
                <button
                  onClick={clearDeliveryCart}
                  className="text-xs font-semibold text-red-500 hover:text-red-600 h-8 px-2 -mr-2 rounded-lg hover:bg-red-50 transition"
                >
                  Clear all
                </button>
              </div>

              <ul className="divide-y divide-slate-100 px-4">
                {deliveryCartItems.map(item => (
                  <li key={item.id} className="py-3.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm leading-snug">{item.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5 tabular-nums">NPR {item.price}/- each</p>
                      <p className="text-sm font-bold text-amber-600 mt-1 tabular-nums">
                        NPR {item.price * item.quantity}/-
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5 bg-slate-100 rounded-full p-1">
                      <button
                        onClick={() => updateDeliveryQuantity(item.id, item.quantity - 1)}
                        aria-label={`Decrease quantity of ${item.name}`}
                        className="w-9 h-9 rounded-full bg-white text-slate-700 shadow flex items-center justify-center active:scale-95 transition"
                      >
                        <IconMinus className="w-4 h-4" />
                      </button>
                      <span className="w-6 text-center font-bold text-slate-800 tabular-nums">{item.quantity}</span>
                      <button
                        onClick={() => updateDeliveryQuantity(item.id, item.quantity + 1)}
                        aria-label={`Increase quantity of ${item.name}`}
                        className="w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow flex items-center justify-center active:scale-95 transition"
                      >
                        <IconPlus className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromDeliveryCart(item.id)}
                      aria-label={`Remove ${item.name} from cart`}
                      className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 active:scale-95 transition"
                    >
                      <IconTrash className="w-[18px] h-[18px]" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Order summary */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">Summary</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-600">Subtotal</dt>
                  <dd className="font-semibold text-slate-800 tabular-nums">NPR {subtotal}/-</dd>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-slate-600">Delivery fee</dt>
                    <dd className="font-semibold text-slate-800 tabular-nums">NPR {deliveryFee}/-</dd>
                  </div>
                )}
                {estimatedDeliveryTime > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-slate-600">Estimated delivery</dt>
                    <dd className="font-semibold text-slate-800">~{estimatedDeliveryTime} min</dd>
                  </div>
                )}
              </dl>
              {deliveryFeeBreakdown && (
                <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-2.5 mt-3">
                  {deliveryFeeBreakdown}
                </p>
              )}
              {deliveryFee === 0 && (
                <p className="text-xs text-slate-400 mt-3">
                  Delivery fee is calculated from your location at the next step.
                </p>
              )}
              <div className="flex justify-between items-baseline border-t border-dashed border-slate-200 mt-3 pt-3">
                <span className="font-bold text-slate-900">Total</span>
                <span className="text-lg font-extrabold text-amber-600 tabular-nums">NPR {grandTotal}/-</span>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Checkout form */}
            <button
              onClick={() => setShowCheckout(false)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 h-10 -ml-1 px-1 mb-1 transition"
            >
              <IconArrowLeft className="w-4 h-4" />
              Back to cart
            </button>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Delivery details</h2>

              <div>
                <label htmlFor="dc-name" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Your name <span className="text-red-500">*</span>
                </label>
                <input
                  id="dc-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Full name"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                  className="w-full h-12 text-base border border-slate-300 rounded-xl px-3.5 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder:text-slate-400"
                  required
                />
              </div>

              <div>
                <label htmlFor="dc-phone" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Phone number <span className="text-red-500">*</span>
                </label>
                <input
                  id="dc-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="98XXXXXXXX"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                  className="w-full h-12 text-base border border-slate-300 rounded-xl px-3.5 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder:text-slate-400"
                  required
                />
              </div>

              <div>
                <label htmlFor="dc-address" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Delivery address <span className="text-red-500">*</span>
                </label>

                <div className="flex gap-2 mb-2">
                  <button
                    onClick={getCurrentLocation}
                    disabled={locationError.includes('📍')}
                    className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl border border-amber-300 bg-amber-50 text-amber-700 text-sm font-semibold hover:bg-amber-100 active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {locationError.includes('📍') ? (
                      <>
                        <IconSpinner className="w-4 h-4" />
                        Getting location…
                      </>
                    ) : (
                      <>
                        <IconLocation className="w-[18px] h-[18px]" />
                        Use my location
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLocationError('');
                      setCustomerInfo(prev => ({ ...prev, coordinates: null, address: '' }));
                    }}
                    className="shrink-0 h-11 px-4 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 active:scale-[0.98] transition"
                  >
                    Clear
                  </button>
                </div>

                {locationError && (
                  <p
                    className={`text-sm mb-2 p-2.5 rounded-lg border ${
                      locationError.includes('✅')
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : locationError.includes('📍')
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}
                  >
                    {locationError}
                  </p>
                )}

                <textarea
                  id="dc-address"
                  autoComplete="street-address"
                  placeholder="Complete address with landmarks"
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                  className="w-full text-base border border-slate-300 rounded-xl px-3.5 py-3 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder:text-slate-400"
                  required
                />
                {customerInfo.coordinates && (
                  <p className="text-xs text-green-600 mt-1.5 tabular-nums">
                    ✅ Location detected: {customerInfo.coordinates.latitude.toFixed(4)}, {customerInfo.coordinates.longitude.toFixed(4)}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="dc-notes" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Special instructions <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  id="dc-notes"
                  placeholder="Anything the rider should know…"
                  value={customerInfo.deliveryNotes}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, deliveryNotes: e.target.value })}
                  className="w-full text-base border border-slate-300 rounded-xl px-3.5 py-3 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder:text-slate-400"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Sticky bottom bar */}
      <div
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-4">
          <div className="shrink-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total</p>
            <p className="text-lg font-extrabold text-slate-900 leading-tight tabular-nums">NPR {grandTotal}/-</p>
          </div>
          {!showCheckout ? (
            <button
              onClick={() => setShowCheckout(true)}
              className="flex-1 h-12 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-bold text-sm sm:text-base shadow transition"
            >
              Proceed to Delivery Details
            </button>
          ) : (
            <button
              onClick={handleSubmitOrder}
              disabled={isSubmitting}
              className="flex-1 h-12 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-bold text-sm sm:text-base shadow transition disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <IconSpinner className="w-5 h-5" />
                  Placing order…
                </>
              ) : (
                'Place Order'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryCart;
