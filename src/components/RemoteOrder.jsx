import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

function RemoteOrder() {
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);

    const [orderType, setOrderType] = useState('booking');
    const [paymentMethod, setPaymentMethod] = useState('counter');

    const [name, setName] = useState(() => localStorage.getItem('cust_name') || '');
    const [bookingHour, setBookingHour] = useState('');

    const getTimeSlots = () => {
        const now = new Date();
        const dayOfWeek = now.getDay();

        const startHour = 10;
        const endHour = dayOfWeek === 0 ? 18 : 22;

        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        const slots = [];
        for (let h = startHour; h < endHour; h++) {
            for (let m of [0, 15, 30, 45]) {
                if (h > currentHour || (h === currentHour && m > currentMinute + 10)) {
                    const hStr = String(h).padStart(2, '0');
                    const mStr = String(m).padStart(2, '0');
                    slots.push(`${hStr}:${mStr}`);
                }
            }
        }
        return slots;
    };

    const timeSlots = getTimeSlots();

    useEffect(() => {
        if (timeSlots.length > 0 && !bookingHour) {
            setBookingHour(timeSlots[0]);
        }
    }, [timeSlots]);

    useEffect(() => {
        fetchData();

        const menuChannel = supabase
            .channel('remote-menu-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => fetchData())
            .subscribe();

        return () => {
            supabase.removeChannel(menuChannel);
        };
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: cat } = await supabase.from('categories').select('*');
        const { data: items } = await supabase.from('menu_items').select('*').eq('is_available', true);
        if (cat) setCategories(cat);
        if (items) setMenuItems(items);
        setLoading(false);
    };

    const updateCart = (item, delta) => {
        setCart((prev) => {
            const existing = prev.find((i) => i.id === item.id);
            if (!existing && delta > 0) return [...prev, { ...item, quantity: 1 }];
            return prev
                .map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + delta } : i))
                .filter((i) => i.quantity > 0);
        });
    };

    const handleSubmit = async () => {
        if (!name.trim()) return alert('Iltimos, ismingizni kiriting!');
        if (!bookingHour) return alert('Restoran hozir yopiq yoki mos vaqt mavjud emas!');
        if (cart.length === 0 && orderType !== 'booking') return alert("Savatchangiz bo'sh!");

        const tenantId = categories[0]?.tenant_id || menuItems[0]?.tenant_id;
        if (!tenantId) return alert("Restoran ID si yuklanmadi, sahifani qayta yangilang!");

        setSubmitting(true);
        localStorage.setItem('cust_name', name);

        const fullInfo = `Ism: ${name} | Vaqt: ${bookingHour} (${orderType === 'booking' ? 'Booking' : 'Takeaway'})`;
        const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

        const { data: order, error } = await supabase.from('orders').insert([{
            tenant_id: tenantId,
            order_type: orderType,
            table_number: 0,
            status: 'new',
            total_price: total,
            delivery_fee: 0,
            delivery_address: fullInfo,
            payment_method: paymentMethod,
            payment_status: paymentMethod === 'revolut' ? 'pending' : 'pay_on_site'
        }]).select().single();

        if (error) {
            setSubmitting(false);
            return alert("Buyurtma yuborishda xatolik bo'ldi: " + error.message);
        }

        if (cart.length > 0) {
            const items = cart.map((i) => ({
                order_id: order.id,
                menu_item_id: i.id,
                item_name: i.name,
                unit_price: i.price,
                price_at_time: i.price,
                quantity: i.quantity
            }));
            const { error: itemsError } = await supabase.from('order_items').insert(items);
            if (itemsError) {
                console.error("Order items insert error:", itemsError);
            }
        }

        setSubmitting(false);
        setOrderSuccess(true);
        setCart([]);
    };

    const categoryOrder = categories.reduce((acc, cat, index) => {
        acc[cat.id] = index;
        return acc;
    }, {});

    const sortedItems = [...menuItems].sort(
        (a, b) => (categoryOrder[a.category_id] ?? 999) - (categoryOrder[b.category_id] ?? 999)
    );

    const filteredItems = selectedCategory === 'all'
        ? sortedItems
        : sortedItems.filter((item) => item.category_id === selectedCategory);

    if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Menu yuklanmoqda...</div>;

    if (orderSuccess) {
        return (
            <div className="max-w-md mx-auto p-6 text-center font-sans mt-12 bg-white rounded-3xl shadow-lg border">
                <h2 className="text-xl font-black text-emerald-600 mb-2">🎉 Buyurtmangiz qabul qilindi!</h2>
                <p className="text-xs text-slate-500 font-medium mb-4">Sizni restoranimizda kutib qolamiz.</p>
                <button onClick={() => setOrderSuccess(false)} className="w-full bg-slate-900 text-white py-3 rounded-2xl text-sm font-bold">
                    Yangi buyurtma
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto bg-slate-50 min-h-screen p-4 font-sans pb-36">
            <h1 className="text-xl font-black text-slate-800 mb-3">Online Restoran</h1>

            <div className="bg-slate-200 p-1 rounded-2xl flex gap-1 mb-4">
                <button
                    onClick={() => setOrderType('booking')}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition ${orderType === 'booking' ? 'bg-slate-900 text-white shadow' : 'text-slate-600'
                        }`}
                >
                    📅 Booking
                </button>
                <button
                    onClick={() => setOrderType('pickup')}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition ${orderType === 'pickup' ? 'bg-slate-900 text-white shadow' : 'text-slate-600'
                        }`}
                >
                    🛍️ Takeaway
                </button>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-3 mb-4 text-xs shadow-sm">
                <input
                    type="text"
                    placeholder="Ismingiz *"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none font-semibold text-slate-800"
                />

                <div className="flex items-center gap-2 pt-1 border-t">
                    <span className="font-bold text-slate-600">
                        {orderType === 'booking' ? 'Kelish vaqti:' : 'Olib ketish vaqti:'}
                    </span>
                    {timeSlots.length > 0 ? (
                        <select
                            value={bookingHour}
                            onChange={(e) => setBookingHour(e.target.value)}
                            className="flex-1 p-2 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none"
                        >
                            {timeSlots.map((slot) => (
                                <option key={slot} value={slot}>
                                    {slot}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <span className="text-xs font-bold text-rose-500">Restoran bugun yopiq</span>
                    )}
                </div>

                <div className="flex gap-2 pt-1 border-t">
                    <button
                        onClick={() => setPaymentMethod('counter')}
                        className={`flex-1 py-2 rounded-xl border font-bold transition ${paymentMethod === 'counter' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600'
                            }`}
                    >
                        🏢 Kassada to'lash
                    </button>
                    <button
                        onClick={() => setPaymentMethod('revolut')}
                        className={`flex-1 py-2 rounded-xl border font-bold transition ${paymentMethod === 'revolut' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600'
                            }`}
                    >
                        💳 Revolut Pay
                    </button>
                </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
                <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${selectedCategory === 'all' ? 'bg-slate-900 text-white' : 'bg-white border text-slate-600'
                        }`}
                >
                    Barchasi
                </button>
                {categories.map((c) => (
                    <button
                        key={c.id}
                        onClick={() => setSelectedCategory(c.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${selectedCategory === c.id ? 'bg-slate-900 text-white' : 'bg-white border text-slate-600'
                            }`}
                    >
                        {c.name}
                    </button>
                ))}
            </div>

            <div className="space-y-2">
                {filteredItems.map((item) => {
                    const cartItem = cart.find((i) => i.id === item.id);
                    return (
                        <div key={item.id} className="p-3 bg-white rounded-2xl border flex justify-between items-center shadow-sm">
                            <div className="flex items-center gap-3">
                                {item.image_url ? (
                                    <img
                                        src={item.image_url}
                                        alt={item.name}
                                        className="w-12 h-12 object-cover rounded-xl border border-slate-100 flex-shrink-0"
                                    />
                                ) : (
                                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                                        🍽️
                                    </div>
                                )}
                                <div>
                                    <h4 className="font-bold text-slate-800 text-xs">{item.name}</h4>
                                    <span className="text-xs font-black text-slate-900 block mt-0.5">
                                        €{Number(item.price).toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {cartItem ? (
                                <div className="flex items-center gap-2 bg-slate-900 text-white rounded-xl px-2.5 py-1">
                                    <button onClick={() => updateCart(item, -1)} className="font-bold">-</button>
                                    <span className="text-xs font-bold">{cartItem.quantity}</span>
                                    <button onClick={() => updateCart(item, 1)} className="font-bold">+</button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => updateCart(item, 1)}
                                    className="bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl"
                                >
                                    + Qo'shish
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 max-w-md mx-auto shadow-2xl">
                <div className="flex justify-between items-center text-xs font-bold mb-2">
                    <span>Jami ({cart.reduce((s, i) => s + i.quantity, 0)} ta taom):</span>
                    <span className="text-base font-black text-slate-900">
                        €{cart.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)}
                    </span>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full bg-emerald-600 disabled:bg-slate-300 text-white font-bold py-3 rounded-2xl text-sm transition"
                >
                    {submitting ? 'Yuborilmoqda...' : 'Tasdiqlash ➔'}
                </button>
            </div>
        </div>
    );
}

export default RemoteOrder;