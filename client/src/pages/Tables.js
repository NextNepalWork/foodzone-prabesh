import React, { useState, useMemo, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useTableCount } from '../hooks/useSettings';
// No longer need table URL mapping - using simple numeric IDs

// Lazy load table card component for better performance
const TableCard = lazy(() => Promise.resolve({
  default: ({ tableNumber, generateTableLink }) => (
    <Link
      to={generateTableLink(tableNumber)}
      className="bg-white rounded-lg border border-gray-200 hover:border-blue-400 p-4 text-center transition-colors duration-150 hover:shadow-md transform hover:scale-105"
    >
      <div className="text-3xl mb-2">🪑</div>
      <div className="text-lg font-semibold text-gray-700">Table {tableNumber}</div>
      <div className="text-sm text-gray-500 mt-1">Click to Order</div>
    </Link>
  )
}));

const Tables = () => {
  // Get dynamic table count from settings
  const tableCount = useTableCount();
  
  // Generate simple numeric table links
  const generateTableLink = (tableNumber) => {
    return `/${tableNumber}`;
  };

  const [visibleTables, setVisibleTables] = useState(12); // Show 12 tables initially
  const tables = Array.from({ length: tableCount }, (_, i) => i + 1);
  
  // Memoized displayed tables for performance
  const displayedTables = useMemo(() => {
    return tables.slice(0, visibleTables);
  }, [tables, visibleTables]);
  
  const hasMoreTables = tables.length > visibleTables;
  
  const loadMoreTables = () => {
    setVisibleTables(prev => Math.min(prev + 8, tables.length));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-700 mb-3">🪑 Table Selection</h1>
          <p className="text-gray-600">Choose your table to start ordering</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-4xl mx-auto">
          <Suspense fallback={
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg p-4 animate-pulse">
                <div className="h-8 bg-gray-300 rounded mb-2"></div>
                <div className="h-4 bg-gray-300 rounded mb-1"></div>
                <div className="h-3 bg-gray-300 rounded"></div>
              </div>
            ))
          }>
            {displayedTables.map(tableNumber => (
              <TableCard
                key={tableNumber}
                tableNumber={tableNumber}
                generateTableLink={generateTableLink}
              />
            ))}
          </Suspense>
        </div>
        
        {/* Load More Button */}
        {hasMoreTables && (
          <div className="text-center mt-8">
            <button
              onClick={loadMoreTables}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Load More Tables ({tables.length - visibleTables} remaining)
            </button>
          </div>
        )}

        <div className="text-center mt-10">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-w-xl mx-auto">
            <h2 className="text-base font-medium text-gray-700 mb-2">🔒 Secure Table Access</h2>
            <p className="text-gray-600 text-sm">
              All table links use custom URLs for your security. You can also scan the QR code at your table for direct access.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {tableCount} tables available
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tables;
