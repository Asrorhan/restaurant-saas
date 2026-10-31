import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function RemoteOrder() {
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);

    const [orderType, setOrderType] = useState('booking'); // 'booking' | 'pickup' | 'delivery'
    const [paymentMethod, setPaymentMethod] = useState('counter');

    // LocalStorage orqali ma'lumotlarni avto-to'ldirish
    const [name, setName] = useState(() => localStorage.getItem('cust_name') || '');
    const [phone, setPhone] = useState(() => localStorage.getItem('cust_phone') || '');
    const [address, setAddress] = useState(() => localStorage.getItem('cust_addr') || '');
    const [aptCode, setAptCode] = useState(() => localStorage.getItem('cust_apt') || '');
    const [bookingHour, setBookingHour] = useState('18:00');

    const deliveryFee = orderType === 'delivery' ? 2.50 : 0;

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        setPaymentMethod(orderType === 'delivery' ? 'cash' : 'counter');
    }, [orderType]);

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
        if (!name) return alert('Ismingizni kiriting!');
        if (orderType === 'delivery' && (!phone || !address)) {
            return alert('Delivery uchun telefon va manzil shart!');
        }
        if (cart.length === 0 && orderType !== 'booking') return alert('Savatchangiz bo\'sh!');

        setSubmitting(true);

        // Ma'lumotlarni kelajak uchun brauzerga saqlab qo'yish
        localStorage.setItem('cust_name', name);
        localStorage.setItem('cust_phone', phone);
        localStorage.setItem('cust_addr', address);
        localStorage.setItem('cust_apt', aptCode);

        const fullAddr = orderType === 'delivery'
            ? `Ism: ${name} | Tel: ${phone} | Manzil: ${address} | Kv/Kod: ${aptCode || 'Yo\'q'}`
            : `Ism: ${name} ${orderType === 'booking' ? `| Soat: ${bookingHour}` : ''}`;

        const total = cart.reduce((s, i) => s + i.price * i.quantity, 0) + deliveryFee;

        const { data: order, error } = await supabase.from('orders').insert([{
            tenant_id: categories[0]?.tenant_id,
            order_type: orderType,
            table_number: 0,
            status: 'new',
            total_price: total,
            delivery_fee: deliveryFee,
            delivery_address: fullAddr,
            payment_method: paymentMethod,
            payment_status: paymentMethod === 'revolut' ? 'pending' : 'pay_on_site'
        }]).select().single();

        if (!error && cart.length > 0) {
            const items = cart.map((i) => ({
                order_id: order.id,
                menu_item_id: i.id,
                price_at_time: i.price,
                quantity: i.quantity
            }));
            await supabase.from('order_items').insert(items);
        }

        setSubmitting(false);
        setOrderSuccess(true);
        setCart([]);
    };

    const filteredItems = selectedCategory === 'all'
        ? menuItems
        : menuItems.filter((i) => i.category_id === selectedCategory);

    if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Yuklanmoqda...</div>;

    if (orderSuccess) {
        return (
            <div className="max-w-md mx-auto p-6 text-center font-sans mt-12 bg-white rounded-3xl shadow-lg border">
                <h2 className="text-xl font-black text-emerald-600 mb-2">🎉 Buyurtmangiz qabul qilindi!</h2>
                <button onClick={() => setOrderSuccess(false)} className="w-full bg-slate-900 text-white py-3 rounded-2xl text-sm font-bold mt-4">
                    Yangi buyurtma
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto bg-slate-50 min-h-screen p-4 font-sans pb-36">
            <h1 className="text-xl font-black text-slate-800 mb-3">Online Restoran</h1>

            {/* Mode Switcher */}
            <div className="bg-slate-200 p-1 rounded-2xl flex gap-1 mb-4">
                {['booking', 'pickup', 'delivery'].map((type) => (
                    <button
                        key={type}
                        onClick={() => setOrderType(type)}
                        className={`flex-1 py-2 rounded-xl text-xs font-black capitalize transition ${orderType === type ? 'bg-slate-900 text-white shadow' : 'text-slate-600'
                            }`}
                    >
                        {type === 'booking' ? '📅 Booking' : type === 'pickup' ? '🛍️ Takeaway' : '🛵 Delivery'}
                    </button>
                ))}
            </div>

            {/* Customer Form */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2 mb-4 text-xs">
                <input
                    type="text"
                    placeholder="Ismingiz *"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none font-semibold"
                />

                {orderType === 'booking' && (
                    <div className="flex items-center gap-2 pt-1">
                        <span className="font-bold text-slate-600">Soat:</span>
                        <select
                            value={bookingHour}
                            onChange={(e) => setBookingHour(e.target.value)}
                            className="flex-1 p-2 bg-slate-50 border rounded-xl font-bold"
                        >
                            {['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'].map((h) => (
                                <option key={h} value={h}>{h}</option>
                            ))}
                        </select>
                    </div>
                )}

                {orderType === 'delivery' && (
                    <>
                        <input
                            type="tel"
                            placeholder="Tel raqamingiz *"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none font-semibold"
                        />
                        <input
                            type="text"
                            placeholder="Ko'cha va Bino manzili *"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none font-semibold"
                        />
                        <input
                            type="text"
                            placeholder="Kvartira / Domofon kodi"
                            value={aptCode}
                            onChange={(e) => setAptCode(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none font-semibold"
                        />
                    </>
                )}

                {/* Payment Methods */}
                <div className="flex gap-2 pt-1">
                    <button
                        onClick={() => setPaymentMethod(orderType === 'delivery' ? 'cash' : 'counter')}
                        className={`flex-1 py-2 rounded-xl border font-bold ${paymentMethod !== 'revolut' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600'
                            }`}
                    >
                        {orderType === 'delivery' ? '💵 Naqd pul' : '🏢 Kassada'}
                    </button>
                    <button
                        onClick={() => setPaymentMethod('revolut')}
                        className={`flex-1 py-2 rounded-xl border font-bold ${paymentMethod === 'revolut' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600'
                            }`}
                    >
                        💳 Revolut Pay
                    </button>
                </div>
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
                <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${selectedCategory === 'all' ? 'bg-slate-900 text-white' : 'bg-white border text-slate-600'
                        }`}
                >
                    Barchasi
                </button>
                {categories.map((c) => (
                    <button
                        key={c.id}
                        onClick={() => setSelectedCategory(c.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${selectedCategory === c.id ? 'bg-slate-900 text-white' : 'bg-white border text-slate-600'
                            }`}
                    >
                        {c.name}
                    </button>
                ))}
            </div>

            {/* Menu Items */}
            <div className="space-y-2">
                {filteredItems.map((item) => {
                    const cartItem = cart.find((i) => i.id === item.id);
                    return (
                        <div key={item.id} className="p-3 bg-white rounded-2xl border flex justify-between items-center shadow-sm">
                            <div>
                                <h4 className="font-bold text-slate-800 text-xs">{item.name}</h4>
                                <span className="text-xs font-black text-slate-900 block">€{Number(item.price).toFixed(2)}</span>
                            </div>
                            {cartItem ? (
                                <div className="flex items-center gap-2 bg-slate-900 text-white rounded-xl px-2 py-1">
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

            {/* Floating Bottom Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 max-w-md mx-auto shadow-2xl">
                <div className="flex justify-between items-center text-xs font-bold mb-2">
                    <span>Jami:</span>
                    <span className="text-base font-black">
                        €{(cart.reduce((s, i) => s + i.price * i.quantity, 0) + deliveryFee).toFixed(2)}
                    </span>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full bg-emerald-600 disabled:bg-slate-300 text-white font-bold py-3 rounded-2xl text-sm"
                >
                    {submitting ? 'Yuborilmoqda...' : 'Tasdiqlash ➔'}
                </button>
            </div>
        </div>
    );
}