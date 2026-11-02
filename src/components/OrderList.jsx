import React from 'react';

function OrderList({ orders, handleUpdateStatus, t }) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 mb-8 shadow-sm font-sans">
            <h2 className="text-base font-black text-slate-800 uppercase mb-4">
                {t.activeOrders} ({orders.length})
            </h2>

            <div className="space-y-3">
                {orders.map((order) => (
                    <div key={order.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 text-sm">
                                    {order.order_type === 'dine_in'
                                        ? `${t.table}${order.table_number}`
                                        : order.order_type === 'pickup'
                                            ? t.takeaway
                                            : t.booking}
                                </span>
                                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-extrabold uppercase">
                                    {order.order_type === 'dine_in' ? t.dineIn : order.order_type === 'pickup' ? t.takeaway : t.booking}
                                </span>
                            </div>
                            <span className="text-xs text-slate-400 block mt-1">
                                Status: <strong className="text-slate-700 uppercase">{order.status}</strong>
                            </span>
                        </div>

                        <div className="text-right">
                            <span className="font-black text-slate-900 text-base block">
                                €{Number(order.total_price || 0).toFixed(2)}
                            </span>
                            {order.status !== 'completed' && (
                                <button
                                    onClick={() => handleUpdateStatus(order.id, 'completed')}
                                    className="mt-1 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg hover:bg-emerald-600 transition"
                                >
                                    {t.completeBtn} (Completed)
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default OrderList;