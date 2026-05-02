import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [currentTable, setCurrentTable] = useState(null);

  // Simple table session management - 4 hours duration
  const TABLE_SESSION_DURATION = 4 * 60 * 60 * 1000; // 4 hours

  // Get current table from URL or session
  useEffect(() => {
    const path = window.location.pathname;
    // Simple numeric table detection (e.g., /5 for Table 5)
    const tableMatch = path.match(/^\/(\d+)$/);
    
    let tableId = null;
    
    if (tableMatch) {
      tableId = parseInt(tableMatch[1]);
    }
    
    if (tableId && tableId >= 1 && tableId <= 25) {
      setCurrentTable(tableId);
      
      // Create/update table session
      const tableSession = {
        tableId,
        sessionStart: Date.now(),
        lastActivity: Date.now()
      };
      sessionStorage.setItem('tableSession', JSON.stringify(tableSession));
      
      // Load cart for this table
      loadCartForTable(tableId);
    } else {
      // Check if we have an existing table session
      const existingSession = sessionStorage.getItem('tableSession');
      if (existingSession) {
        const session = JSON.parse(existingSession);
        const now = Date.now();
        
        // Check if session is still valid (within 4 hours)
        if (now - session.sessionStart < TABLE_SESSION_DURATION) {
          setCurrentTable(session.tableId);
          loadCartForTable(session.tableId);
          
          // Update last activity
          session.lastActivity = now;
          sessionStorage.setItem('tableSession', JSON.stringify(session));
        } else {
          // Session expired, clear it
          clearExpiredSession();
        }
      }
    }
  }, []);

  const loadCartForTable = (tableId) => {
    const savedCart = localStorage.getItem(`cart_table_${tableId}`);
    const savedTimestamp = localStorage.getItem(`cart_timestamp_${tableId}`);
    
    if (savedCart && savedTimestamp) {
      const now = Date.now();
      const cartAge = now - parseInt(savedTimestamp);
      
      // Load cart if it's less than 4 hours old
      if (cartAge < TABLE_SESSION_DURATION) {
        setCartItems(JSON.parse(savedCart));
      } else {
        // Cart expired, clear it
        clearCartForTable(tableId);
      }
    }
  };

  const clearExpiredSession = () => {
    sessionStorage.removeItem('tableSession');
    setCurrentTable(null);
    setCartItems([]);
  };

  const clearCartForTable = (tableId) => {
    localStorage.removeItem(`cart_table_${tableId}`);
    localStorage.removeItem(`cart_timestamp_${tableId}`);
    setCartItems([]);
  };

  const saveCart = (items) => {
    if (currentTable) {
      localStorage.setItem(`cart_table_${currentTable}`, JSON.stringify(items));
      localStorage.setItem(`cart_timestamp_${currentTable}`, Date.now().toString());
      
      // Update session activity
      const session = sessionStorage.getItem('tableSession');
      if (session) {
        const sessionData = JSON.parse(session);
        sessionData.lastActivity = Date.now();
        sessionStorage.setItem('tableSession', JSON.stringify(sessionData));
      }
    }
  };

  const addToCart = (item, quantity = 1) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(cartItem => cartItem.id === item.id);
      let newItems;
      
      if (existingItem) {
        newItems = prevItems.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + quantity }
            : cartItem
        );
      } else {
        newItems = [...prevItems, { ...item, quantity }];
      }
      
      saveCart(newItems);
      return newItems;
    });
  };

  const removeFromCart = (itemId) => {
    setCartItems(prevItems => {
      const newItems = prevItems.filter(item => item.id !== itemId);
      saveCart(newItems);
      return newItems;
    });
  };

  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    
    setCartItems(prevItems => {
      const newItems = prevItems.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      );
      saveCart(newItems);
      return newItems;
    });
  };

  const clearCart = () => {
    setCartItems([]);
    if (currentTable) {
      localStorage.removeItem(`cart_table_${currentTable}`);
      localStorage.removeItem(`cart_timestamp_${currentTable}`);
    }
  };

  const setTableContext = (tableId) => {
    setCurrentTable(tableId);
    
    // Load cart items for the new table
    loadCartForTable(tableId);
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getTotalPrice,
      getTotalItems,
      currentTable,
      setTableContext
    }}>
      {children}
    </CartContext.Provider>
  );
};
