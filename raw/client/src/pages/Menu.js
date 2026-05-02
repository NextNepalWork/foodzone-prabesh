import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { fetchApi, getSocketUrl } from '../services/apiService';
import { useCart } from '../context/CartContext';
import { useDeliveryCart } from '../context/DeliveryCartContext';
import io from 'socket.io-client';

// Custom hook for debouncing
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

// Lazy load components
const MenuItemCard = lazy(() => import('../components/MenuItemCard'));
const HappyHourSection = lazy(() => import('../components/HappyHourSection'));

const Menu = () => {
  // Initialize with empty array for priority loading
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isHappyHour, setIsHappyHour] = useState(false);
  const [happyHourEnabled, setHappyHourEnabled] = useState(true);
  const [visibleItems, setVisibleItems] = useState(12); // Initial items to show
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Debounce search query to improve performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  // Get URL parameters for table context
  const [searchParams] = useSearchParams();
  const tableParam = searchParams.get('table');
  
  const { currentTable, setTableContext } = useCart();
  
  // Handle table context from URL parameter
  useEffect(() => {
    if (tableParam && !isNaN(tableParam) && parseInt(tableParam) >= 1 && parseInt(tableParam) <= 25) {
      const tableId = parseInt(tableParam);
      if (currentTable !== tableId) {
        setTableContext(tableId);
      }
    }
  }, [tableParam, currentTable, setTableContext]);

  // Use appropriate cart based on customer type
  const { deliveryCartItems, addToDeliveryCart, updateDeliveryQuantity } = useDeliveryCart();
  const { cartItems, addToCart, updateQuantity } = useCart();
  
  // Memoized customer type determination
  const isTableCustomer = useMemo(() => !!currentTable, [currentTable]);
  const canOrderDelivery = useMemo(() => !isTableCustomer, [isTableCustomer]);

  const checkHappyHour = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    // Happy hour is from 11 AM to 2 PM (11:00 - 13:59), Sunday to Friday (not Saturday)
    const isHappyHourTime = currentHour >= 11 && currentHour < 14;
    const isNotSaturday = currentDay !== 6;
    setIsHappyHour(isHappyHourTime && isNotSaturday && happyHourEnabled);
  };

  const fetchHappyHourSettings = useCallback(async () => {
    try {
      const response = await fetchApi.get('/api/settings/happy-hour');
      setHappyHourEnabled(response.enabled !== false);
    } catch (error) {
      console.error('Error fetching happy hour settings:', error);
      setHappyHourEnabled(true); // Default to enabled
    }
  }, []);


  const fetchMenuItems = useCallback(async () => {
    console.log('fetchMenuItems called - loading full menu');
    setLoading(true);
    
    try {
      // Check if data is cached in sessionStorage for faster loading
      const cachedMenu = sessionStorage.getItem('menuCache');
      const cacheTimestamp = sessionStorage.getItem('menuCacheTimestamp');
      
      if (cachedMenu && cacheTimestamp) {
        const cacheAge = Date.now() - parseInt(cacheTimestamp);
        if (cacheAge < 300000) { // 5 minutes
          console.log('Using cached menu data');
          const parsedMenu = JSON.parse(cachedMenu);
          setMenuItems(parsedMenu);
          setLoading(false);
          
          // Still fetch fresh data in background to update cache
          try {
            const response = await fetchApi.get('/api/menu');
            if (response && Array.isArray(response) && response.length > 0) {
              setMenuItems(response);
              sessionStorage.setItem('menuCache', JSON.stringify(response));
              sessionStorage.setItem('menuCacheTimestamp', Date.now().toString());
            }
          } catch (bgError) {
            console.log('Background fetch failed, using cached data');
          }
          return;
        }
      }
      
      // Fetch fresh data from API
      const response = await fetchApi.get('/api/menu');
      
      // Handle different response formats
      let menuData = response;
      if (response && response.data) {
        menuData = response.data;
      }
      
      if (menuData && Array.isArray(menuData) && menuData.length > 0) {
        console.log(`Loaded ${menuData.length} menu items from API`);
        setMenuItems(menuData);
        // Cache the response
        sessionStorage.setItem('menuCache', JSON.stringify(menuData));
        sessionStorage.setItem('menuCacheTimestamp', Date.now().toString());
      } else {
        console.error('API response invalid or empty:', response);
        console.error('Response structure:', JSON.stringify(response, null, 2));
        setMenuItems([]);
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
      console.error('Error details:', error.message);
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Set table context from URL parameters
  useEffect(() => {
    const tableParam = searchParams.get('table');
    if (tableParam) {
      const tableNumber = parseInt(tableParam);
      if (tableNumber >= 1 && tableNumber <= 25) {
        setTableContext(tableNumber);
      }
    }
  }, [searchParams, setTableContext]);


  useEffect(() => {
    // Fetch happy hour settings first
    fetchHappyHourSettings();
    
    // Always check happy hour first
    checkHappyHour();
    
    // Then fetch menu items
    fetchMenuItems();
    
    // Check happy hour every minute
    const interval = setInterval(checkHappyHour, 60000);
    
    // Setup socket connection for real-time updates
    const socket = io(getSocketUrl());
    
    socket.on('happyHourSettingsUpdated', ({ enabled }) => {
      console.log('🔄 Happy Hour settings updated:', enabled);
      setHappyHourEnabled(enabled);
    });
    
    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [fetchMenuItems, fetchHappyHourSettings]);

  // Re-check happy hour when settings change
  useEffect(() => {
    checkHappyHour();
  }, [happyHourEnabled]);

  // Initialize with happy hour items if it's happy hour time
  useEffect(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    const isCurrentlyHappyHour = currentHour >= 11 && currentHour < 14 && currentDay !== 6;
    
    if (isCurrentlyHappyHour && menuItems.length <= 5) {
      const happyHourItems = [
        { id: 1001, name: 'Chicken Momo', price: 125, category: 'Happy Hour', description: 'Delicious steamed chicken dumplings' },
        { id: 1002, name: 'Chicken Fried Rice', price: 145, category: 'Happy Hour', description: 'Aromatic fried rice with tender chicken pieces' },
        { id: 1003, name: 'Veg Fried Rice', price: 110, category: 'Happy Hour', description: 'Flavorful vegetarian fried rice with fresh vegetables' },
        { id: 1004, name: 'Burger', price: 150, category: 'Happy Hour', description: 'Juicy beef burger with fresh toppings' },
        { id: 1005, name: 'Chicken Chowmein', price: 110, category: 'Happy Hour', description: 'Stir-fried noodles with chicken and vegetables' },
        { id: 1006, name: 'Veg Chowmein', price: 80, category: 'Happy Hour', description: 'Vegetarian stir-fried noodles with fresh vegetables' }
      ];
      setMenuItems(prev => [...prev, ...happyHourItems]);
    }
  }, []);

  // Static categories for instant display - show immediately without waiting for menu items
  const categories = useMemo(() => {
    const staticCategories = [
      'All', 'Breakfast', 'Chopsuey', 'Chowmein', 'Cold Beverages', 'Combo Meals', 
      'Corn Dog & Hot Dog', 'Curries', 'Fish Specials', 'Food Zone Specials', 'Fries', 
      'Happy Hour', 'Hot Beverages', 'Hukka', 'Khaja & Khana Sets', 'MoMo', 
      'Nanglo Khaja Set', 'Paneer & Veg Snacks', 'Pasta', 'Peri Peri & Chicken Specials', 
      'Pizza', 'Rice & Biryani', 'Sandwiches & Burgers', 'Soups', 'Thukpa'
    ];
    
    // If menu items are loaded, use dynamic categories, otherwise use static
    if (menuItems.length > 0) {
      return ['All', ...new Set(menuItems.map(item => item.category))];
    }
    return staticCategories;
  }, [menuItems]);
  
  // Happy Hour menu items - using integer IDs for database compatibility
  const happyHourItems = [
    { id: 1001, name: 'Chicken Momo', price: 125, category: 'Happy Hour', description: 'Delicious steamed chicken dumplings' },
    { id: 1002, name: 'Chicken Fried Rice', price: 145, category: 'Happy Hour', description: 'Aromatic fried rice with tender chicken pieces' },
    { id: 1003, name: 'Veg Fried Rice', price: 110, category: 'Happy Hour', description: 'Flavorful vegetarian fried rice with fresh vegetables' },
    { id: 1004, name: 'Burger', price: 150, category: 'Happy Hour', description: 'Juicy beef burger with fresh toppings' },
    { id: 1005, name: 'Chicken Chowmein', price: 110, category: 'Happy Hour', description: 'Stir-fried noodles with chicken and vegetables' },
    { id: 1006, name: 'Veg Chowmein', price: 80, category: 'Happy Hour', description: 'Vegetarian stir-fried noodles with fresh vegetables' }
  ];
  
  // Memoized filtered items to prevent recalculation (using debounced search)
  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      if (!item || !item.name) return false;
      
      const matchesSearch = debouncedSearchQuery === '' || 
        item.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        (item.category && item.category.toLowerCase().includes(debouncedSearchQuery.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [menuItems, selectedCategory, debouncedSearchQuery]);
  
  // Items to display with lazy loading
  const displayedItems = useMemo(() => {
    return filteredItems.slice(0, visibleItems);
  }, [filteredItems, visibleItems]);
  
  const hasMoreItems = filteredItems.length > visibleItems;

  const getItemQuantity = useCallback((itemId) => {
    if (isTableCustomer) {
      // Use table cart for dine-in customers
      const cartItem = cartItems.find(item => item.id === itemId);
      return cartItem ? cartItem.quantity : 0;
    } else {
      // Use delivery cart for delivery customers
      const cartItem = deliveryCartItems.find(item => item.id === itemId);
      return cartItem ? cartItem.quantity : 0;
    }
  }, [isTableCustomer, cartItems, deliveryCartItems]);


  const handleAddToCart = useCallback(async (item) => {
    // Apply 10% discount during Happy Hour
    const itemWithDiscount = {
      ...item,
      price: isHappyHour ? Math.round(parseFloat(item.price) * 0.9) : parseFloat(item.price),
      originalPrice: parseFloat(item.price),
      isHappyHourDiscount: isHappyHour
    };
    
    if (isTableCustomer) {
      addToCart(itemWithDiscount, 1);
    } else {
      // For delivery customers, add directly to cart without API call
      addToDeliveryCart(itemWithDiscount, 1);
    }
  }, [isTableCustomer, addToCart, addToDeliveryCart, isHappyHour]);

  const handleUpdateQuantity = useCallback((itemId, newQuantity) => {
    if (isTableCustomer) {
      updateQuantity(itemId, newQuantity);
    } else {
      updateDeliveryQuantity(itemId, newQuantity);
    }
  }, [isTableCustomer, updateQuantity, updateDeliveryQuantity]);
  
  // Load more items function
  const loadMoreItems = useCallback(() => {
    if (!isLoadingMore && hasMoreItems) {
      setIsLoadingMore(true);
      setTimeout(() => {
        setVisibleItems(prev => prev + 12);
        setIsLoadingMore(false);
      }, 300); // Small delay for smooth UX
    }
  }, [isLoadingMore, hasMoreItems]);
  
  // Simple load more functionality without intersection observer
  const [loadMoreRef, setLoadMoreRef] = useState(null);
  
  // Auto-load more items when load more button comes into view
  useEffect(() => {
    const loadMoreButton = loadMoreRef;
    if (!loadMoreButton) return;
    
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMoreItems && !isLoadingMore) {
        loadMoreItems();
      }
    }, {
      rootMargin: '100px',
      threshold: 0.1
    });
    
    observer.observe(loadMoreButton);
    return () => observer.disconnect();
  }, [loadMoreRef, hasMoreItems, isLoadingMore, loadMoreItems]);
  
  // Reset visible items when category or search changes
  useEffect(() => {
    setVisibleItems(12);
  }, [selectedCategory, debouncedSearchQuery]);

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
    <div>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Our Menu</h1>
      
      {/* Happy Hour Section */}
      {isHappyHour && (
        <Suspense fallback={<div className="h-32 bg-gray-100 rounded-2xl animate-pulse mb-8"></div>}>
          <HappyHourSection 
            happyHourItems={happyHourItems}
            getItemQuantity={getItemQuantity}
            handleAddToCart={handleAddToCart}
            handleUpdateQuantity={handleUpdateQuantity}
            isTableCustomer={isTableCustomer}
            currentTable={currentTable}
          />
        </Suspense>
      )}

      {/* Dine-In Menu Header for Table Customers */}
      {isTableCustomer && (
        <div className="border border-gray-300 rounded-lg p-4 mb-6 text-center">
          <div className="text-gray-800">
            <div className="flex items-center justify-center mb-3">
              <span className="text-3xl mr-2">🍽️</span>
              <div>
                <h2 className="text-xl font-bold">Dine-In Menu</h2>
                <p className="text-sm text-gray-600">Table {currentTable}</p>
              </div>
            </div>
            <p className="text-sm mb-4 text-gray-600">Ready to order? Please select your favorite food from our menu.</p>
            <button
              onClick={() => {
                // Simple numeric table URL navigation
                if (currentTable) {
                  window.location.href = `/${currentTable}`;
                } else {
                  // Fallback to home page
                  window.location.href = '/';
                }
              }}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors font-medium"
            >
              Go Back to Table {currentTable}
            </button>
          </div>
        </div>
      )}
      
      {/* Search Bar */}
      <div className="max-w-md mx-auto mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search menu items, categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Category Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap justify-center gap-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Search Results Info */}
      {debouncedSearchQuery && (
        <div className="text-center mb-4">
          <p className="text-gray-600">
            Found {filteredItems.length} items for "{debouncedSearchQuery}"
            <button
              onClick={() => setSearchQuery('')}
              className="ml-2 underline text-sm text-blue-600 hover:text-blue-800"
            >
              Clear search
            </button>
          </p>
        </div>
      )}

      {/* No Results Message */}
      {filteredItems.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-semibold text-gray-600 mb-2">No items found</h2>
          <p className="text-gray-500 mb-4">
            {debouncedSearchQuery 
              ? `No menu items match "${debouncedSearchQuery}". Try a different search term.`
              : 'No items match the selected category.'
            }
          </p>
          {debouncedSearchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Clear search
            </button>
          )}
        </div>
      )}

      {/* Menu Items by Category */}
      {displayedItems.length > 0 && (
        <div className="space-y-8">
          {selectedCategory === 'All' ? (
            // Show all categories with subheadings
            categories.filter(cat => cat !== 'All').map(category => {
              const categoryItems = displayedItems.filter(item => item.category === category);
              if (categoryItems.length === 0) return null;
              
              return (
                <div key={category} className="space-y-4">
                  {/* Category Subheading */}
                  <div className="border-b border-gray-200 pb-2">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                      <span className="text-primary">
                        {category === 'Appetizers' && '🥗'}
                        {category === 'Main Course' && '🍛'}
                        {category === 'Beverages' && '🥤'}
                        {category === 'Desserts' && '🍰'}
                        {category === 'Snacks' && '🍿'}
                        {category === 'Specials' && '⭐'}
                        {!['Appetizers', 'Main Course', 'Beverages', 'Desserts', 'Snacks', 'Specials'].includes(category) && '🍽️'}
                      </span>
                      {category}
                      <span className="text-sm font-normal text-gray-500">({filteredItems.filter(item => item.category === category).length} items)</span>
                    </h2>
                  </div>
                  
                  {/* Category Items Grid */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categoryItems.map(item => (
                      <Suspense key={item.id} fallback={<div className="h-64 bg-gray-100 rounded-2xl animate-pulse"></div>}>
                        <MenuItemCard 
                          item={item}
                          quantity={getItemQuantity(item.id)}
                          onAddToCart={handleAddToCart}
                          onUpdateQuantity={handleUpdateQuantity}
                          isTableCustomer={isTableCustomer}
                          currentTable={currentTable}
                          isHappyHour={isHappyHour}
                        />
                      </Suspense>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            // Show single category without subheading
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedItems.map(item => (
                <Suspense key={item.id} fallback={<div className="h-64 bg-gray-100 rounded-2xl animate-pulse"></div>}>
                  <MenuItemCard 
                    item={item}
                    quantity={getItemQuantity(item.id)}
                    onAddToCart={handleAddToCart}
                    onUpdateQuantity={handleUpdateQuantity}
                    isTableCustomer={isTableCustomer}
                    currentTable={currentTable}
                    isHappyHour={isHappyHour}
                  />
                </Suspense>
              ))}
            </div>
          )}
          
          {/* Load More Button */}
          {hasMoreItems && (
            <div ref={loadMoreRef} className="text-center mt-6">
              <button
                onClick={loadMoreItems}
                disabled={isLoadingMore}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingMore ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Loading...
                  </div>
                ) : (
                  `Load More (${filteredItems.length - visibleItems} remaining)`
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Delivery Cart Notice */}
      {!isTableCustomer && deliveryCartItems.length > 0 && (
        <div className="border border-gray-300 rounded p-4 mb-6">
          <h3 className="font-medium mb-2">🚚 You have {deliveryCartItems.length} items in your delivery cart</h3>
          <p className="text-sm mb-3 text-gray-600">Ready to place your delivery order?</p>
          <Link 
            to="/delivery-cart"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Go to Delivery Cart
          </Link>
        </div>
      )}
      </div>
    </div>
  );
};

export default Menu;
