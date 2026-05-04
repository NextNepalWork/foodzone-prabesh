import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/apiService';
import io from 'socket.io-client';
import { getSocketUrl } from '../config/api';
import { useCart } from '../context/CartContext';
import { useTableCount } from '../hooks/useSettings';
import { useTableSession } from '../hooks/useTableSession';
import TableCallButton from '../components/TableCallButton';
import { orderingStatusChecker } from '../utils/orderingStatusChecker';
import './TableOrder.css';

const TableOrder = () => {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { cartItems, addToCart, removeFromCart, updateQuantity, setTableContext, clearCart, getTotalPrice } = useCart();
  const { createSession, sessionActive } = useTableSession();
  
  // Get dynamic table count from settings
  const tableCount = useTableCount();
  
  // Debug logging
  useEffect(() => {
    console.log('🔍 TableOrder - Current table count:', tableCount);
    console.log('🟡 FOOTER SHOULD BE VISIBLE - Yellow background with orange border');
  }, [tableCount]);

  const [menuItems, setMenuItems] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  // eslint-disable-next-line no-unused-vars
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [menuPhotos, setMenuPhotos] = useState([]);
  const [slidePosition, setSlidePosition] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const [slideComplete, setSlideComplete] = useState(false);
  const slideRef = useRef(null);
  const slideStartX = useRef(0);

  const menuListRef = useRef(null);

  // Lock body scroll so only internal menu area scrolls (important for PWA on iOS)
  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  useEffect(() => {
    if (tableId && !isNaN(tableId) && parseInt(tableId) >= 1 && parseInt(tableId) <= tableCount) {
      setTableContext(parseInt(tableId));
      fetchMenuItems();
      
      // Initialize table session
      if (!sessionActive) {
        createSession(tableId).catch(error => {
          console.error('Failed to create table session:', error);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId, tableCount]);

  // Socket connection for real-time table clearing
  useEffect(() => {
    const socket = io(getSocketUrl());

    socket.on('tableCleared', (data) => {
      console.log('🔔 Table cleared event received:', data);
      if (data.tableId === parseInt(tableId)) {
        console.log('🧹 This table was cleared by admin, redirecting to homepage...');
        clearCart();
        localStorage.removeItem(`customerInfo_${tableId}`);
        localStorage.removeItem(`tableSession_${tableId}`);
        localStorage.removeItem(`cart_table_${tableId}`);
        localStorage.removeItem(`cart_timestamp_${tableId}`);
        localStorage.removeItem(`order_submitted_${tableId}`);
        localStorage.removeItem('currentTable');
        localStorage.removeItem('tableTimestamp');

        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes(`_${tableId}`) || key.includes(`table_${tableId}`) || key.includes(`${tableId}_`))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));

        alert('🍽️ Your table session has been cleared by restaurant staff. You will be redirected to the homepage.');
        navigate('/', { replace: true });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [tableId, clearCart, navigate]);

  const fetchMenuItems = async () => {
    try {
      const response = await apiService.getMenu();
      if (response && response.data && Array.isArray(response.data)) {
        setMenuItems(response.data);
      } else if (Array.isArray(response)) {
        setMenuItems(response);
      } else {
        console.error('Invalid menu response format:', response);
        setMenuItems([]);
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Load menu photos from settings
  useEffect(() => {
    const fetchMenuPhotos = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/settings/menu-photos`);
        const data = await response.json();
        if (data.photos && Array.isArray(data.photos)) {
          setMenuPhotos(data.photos);
        }
      } catch (error) {
        console.error('Error fetching menu photos:', error);
        // Fallback to default photos
        setMenuPhotos([
          '/menu/1.jpg',
          '/menu/2.jpeg',
          '/menu/3.jpeg',
          '/menu/4.jpg',
          '/menu/5.jpg',
          '/menu/6.jpeg',
          '/menu/7.jpeg',
          '/menu/8.jpeg',
          '/menu/9.jpeg',
          '/menu/10.jpeg'
        ]);
      }
    };
    fetchMenuPhotos();
  }, []);

  const handleSubmitOrder = async () => {
    setErrorMessage('');
    
    if (cartItems.length === 0) {
      setErrorMessage('Your cart is empty');
      return;
    }

    // Check if orders can be placed
    const orderingStatus = await orderingStatusChecker.canPlaceOrder();
    if (!orderingStatus.canOrder) {
      const allowPreOrders = orderingStatusChecker.allowPreOrders();
      if (!allowPreOrders) {
        setErrorMessage(orderingStatus.message);
        resetSlide();
        return;
      }
      // Pre-orders allowed, show warning but continue
      console.log('⏰ Pre-order accepted:', orderingStatus.message);
    }

    // Check minimum order amount
    const minOrder = orderingStatusChecker.getMinimumOrderAmount('dine-in');
    const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (totalAmount < minOrder) {
      setErrorMessage(`Minimum order amount is Rs. ${minOrder}. Your order is Rs. ${totalAmount}`);
      resetSlide();
      return;
    }

    // Direct order submission (no cart drawer, no name/phone required)
    await confirmSubmitOrder();
  };

  const handleSlideStart = (e) => {
    if (isSubmitting || cartItems.length === 0) return;
    setIsSliding(true);
    slideStartX.current = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
  };

  const handleSlideMove = (e) => {
    if (!isSliding || isSubmitting) return;
    
    const currentX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const diff = currentX - slideStartX.current;
    const maxSlide = slideRef.current ? slideRef.current.offsetWidth - 60 : 250;
    
    if (diff >= 0 && diff <= maxSlide) {
      setSlidePosition(diff);
      
      // Sticky threshold at 70% - once you reach this, it auto-completes
      const stickyThreshold = maxSlide * 0.7;
      if (diff >= stickyThreshold && !slideComplete) {
        setSlideComplete(true);
        setIsSliding(false);
        setSlidePosition(maxSlide); // Snap to end
        handleSubmitOrder();
      }
    }
  };

  const handleSlideEnd = () => {
    if (!slideComplete && !isSubmitting) {
      // If not past sticky threshold, snap back to start
      setSlidePosition(0);
    }
    setIsSliding(false);
  };

  const resetSlide = () => {
    setSlidePosition(0);
    setSlideComplete(false);
    setIsSliding(false);
  };

  const confirmSubmitOrder = async () => {
    setIsSubmitting(true);
    setErrorMessage('');

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 30000);
    });

    try {
      const orderData = {
        tableId: parseInt(tableId),
        customerName: customerInfo.name.trim() || 'Guest', // Default to 'Guest' if empty
        phone: customerInfo.phone.trim() || '', // Allow empty phone
        orderType: 'dine-in',
        totalAmount: cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          isCustom: item.isCustom || false
        }))
      };

      const response = await Promise.race([
        apiService.createOrder(orderData),
        timeoutPromise
      ]);

      if (response && response.success) {
        // Show full-screen success
        setOrderSubmitted(true);
        setShowCart(false);
        setShowCheckout(false);
        resetSlide();
        clearCart();
        localStorage.setItem(`order_submitted_${tableId}`, Date.now().toString());
        
        // Auto-hide success screen after 3 seconds
        setTimeout(() => {
          setOrderSubmitted(false);
        }, 3000);
      } else {
        throw new Error('Order submission failed');
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      let errorMsg = 'Failed to submit order. Please try again.';

      if (error.message === 'Request timeout') {
        errorMsg = 'Order is taking longer than usual. Please wait a moment and check if your order appears in the system.';
      } else if (error.code === 'ECONNREFUSED' || (error.message || '').includes('fetch') || (error.message || '').includes('Network Error')) {
        errorMsg = 'Connection failed. Please check your internet and try again.';
      } else if (error.response?.status === 503) {
        errorMsg = 'Server is starting up. Please wait 30-60 seconds and try again.';
      } else if (error.response?.status === 400) {
        errorMsg = `Order validation failed: ${error.response?.data?.error || 'Invalid order data'}`;
      } else if (error.response?.status === 500) {
        errorMsg = 'Server error occurred. Please try again.';
      }

      setErrorMessage(errorMsg);
      resetSlide();
    } finally {
      setIsSubmitting(false);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const cancelSubmitOrder = () => {
    setShowConfirmModal(false);
    setErrorMessage('');
  };

  // Derived: categories list, with All always first
  const categories = useMemo(() => {
    const set = new Set();
    menuItems.forEach(i => { if (i && i.category) set.add(i.category); });
    return ['All', ...Array.from(set)];
  }, [menuItems]);

  // Filter menu items by search + category
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      if (!item || !item.name || !item.id || item.price === undefined) return false;
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q));
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // Reset scroll to top when filters change
  useEffect(() => {
    if (menuListRef.current) menuListRef.current.scrollTop = 0;
  }, [selectedCategory, searchQuery]);

  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  if (!tableId || isNaN(tableId) || parseInt(tableId) < 1 || parseInt(tableId) > tableCount) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Table</h1>
        <p>Please scan a valid QR code from tables 1-{tableCount}.</p>
      </div>
    );
  }

  if (orderSubmitted) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-green-50 to-green-100 z-50">
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-green-300 p-8 max-w-sm w-full text-center animate-bounce-in">
          <div className="text-7xl mb-4 animate-scale-in">✅</div>
          <h2 className="text-2xl font-bold text-green-700 mb-3">Order Placed!</h2>
          <p className="text-slate-600 mb-4">Your order has been sent to the kitchen. We'll prepare it fresh for you!</p>
          <div className="bg-green-50 rounded-xl p-4 mb-4">
            <div className="text-sm text-green-700 font-semibold">Table {tableId}</div>
            <div className="text-xs text-green-600 mt-1">Check order status in the Orders tab</div>
          </div>
          <button
            onClick={() => {
              setOrderSubmitted(false);
              navigate(`/${tableId}`);
            }}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold shadow-lg"
          >
            Continue Ordering
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
        <p className="mt-4 text-slate-600 text-sm">Loading menu...</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc', height: '100vh', overflow: 'hidden' }}>
      {/* Desktop wrapper with max-width */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', margin: '0 auto', width: '100%', maxWidth: '42rem', backgroundColor: 'white', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', height: '100%', overflow: 'hidden' }}>
        {/* ─── Thin Top Header ───────────────────────────── */}
        <header className="shrink-0 h-12 px-3 flex items-center justify-between bg-white border-b border-slate-200 shadow-sm pt-safe">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 text-white font-bold text-sm shadow">
            {tableId}
          </div>
          <div className="leading-tight min-w-0">
            <div className="text-[11px] text-slate-500 uppercase tracking-wide">Table</div>
            <div className="text-sm font-semibold text-slate-800 truncate">Order Now</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Dashboard Button */}
          <button
            onClick={() => navigate(`/table/${tableId}/dashboard`)}
            className="flex items-center gap-1 px-2.5 h-8 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-semibold active:scale-95 transition"
            title="View Orders & Payment"
          >
            <span>📋</span>
            <span className="hidden xs:inline">Orders</span>
          </button>
          
          <button
            onClick={() => setShowImageMenu(true)}
            className="flex items-center gap-1 px-2.5 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold active:scale-95 transition"
            title="View the real menu"
          >
            <span>📖</span>
            <span className="hidden xs:inline">Menu</span>
          </button>

          {/* Inline call-reception button */}
          <TableCallButton tableId={tableId} variant="inline" />

          <button
            onClick={() => setShowCart(true)}
            className="relative flex items-center gap-1 px-2.5 h-8 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold active:scale-95 transition shadow"
          >
            <span>🛒</span>
            <span className="hidden xs:inline">Cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ─── Search + Horizontal Category Chips ──────── */}
      <div className="shrink-0 bg-white border-b border-slate-200 z-10">
        <div className="px-3 pt-2 pb-1.5">
          <div className="relative">
            <input
              type="text"
              placeholder="Search menu (momo, pizza, tea...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-sm border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-xs flex items-center justify-center"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar px-3 pb-2">
          {categories.map(cat => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 h-8 px-3 rounded-full text-xs font-semibold border transition active:scale-95 ${
                  active
                    ? 'bg-orange-500 text-white border-orange-500 shadow'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-orange-300'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Internally-scrollable Menu List ─────────── */}
      <div 
        ref={menuListRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2"
        style={{ 
          height: '100%',
          paddingBottom: cartItems.length > 0 ? '100px' : '16px',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {filteredMenuItems.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <div className="text-4xl mb-2">🍽️</div>
            <p className="text-sm">
              {searchQuery ? `No items found for "${searchQuery}"` : 'No items in this category'}
            </p>
            {(searchQuery || selectedCategory !== 'All') && (
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                className="mt-3 text-orange-600 underline text-sm"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <ul className="space-y-2 pb-4">
            {filteredMenuItems.map(item => {
              const quantity = cartItems.find(c => c.id === item.id)?.quantity || 0;
              return (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 text-sm truncate">{item.name}</h4>
                    <div className="text-[11px] text-slate-500 truncate">{item.category}</div>
                    <div className="text-sm font-bold text-orange-600 mt-0.5">NPR {item.price}/-</div>
                  </div>

                  {quantity === 0 ? (
                    <button
                      onClick={() => addToCart(item, 1)}
                      className="shrink-0 px-3 h-9 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold active:scale-95 transition shadow"
                    >
                      + Add
                    </button>
                  ) : (
                    <div className="shrink-0 flex items-center gap-1.5 bg-slate-100 rounded-full p-1">
                      <button
                        onClick={() => updateQuantity(item.id, quantity - 1)}
                        className="w-7 h-7 rounded-full bg-white text-slate-700 font-bold text-sm shadow active:scale-95"
                      >
                        −
                      </button>
                      <span className="text-sm font-semibold w-6 text-center">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, quantity + 1)}
                        className="w-7 h-7 rounded-full bg-orange-500 text-white font-bold text-sm shadow active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ─── Sticky Bottom Slide Button - Only show when cart has items and cart is not open ───────────────── */}
      {cartItems.length > 0 && !showCart && (
        <div className="fixed bottom-0 left-0 right-0 border-t-2 border-slate-200 bg-white px-3 py-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)', maxWidth: '42rem', margin: '0 auto', zIndex: 9999 }}>
          {/* Slide to Confirm - Direct Order */}
          <div className="mb-0">
            <div
              ref={slideRef}
              className="relative h-16 rounded-xl overflow-hidden shadow-lg bg-gradient-to-r from-green-500 to-green-600 cursor-grab"
            >
              {/* Background text with item count and total */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white font-bold pointer-events-none">
                <div className="text-xs opacity-90 mb-0.5">
                  {cartCount} item{cartCount !== 1 ? 's' : ''} • NPR {getTotalPrice()}/-
                </div>
                <div className="text-sm">
                  {isSubmitting ? 'Submitting Order...' : slideComplete ? '✓ Order Confirmed!' : 'Slide to Confirm Order →'}
                </div>
              </div>
              
              {/* Sliding button */}
              <div
                className="absolute left-1 top-1 bottom-1 w-14 bg-white rounded-lg shadow-xl flex items-center justify-center cursor-grab active:cursor-grabbing transition-transform"
                style={{ 
                  transform: `translateX(${slidePosition}px)`,
                  transition: isSliding ? 'none' : 'transform 0.3s ease'
                }}
                onMouseDown={handleSlideStart}
                onMouseMove={handleSlideMove}
                onMouseUp={handleSlideEnd}
                onMouseLeave={handleSlideEnd}
                onTouchStart={handleSlideStart}
                onTouchMove={handleSlideMove}
                onTouchEnd={handleSlideEnd}
              >
                <span className="text-2xl">{isSubmitting ? '⏳' : slideComplete ? '✅' : '→'}</span>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="mt-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
              {errorMessage}
            </div>
          )}
        </div>
      )}
      </div> {/* End desktop wrapper */}

      {/* ─── Cart Drawer (slide-up modal) ─────────────── */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50">
          <div
            className="flex-1"
            onClick={() => setShowCart(false)}
          />
          <div className="bg-white rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh]">
            {/* Grab handle + header */}
            <div className="shrink-0 px-4 pt-2 pb-3 border-b border-slate-200">
              <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-800">Your Order · Table {tableId}</h3>
                <button
                  onClick={() => setShowCart(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 text-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Cart items — scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto touch-scroll px-4 py-3">
              {cartItems.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm">Your cart is empty</div>
              ) : (
                <ul className="space-y-2">
                  {cartItems.map(item => (
                    <li key={item.id} className="flex items-center justify-between gap-2 p-3 rounded-lg border border-slate-200">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 text-sm truncate">
                          {item.name}
                          {item.isCustom && <span className="ml-1 text-xs text-slate-500">(Custom)</span>}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.quantity}× {!item.isCustom && `@ NPR ${item.price}/-`}
                        </div>
                      </div>

                      {!item.isCustom && (
                        <div className="text-sm font-bold text-orange-600">
                          NPR {item.price * item.quantity}/-
                        </div>
                      )}

                      <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-6 h-6 rounded-full bg-white text-slate-700 text-sm shadow"
                        >
                          −
                        </button>
                        <span className="text-xs font-semibold w-5 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-6 h-6 rounded-full bg-orange-500 text-white text-sm shadow"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remove"
                      >
                        🗑️
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Totals + checkout */}
            {cartItems.length > 0 && (
              <div className="shrink-0 border-t border-slate-200 px-4 py-3 pb-safe bg-slate-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-700">Total</span>
                  <span className="text-lg font-bold text-orange-600">NPR {getTotalPrice()}/-</span>
                </div>

                {!showCheckout ? (
                  <button
                    onClick={() => setShowCheckout(true)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold text-sm shadow-lg active:scale-95 transition"
                  >
                    Proceed to Order
                  </button>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Your Name (Optional)"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                      className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number (Optional)"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                      className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    {errorMessage && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
                        {errorMessage}
                      </div>
                    )}
                    
                    {/* Slide to Confirm */}
                    <div className="relative">
                      <div
                        ref={slideRef}
                        className="relative h-14 bg-gradient-to-r from-green-500 to-green-600 rounded-xl overflow-hidden shadow-lg"
                      >
                        {/* Background text */}
                        <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm pointer-events-none">
                          {isSubmitting ? 'Submitting...' : slideComplete ? 'Order Confirmed!' : 'Slide to Confirm Order →'}
                        </div>
                        
                        {/* Sliding button */}
                        <div
                          className="absolute left-1 top-1 bottom-1 w-12 bg-white rounded-lg shadow-xl flex items-center justify-center cursor-grab active:cursor-grabbing transition-transform"
                          style={{ 
                            transform: `translateX(${slidePosition}px)`,
                            transition: isSliding ? 'none' : 'transform 0.3s ease'
                          }}
                          onMouseDown={handleSlideStart}
                          onMouseMove={handleSlideMove}
                          onMouseUp={handleSlideEnd}
                          onMouseLeave={handleSlideEnd}
                          onTouchStart={handleSlideStart}
                          onTouchMove={handleSlideMove}
                          onTouchEnd={handleSlideEnd}
                        >
                          <span className="text-2xl">{isSubmitting ? '⏳' : slideComplete ? '✅' : '→'}</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => {
                          setShowCheckout(false);
                          resetSlide();
                        }}
                        className="mt-2 w-full py-2 text-sm text-slate-600 hover:text-slate-800"
                      >
                        ← Back to Cart
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── View Menu (JPG) Modal ─────────────────────── */}
      {showImageMenu && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex flex-col"
          onClick={() => setShowImageMenu(false)}
        >
          <div className="shrink-0 flex items-center justify-between px-4 h-12 text-white pt-safe">
            <div className="font-semibold text-sm">📖 Our Menu</div>
            <button
              onClick={() => setShowImageMenu(false)}
              className="w-8 h-8 rounded-full bg-white/20 text-white text-sm"
            >
              ✕
            </button>
          </div>
          <div
            className="flex-1 overflow-y-auto touch-scroll px-3 pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Menu Images - Dynamically loaded */}
            {menuPhotos.length > 0 ? (
              menuPhotos.map((photo, index) => (
                <img
                  key={index}
                  src={photo}
                  alt={`Menu Page ${index + 1}`}
                  className="w-full rounded-lg shadow-xl mb-3"
                  loading="lazy"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ))
            ) : (
              <div className="text-center text-white py-12">
                <p className="text-lg mb-2">📖</p>
                <p>No menu photos available</p>
              </div>
            )}
            <p className="text-center text-white/70 text-xs mt-2">
              Pinch to zoom · Tap outside to close
            </p>
          </div>
        </div>
      )}

      {/* ─── Order Confirmation Modal ───────────────── */}
      {/* Removed - using slide to confirm instead */}
    </div>
  );
};

export default TableOrder;
