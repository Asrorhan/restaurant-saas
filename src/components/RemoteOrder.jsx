import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { translations } from '../translations';

function RemoteOrder() {
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);

    const [orderType, setOrderType] = useState('booking');

    const [name, setName] = useState(() => localStorage.getItem('cust_name') || '');
    const [bookingHour, setBookingHour] = useState('');
    const [lang, setLang] = useState('ru');

    // Filial / Ish vaqti holati
    const [branchData, setBranchData] = useState({ is_open: true, open_time: '09:00', close_time: '23:00', sunday_open_time: '10:00', sunday_close_time: '18:00' });
    const [isRestaurantOpenTime, setIsRestaurantOpenTime] = useState(true);

    const t = translations[lang];

    // Yakshanba kunini hisobga oluvchi vaqt funksiyasi
    const getTimeSlots = () => {
        if (!branchData.is_open) return [];

        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 - Yakshanba

        const startStr = dayOfWeek === 0 ? (branchData.sunday_open_time || '10:00') : (branchData.open_time || '09:00');
        const endStr = dayOfWeek === 0 ? (branchData.sunday_close_time || '18:00') : (branchData.close_time || '23:00');

        const [startH, startM] = startStr.split(':').map(Number);
        const [endH, endM] = endStr.split(':').map(Number);

        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        const slots = [];
        for (let h = startH; h < endH || (h === endH && endM > 0); h++) {
            for (let m of [0, 15, 30, 45]) {
                if (h > endH || (h === endH && m > endM)) break;
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

        const branchChannel = supabase
            .channel('public:branches')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'branches' }, (payload) => {
                if (payload.new && payload.new.id === 1) {
                    setBranchData(payload.new);
                    checkOpenStatus(payload.new);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(menuChannel);
            supabase.removeChannel(branchChannel);
        };
    }, []);

    const checkOpenStatus = (data) => {
        if (!data.is_open) {
            setIsRestaurantOpenTime(false);
            return;
        }

        const now = new Date();
        const dayOfWeek = now.getDay();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const openT = dayOfWeek === 0 ? (data.sunday_open_time || '10:00') : data.open_time;
        const closeT = dayOfWeek === 0 ? (data.sunday_close_time || '18:00') : data.close_time;

        if (currentTime < openT || currentTime > closeT) {
            setIsRestaurantOpenTime(false);
        } else {
            setIsRestaurantOpenTime(true);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        const { data: branchInfo } = await supabase.from('branches').select('*').eq('id', 1).single();
        if (branchInfo) {
            setBranchData(branchInfo);
            checkOpenStatus(branchInfo);
        }

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
        const { data: latestBranch } = await supabase.from('branches').select('*').eq('id', 1).single();

        if (latestBranch) {
            const now = new Date();
            const dayOfWeek = now.getDay();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

            const openT = dayOfWeek === 0 ? (latestBranch.sunday_open_time || '10:00') : latestBranch.open_time;
            const closeT = dayOfWeek === 0 ? (latestBranch.sunday_close_time || '18:00') : latestBranch.close_time;

            const isClosed = !latestBranch.is_open || (currentTime < openT || currentTime > closeT);

            if (isClosed) {
                alert('Restoran hozir yopiq! Buyurtma qabul qilinmaydi.');
                setIsRestaurantOpenTime(false);
                return;
            }
        }

        if (!name.trim()) return alert(t.enterNameAlert);
        if (!bookingHour) return alert(t.closedAlert || 'Vaqt tanlanmagan');
        if (cart.length === 0 && orderType !== 'booking') return alert(t.emptyCartAlert);

        const tenantId = categories[0]?.tenant_id || menuItems[0]?.tenant_id;
        if (!tenantId) return alert(t.closedAlert);

        setSubmitting(true);
        localStorage.setItem('cust_name', name);

        const fullInfo = `Name: ${name} | Time: ${bookingHour} (${orderType === 'booking' ? 'Booking' : 'Takeaway'})`;
        const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

        const { data: order, error } = await supabase.from('orders').insert([{
            tenant_id: tenantId,
            order_type: orderType,
            table_number: 0,
            status: 'new',
            total_price: total,
            delivery_fee: 0,
            delivery_address: fullInfo,
            payment_method: 'counter',
            payment_status: 'pay_on_site'
        }]).select().single();

        if (error) {
            setSubmitting(false);
            return alert(`${t.errorOccurred} ${error.message}`);
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

    if (loading) return <div className="p-8 text-center text-slate-500 font-bold">...</div>;

    if (orderSuccess) {
        return (
            <div className="max-w-md mx-auto p-6 text-center font-sans mt-12 bg-white rounded-3xl shadow-lg border">
                <h2 className="text-xl font-black text-emerald-600 mb-2">{t.orderSuccessTitle}</h2>
                <p className="text-xs text-slate-500 font-medium mb-4">{t.orderSuccessSub}</p>
                <button onClick={() => setOrderSuccess(false)} className="w-full bg-slate-900 text-white py-3 rounded-2xl text-sm font-bold">
                    {t.newOrderBtn}
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto bg-slate-50 min-h-screen p-4 font-sans pb-36">
            <div className="flex justify-end gap-1 mb-2">
                {['ru', 'lv', 'en', 'uz'].map((l) => (
                    <button
                        key={l}
                        onClick={() => setLang(l)}
                        className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase border transition ${lang === l ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                        {l}
                    </button>
                ))}
            </div>

            <h1 className="text-xl font-black text-slate-800 mb-3">{t.title}</h1>

            {!isRestaurantOpenTime && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-2xl mb-4 text-xs font-bold text-center">
                    {t.closedBanner} {new Date().getDay() === 0 ? `${branchData.sunday_open_time} - ${branchData.sunday_close_time}` : `${branchData.open_time} - ${branchData.close_time}`}.
                </div>
            )}

            <div className="bg-slate-200 p-1 rounded-2xl flex gap-1 mb-4">
                <button
                    onClick={() => setOrderType('booking')}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition ${orderType === 'booking' ? 'bg-slate-900 text-white shadow' : 'text-slate-600'}`}
                >
                    {t.booking}
                </button>
                <button
                    onClick={() => setOrderType('pickup')}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition ${orderType === 'pickup' ? 'bg-slate-900 text-white shadow' : 'text-slate-600'}`}
                >
                    {t.takeaway}
                </button>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-3 mb-4 text-xs shadow-sm">
                <input
                    type="text"
                    placeholder={t.namePlaceholder}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none font-semibold text-slate-800"
                />

                <div className="flex items-center gap-2 pt-1 border-t">
                    <span className="font-bold text-slate-600">
                        {orderType === 'booking' ? t.arrivalTime : t.pickupTime}
                    </span>
                    {isRestaurantOpenTime && timeSlots.length > 0 ? (
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
                        <span className="text-xs font-bold text-rose-500">{t.restaurantClosed || 'Yopiq'}</span>
                    )}
                </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
                <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${selectedCategory === 'all' ? 'bg-slate-900 text-white' : 'bg-white border text-slate-600'}`}
                >
                    {t.allCategories}
                </button>
                {categories.map((c) => (
                    <button
                        key={c.id}
                        onClick={() => setSelectedCategory(c.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${selectedCategory === c.id ? 'bg-slate-900 text-white' : 'bg-white border text-slate-600'}`}
                    >
                        {t.categories?.[c.name] || c.name}
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
                                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{item.description}</p>
                                    <span className="text-xs font-black text-slate-900 block mt-1">
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
                                    disabled={!isRestaurantOpenTime}
                                    className="bg-emerald-500 disabled:bg-slate-300 text-white text-xs font-bold px-3 py-1.5 rounded-xl"
                                >
                                    {t.addToCart}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 max-w-md mx-auto shadow-2xl">
                <div className="flex justify-between items-center text-xs font-bold mb-2">
                    <span>{t.total} ({cart.reduce((s, i) => s + i.quantity, 0)} {t.cartItemsCount}):</span>
                    <span className="text-base font-black text-slate-900">
                        €{cart.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)}
                    </span>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={submitting || !isRestaurantOpenTime}
                    className="w-full bg-emerald-600 disabled:bg-slate-300 text-white font-bold py-3 rounded-2xl text-sm transition"
                >
                    {submitting ? t.submitting : `${t.confirmOrder}`}
                </button>
            </div>
        </div>
    );
}

export default RemoteOrder;