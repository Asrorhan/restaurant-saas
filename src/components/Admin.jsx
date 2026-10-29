import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

function Admin() {
    const [categories, setCategories] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [tenantId, setTenantId] = useState(null);
    const [orders, setOrders] = useState([]);
    const [commisionRate, setCommisionRate] = useState(5);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);

        const { data: catData } = await supabase.from('categories').select('*');
        if (catData) {
            setCategories(catData);
            if (catData.length > 0) setCategoryId(catData[0].id);
        }
        const { data: tenantData } = await supabase
            .from('tenants').select('id')
            .limit(1)
            .single();
        if (tenantData) setTenantId(tenantData.id);

        const { data: itemData } = await supabase
            .from('menu_items')
            .select('*')
            .order('created_at', { ascending: false });
        if (itemData) setMenuItems(itemData);

        const { data: ordersData } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });
        if (ordersData) setOrders(ordersData)

        setLoading(false);
    };

    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_price || 0), 0);
    const totalOrdersCount = orders.length;
    const myCommission = Number((totalRevenue * 0.05)).toFixed(2);

    const dineInOrders = orders.filter(o => o.order_type === 'dine_in').length;
    const takeawayOrders = orders.filter(o => o.order_type === 'takeaway').length;

    const toggleAvailability = async (item) => {
        const newStatus = !item.is_available;

        const { error } = await supabase
            .from('menu_items')
            .update({ is_available: newStatus })
            .eq('id', item.id);

        if (!error) {
            setMenuItems((prev) =>
                prev.map((i) => (i.id === item.id ? { ...i, is_available: newStatus } : i))
            );
        }
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!name || !price || !categoryId) return alert("Barcha maydonlarni to'ldiring!");

        const tenantId = categories[0]?.tenant_id;

        const { data, error } = await supabase
            .from('menu_items')
            .insert([
                {
                    tenant_id: tenantId,
                    category_id: categoryId,
                    name,
                    description,
                    price: parseFloat(price),
                    is_available: true
                }
            ])
            .select()
            .single();

        if (!error && data) {
            setMenuItems([data, ...menuItems]);
            setName('');
            setPrice('');
            setDescription('');
            alert("Yangi taom qo'shildi!");
        }
    };

    const handleDeleteItem = async (itemId) => {
        if (!window.confirm("Rostdan ham bu taomni bazadan butunlay o'chirmoqchimisiz?")) return;

        const { error } = await supabase.from('menu_items').delete().eq('id', itemId);

        if (!error) {
            setMenuItems((prev) => prev.filter((item) => item.id !== itemId));
        } else {
            alert("O'chirishda xatolik bo'ldi!");
        }
    };

    if (loading) {
        return <div className="p-8 text-center font-bold text-slate-500">Admin panel yuklanmoqda...</div>;
    }

    return (



        <div className="max-w-4xl mx-auto p-6 font-sans">
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-8'>
                <div className='bg-white p-4 rounded-2xl border-slate-200 shadow-sm'>
                    <span className="text-xs font-bold text-slate-400 block uppercase">Jami Tushum</span>
                    <span className="text-2xl font-black text-slate-900 mt-1 block">€{totalRevenue.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-500 mt-1 block">{totalOrdersCount} ta buyurtma</span>
                </div>
                <div className="bg-emerald-500 text-white p-4 rounded-2xl shadow-sm">
                    <span className="text-xs font-bold text-emerald-100 block uppercase">Service fee ({commisionRate}%)</span>
                    <span className="text-2xl font-black text-white mt-1 block">€{myCommission}</span>
                    <span className="text-[10px] text-emerald-100 mt-1 block">Dastur servisi uchun</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-xs font-bold text-slate-400 block uppercase">Dine-in (Stolda)</span>
                    <span className="text-2xl font-black text-slate-800 mt-1 block">{dineInOrders} ta</span>
                    <span className="text-[10px] text-slate-500 mt-1 block">QR-kod orqali</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-xs font-bold text-slate-400 block uppercase">Takeaway (Olib ketish)</span>
                    <span className="text-2xl font-black text-slate-800 mt-1 block">{takeawayOrders} ta</span>
                    <span className="text-[10px] text-slate-500 mt-1 block">Olib ketish zakazlari</span>
                </div>
            </div>

            <div className="flex justify-between items-center border-b pb-4 mb-6">
                <h1 className="text-2xl font-black text-slate-800">Boshqaruv Paneli (Admin)</h1>
                <span className="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-lg font-bold">Menu Management</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Chap tomon: Yangi taom qo'shish formasi */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-fit">
                    <h2 className="text-sm font-black text-slate-700 mb-4 uppercase">Yangi Taom Qo'shish</h2>
                    <form onSubmit={handleAddItem} className="space-y-3">
                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">Kategoriya</label>
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 outline-none"
                            >
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">Taom nomi</label>
                            <input
                                type="text"
                                placeholder="Masalan: Cheese Burger"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">Narxi (€)</label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="6.50"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">Tavsifi</label>
                            <textarea
                                placeholder="Tarkibi va ma'lumot..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 outline-none"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-slate-800 transition"
                        >
                            + Qo'shish
                        </button>
                    </form>
                </div>

                {/* O'ng tomon: Taomlar ro'yxati va Out of Stock toggle */}
                <div className="md:col-span-2 space-y-3">
                    <h2 className="text-sm font-black text-slate-700 mb-4 uppercase">Mavjud Taomlar ({menuItems.length})</h2>
                    {menuItems.map((item) => (
                        <div
                            key={item.id}
                            className={`p-4 rounded-2xl border flex justify-between items-center transition ${item.is_available ? 'bg-white border-slate-200' : 'bg-slate-100 border-slate-300 opacity-60'
                                }`}
                        >
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm">{item.name}</h3>
                                <span className="text-xs text-slate-500 font-extrabold block">€{Number(item.price).toFixed(2)}</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => toggleAvailability(item)}
                                    className={`text-xs font-black px-3 py-1.5 rounded-xl transition ${item.is_available
                                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                        : 'bg-rose-100 text-rose-700 border border-rose-300'
                                        }`}
                                >
                                    {item.is_available ? 'In Stock' : 'Out of Stock'}
                                </button>

                                <button
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 p-2 rounded-xl border border-rose-200 transition text-xs font-bold"
                                    title="O'chirish"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Admin