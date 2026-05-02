import React, { memo } from 'react';

const HappyHourSection = memo(({ 
  happyHourItems, 
  getItemQuantity, 
  handleAddToCart, 
  handleUpdateQuantity, 
  isTableCustomer, 
  currentTable 
}) => {
  return (
    <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 rounded-2xl p-6 mb-8 shadow-xl border-4 border-yellow-300 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-orange-400/20 to-red-400/20 animate-pulse"></div>
      <div className="relative z-10 text-center">
        <div className="flex items-center justify-center mb-4">
          <span className="text-5xl mr-3 animate-bounce">🎉</span>
          <h2 className="text-3xl font-bold text-white drop-shadow-lg">HAPPY HOUR SPECIAL!</h2>
          <span className="text-5xl ml-3 animate-bounce">🍻</span>
        </div>
        <p className="text-xl text-white font-semibold mb-6 drop-shadow-md">11:00 AM - 2:00 PM | Sunday to Friday Only!</p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {happyHourItems.map(item => {
            const quantity = getItemQuantity(item.id);
            return (
              <div key={item.id} className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800 mb-1">{item.name}</h3>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                  <div className="ml-3 flex-shrink-0">
                    <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1 rounded-full shadow-md">
                      <span className="text-sm font-bold">NPR {item.price}</span>
                    </div>
                  </div>
                </div>
                
                {quantity === 0 ? (
                  <button
                    onClick={() => {
                      handleAddToCart(item);
                      // Don't redirect - just add to cart and stay on menu page
                    }}
                    className={`w-full px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg ${
                      isTableCustomer 
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600' 
                        : 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600'
                    }`}
                  >
                    {isTableCustomer ? `🍽️ Add to Table ${currentTable}` : '🚚 Add for Delivery'}
                  </button>
                ) : (
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateQuantity(item.id, quantity - 1)}
                        className="bg-white text-gray-700 w-8 h-8 rounded-full hover:bg-gray-100 transition-all duration-200 shadow-md font-bold text-sm"
                      >
                        −
                      </button>
                      <span className="font-bold text-lg w-6 text-center text-gray-800">{quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(item.id, quantity + 1)}
                        className={`w-8 h-8 rounded-full text-white transition-all duration-200 shadow-md font-bold text-sm ${
                          isTableCustomer 
                            ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600' 
                            : 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600'
                        }`}
                      >
                        +
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Total</div>
                      <div className="text-sm font-bold text-gray-800">NPR {(item.price * quantity)}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

HappyHourSection.displayName = 'HappyHourSection';

export default HappyHourSection;
