import React, { createContext, useContext, useState, useEffect } from 'react';

const TableContext = createContext();

export const useTable = () => {
  const context = useContext(TableContext);
  if (!context) {
    throw new Error('useTable must be used within a TableProvider');
  }
  return context;
};

export const TableProvider = ({ children }) => {
  const [currentTable, setCurrentTable] = useState(null);

  useEffect(() => {
    // Check localStorage for existing table session
    const savedTable = localStorage.getItem('currentTable');
    const savedTimestamp = localStorage.getItem('tableTimestamp');
    
    if (savedTable && savedTimestamp) {
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      if (parseInt(savedTimestamp) > oneHourAgo) {
        setCurrentTable(parseInt(savedTable));
      } else {
        // Clear expired session
        localStorage.removeItem('currentTable');
        localStorage.removeItem('tableTimestamp');
      }
    }
  }, []);

  const setTable = (tableId) => {
    setCurrentTable(tableId);
    localStorage.setItem('currentTable', tableId.toString());
    localStorage.setItem('tableTimestamp', Date.now().toString());
  };

  const clearTable = () => {
    setCurrentTable(null);
    localStorage.removeItem('currentTable');
    localStorage.removeItem('tableTimestamp');
  };

  return (
    <TableContext.Provider value={{
      currentTable,
      setTable,
      clearTable
    }}>
      {children}
    </TableContext.Provider>
  );
};
