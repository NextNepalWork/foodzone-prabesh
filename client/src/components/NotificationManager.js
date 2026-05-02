import React, { useState, useEffect } from 'react';
import PushNotificationManager from '../utils/pushNotifications';

const NotificationManager = ({ userType = 'customer' }) => {
  const [notificationStatus, setNotificationStatus] = useState('checking');
  const [pushManager, setPushManager] = useState(null);

  useEffect(() => {
    const initializeNotifications = async () => {
      const manager = new PushNotificationManager();
      setPushManager(manager);

      // Check if notifications are supported
      if (!manager.isSupported()) {
        setNotificationStatus('unsupported');
        return;
      }

      // Check current permission
      const permission = Notification.permission;
      if (permission === 'granted') {
        setNotificationStatus('enabled');
        // Initialize push notifications for staff
        if (userType === 'staff' || userType === 'admin') {
          await manager.initialize();
        }
      } else if (permission === 'denied') {
        setNotificationStatus('denied');
      } else {
        setNotificationStatus('prompt');
      }
    };

    initializeNotifications();
  }, [userType]);

  const enableNotifications = async () => {
    if (!pushManager) return;

    try {
      setNotificationStatus('requesting');
      const success = await pushManager.initialize();
      
      if (success) {
        setNotificationStatus('enabled');
        
        // Show success notification
        pushManager.showLocalNotification('🔔 Notifications Enabled!', {
          body: 'You will now receive order updates and alerts',
          tag: 'notification-enabled'
        });
      } else {
        setNotificationStatus('denied');
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      setNotificationStatus('error');
    }
  };

  // Don't show for regular customers unless they're on a table
  if (userType === 'customer') {
    return null;
  }

  return (
    <div className="notification-manager">
      {notificationStatus === 'prompt' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-2xl mr-3">🔔</div>
              <div>
                <h3 className="font-semibold text-blue-900">Enable Notifications</h3>
                <p className="text-sm text-blue-700">Get instant alerts for new orders and updates</p>
              </div>
            </div>
            <button
              onClick={enableNotifications}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Enable
            </button>
          </div>
        </div>
      )}

      {notificationStatus === 'requesting' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600 mr-3"></div>
            <p className="text-yellow-800">Requesting notification permission...</p>
          </div>
        </div>
      )}

      {notificationStatus === 'enabled' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <div className="flex items-center">
            <div className="text-green-600 mr-2">✅</div>
            <p className="text-sm text-green-800">Notifications enabled - You'll receive order alerts</p>
          </div>
        </div>
      )}

      {notificationStatus === 'denied' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-red-600 mr-3">🚫</div>
              <div>
                <h3 className="font-semibold text-red-900">Notifications Blocked</h3>
                <p className="text-sm text-red-700">Enable in browser settings to receive order alerts</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {notificationStatus === 'unsupported' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <div className="text-gray-600 mr-3">ℹ️</div>
            <p className="text-sm text-gray-700">Push notifications not supported in this browser</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationManager;
