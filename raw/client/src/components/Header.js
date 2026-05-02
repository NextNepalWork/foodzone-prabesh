import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header = React.memo(() => {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Memoize page type calculations to prevent re-renders
  const pageInfo = useMemo(() => {
    const path = location.pathname;
    return {
      isNumericTablePage: /^\/\d+$/.test(path),
      isEncryptedTablePage: /^\/[A-Za-z0-9]{12,}$/.test(path),
      isDeliveryCartPage: path === '/delivery-cart',
      isMenuPage: path === '/menu'
    };
  }, [location.pathname]);
  
  const isTablePage = pageInfo.isNumericTablePage || pageInfo.isEncryptedTablePage;

  // Optimized scroll handler with throttling
  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          setIsScrolled(scrollTop > 50);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 ${isTablePage ? 'bg-gradient-to-r from-amber-800 to-yellow-800' : 'bg-transparent'}`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-3">
            <div className="relative">
              <img 
                src="/images/logo.jpg" 
                alt="Food Zone Logo" 
                className={`h-16 w-16 rounded-full object-cover shadow-lg border-2 ${isTablePage ? 'border-amber-200' : 'border-white'}`}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
              <div className={`h-16 w-16 rounded-full bg-gradient-to-br from-orange-500 to-red-600 shadow-lg border-2 ${isTablePage ? 'border-amber-200' : 'border-white'} hidden items-center justify-center`}>
                <span className="text-white font-bold text-lg">FZ</span>
              </div>
            </div>
            <div className={`text-white transition-all duration-300 ${isScrolled || location.pathname !== '/' ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
              <h1 className="text-xl font-bold">Food Zone</h1>
              <p className="text-sm opacity-90">Restaurant</p>
            </div>
          </Link>
          
          <nav className="flex items-center space-x-6">
            {/* Show menu button only on homepage and delivery cart page, NOT on table pages or menu page */}
            {!pageInfo.isMenuPage && !isTablePage && (
              <Link 
                to="/menu" 
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-semibold px-6 py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <span className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  <span>
                    {pageInfo.isDeliveryCartPage ? 'Browse Menu' : 'View Menu'}
                  </span>
                </span>
              </Link>
            )}
          </nav>

        </div>
      </div>
    </header>
  );
});

export default Header;
