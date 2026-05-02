import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { TableContext } from '../context/TableContext';
import { apiService } from '../services/apiService';
import io from 'socket.io-client';
import { getSocketUrl } from '../config/api';
import { useCart } from '../context/CartContext';

const TableOrder = () => {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { cartItems, addToCart, removeFromCart, updateQuantity, setTableContext, clearCart, getTotalPrice } = useCart();
  const [menuItems, setMenuItems] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (tableId && !isNaN(tableId) && parseInt(tableId) >= 1 && parseInt(tableId) <= 25) {
      setTableContext(parseInt(tableId));
      fetchMenuItems();
    }
  }, [tableId]); // Removed setTableContext from dependencies to prevent infinite loop

  // Socket connection for real-time table clearing
  useEffect(() => {
    const socket = io(getSocketUrl());
    
    // Listen for table cleared event
    socket.on('tableCleared', (data) => {
      console.log('🔔 Table cleared event received:', data);
      
      // Check if this customer's table was cleared
      if (data.tableId === parseInt(tableId)) {
        console.log('🧹 This table was cleared by admin, redirecting to homepage...');
        
        // Clear customer's cart and session data
        clearCart();
        
        // Remove ALL localStorage items related to this table
        localStorage.removeItem(`customerInfo_${tableId}`);
        localStorage.removeItem(`tableSession_${tableId}`);
        localStorage.removeItem(`cart_table_${tableId}`);
        localStorage.removeItem(`cart_timestamp_${tableId}`);
        localStorage.removeItem(`order_submitted_${tableId}`);
        localStorage.removeItem('currentTable');
        localStorage.removeItem('tableTimestamp');
        
        // Clear any other table-related data
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes(`_${tableId}`) || key.includes(`table_${tableId}`) || key.includes(`${tableId}_`))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        console.log('🧹 All localStorage cleared for table:', tableId);
        
        // Show notification to customer
        alert('🍽️ Your table session has been cleared by restaurant staff. You will be redirected to the homepage.');
        
        // Redirect to homepage
        navigate('/', { replace: true });
      }
    });

    // Cleanup socket connection
    return () => {
      socket.disconnect();
    };
  }, [tableId, clearCart, navigate]);

  const fetchMenuItems = async () => {
    try {
      const response = await apiService.getMenu();
      
      // Validate response structure
      if (response && response.data && Array.isArray(response.data)) {
        setMenuItems(response.data);
      } else if (Array.isArray(response)) {
        // Handle case where response is directly an array
        setMenuItems(response);
      } else {
        console.error('Invalid menu response format:', response);
        setMenuItems([]);
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
      
      // Check if error contains HTML (common cause of "Unexpected token '<'")
      if (error.message && error.message.includes('<')) {
        console.error('Received HTML response instead of JSON - API endpoint issue');
      }
      
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  };


  const handleSubmitOrder = () => {
    // Clear any previous error messages
    setErrorMessage('');

    // Validation
    if (!customerInfo.name.trim() || !customerInfo.phone.trim()) {
      setErrorMessage('Please provide your name and phone number');
      return;
    }

    if (cartItems.length === 0) {
      setErrorMessage('Your cart is empty');
      return;
    }

    // Show confirmation modal
    setShowConfirmModal(true);
  };

  const confirmSubmitOrder = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    
    // Add timeout to prevent hanging - increased for backend database issues
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 30000); // 30 second timeout
    });
    
    try {
      const orderData = {
        tableId: parseInt(tableId),
        customerName: customerInfo.name.trim(),
        phone: customerInfo.phone.trim(),
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

      // Race between API call and timeout
      const response = await Promise.race([
        apiService.createOrder(orderData),
        timeoutPromise
      ]);
      
      // Backend returns direct success response
      if (response && response.success) {
        // Show success notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg z-50';
        notification.innerHTML = `
          <div class="flex items-center">
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>
            <div>
              <p class="font-medium">Order Submitted Successfully!</p>
              <p class="text-sm">Order #${response.order?.order_number || 'PENDING'} for Table ${tableId}</p>
            </div>
          </div>
        `;
        document.body.appendChild(notification);
        
        // Auto-remove notification after 5 seconds
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 5000);
        
        setOrderSubmitted(true);
        clearCart();
        setShowConfirmModal(false);
        localStorage.setItem(`order_submitted_${tableId}`, Date.now().toString());
      } else {
        throw new Error('Order submission failed');
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // Better error handling based on error type
      let errorMsg = 'Failed to submit order. Please try again.';
      
      if (error.message === 'Request timeout') {
        errorMsg = 'Order is taking longer than usual. The server may be processing your request. Please wait a moment and check if your order appears in the system.';
      } else if (error.code === 'ECONNREFUSED' || error.message.includes('fetch') || error.message.includes('Network Error')) {
        errorMsg = 'Connection failed. Please check your internet and try again.';
      } else if (error.response?.status === 503) {
        errorMsg = 'Server is starting up. Please wait 30-60 seconds and try again.';
      } else if (error.response?.status === 400) {
        errorMsg = `Order validation failed: ${error.response?.data?.error || 'Invalid order data'}`;
      } else if (error.response?.status === 500) {
        if (error.response?.data?.details?.includes('timeout')) {
          errorMsg = 'Database connection timeout. Your order may still be processing. Please check with staff or try again in a few minutes.';
        } else {
          errorMsg = 'Server error occurred. Please try again.';
        }
      }
      
      setErrorMessage(errorMsg);
      setShowConfirmModal(false);
      
      // Show error notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50';
      notification.innerHTML = `
        <div class="flex items-center">
          <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
          </svg>
          <div>
            <p class="font-medium">Order Failed</p>
            <p class="text-sm">${errorMsg}</p>
          </div>
        </div>
      `;
      document.body.appendChild(notification);
      
      // Auto-remove notification after 5 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 5000);
      
    } finally {
      // Always ensure button is re-enabled
      setIsSubmitting(false);
    }
  };

  const cancelSubmitOrder = () => {
    setShowConfirmModal(false);
    setErrorMessage('');
  };

  // Filter menu items based on search query
  const filteredMenuItems = menuItems.filter(item => {
    // Validate item has required properties
    if (!item || !item.name || !item.id || item.price === undefined) return false;
    
    // If no search query, show all valid items
    if (!searchQuery) return true;
    
    // Apply search filter
    return item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  if (!tableId || isNaN(tableId) || parseInt(tableId) < 1 || parseInt(tableId) > 25) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Table</h1>
        <p>Please scan a valid QR code from tables 1-25.</p>
      </div>
    );
  }

  if (orderSubmitted) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded max-w-md mx-auto">
          <h2 className="text-xl font-bold mb-2">Order Submitted! ✅</h2>
          <p>Thank you for your order. We'll prepare it fresh for you!</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Order for Table {tableId}</h1>

      {/* Add Items Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Add Items to Your Order</h2>
        
        {/* Menu Search */}
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search menu items (momo, chicken, pizza, tea...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          {/* Browse Menu Button */}
          <div className="mt-3 text-center">
            <Link 
              to="/menu"
              className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              📋 Browse Full Menu
            </Link>
          </div>
        </div>

        {/* Menu Items Display */}
        {filteredMenuItems.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-3">
              {searchQuery ? `Found ${filteredMenuItems.length} items:` : `Available menu items (${filteredMenuItems.length}):`}
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredMenuItems.map(item => {
                const quantity = cartItems.find(cartItem => cartItem.id === item.id)?.quantity || 0;
                return (
                  <div key={item.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-gray-500">{item.category}</p>
                      <p className="text-sm font-semibold text-primary">NPR {item.price}/-</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {quantity === 0 ? (
                        <button
                          onClick={() => addToCart(item, 1)}
                          className="bg-primary text-white px-3 py-1 rounded hover:bg-orange-600 transition-colors text-sm"
                        >
                          Add
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, quantity - 1)}
                            className="bg-gray-200 text-gray-700 w-7 h-7 rounded-full hover:bg-gray-300 text-sm"
                          >
                            -
                          </button>
                          <span className="text-sm font-medium w-8 text-center">{quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, quantity + 1)}
                            className="bg-primary text-white w-7 h-7 rounded-full hover:bg-orange-600 text-sm"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No Results Message */}
        {filteredMenuItems.length === 0 && (
          <div className="text-center py-4">
            <p className="text-gray-500">
              {searchQuery ? `No items found for "${searchQuery}"` : 'Loading menu items...'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-primary hover:text-orange-600 underline text-sm mt-1"
              >
                Clear search
              </button>
            )}
          </div>
        )}

      </div>

      {/* Cart Summary */}
      {cartItems.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Your Order</h2>
            <button
              onClick={clearCart}
              className="text-red-600 hover:text-red-700 text-sm font-medium underline"
            >
              Clear All
            </button>
          </div>
          
          {cartItems.map(item => (
            <div key={item.id} className="flex justify-between items-center py-3 border-b">
              <div className="flex-1">
                <span className="font-medium">{item.name}</span>
                {item.isCustom && <span className="text-sm text-gray-500 ml-2">(Custom)</span>}
                <div className="text-sm text-gray-600 mt-1">
                  {item.quantity}x {!item.isCustom && `@ NPR ${item.price}/-`}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {!item.isCustom && (
                  <span className="font-semibold text-primary">
                    NPR {(item.price * item.quantity)}/-
                  </span>
                )}
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="bg-gray-200 text-gray-700 w-7 h-7 rounded-full hover:bg-gray-300 transition-colors text-sm flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="bg-primary text-white w-7 h-7 rounded-full hover:bg-orange-600 transition-colors text-sm flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
                
                <button
                  onClick={() => removeFromCart(item.id)}
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
            <span>NPR {getTotalPrice()}/-</span>
          </div>
          
          {!showCheckout ? (
            <button
              onClick={() => setShowCheckout(true)}
              className="w-full bg-primary text-white py-3 rounded-lg mt-4 hover:bg-orange-600 transition-colors"
            >
              Proceed to Checkout
            </button>
          ) : (
            <div className="mt-4 space-y-4">
              <input
                type="text"
                placeholder="Your Name"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              {/* Error Message */}
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {errorMessage}
                </div>
              )}
              
              <button
                onClick={handleSubmitOrder}
                disabled={isSubmitting}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Order'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Order Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-4xl mb-4">🍽️</div>
              <h3 className="text-lg font-semibold mb-2">Confirm Your Order</h3>
              <div className="text-left bg-gray-50 rounded-lg p-4 mb-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">Table:</span>
                    <span>{tableId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Name:</span>
                    <span>{customerInfo.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Phone:</span>
                    <span>{customerInfo.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Items:</span>
                    <span>{cartItems.length} items</span>
                  </div>
                  <div className="flex justify-between font-semibold text-primary border-t pt-2">
                    <span>Total:</span>
                    <span>NPR {getTotalPrice()}/-</span>
                  </div>
                </div>
              </div>
              <p className="text-gray-600 mb-6 text-sm">
                Please confirm that all details are correct before submitting your order.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={cancelSubmitOrder}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSubmitOrder}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Confirm Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableOrder;
