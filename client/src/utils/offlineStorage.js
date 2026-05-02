// Offline storage utility for Staff PWA
class OfflineStorageManager {
  constructor() {
    this.dbName = 'FoodZoneStaffDB';
    this.version = 1;
    this.db = null;
  }

  // Initialize IndexedDB
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create orders store
        if (!db.objectStoreNames.contains('orders')) {
          const ordersStore = db.createObjectStore('orders', { keyPath: 'id' });
          ordersStore.createIndex('status', 'status', { unique: false });
          ordersStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // Create pending actions store
        if (!db.objectStoreNames.contains('pendingActions')) {
          const actionsStore = db.createObjectStore('pendingActions', { keyPath: 'id', autoIncrement: true });
          actionsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // Store orders offline
  async storeOrders(orders) {
    if (!this.db) await this.init();

    const transaction = this.db.transaction(['orders'], 'readwrite');
    const store = transaction.objectStore('orders');

    for (const order of orders) {
      await store.put(order);
    }

    return transaction.complete;
  }

  // Get stored orders
  async getStoredOrders() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['orders'], 'readonly');
      const store = transaction.objectStore('orders');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  // Store pending action for when back online
  async storePendingAction(action) {
    if (!this.db) await this.init();

    const transaction = this.db.transaction(['pendingActions'], 'readwrite');
    const store = transaction.objectStore('pendingActions');

    const pendingAction = {
      ...action,
      timestamp: Date.now()
    };

    return store.add(pendingAction);
  }

  // Get pending actions
  async getPendingActions() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pendingActions'], 'readonly');
      const store = transaction.objectStore('pendingActions');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  // Clear pending actions after sync
  async clearPendingActions() {
    if (!this.db) await this.init();

    const transaction = this.db.transaction(['pendingActions'], 'readwrite');
    const store = transaction.objectStore('pendingActions');
    return store.clear();
  }

  // Check if online
  isOnline() {
    return navigator.onLine;
  }

  // Sync pending actions when back online
  async syncPendingActions(apiService) {
    const pendingActions = await this.getPendingActions();
    
    for (const action of pendingActions) {
      try {
        switch (action.type) {
          case 'UPDATE_ORDER_STATUS':
            await apiService.put(`/api/orders/${action.orderId}/status`, { status: action.status });
            break;
          // Add more action types as needed
          default:
            console.warn('Unknown action type:', action.type);
            break;
        }
      } catch (error) {
        console.error('Failed to sync action:', action, error);
      }
    }

    await this.clearPendingActions();
  }
}

export default OfflineStorageManager;
