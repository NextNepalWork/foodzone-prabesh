import React from 'react';

const MobileOrderCard = ({ order, onClearTable, onCompleteOrder, formatDate, getTotalOrderValue }) => {
  const isDelivery = order.order_type === 'delivery';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-3">
      {/* Compact Header */}
      <div className="p-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
              isDelivery ? 'bg-green-500' : 'bg-blue-500'
            }`}>
              {isDelivery ? '🚚' : order.table_id}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-gray-900 text-sm truncate">
                  {isDelivery ? 'Delivery' : `Table ${order.table_id}`}
                </h3>
                <span className="text-xs text-gray-500">#{order.order_number || order.id}</span>
              </div>
              <p className="text-xs text-gray-600 truncate">{order.customer_name}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className={`text-lg font-bold ${isDelivery ? 'text-green-600' : 'text-orange-600'}`}>
              NPR {getTotalOrderValue(order.items, order.total)}/-
            </div>
            <p className="text-xs text-gray-500">{formatDate(order.created_at)}</p>
          </div>
        </div>

        {/* Status and Action Row */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center space-x-1">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              order.status === 'pending' 
                ? 'bg-orange-100 text-orange-700' 
                : 'bg-green-100 text-green-700'
            }`}>
              {order.status || 'pending'}
            </span>
            <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full font-medium">
              {order.items?.length || 0} items
            </span>
          </div>
          <button
            onClick={() => isDelivery ? onCompleteOrder?.(order.id) : onClearTable?.(order.table_id)}
            className={`px-3 py-1 rounded-md text-xs font-medium text-white transition-colors ${
              isDelivery 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {isDelivery ? 'Complete' : 'Clear'}
          </button>
        </div>
      </div>

      {/* Delivery Address - Compact */}
      {isDelivery && order.delivery_address && (
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
          <p className="text-xs text-gray-600 mb-1">📍 Address:</p>
          <p className="text-xs text-gray-800 leading-relaxed">{order.delivery_address}</p>
        </div>
      )}

      {/* Order Items - Compact List */}
      <div className="p-3">
        <div className="space-y-2">
          {order.items?.map((item, index) => (
            <div key={index} className="flex items-center justify-between py-1">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-800 truncate">{item.name}</span>
                {item.isCustom && (
                  <span className="bg-yellow-100 text-yellow-700 text-xs px-1.5 py-0.5 rounded font-medium">
                    Custom
                  </span>
                )}
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <div className="text-xs text-gray-600">Qty: {item.quantity}</div>
                {!item.isCustom && (
                  <div className="text-sm font-semibold text-gray-800">
                    NPR {(item.price * item.quantity)}/-
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MobileOrderCard;
