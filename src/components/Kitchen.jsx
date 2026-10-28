import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase';

function Kitchen() {

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // get data from Supabase
    const fetchOrders = async () => {
        setLoading(true);

        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (*)
            `)
            .in('status', ['new', 'in_prep', 'ready'])
            .order('created_at', { ascending: true });

        if (!error) {
            setOrders(data || []);
        }

        setLoading(false);
    };


    const playAlertSound = () => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, audioCtx.currentTime); // Beep tone

            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + 0.5);
        } catch (err) {
            console.log("Audio error:", err);
        }
    };
    //websocket
    useEffect(() => {
        fetchOrders();

        const channel = supabase
            .channel('kds-realtime-channel')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders' },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        playAlertSound();
                    }
                    fetchOrders();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const updateStatus = async (orderId, newStatus) => {
        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId);

        if (!error) {
            fetchOrders();
        }
    };

    ///////////// UI //////////////
    if (loading) {
        return <div className="p-8 text-center text-slate-400 font-bold">KDS Yuklanmoqda...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
            {/* Header */}
            <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-2xl font-black text-white">KITCHEN DISPLAY SYSTEM</h1>
                    <p className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                        ● Real-time Live
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-3xl font-extrabold text-slate-400">{orders.length}</span>
                    <span className="text-xs text-slate-500 block font-semibold">Active Orders</span>
                </div>
            </header>

            {/* Orders Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orders.map((order) => {
                    const isNew = order.status === 'new';
                    const isInPrep = order.status === 'in_prep';

                    return (
                        <div
                            key={order.id}
                            className={`bg-slate-800 rounded-2xl border-2 p-5 flex flex-col justify-between ${isNew ? 'border-red-500 animate-pulse' : isInPrep ? 'border-amber-500' : 'border-emerald-500'
                                }`}
                        >
                            <div>
                                {/* Order Info Header */}
                                <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-3">
                                    <span className="text-xs font-black uppercase px-2 py-0.5 rounded bg-slate-700 text-sky-400">
                                        {order.order_type === 'dine_in' ? `Stol #${order.table_number}` : 'TAKEAWAY'}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>

                                {/* Order Items List */}
                                <div className="space-y-2 mb-4">
                                    {order.order_items?.map((item) => (
                                        <div key={item.id} className="flex justify-between text-sm">
                                            <span className="font-bold text-white mr-2">{item.quantity}x</span>
                                            <span className="flex-1 text-slate-300">{item.item_name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Status Change Action Buttons */}
                            <div className="pt-3 border-t border-slate-700">
                                {isNew && (
                                    <button
                                        onClick={() => updateStatus(order.id, 'in_prep')}
                                        className="w-full bg-amber-500 text-slate-950 font-black py-2 rounded-xl text-sm"
                                    >
                                        START PREPARING
                                    </button>
                                )}

                                {isInPrep && (
                                    <button
                                        onClick={() => updateStatus(order.id, 'ready')}
                                        className="w-full bg-emerald-500 text-slate-950 font-black py-2 rounded-xl text-sm"
                                    >
                                        MARK AS READY
                                    </button>
                                )}

                                {order.status === 'ready' && (
                                    <button
                                        onClick={() => updateStatus(order.id, 'completed')}
                                        className="w-full bg-slate-700 text-slate-300 font-bold py-2 rounded-xl text-sm"
                                    >
                                        COMPLETE & CLEAR
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default Kitchen