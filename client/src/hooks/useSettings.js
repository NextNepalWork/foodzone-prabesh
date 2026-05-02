import { useState, useEffect } from 'react';
import settingsService from '../services/settingsService';

// Hook for using settings in React components
export function useSettings() {
  const [settings, setSettings] = useState(settingsService.settings);
  const [loading, setLoading] = useState(!settingsService.isLoaded());

  useEffect(() => {
    // Subscribe to settings changes
    const unsubscribe = settingsService.subscribe((newSettings) => {
      setSettings(newSettings);
      setLoading(false);
    });

    // Load settings if not already loaded
    if (!settingsService.isLoaded()) {
      settingsService.loadSettings().then(() => {
        setSettings(settingsService.settings);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }

    return unsubscribe;
  }, []);

  return {
    settings,
    loading,
    get: settingsService.get.bind(settingsService),
    getTableCount: settingsService.getTableCount.bind(settingsService),
    getRestaurantInfo: settingsService.getRestaurantInfo.bind(settingsService),
    getOrderSettings: settingsService.getOrderSettings.bind(settingsService),
    getPaymentSettings: settingsService.getPaymentSettings.bind(settingsService),
    getNotificationSettings: settingsService.getNotificationSettings.bind(settingsService),
    getDisplaySettings: settingsService.getDisplaySettings.bind(settingsService),
    getDeliverySettings: settingsService.getDeliverySettings.bind(settingsService),
    getHoursSettings: settingsService.getHoursSettings.bind(settingsService),
    getHappyHourSettings: settingsService.getHappyHourSettings.bind(settingsService),
    getPrintSettings: settingsService.getPrintSettings.bind(settingsService),
    getSecuritySettings: settingsService.getSecuritySettings.bind(settingsService),
    getCustomerAppSettings: settingsService.getCustomerAppSettings.bind(settingsService),
    getTableSettings: settingsService.getTableSettings.bind(settingsService),
    getIntegrationsSettings: settingsService.getIntegrationsSettings.bind(settingsService),
    updateSetting: settingsService.updateSetting.bind(settingsService),
    updateSettings: settingsService.updateSettings.bind(settingsService),
    reload: settingsService.reload.bind(settingsService)
  };
}

// Hook for specific setting value
export function useSetting(key, defaultValue = null) {
  const [value, setValue] = useState(settingsService.get(key, defaultValue));

  useEffect(() => {
    const unsubscribe = settingsService.subscribe(() => {
      setValue(settingsService.get(key, defaultValue));
    });

    // Update value if settings are already loaded
    if (settingsService.isLoaded()) {
      setValue(settingsService.get(key, defaultValue));
    }

    return unsubscribe;
  }, [key, defaultValue]);

  return value;
}

// Hook for table count specifically
export function useTableCount() {
  const [tableCount, setTableCount] = useState(25); // Default fallback
  
  useEffect(() => {
    // Load settings immediately
    const loadTableCount = async () => {
      try {
        await settingsService.loadSettings();
        const count = settingsService.getTableCount();
        console.log('🔍 useTableCount - Loaded table count:', count);
        setTableCount(count);
      } catch (error) {
        console.error('Failed to load table count:', error);
        setTableCount(25); // Fallback
      }
    };
    
    loadTableCount();
    
    // Subscribe to changes
    const unsubscribe = settingsService.subscribe(() => {
      const count = settingsService.getTableCount();
      console.log('🔍 useTableCount - Settings updated, new count:', count);
      setTableCount(count);
    });

    return unsubscribe;
  }, []);

  return tableCount;
}

// Hook for restaurant info
export function useRestaurantInfo() {
  const [info, setInfo] = useState(settingsService.getRestaurantInfo());
  
  useEffect(() => {
    const unsubscribe = settingsService.subscribe(() => {
      setInfo(settingsService.getRestaurantInfo());
    });

    if (settingsService.isLoaded()) {
      setInfo(settingsService.getRestaurantInfo());
    }

    return unsubscribe;
  }, []);

  return info;
}

// Hook for order settings
export function useOrderSettings() {
  const [settings, setSettings] = useState(settingsService.getOrderSettings());
  
  useEffect(() => {
    const unsubscribe = settingsService.subscribe(() => {
      setSettings(settingsService.getOrderSettings());
    });

    if (settingsService.isLoaded()) {
      setSettings(settingsService.getOrderSettings());
    }

    return unsubscribe;
  }, []);

  return settings;
}

// Hook for payment settings
export function usePaymentSettings() {
  const [settings, setSettings] = useState(settingsService.getPaymentSettings());
  
  useEffect(() => {
    const unsubscribe = settingsService.subscribe(() => {
      setSettings(settingsService.getPaymentSettings());
    });

    if (settingsService.isLoaded()) {
      setSettings(settingsService.getPaymentSettings());
    }

    return unsubscribe;
  }, []);

  return settings;
}

// Hook for notification settings
export function useNotificationSettings() {
  const [settings, setSettings] = useState(settingsService.getNotificationSettings());
  
  useEffect(() => {
    const unsubscribe = settingsService.subscribe(() => {
      setSettings(settingsService.getNotificationSettings());
    });

    if (settingsService.isLoaded()) {
      setSettings(settingsService.getNotificationSettings());
    }

    return unsubscribe;
  }, []);

  return settings;
}

// Hook for display settings
export function useDisplaySettings() {
  const [settings, setSettings] = useState(settingsService.getDisplaySettings());
  
  useEffect(() => {
    const unsubscribe = settingsService.subscribe(() => {
      setSettings(settingsService.getDisplaySettings());
    });

    if (settingsService.isLoaded()) {
      setSettings(settingsService.getDisplaySettings());
    }

    return unsubscribe;
  }, []);

  return settings;
}

// Hook for delivery settings
export function useDeliverySettings() {
  const [settings, setSettings] = useState(settingsService.getDeliverySettings());
  
  useEffect(() => {
    const unsubscribe = settingsService.subscribe(() => {
      setSettings(settingsService.getDeliverySettings());
    });

    if (settingsService.isLoaded()) {
      setSettings(settingsService.getDeliverySettings());
    }

    return unsubscribe;
  }, []);

  return settings;
}

// Hook for hours settings
export function useHoursSettings() {
  const [settings, setSettings] = useState(settingsService.getHoursSettings());
  
  useEffect(() => {
    const unsubscribe = settingsService.subscribe(() => {
      setSettings(settingsService.getHoursSettings());
    });

    if (settingsService.isLoaded()) {
      setSettings(settingsService.getHoursSettings());
    }

    return unsubscribe;
  }, []);

  return settings;
}

// Hook for happy hour settings
export function useHappyHourSettings() {
  const [settings, setSettings] = useState(settingsService.getHappyHourSettings());
  
  useEffect(() => {
    const unsubscribe = settingsService.subscribe(() => {
      setSettings(settingsService.getHappyHourSettings());
    });

    if (settingsService.isLoaded()) {
      setSettings(settingsService.getHappyHourSettings());
    }

    return unsubscribe;
  }, []);

  return settings;
}

// Hook for print settings
export function usePrintSettings() {
  const [settings, setSettings] = useState(settingsService.getPrintSettings());
  
  useEffect(() => {
    const unsubscribe = settingsService.subscribe(() => {
      setSettings(settingsService.getPrintSettings());
    });

    if (settingsService.isLoaded()) {
      setSettings(settingsService.getPrintSettings());
    }

    return unsubscribe;
  }, []);

  return settings;
}

// Hook for security settings
export function useSecuritySettings() {
  const [settings, setSettings] = useState(settingsService.getSecuritySettings());
  
  useEffect(() => {
    const unsubscribe = settingsService.subscribe(() => {
      setSettings(settingsService.getSecuritySettings());
    });

    if (settingsService.isLoaded()) {
      setSettings(settingsService.getSecuritySettings());
    }

    return unsubscribe;
  }, []);

  return settings;
}

// Hook for customer app settings
export function useCustomerAppSettings() {
  const [settings, setSettings] = useState(settingsService.getCustomerAppSettings());
  
  useEffect(() => {
    const unsubscribe = settingsService.subscribe(() => {
      setSettings(settingsService.getCustomerAppSettings());
    });

    if (settingsService.isLoaded()) {
      setSettings(settingsService.getCustomerAppSettings());
    }

    return unsubscribe;
  }, []);

  return settings;
}

// Hook for table settings
export function useTableSettings() {
  const [settings, setSettings] = useState(settingsService.getTableSettings());
  
  useEffect(() => {
    const unsubscribe = settingsService.subscribe(() => {
      setSettings(settingsService.getTableSettings());
    });

    if (settingsService.isLoaded()) {
      setSettings(settingsService.getTableSettings());
    }

    return unsubscribe;
  }, []);

  return settings;
}

// Hook for integrations settings
export function useIntegrationsSettings() {
  const [settings, setSettings] = useState(settingsService.getIntegrationsSettings());
  
  useEffect(() => {
    const unsubscribe = settingsService.subscribe(() => {
      setSettings(settingsService.getIntegrationsSettings());
    });

    if (settingsService.isLoaded()) {
      setSettings(settingsService.getIntegrationsSettings());
    }

    return unsubscribe;
  }, []);

  return settings;
}