import { useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const TableBanner = () => {
  const { currentTable } = useCart();
  const location = useLocation();
  
  // Don't show on table ordering pages (they have their own sticky bar)
  const isTableOrderingPage = location.pathname.match(/^\/\d+$/) || location.pathname.match(/^\/[A-Z0-9]{12}$/);
  
  if (!currentTable || isTableOrderingPage) return null;

  return null; // Temporarily disabled to avoid duplicates
};

export default TableBanner;
