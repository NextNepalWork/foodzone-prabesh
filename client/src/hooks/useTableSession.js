import { useState, useEffect, useCallback } from 'react';
import tableSessionService from '../services/tableSessionService';

export const useTableSession = () => {
  const [sessionActive, setSessionActive] = useState(false);
  const [tableId, setTableId] = useState(null);
  const [orders, setOrders] = useState([]);
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize session on mount
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const initialized = await tableSessionService.autoInitialize();
        if (initialized) {
          setSessionActive(true);
          setTableId(tableSessionService.getCurrentTableId());
          await refreshData();
        }
      } catch (error) {
        console.error('Session initialization failed:', error);
        setError(error.message);
      }
    };

    initializeSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh orders and bill data
  const refreshData = useCallback(async () => {
    if (!tableSessionService.hasActiveSession()) return;

    setLoading(true);
    setError(null);

    try {
      const [ordersData, billData] = await Promise.all([
        tableSessionService.getOrderHistory(),
        tableSessionService.getBill()
      ]);

      setOrders(ordersData.orders || []);
      setBill(billData.bill || null);
    } catch (error) {
      console.error('Failed to refresh data:', error);
      setError(error.message);
      
      // If session expired, clear state
      if (error.response?.status === 401) {
        setSessionActive(false);
        setTableId(null);
        setOrders([]);
        setBill(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new session
  const createSession = useCallback(async (newTableId) => {
    setLoading(true);
    setError(null);

    try {
      await tableSessionService.createSession(newTableId);
      setSessionActive(true);
      setTableId(newTableId);
      await refreshData();
      return true;
    } catch (error) {
      console.error('Failed to create session:', error);
      setError(error.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [refreshData]);

  // Request payment
  const requestPayment = useCallback(async (paymentMethod) => {
    if (!sessionActive) {
      throw new Error('No active session');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await tableSessionService.requestPayment(paymentMethod);
      await refreshData(); // Refresh to get updated payment status
      return result;
    } catch (error) {
      console.error('Payment request failed:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [sessionActive, refreshData]);

  // Clear session
  const clearSession = useCallback(() => {
    tableSessionService.clearSession();
    setSessionActive(false);
    setTableId(null);
    setOrders([]);
    setBill(null);
    setError(null);
  }, []);

  // Get session info
  const getSessionInfo = useCallback(async () => {
    if (!sessionActive) return null;

    try {
      return await tableSessionService.getSessionInfo();
    } catch (error) {
      console.error('Failed to get session info:', error);
      return null;
    }
  }, [sessionActive]);

  return {
    // State
    sessionActive,
    tableId,
    orders,
    bill,
    loading,
    error,

    // Actions
    createSession,
    refreshData,
    requestPayment,
    clearSession,
    getSessionInfo,

    // Computed values
    hasOrders: orders.length > 0,
    totalAmount: bill?.total || 0,
    orderCount: bill?.orderCount || 0
  };
};