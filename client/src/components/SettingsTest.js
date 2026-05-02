import React from 'react';
import { 
  useSettings, 
  useRestaurantInfo, 
  useTableCount, 
  useNotificationSettings,
  useDisplaySettings,
  usePaymentSettings,
  useOrderSettings,
  useDeliverySettings
} from '../hooks/useSettings';
import { formatCurrency, getCurrencySymbol } from '../utils/currency';

const SettingsTest = () => {
  const { settings, loading, updateSetting } = useSettings();
  const restaurantInfo = useRestaurantInfo();
  const tableCount = useTableCount();
  const notificationSettings = useNotificationSettings();
  const displaySettings = useDisplaySettings();
  const paymentSettings = usePaymentSettings();
  const orderSettings = useOrderSettings();
  const deliverySettings = useDeliverySettings();

  const testUpdateSetting = async (key, value) => {
    console.log(`Testing update: ${key} = ${value}`);
    const success = await updateSetting(key, value);
    console.log(`Update ${success ? 'successful' : 'failed'}`);
  };

  if (loading) {
    return <div className="p-4">Loading settings...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🧪 Dynamic Settings Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Restaurant Info */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">🏢 Restaurant Info</h2>
          <div className="space-y-2 text-sm">
            <div><strong>Name:</strong> {restaurantInfo.name}</div>
            <div><strong>Phone:</strong> {restaurantInfo.phone}</div>
            <div><strong>Address:</strong> {restaurantInfo.address}</div>
            <div><strong>Email:</strong> {restaurantInfo.email}</div>
            <div><strong>Tagline:</strong> {restaurantInfo.tagline}</div>
          </div>
          <button 
            onClick={() => testUpdateSetting('business.name', 'Restro 3D')}
            className="mt-3 px-3 py-1 bg-blue-500 text-white rounded text-sm"
          >
            Test: Change Name to "Restro 3D"
          </button>
        </div>

        {/* Table Settings */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">🪑 Table Settings</h2>
          <div className="space-y-2 text-sm">
            <div><strong>Table Count:</strong> {tableCount}</div>
          </div>
          <button 
            onClick={() => testUpdateSetting('tables.table_count', 30)}
            className="mt-3 px-3 py-1 bg-green-500 text-white rounded text-sm"
          >
            Test: Change to 30 Tables
          </button>
        </div>

        {/* Notification Settings */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">🔔 Notification Settings</h2>
          <div className="space-y-2 text-sm">
            <div><strong>Sound Enabled:</strong> {notificationSettings.soundEnabled ? 'Yes' : 'No'}</div>
            <div><strong>Volume:</strong> {notificationSettings.soundVolume}%</div>
            <div><strong>Table Call Sound:</strong> {notificationSettings.tableCallSound ? 'Yes' : 'No'}</div>
            <div><strong>Low Stock Alerts:</strong> {notificationSettings.lowStockAlerts ? 'Yes' : 'No'}</div>
          </div>
          <button 
            onClick={() => testUpdateSetting('notify.sound_volume', 85)}
            className="mt-3 px-3 py-1 bg-purple-500 text-white rounded text-sm"
          >
            Test: Set Volume to 85%
          </button>
        </div>

        {/* Display Settings */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">🎨 Display Settings</h2>
          <div className="space-y-2 text-sm">
            <div><strong>Currency Symbol:</strong> {displaySettings.currencySymbol}</div>
            <div><strong>Currency Code:</strong> {displaySettings.currencyCode}</div>
            <div><strong>Currency Position:</strong> {displaySettings.currencyPosition}</div>
            <div><strong>Language:</strong> {displaySettings.language}</div>
            <div><strong>Timezone:</strong> {displaySettings.timezone}</div>
          </div>
          <button 
            onClick={() => testUpdateSetting('locale.currency_symbol', '$')}
            className="mt-3 px-3 py-1 bg-yellow-500 text-white rounded text-sm"
          >
            Test: Change Currency to $
          </button>
        </div>

        {/* Payment Settings */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">💳 Payment Settings</h2>
          <div className="space-y-2 text-sm">
            <div><strong>Tax Rate:</strong> {paymentSettings.taxRate}%</div>
            <div><strong>Service Charge:</strong> {paymentSettings.serviceChargeRate}%</div>
            <div><strong>Tax Inclusive:</strong> {paymentSettings.taxInclusive ? 'Yes' : 'No'}</div>
            <div><strong>Currency Symbol:</strong> {paymentSettings.currencySymbol}</div>
          </div>
          <button 
            onClick={() => testUpdateSetting('tax.vat_percent', 15)}
            className="mt-3 px-3 py-1 bg-red-500 text-white rounded text-sm"
          >
            Test: Change Tax to 15%
          </button>
        </div>

        {/* Order Settings */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">🛒 Order Settings</h2>
          <div className="space-y-2 text-sm">
            <div><strong>Auto Accept:</strong> {orderSettings.autoAccept ? 'Yes' : 'No'}</div>
            <div><strong>Prep Time:</strong> {orderSettings.preparationTime} min</div>
            <div><strong>Min Delivery Order:</strong> {formatCurrency(orderSettings.minOrderDelivery)}</div>
            <div><strong>Allow Special Requests:</strong> {orderSettings.allowSpecialRequests ? 'Yes' : 'No'}</div>
          </div>
          <button 
            onClick={() => testUpdateSetting('ordering.order_prep_buffer_min', 20)}
            className="mt-3 px-3 py-1 bg-indigo-500 text-white rounded text-sm"
          >
            Test: Change Prep Time to 20 min
          </button>
        </div>

        {/* Delivery Settings */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">🚚 Delivery Settings</h2>
          <div className="space-y-2 text-sm">
            <div><strong>Enabled:</strong> {deliverySettings.enabled ? 'Yes' : 'No'}</div>
            <div><strong>Base Fee:</strong> {formatCurrency(deliverySettings.baseFee)}</div>
            <div><strong>Per KM Fee:</strong> {formatCurrency(deliverySettings.perKmFee)}</div>
            <div><strong>Max Distance:</strong> {deliverySettings.maxDistanceKm} km</div>
            <div><strong>Estimated Time:</strong> {deliverySettings.estimatedMin} min</div>
          </div>
          <button 
            onClick={() => testUpdateSetting('delivery.base_fee', 120)}
            className="mt-3 px-3 py-1 bg-orange-500 text-white rounded text-sm"
          >
            Test: Change Base Fee to {getCurrencySymbol()} 120
          </button>
        </div>

        {/* Currency Test */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">💰 Currency Formatting Test</h2>
          <div className="space-y-2 text-sm">
            <div><strong>100:</strong> {formatCurrency(100)}</div>
            <div><strong>1500:</strong> {formatCurrency(1500)}</div>
            <div><strong>25000:</strong> {formatCurrency(25000)}</div>
            <div><strong>Symbol Only:</strong> {getCurrencySymbol()}</div>
          </div>
        </div>

      </div>

      {/* Raw Settings Debug */}
      <div className="mt-8 bg-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">🔍 Raw Settings (Debug)</h2>
        <pre className="text-xs overflow-auto max-h-60">
          {JSON.stringify(settings, null, 2)}
        </pre>
      </div>

    </div>
  );
};

export default SettingsTest;