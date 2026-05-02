import { useState, useEffect, useCallback } from 'react';
import PushNotificationManager from '../utils/pushNotifications';

export const useNotifications = (userType = 'customer') => {
  const [pushManager, setPushManager] = useState(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [permission, setPermission] = useState('default');

  useEffect(() => {
    const manager = new PushNotificationManager();
    setPushManager(manager);
    
    // Check initial permission
    if ('Notification' in window) {
      setPermission(Notification.permission);
      setIsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!pushManager) return false;
    
    try {
      const granted = await pushManager.requestPermission();
      setPermission(granted ? 'granted' : 'denied');
      setIsEnabled(granted);
      
      if (granted && (userType === 'staff' || userType === 'admin')) {
        await pushManager.initialize();
      }
      
      return granted;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }, [pushManager, userType]);

  const showNotification = useCallback((title, options = {}) => {
    if (!pushManager || !isEnabled) return null;
    
    return pushManager.showLocalNotification(title, options);
  }, [pushManager, isEnabled]);

  // Notification templates for different order events
  const notifyNewOrder = useCallback((orderData) => {
    const { tableId, orderType, totalAmount, customerName, items } = orderData;
    
    let title = '🍽️ New Order Received!';
    let body = '';
    
    if (orderType === 'dine-in') {
      body = `Table ${tableId} - ${customerName || 'Customer'} - NPR ${totalAmount}/-`;
    } else {
      body = `Delivery Order - ${customerName || 'Customer'} - NPR ${totalAmount}/-`;
    }
    
    return showNotification(title, {
      body,
      tag: `order-${Date.now()}`,
      requireInteraction: true,
      actions: [
        { action: 'view', title: 'View Order' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    });
  }, [showNotification]);

  const notifyOrderReady = useCallback((orderData) => {
    const { tableId, orderType, orderNumber } = orderData;
    
    let title = '✅ Order Ready!';
    let body = '';
    
    if (orderType === 'dine-in') {
      body = `Table ${tableId} - Order #${orderNumber} is ready to serve`;
    } else {
      body = `Delivery Order #${orderNumber} is ready for pickup`;
    }
    
    return showNotification(title, {
      body,
      tag: `ready-${orderNumber}`,
      requireInteraction: true
    });
  }, [showNotification]);

  const notifyTableCleared = useCallback((tableId) => {
    return showNotification('🧹 Table Cleared', {
      body: `Table ${tableId} has been cleared and is ready for new customers`,
      tag: `table-cleared-${tableId}`
    });
  }, [showNotification]);

  return {
    isSupported: pushManager?.isSupported() || false,
    isEnabled,
    permission,
    requestPermission,
    showNotification,
    notifyNewOrder,
    notifyOrderReady,
    notifyTableCleared
  };
};
