// Push Notifications Manager for Food Zone
import { getApiUrl } from '../config/api';

class PushNotificationManager {
  constructor() {
    this.vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa40HuWukzpOCmnLmPTwURgxmSWHVvSKHjh6CR70C8uYWduFkBFRdKfvQuo5GQ'; // Replace with your VAPID key
    this.registration = null;
    this.subscription = null;
    this.supported = 'serviceWorker' in navigator && 'PushManager' in window;
  }

  // Check if push notifications are supported
  isSupported() {
    return this.supported;
  }

  // Request notification permission
  async requestPermission() {
    if (!this.isSupported()) {
      throw new Error('Push notifications are not supported');
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  // Register service worker
  async registerServiceWorker() {
    if (!this.isSupported()) {
      throw new Error('Service workers are not supported');
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully');
      return this.registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  // Subscribe to push notifications
  async subscribe() {
    if (!this.registration) {
      await this.registerServiceWorker();
    }

    try {
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      console.log('Push subscription successful');
      return this.subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      throw error;
    }
  }

  // Send subscription to server (optional - fallback to local notifications)
  async sendSubscriptionToServer(subscription) {
    try {
      const response = await fetch(`${getApiUrl()}/api/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription,
          userAgent: navigator.userAgent
        })
      });

      if (!response.ok) {
        console.warn('Server push endpoint not available, using local notifications only');
        return { success: true, local: true };
      }

      return await response.json();
    } catch (error) {
      console.warn('Server push endpoint not available, using local notifications only');
      return { success: true, local: true };
    }
  }

  // Show local notification with enhanced audio
  showLocalNotification(title, options = {}) {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return;
    }

    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    const defaultOptions = {
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [400, 200, 400, 200, 400], // Extended vibration pattern
      requireInteraction: true,
      silent: false,
      tag: 'food-zone-order',
      renotify: true
    };

    const notificationOptions = { ...defaultOptions, ...options };
    
    try {
      const notification = new Notification(title, notificationOptions);
      
      // Import and play enhanced audio alert
      import('../utils/audioAlerts.js').then(({ default: audioAlertManager }) => {
        audioAlertManager.playNotificationAlert();
      }).catch(error => {
        console.warn('Audio alert import failed:', error);
      });
      
      notification.onclick = function() {
        window.focus();
        this.close();
      };
      
      return notification;
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  // Initialize push notifications
  async initialize() {
    try {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        throw new Error('Notification permission denied');
      }

      await this.registerServiceWorker();
      const subscription = await this.subscribe();
      await this.sendSubscriptionToServer(subscription);

      console.log('Push notifications initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  // Utility function to convert VAPID key
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Unsubscribe from push notifications
  async unsubscribe() {
    if (this.subscription) {
      await this.subscription.unsubscribe();
      this.subscription = null;
    }
  }
}

export default PushNotificationManager;
