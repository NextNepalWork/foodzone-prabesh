import React, { useState } from 'react';
import OrdersManagement from '../premium/OrdersManagement';
import PaymentMethodModal from '../PaymentMethodModal';
import EditOrderModal from './EditOrderModal';
import { fetchApi } from '../../services/apiService';

// The operational orders board for the front desk — the same component the
// admin panel uses, with the handlers implemented against staff-permitted
// endpoints so a Receptionist login can run the whole flow.
const PosOrdersTab = ({ refreshTrigger, onRefresh, menuItems, currency, onToast }) => {
  const [payingOrder, setPayingOrder] = useState(null); // { orderId, amount }
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { orderId, orderNumber }
  const [editingOrder, setEditingOrder] = useState(null); // full order object

  const handleCompleteOrder = async (orderId) => {
    try {
      const res = await fetchApi.get(`/api/orders/${orderId}`);
      const order = res?.order || res;
      if (!order?.id) throw new Error('Order not found');
      setPayingOrder({ orderId, amount: order.total || order.total_amount || 0 });
    } catch (err) {
      onToast?.(`Could not load order: ${err.message}`, 'error');
    }
  };

  // Order flow: PAY marks completed+paid (server writes daybook in the same
  // call), then a best-effort payments row is recorded.
  const handlePaymentConfirm = async (paymentMethod) => {
    const { orderId, amount } = payingOrder;
    try {
      await fetchApi.put(`/api/orders/${orderId}/status`, {
        status: 'completed',
        payment_status: 'paid',
        payment_method: paymentMethod,
      });
      try {
        await fetchApi.post('/api/payments', {
          order_id: orderId,
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          payment_status: 'paid',
          transaction_id: `POS-${Date.now()}`,
          notes: `Payment collected at POS via ${paymentMethod}`,
          skip_daybook: true,
        });
      } catch (payErr) {
        console.warn('payments insert failed (order already marked paid):', payErr?.message);
      }
      setPayingOrder(null);
      onToast?.('Payment recorded — order completed', 'success');
      onRefresh?.();
    } catch (err) {
      onToast?.(`Failed to complete order: ${err.message}`, 'error');
    }
  };

  const handleClearTable = async (tableId) => {
    try {
      await fetchApi.post(`/api/clear-table/${tableId}`, {});
      onToast?.(`Table ${tableId} cleared`);
      onRefresh?.();
    } catch (err) {
      onToast?.(`Failed to clear table: ${err.message}`, 'error');
    }
  };

  const confirmDelete = async () => {
    const { orderId, orderNumber } = deleteConfirm;
    try {
      const result = await fetchApi.delete(`/api/order/${orderId}`);
      if (!result?.success) throw new Error(result?.message || 'Unknown error');
      onToast?.(`Order ${orderNumber} deleted`);
      onRefresh?.();
    } catch (err) {
      onToast?.(`Failed to delete order: ${err.message}`, 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="h-full min-h-0">
      <OrdersManagement
        refreshTrigger={refreshTrigger}
        onCompleteOrder={handleCompleteOrder}
        onClearTable={handleClearTable}
        onDeleteOrder={(orderId, orderNumber) => setDeleteConfirm({ orderId, orderNumber })}
        onEditOrder={(order) => setEditingOrder(order)}
      />

      {payingOrder && (
        <PaymentMethodModal
          isOpen={true}
          onClose={() => setPayingOrder(null)}
          onConfirm={handlePaymentConfirm}
          orderAmount={payingOrder.amount}
          orderId={payingOrder.orderId}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
            <h3 className="text-[16px] font-extrabold text-slate-900 mb-1">Delete order {deleteConfirm.orderNumber}?</h3>
            <p className="text-[13px] text-slate-600 mb-4">
              This permanently removes the order and its payment records. There is no undo.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 h-11 rounded-xl bg-slate-100 text-slate-700 font-semibold text-[14px] hover:bg-slate-200">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-[14px]">Delete</button>
            </div>
          </div>
        </div>
      )}

      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          menuItems={menuItems}
          currency={currency}
          onClose={() => setEditingOrder(null)}
          onSaved={() => {
            setEditingOrder(null);
            onToast?.('Order updated — kitchen sees the new items', 'success');
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
};

export default PosOrdersTab;
