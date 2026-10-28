import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function Menu() {
    const [categories, setCategories] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);

    // URL'dan stol raqamini olish (?table=4)
    const queryParams = new URLSearchParams(window.location.search);
    const tableNumber = queryParams.get('table') || '1';

    // Servis turi: dine_in (shu yerda) yoki takeaway (olib ketish)
    const [orderType, setOrderType] = useState('dine_in');

    useEffect(() => {
        fetchMenuData();
    }, []);

    const fetchMenuData = async () => {
        setLoading(true);
        const { data: catData } = await supabase.from('categories').select('*');
        if (catData) setCategories(catData);

        const { data: itemData } = await supabase.from('menu_items').select('*').eq('is_available', true);
        if (itemData) setMenuItems(itemData);
        setLoading(false);
    };

    const addToCart = (item) => {
        setCart((prev) => {
            const existing = prev.find((i) => i.id === item.id);
            if (existing) {
                return prev.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...item, quantity: 1 }];
        });
    };

    const removeFromCart = (itemId) => {
        setCart((prev) =>
            prev
                .map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i))
                .filter((i) => i.quantity > 0)
        );
    };

    const submitOrder = async () => {
        if (cart.length === 0) return alert("Savatchangiz bo'sh!");

        const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const tenantId = categories[0]?.tenant_id || menuItems[0]?.tenant_id;

        // 1. Orders jadvaliga saqlash
        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert([
                {
                    tenant_id: tenantId,
                    order_type: orderType,
                    table_number: parseInt(tableNumber),
                    status: 'new',
                    total_price: totalPrice
                }
            ])
            .select()
            .single();

        if (orderError) return alert("Buyurtma yuborishda xatolik bo'ldi!");

        // 2. Order_items jadvaliga saqlash
        const orderItemsData = cart.map((item) => ({
            order_id: orderData.id,
            item_name: item.name,
            unit_price: item.price,
            quantity: item.quantity
        }));

        const { error: itemsError } = await supabase.from('order_items').insert(orderItemsData);

        if (!itemsError) {
            alert("Buyurtmangiz qabul qilindi!");
            setCart([]);
        }
    };

    const filteredItems = selectedCategory === 'all'
        ? menuItems
        : menuItems.filter((item) => item.category_id === selectedCategory);

    if (loading) {
        return <div className="p-8 text-center text-slate-500 font-bold">Menyu yuklanmoqda...</div>;
    }

    return (
        <div className="max-w-md mx-auto bg-slate-50 min-h-screen p-4 font-sans pb-32">
            {/* Header */}
            <div className="mb-4 border-b pb-3">
                <h1 className="text-2xl font-black text-slate-800">Chayhana Menu</h1>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-bold inline-block mt-1">
                    Stol #{tableNumber}
                </span>
            </div>

            {/* Dine-in vs Takeaway Switcher */}
            <div className="bg-slate-200 p-1 rounded-2xl flex mb-6">
                <button
                    onClick={() => setOrderType('dine_in')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black transition ${orderType === 'dine_in' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                        }`}
                >
                    🍽️ Shu yerda yeyish
                </button>
                <button
                    onClick={() => setOrderType('takeaway')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black transition ${orderType === 'takeaway' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                        }`}
                >
                    🛍️ Olib ketish
                </button>
            </div>

            {/* Categories Bar */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-4 no-scrollbar">
                <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${selectedCategory === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border'
                        }`}
                >
                    Barchasi
                </button>
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${selectedCategory === cat.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border'
                            }`}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* Menu Items Grid */}
            <div className="space-y-3">
                {filteredItems.map((item) => {
                    const cartItem = cart.find((i) => i.id === item.id);
                    return (
                        <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm">{item.name}</h3>
                                <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                                <span className="text-sm font-extrabold text-slate-900 block mt-2">€{Number(item.price).toFixed(2)}</span>
                            </div>

                            <div>
                                {cartItem ? (
                                    <div className="flex items-center gap-2 bg-slate-900 text-white rounded-xl p-1">
                                        <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 flex items-center justify-center font-bold">-</button>
                                        <span className="text-xs font-bold">{cartItem.quantity}</span>
                                        <button onClick={() => addToCart(item)} className="w-6 h-6 flex items-center justify-center font-bold">+</button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => addToCart(item)}
                                        className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                                    >
                                        Qo'shish
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Floating Cart Button */}
            {cart.length > 0 && (
                <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex justify-between items-center">
                    <div>
                        <span className="text-xs text-slate-400 block">{cart.reduce((a, b) => a + b.quantity, 0)} ta taom</span>
                        <span className="text-lg font-black">€{cart.reduce((a, b) => a + b.price * b.quantity, 0).toFixed(2)}</span>
                    </div>
                    <button
                        onClick={submitOrder}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition"
                    >
                        Buyurtma berish ➔
                    </button>
                </div>
            )}
        </div>
    );
}