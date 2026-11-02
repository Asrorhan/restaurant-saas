import React from 'react';

function OrderStats({ totalRevenue, totalOrdersCount, commisionRate, myCommission, dineInOrders, takeawayOrders, t }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 font-sans">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400 block uppercase">
                    {t.totalRevenue}
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">€{Number(totalRevenue || 0).toFixed(2)}</span>
                <span className="text-[10px] text-slate-500 mt-1 block">
                    {totalOrdersCount} {t.cartItemsCount}
                </span>
            </div>

            <div className="bg-emerald-500 text-white p-4 rounded-2xl shadow-sm">
                <span className="text-xs font-bold text-emerald-100 block uppercase">
                    Service fee ({commisionRate}%)
                </span>
                <span className="text-2xl font-black text-white mt-1 block">€{myCommission}</span>
                <span className="text-[10px] text-emerald-100 mt-1 block">
                    {t.serviceFee}
                </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400 block uppercase">
                    {t.dineIn}
                </span>
                <span className="text-2xl font-black text-slate-800 mt-1 block">{dineInOrders}</span>
                <span className="text-[10px] text-slate-500 mt-1 block">
                    QR-code
                </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400 block uppercase">
                    {t.takeaway}
                </span>
                <span className="text-2xl font-black text-slate-800 mt-1 block">{takeawayOrders}</span>
                <span className="text-[10px] text-slate-500 mt-1 block">
                    {t.takeaway}
                </span>
            </div>
        </div>
    );
}

export default OrderStats;