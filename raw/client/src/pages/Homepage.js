import React from 'react';
import { Link } from 'react-router-dom';

const Homepage = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section - Website Launch */}
      <section className="bg-gradient-to-br from-indigo-900 via-purple-800 to-pink-700 text-white pt-0 pb-24 relative overflow-hidden -mt-32">
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        
        {/* Animated Background Elements */}
        <div className="absolute top-10 left-10 animate-bounce delay-100">
          <span className="text-6xl opacity-30">📱</span>
        </div>
        <div className="absolute top-20 right-20 animate-bounce delay-300">
          <span className="text-5xl opacity-40">🍽️</span>
        </div>
        <div className="absolute bottom-20 left-16 animate-bounce delay-500">
          <span className="text-4xl opacity-30">🚚</span>
        </div>
        <div className="absolute bottom-10 right-12 animate-bounce delay-700">
          <span className="text-5xl opacity-40">💻</span>
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10 pt-24">
          <div className="mb-8">
            <div className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-6 py-2 rounded-full font-bold text-lg mb-4 animate-pulse">
              🚀 EXCLUSIVE WEBSITE LAUNCH! 🚀
            </div>
            <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-yellow-200 via-pink-200 to-blue-200 bg-clip-text text-transparent">
              Eat with Food Zone
            </h1>
            <h2 className="text-3xl md:text-4xl font-semibold mb-6 text-yellow-200">
              📱 Through Your Mobile!
            </h2>
          </div>
          
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-3xl p-8 max-w-5xl mx-auto border-2 border-white border-opacity-30 mb-8">
            <p className="text-2xl md:text-3xl font-medium mb-6 leading-relaxed">
              🌟 <span className="text-yellow-300 font-bold">Food Zone Website</span> allows you to order and eat 
              <span className="text-green-300 font-bold"> both inside the restaurant</span> and 
              <span className="text-blue-300 font-bold"> get deliveries from outside</span> the restaurant! 🌟
            </p>
            
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="bg-white bg-opacity-10 rounded-2xl p-6 border border-white border-opacity-20">
                <div className="text-4xl mb-4">🏪</div>
                <h3 className="text-2xl font-bold mb-3 text-yellow-200">Dine-In Experience</h3>
                <p className="text-lg">
                  📱 Scan QR code at your table<br/>
                  🍽️ Browse menu on your phone<br/>
                  ✨ Order instantly without waiting<br/>
                  💳 Pay digitally or cash
                </p>
              </div>
              
              <div className="bg-white bg-opacity-10 rounded-2xl p-6 border border-white border-opacity-20">
                <div className="text-4xl mb-4">🚚</div>
                <h3 className="text-2xl font-bold mb-3 text-blue-200">Delivery Service</h3>
                <p className="text-lg">
                  📍 GPS location tracking<br/>
                  🛵 Fast delivery to your door<br/>
                  📞 Real-time order updates
                </p>
              </div>
            </div>
            
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4 text-pink-200">🎯 Revolutionary Features</h3>
              <div className="flex flex-wrap justify-center gap-4 mb-6">
                <span className="bg-green-500 px-4 py-2 rounded-full font-bold">📱 Mobile First</span>
                <span className="bg-blue-500 px-4 py-2 rounded-full font-bold">🔄 Real-time Orders</span>
                <span className="bg-purple-500 px-4 py-2 rounded-full font-bold">📍 GPS Tracking</span>
                <span className="bg-red-500 px-4 py-2 rounded-full font-bold">⚡ Instant Service</span>
                <span className="bg-yellow-500 text-black px-4 py-2 rounded-full font-bold">💎 Premium Experience</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4 mb-8">
            <div className="flex flex-wrap justify-center gap-4">
              <Link 
                to="/menu" 
                className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black px-8 py-4 rounded-full font-bold text-xl hover:from-yellow-400 hover:to-orange-400 transition-all transform hover:scale-105 shadow-lg"
              >
                🍽️ Explore Our Menu
              </Link>
              <Link 
                to="/delivery-cart" 
                className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-8 py-4 rounded-full font-bold text-xl hover:from-green-400 hover:to-blue-400 transition-all transform hover:scale-105 shadow-lg"
              >
                🚚 Order Delivery Now
              </Link>
            </div>
            <p className="text-lg text-yellow-200">
              ✨ <strong>Digital Restaurant Experience!</strong> Complete mobile ordering system
            </p>
          </div>
          
          <div className="bg-white bg-opacity-5 rounded-2xl p-6 max-w-3xl mx-auto">
            <div className="grid md:grid-cols-3 gap-4 text-lg">
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">📍</span>
                <span>Location to be updated</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">📞</span>
                <span>Contact for phone number</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">🕐</span>
                <span>Daily: 7:30 AM - 10:30 PM</span>
              </div>
            </div>
          </div>
          
          <div className="mt-8">
            <div className="animate-bounce">
              <span className="text-4xl">⬇️</span>
            </div>
            <p className="text-xl text-yellow-200 mt-2">
              Discover the future of dining below!
            </p>
          </div>
        </div>
      </section>

      {/* Live Music Alert Section */}
      <section className="py-12 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center">
            <div className="inline-block animate-pulse mb-4">
              <span className="text-5xl">🎵</span>
            </div>
            <div className="bg-white bg-opacity-15 backdrop-blur-sm rounded-2xl p-6 max-w-3xl mx-auto border-2 border-white border-opacity-40">
              <h2 className="text-4xl font-bold mb-4 animate-bounce">
                🎤 LIVE MUSIC NIGHT! 🎶
              </h2>
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-6 py-3 rounded-full inline-block mb-4 font-bold text-xl animate-pulse">
                🗓️ THIS FRIDAY 🗓️
              </div>
              <div className="grid md:grid-cols-2 gap-6 items-center">
                <div>
                  <h3 className="text-3xl font-bold mb-3 text-yellow-200">
                    🕰️ 5:00 PM - 8:00 PM
                  </h3>
                  <p className="text-lg mb-4">
                    Join us for an unforgettable evening of live music, delicious food, and great atmosphere!
                  </p>
                  <div className="flex justify-center gap-3 mb-4">
                    <span className="bg-pink-500 px-3 py-1 rounded-full text-sm font-bold">
                      🎸 Live Band
                    </span>
                    <span className="bg-purple-500 px-3 py-1 rounded-full text-sm font-bold">
                      🍽️ Full Menu
                    </span>
                    <span className="bg-blue-500 px-3 py-1 rounded-full text-sm font-bold">
                      🍻 Beverages
                    </span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="bg-white bg-opacity-10 rounded-xl p-4 border border-white border-opacity-30">
                    <h4 className="text-xl font-bold mb-3 text-yellow-200">
                      🌟 Special Evening Menu
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="text-center">
                        <span>🍖 BBQ Platter</span>
                      </div>
                      <div className="text-center">
                        <span>🍕 Live Music Pizza</span>
                      </div>
                      <div className="text-center">
                        <span>🥂 Special Mocktails</span>
                      </div>
                      <div className="text-center">
                        <span>🍰 Dessert Combo</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <div className="flex justify-center items-center gap-6 text-lg mb-4">
                  <div className="flex items-center gap-2">
                    <span className="animate-bounce text-2xl">🎵</span>
                    <span>Live Entertainment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="animate-pulse text-2xl">🍽️</span>
                    <span>Great Food</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="animate-bounce text-2xl">👥</span>
                    <span>Family Friendly</span>
                  </div>
                </div>
                <div className="text-center">
                  <a 
                    href="tel:9843343084" 
                    className="bg-white text-purple-600 px-6 py-3 rounded-full font-bold text-lg hover:bg-yellow-100 transition-colors inline-block shadow-lg transform hover:scale-105 duration-200 mr-4"
                  >
                    📞 Reserve Your Table!
                  </a>
                  <Link 
                    to="/menu" 
                    className="bg-yellow-500 text-black px-6 py-3 rounded-full font-bold text-lg hover:bg-yellow-400 transition-colors inline-block shadow-lg transform hover:scale-105 duration-200"
                  >
                    🍽️ View Menu
                  </Link>
                </div>
                <p className="mt-3 text-yellow-200">
                  📍 Food Zone • 📞 Contact for details
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Musical Note Animations */}
        <div className="absolute top-8 left-8 animate-bounce delay-200">
          <span className="text-3xl opacity-60">🎵</span>
        </div>
        <div className="absolute top-16 right-12 animate-bounce delay-500">
          <span className="text-4xl opacity-70">🎶</span>
        </div>
        <div className="absolute bottom-8 left-16 animate-bounce delay-300">
          <span className="text-3xl opacity-60">🎤</span>
        </div>
        <div className="absolute bottom-12 right-8 animate-bounce delay-700">
          <span className="text-4xl opacity-70">🎸</span>
        </div>
        <div className="absolute top-1/2 left-4 animate-bounce delay-400">
          <span className="text-2xl opacity-50">♪</span>
        </div>
        <div className="absolute top-1/3 right-4 animate-bounce delay-600">
          <span className="text-2xl opacity-50">♫</span>
        </div>
      </section>

      {/* Revolutionary Digital Experience Section */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-gray-800 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
        
        {/* Tech Background Elements */}
        <div className="absolute top-16 left-8 animate-pulse delay-200">
          <span className="text-4xl opacity-20">⚡</span>
        </div>
        <div className="absolute top-32 right-12 animate-pulse delay-500">
          <span className="text-5xl opacity-25">🔥</span>
        </div>
        <div className="absolute bottom-20 left-20 animate-pulse delay-300">
          <span className="text-4xl opacity-20">✨</span>
        </div>
        <div className="absolute bottom-32 right-16 animate-pulse delay-700">
          <span className="text-5xl opacity-25">🚀</span>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-block bg-gradient-to-r from-cyan-400 to-blue-500 text-black px-6 py-2 rounded-full font-bold text-lg mb-6 animate-pulse">
              ⚡ REVOLUTIONARY DIGITAL EXPERIENCE ⚡
            </div>
            <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-200 via-blue-200 to-purple-200 bg-clip-text text-transparent">
              How Food Zone Works
            </h2>
            <p className="text-2xl text-gray-300 max-w-4xl mx-auto">
              Experience the future of dining with our cutting-edge mobile ordering system
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-3xl p-8 text-center transform hover:scale-105 transition-all duration-300 shadow-2xl border border-white border-opacity-20">
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 text-4xl animate-bounce">
                📱
              </div>
              <h3 className="text-2xl font-bold mb-4 text-yellow-200">Step 1: Scan QR Code</h3>
              <p className="text-lg text-gray-200 mb-4">
                Each table has a unique QR code. Simply scan it with your phone camera to instantly access our digital menu.
              </p>
              <div className="bg-white bg-opacity-10 rounded-xl p-3 text-sm">
                <span className="text-cyan-300 font-bold">💡 Pro Tip:</span> No app download needed!
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-600 to-teal-700 rounded-3xl p-8 text-center transform hover:scale-105 transition-all duration-300 shadow-2xl border border-white border-opacity-20">
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 text-4xl animate-bounce delay-200">
                🍽️
              </div>
              <h3 className="text-2xl font-bold mb-4 text-yellow-200">Step 2: Browse & Order</h3>
              <p className="text-lg text-gray-200 mb-4">
                Explore our full menu with photos, descriptions, and prices. Add items to your cart with custom quantities.
              </p>
              <div className="bg-white bg-opacity-10 rounded-xl p-3 text-sm">
                <span className="text-green-300 font-bold">🎯 Smart Feature:</span> Real-time availability!
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-orange-600 to-red-700 rounded-3xl p-8 text-center transform hover:scale-105 transition-all duration-300 shadow-2xl border border-white border-opacity-20">
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 text-4xl animate-bounce delay-400">
                ✅
              </div>
              <h3 className="text-2xl font-bold mb-4 text-yellow-200">Step 3: Instant Checkout</h3>
              <p className="text-lg text-gray-200 mb-4">
                Provide your details and submit your order. Our kitchen receives it instantly and starts preparing!
              </p>
              <div className="bg-white bg-opacity-10 rounded-xl p-3 text-sm">
                <span className="text-orange-300 font-bold">⚡ Lightning Fast:</span> Order in 30 seconds!
              </div>
            </div>
          </div>
          
          <div className="mt-16 text-center">
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-3xl p-8 max-w-4xl mx-auto border border-white border-opacity-30">
              <h3 className="text-3xl font-bold mb-6 text-yellow-200">🌟 Why Choose Our Digital System?</h3>
              <div className="grid md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl mb-2">⚡</div>
                  <h4 className="font-bold text-cyan-300">Lightning Fast</h4>
                  <p className="text-sm text-gray-300">Order in seconds</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">🎯</div>
                  <h4 className="font-bold text-green-300">100% Accurate</h4>
                  <p className="text-sm text-gray-300">No miscommunication</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">📱</div>
                  <h4 className="font-bold text-blue-300">Mobile First</h4>
                  <p className="text-sm text-gray-300">Designed for phones</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">🔒</div>
                  <h4 className="font-bold text-purple-300">Secure & Safe</h4>
                  <p className="text-sm text-gray-300">Protected payments</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Exclusive Gallery Experience Section */}
      <section className="py-20 bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        
        {/* Gallery Background Elements */}
        <div className="absolute top-12 left-12 animate-float delay-100">
          <span className="text-5xl opacity-20">📸</span>
        </div>
        <div className="absolute top-24 right-16 animate-float delay-400">
          <span className="text-4xl opacity-25">🌟</span>
        </div>
        <div className="absolute bottom-16 left-8 animate-float delay-600">
          <span className="text-5xl opacity-20">🎨</span>
        </div>
        <div className="absolute bottom-28 right-20 animate-float delay-300">
          <span className="text-4xl opacity-25">✨</span>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-full text-lg font-semibold mb-6 shadow-lg">
              🎨 EXCLUSIVE GALLERY EXPERIENCE 🎨
            </div>
            <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-emerald-200 via-teal-200 to-cyan-200 bg-clip-text text-transparent">
              Food Zone Gallery
            </h2>
            <p className="text-2xl text-gray-300 max-w-4xl mx-auto">
              Discover our mouth-watering dishes, authentic atmosphere, and the premium Food Zone experience
            </p>
          </div>

          {/* Food Zone Gallery */}
          <div className="mb-16">
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-3xl p-8 border border-white border-opacity-20 mb-8">
              <h3 className="text-3xl font-bold text-center mb-8 text-emerald-200">🍴 Our Signature Dishes</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-orange-600 to-red-700 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-white border-opacity-20">
                  <div className="relative overflow-hidden">
                    <img 
                      src="/images/Gourmet Burgers.jpg" 
                      alt="Gourmet Burgers"
                      className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/images/Best burger in best Restaurant in duwakot.jpg';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h4 className="font-bold text-xl mb-1 text-white">🍔 Gourmet Burgers</h4>
                      <p className="text-gray-200 text-sm">Best burgers with fresh ingredients</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-green-600 to-teal-700 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-white border-opacity-20">
                  <div className="relative overflow-hidden">
                    <img 
                      src="/images/Momo Platter.jpg" 
                      alt="Momo Platter"
                      className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/images/momo-platter.jpg';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h4 className="font-bold text-xl mb-1 text-white">🥟 Momo Platter</h4>
                      <p className="text-gray-200 text-sm">Authentic Nepali momos with special sauce</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-white border-opacity-20">
                  <div className="relative overflow-hidden">
                    <img 
                      src="/images/Combo Meals.jpg" 
                      alt="Combo Meals"
                      className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/images/combo-set.jpg';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h4 className="font-bold text-xl mb-1 text-white">🍟 Combo Meals</h4>
                      <p className="text-gray-200 text-sm">Complete value meals for every appetite</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-yellow-600 to-orange-700 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-white border-opacity-20">
                  <div className="relative overflow-hidden">
                    <img 
                      src="/images/Cheesy Delights.jpg" 
                      alt="Cheesy Delights"
                      className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/images/cheesy-food.jpg';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h4 className="font-bold text-xl mb-1 text-white">🧀 Cheesy Delights</h4>
                      <p className="text-gray-200 text-sm">All day, all night cheesy goodness</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Exclusive Restaurant Atmosphere */}
          <div className="mb-16">
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-3xl p-8 border border-white border-opacity-20">
              <h3 className="text-3xl font-bold text-center mb-8 text-cyan-200">🏪 Exclusive Restaurant Atmosphere</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-white border-opacity-20">
                  <div className="relative overflow-hidden">
                    <img 
                      src="/images/Cozy Dining Area.jpg" 
                      alt="Food Zone Restaurant Interior"
                      className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/images/banner.jpg';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h4 className="font-bold text-xl mb-1 text-white">🪑 Cozy Dining Area</h4>
                      <p className="text-gray-200 text-sm">Comfortable premium seating for families and friends</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-white border-opacity-20">
                  <div className="relative overflow-hidden">
                    <img 
                      src="/images/Fresh Kitchen.jpg" 
                      alt="Fresh Kitchen"
                      className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/images/banner.jpg';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h4 className="font-bold text-xl mb-1 text-white">👨‍🍳 Fresh Kitchen</h4>
                      <p className="text-gray-200 text-sm">State-of-the-art kitchen with premium fresh ingredients</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-amber-600 to-orange-700 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-white border-opacity-20">
                  <div className="relative overflow-hidden">
                    <img 
                      src="/images/Welcoming Ambiance.jpg" 
                      alt="Welcoming Ambiance"
                      className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/images/banner.jpg';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h4 className="font-bold text-xl mb-1 text-white">🌟 Welcoming Ambiance</h4>
                      <p className="text-gray-200 text-sm">Perfect luxury atmosphere for any special occasion</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Exclusive Call to Action */}
          <div className="bg-gradient-to-br from-violet-800 via-purple-700 to-fuchsia-800 rounded-3xl p-12 text-center border border-white border-opacity-20 relative overflow-hidden">
            <div className="absolute top-8 left-8 animate-pulse delay-200">
              <span className="text-4xl opacity-20">🎯</span>
            </div>
            <div className="absolute top-12 right-12 animate-pulse delay-500">
              <span className="text-5xl opacity-25">✨</span>
            </div>
            <div className="absolute bottom-8 left-12 animate-pulse delay-300">
              <span className="text-4xl opacity-20">🚀</span>
            </div>
            <div className="absolute bottom-12 right-8 animate-pulse delay-700">
              <span className="text-5xl opacity-25">💎</span>
            </div>
            
            <div className="relative z-10">
              <div className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-6 py-2 rounded-full font-bold text-lg mb-6 animate-pulse">
                📸 EXCLUSIVE EXPERIENCE AWAITS 📸
              </div>
              <h3 className="text-4xl font-bold mb-6 bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200 bg-clip-text text-transparent">
                Visit Us & Experience Food Zone!
              </h3>
              <p className="text-xl text-gray-200 mb-8 max-w-3xl mx-auto">
                Come and taste these amazing dishes yourself at our innovative restaurant. 
                Located at <span className="text-cyan-300 font-bold">Location to be updated</span>
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link 
                  to="/menu" 
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 transform hover:scale-105 shadow-2xl border border-white border-opacity-20"
                >
                  🍽️ View Full Menu
                </Link>
                <a 
                  href="https://maps.app.goo.gl/8ZE1Rn38Qn8Vnr1S7" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-2xl border border-white border-opacity-20"
                >
                  📍 Get Directions
                </a>
              </div>
              
              <div className="mt-8 grid md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-20">
                  <div className="text-2xl mb-2">🏆</div>
                  <h4 className="font-bold text-yellow-200">Premium Quality</h4>
                  <p className="text-sm text-gray-300">First-class dining experience</p>
                </div>
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-20">
                  <div className="text-2xl mb-2">📱</div>
                  <h4 className="font-bold text-cyan-200">Digital Innovation</h4>
                  <p className="text-sm text-gray-300">Revolutionary mobile ordering</p>
                </div>
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-20">
                  <div className="text-2xl mb-2">⚡</div>
                  <h4 className="font-bold text-green-200">Lightning Service</h4>
                  <p className="text-sm text-gray-300">Instant order processing</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reservation Section */}
      <section className="py-16 bg-gradient-to-r from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-gray-800">🎉 Reserve Your Special Event</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Perfect venue for birthdays, family gatherings, corporate events, and celebrations
            </p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="text-center mb-6">
                  <div className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-full text-2xl font-bold mb-4">
                    👥 Up to 50 People
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">
                    🏪 Private Group Dining
                  </h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <span className="text-2xl">🎂</span>
                    <div>
                      <h4 className="font-semibold text-gray-800">Birthday Parties</h4>
                      <p className="text-sm text-gray-600">Special decorations and birthday cake arrangements</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <span className="text-2xl">👨‍👩‍👧‍👦</span>
                    <div>
                      <h4 className="font-semibold text-gray-800">Family Gatherings</h4>
                      <p className="text-sm text-gray-600">Comfortable seating for large family celebrations</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <span className="text-2xl">💼</span>
                    <div>
                      <h4 className="font-semibold text-gray-800">Corporate Events</h4>
                      <p className="text-sm text-gray-600">Professional setting for business meetings and team events</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                    <span className="text-2xl">🎊</span>
                    <div>
                      <h4 className="font-semibold text-gray-800">Special Celebrations</h4>
                      <p className="text-sm text-gray-600">Anniversaries, graduations, and milestone events</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-xl p-6">
                <h3 className="text-2xl font-bold mb-6 text-center">📋 Reservation Details</h3>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center border-b border-white border-opacity-30 pb-2">
                    <span className="font-medium">👥 Group Size:</span>
                    <span className="font-bold">5 - 50 People</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white border-opacity-30 pb-2">
                    <span className="font-medium">⏰ Advance Notice:</span>
                    <span className="font-bold">24 Hours</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white border-opacity-30 pb-2">
                    <span className="font-medium">💰 Booking Fee:</span>
                    <span className="font-bold">NPR 500</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white border-opacity-30 pb-2">
                    <span className="font-medium">🍽️ Menu Options:</span>
                    <span className="font-bold">Full Menu + Specials</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">🎵 Live Music:</span>
                    <span className="font-bold">Available on Request</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <a 
                    href="#" 
                    className="block w-full bg-white text-blue-600 px-6 py-3 rounded-lg font-bold text-center hover:bg-gray-100 transition-colors"
                  >
                    📞 Call to Reserve
                  </a>
                  <a 
                    href="#" 
                    className="block w-full bg-yellow-500 text-black px-6 py-3 rounded-lg font-bold text-center hover:bg-yellow-400 transition-colors"
                  >
                    📞 Alternative Contact
                  </a>
                  <a 
                    href="#" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-green-600 text-white px-6 py-3 rounded-lg font-bold text-center hover:bg-green-700 transition-colors"
                  >
                    💬 WhatsApp Booking
                  </a>
                </div>
                
                <p className="text-center text-sm mt-4 text-blue-100">
                  📍 Location to be updated
                </p>
              </div>
            </div>
            
            <div className="mt-8 text-center">
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-6 py-3 rounded-full inline-block font-bold">
                🎉 Make Your Event Memorable at Food Zone! 🎉
              </div>
              <p className="mt-3 text-gray-600">
                Professional service, delicious food, and perfect atmosphere for your special occasions
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Exclusive About Food Zone Section */}
      <section className="py-20 bg-gradient-to-br from-rose-900 via-pink-800 to-purple-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
        
        {/* About Background Elements */}
        <div className="absolute top-20 left-16 animate-pulse delay-200">
          <span className="text-5xl opacity-20">🏆</span>
        </div>
        <div className="absolute top-32 right-20 animate-pulse delay-500">
          <span className="text-4xl opacity-25">⭐</span>
        </div>
        <div className="absolute bottom-24 left-12 animate-pulse delay-300">
          <span className="text-5xl opacity-20">💎</span>
        </div>
        <div className="absolute bottom-16 right-24 animate-pulse delay-700">
          <span className="text-4xl opacity-25">🌟</span>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-block bg-gradient-to-r from-rose-400 to-pink-500 text-black px-6 py-2 rounded-full font-bold text-lg mb-6 animate-pulse">
              👑 PREMIUM DINING EXPERIENCE 👑
            </div>
            <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-rose-200 via-pink-200 to-purple-200 bg-clip-text text-transparent">
              About Food Zone
            </h2>
            <p className="text-2xl text-gray-300 max-w-4xl mx-auto">
              Since 2020, pioneering the future of dining with innovation, quality, and exceptional service
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-3xl p-8 border border-white border-opacity-20">
              <h3 className="text-3xl font-bold mb-6 text-rose-200">🏪 Our Story</h3>
              <p className="text-lg text-gray-200 mb-6 leading-relaxed">
                Since 2020, Food Zone Restaurant has been revolutionizing the dining experience. 
                We've evolved from a traditional restaurant to the first 
                <span className="text-yellow-300 font-bold"> fully digital dining experience</span> in the area.
              </p>
              <p className="text-lg text-gray-200 mb-8 leading-relaxed">
                Our menu celebrates diversity with Tibetan, Continental, and Indian dishes alongside 
                pizzas, burgers, momos, and flavorful curries - all now available through our 
                <span className="text-cyan-300 font-bold"> revolutionary mobile ordering system</span>.
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-green-600 to-teal-700 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-2">🕐</div>
                  <h4 className="font-bold text-yellow-200 mb-1">Operating Hours</h4>
                  <p className="text-sm">Daily 7:30 AM - 10:30 PM</p>
                </div>
                <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-2">🚚</div>
                  <h4 className="font-bold text-yellow-200 mb-1">Delivery Service</h4>
                  <p className="text-sm">Daily 10:00 AM - 11:00 PM</p>
                </div>
                <div className="bg-gradient-to-br from-purple-600 to-pink-700 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-2">🎵</div>
                  <h4 className="font-bold text-yellow-200 mb-1">Live Music</h4>
                  <p className="text-sm">Weekends & Special Events</p>
                </div>
                <div className="bg-gradient-to-br from-orange-600 to-red-700 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-2">👨‍👩‍👧‍👦</div>
                  <h4 className="font-bold text-yellow-200 mb-1">Family Friendly</h4>
                  <p className="text-sm">LGBTQ+ Friendly & Kids Welcome</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-3xl p-8 border border-white border-opacity-20">
              <h3 className="text-3xl font-bold mb-6 text-purple-200 text-center">🚀 Innovation Leaders</h3>
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-cyan-600 to-blue-700 rounded-xl p-4 flex items-center gap-4">
                  <div className="text-3xl">📱</div>
                  <div>
                    <h4 className="font-bold text-yellow-200">First Digital Restaurant</h4>
                    <p className="text-sm text-gray-200">Mobile-first ordering system</p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-green-600 to-teal-700 rounded-xl p-4 flex items-center gap-4">
                  <div className="text-3xl">📍</div>
                  <div>
                    <h4 className="font-bold text-yellow-200">GPS Delivery Tracking</h4>
                    <p className="text-sm text-gray-200">Real-time location-based delivery</p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-purple-600 to-pink-700 rounded-xl p-4 flex items-center gap-4">
                  <div className="text-3xl">⚡</div>
                  <div>
                    <h4 className="font-bold text-yellow-200">Instant Service</h4>
                    <p className="text-sm text-gray-200">QR code table ordering technology</p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-orange-600 to-red-700 rounded-xl p-4 flex items-center gap-4">
                  <div className="text-3xl">🎯</div>
                  <div>
                    <h4 className="font-bold text-yellow-200">Premium Experience</h4>
                    <p className="text-sm text-gray-200">Seamless dine-in and delivery service</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 text-center">
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-6 py-3 rounded-full font-bold text-lg">
                  🏆 Setting New Standards! 🏆
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QR Code Info */}
      <section className="py-16 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Order?</h2>
          <p className="text-xl mb-8">
            Look for the QR code on your table to start ordering, or browse our menu first. 
            We offer dine-in, takeaway, and delivery services!
          </p>
          <div className="space-x-4">
            <Link 
              to="/menu" 
              className="bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-block"
            >
              Browse Menu
            </Link>
            <a 
              href="#" 
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors inline-block"
            >
              WhatsApp Order
            </a>
          </div>
          <div className="mt-8 text-lg">
            <p>📞 Call us for contact details</p>
            <p>🌐 Visit: foodzone.com.np</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Homepage;
