import React, { createContext, useContext, useState, useEffect } from 'react';

const DeliveryCartContext = createContext();

export const useDeliveryCart = () => {
  const context = useContext(DeliveryCartContext);
  if (!context) {
    throw new Error('useDeliveryCart must be used within a DeliveryCartProvider');
  }
  return context;
};

export const DeliveryCartProvider = ({ children }) => {
  const [deliveryCartItems, setDeliveryCartItems] = useState([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('delivery_cart');
    const savedTimestamp = localStorage.getItem('delivery_cart_timestamp');
    
    if (savedCart && savedTimestamp) {
      const timestamp = parseInt(savedTimestamp);
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      
      // Check if cart is less than 1 hour old
      if (now - timestamp < oneHour) {
        const cartItems = JSON.parse(savedCart);
        // Filter out items with invalid string IDs (like 'hh1', 'hh2', etc.)
        const validItems = cartItems.filter(item => 
          typeof item.id === 'number' && !isNaN(item.id)
        );
        
        // If we filtered out invalid items, update localStorage
        if (validItems.length !== cartItems.length) {
          console.log('🧹 Filtered out invalid cart items with string IDs');
          if (validItems.length > 0) {
            localStorage.setItem('delivery_cart', JSON.stringify(validItems));
          } else {
            localStorage.removeItem('delivery_cart');
            localStorage.removeItem('delivery_cart_timestamp');
          }
        }
        
        setDeliveryCartItems(validItems);
      } else {
        // Clear expired cart
        localStorage.removeItem('delivery_cart');
        localStorage.removeItem('delivery_cart_timestamp');
      }
    }
  }, []);

  const saveDeliveryCart = (items) => {
    localStorage.setItem('delivery_cart', JSON.stringify(items));
    localStorage.setItem('delivery_cart_timestamp', Date.now().toString());
  };

  const addToDeliveryCart = (item) => {
    // Validate item ID is a number
    if (typeof item.id !== 'number' || isNaN(item.id)) {
      console.error(' Cannot add item with invalid ID:', item.id);
      return;
    }
    
    setDeliveryCartItems(prevItems => {
      const existingItem = prevItems.find(cartItem => cartItem.id === item.id);
      let newItems;
      
      if (existingItem) {
        newItems = prevItems.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        newItems = [...prevItems, { ...item, quantity: 1 }];
      }
      
      saveDeliveryCart(newItems);
      return newItems;
    });
  };

  const removeFromDeliveryCart = (itemId) => {
    setDeliveryCartItems(prevItems => {
      const newItems = prevItems.filter(item => item.id !== itemId);
      saveDeliveryCart(newItems);
      return newItems;
    });
  };

  const updateDeliveryQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeFromDeliveryCart(itemId);
      return;
    }
    
    setDeliveryCartItems(prevItems => {
      const newItems = prevItems.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      );
      saveDeliveryCart(newItems);
      return newItems;
    });
  };

  const clearDeliveryCart = () => {
    setDeliveryCartItems([]);
    localStorage.removeItem('delivery_cart');
    localStorage.removeItem('delivery_cart_timestamp');
  };

  const getDeliveryTotalPrice = () => {
    return deliveryCartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getDeliveryTotalItems = () => {
    return deliveryCartItems.reduce((total, item) => total + item.quantity, 0);
  };

  return (
    <DeliveryCartContext.Provider value={{
      deliveryCartItems,
      addToDeliveryCart,
      removeFromDeliveryCart,
      updateDeliveryQuantity,
      clearDeliveryCart,
      getDeliveryTotalPrice,
      getDeliveryTotalItems
    }}>
      {children}
    </DeliveryCartContext.Provider>
  );
};
