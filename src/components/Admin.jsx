import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Login from './Login';

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
    const [activeTab, setActiveTab] = useState('orders');
    const [editingItemId, setEditingItemId] = useState(null);
    const [newPrice, setNewPrice] = useState('');
    const [session, setSession] = useState(null);

    useEffect(() => {
        fetchData();

        const orderChannel = supabase
            .channel('admin-orders-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders'
                },
                (payload) => {
                    console.log('Orders change:', payload)
                    fetchData();
                }
            )
            .subscribe();

        const menuChannel = supabase
            .channel('admin-menu-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'menu_items'
                },
                () => {
                    fetchData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(orderChannel);
            supabase.removeChannel(menuChannel);
        };
    }, []);
    // Login
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchData = async () => {
        setLoading(true);

        const { data: catData } = await supabase.from('categories').select('*');
        if (catData) {
            setCategories(catData);
            if (catData.length > 0) setCategoryId(catData[0].id);
        }
        const { data: tenantData } = await supabase
            .from('tenants')
            .select('id')
            .limit(1);

        if (tenantData && tenantData.length > 0) {
            setTenantId(tenantData[0].id);
        }

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

    const handleUpdatePrice = async (itemId) => {
        if (!newPrice || isNaN(newPrice)) return alert("To'g'ri narx kiriting!");

        const { error } = await supabase
            .from('menu_items')
            .update({ price: parseFloat(newPrice) })
            .eq('id', itemId);

        if (!error) {
            setMenuItems((prev) =>
                prev.map((item) => (item.id === itemId ? { ...item, price: parseFloat(newPrice) } : item))
            );
            setEditingItemId(null);
            setNewPrice('');
        } else {
            alert("Narxni o'zgartirishda xato bo'ldi!");
        }
    };

    const handleUpdateStatus = async (orderId, newStatus) => {
        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId);

        if (error) alert("Statusni o'zgartirishda xato bo'ldi");
    }

    if (!session) {
        return <Login onLoginSuccess={(sess) => setSession(sess)} />;
    }

    if (loading) {
        return <div className="p-8 text-center font-bold text-slate-500">Admin panel yuklanmoqda...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-6 font-sans">
            {/* Yuqori Sarlavha va Logout Tugmasi */}
            <div className="flex justify-between items-center border-b pb-4 mb-6">
                <h1 className="text-2xl font-black text-slate-800">Boshqaruv Paneli (Admin)</h1>
                <button
                    onClick={() => supabase.auth.signOut()}
                    className="text-xs bg-rose-50 text-rose-600 border border-rose-200 px-3 py-1.5 rounded-xl font-bold hover:bg-rose-500 hover:text-white transition"
                >
                    Chiqish (Logout)
                </button>
            </div>

            {/* Tab Tugmalari */}
            <div className="flex gap-2 mb-6 border-b pb-3">
                <button
                    onClick={() => setActiveTab('orders')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'orders' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                >
                    📊 Dashboard & Live Orders
                </button>
                <button
                    onClick={() => setActiveTab('menu')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'menu' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                >
                    🍔 Menu & Price Control
                </button>
            </div>

            {/* 1-TAB: DASHBOARD VA JONLI BUYURTMALAR */}
            {activeTab === 'orders' && (
                <>
                    <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-8'>
                        <div className='bg-white p-4 rounded-2xl border border-slate-200 shadow-sm'>
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

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 mb-8 shadow-sm">
                        <h2 className="text-base font-black text-slate-800 mb-4 uppercase">
                            Jonli Buyurtmalar ({orders.length})
                        </h2>
                        <div className="space-y-3">
                            {orders.map((order) => (
                                <div key={order.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-center">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-800 text-sm">
                                                Stol #{order.table_number}
                                            </span>
                                            <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-extrabold uppercase">
                                                {order.order_type}
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
                                                Yopish (Completed)
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* 2-TAB: MENU VA NARXLAR BOSHQRUVI */}
            {activeTab === 'menu' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

                                    {editingItemId === item.id ? (
                                        <div className="flex items-center gap-1 mt-1">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={newPrice}
                                                onChange={(e) => setNewPrice(e.target.value)}
                                                className="w-20 text-xs p-1 rounded-lg border border-slate-300 outline-none font-bold"
                                                placeholder="0.00"
                                            />
                                            <button
                                                onClick={() => handleUpdatePrice(item.id)}
                                                className="bg-emerald-500 text-white text-[10px] px-2 py-1 rounded-lg font-bold"
                                            >
                                                ✓
                                            </button>
                                            <button
                                                onClick={() => setEditingItemId(null)}
                                                className="bg-slate-200 text-slate-600 text-[10px] px-2 py-1 rounded-lg font-bold"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <span className="text-xs text-slate-500 font-extrabold">€{Number(item.price).toFixed(2)}</span>
                                            <button
                                                onClick={() => {
                                                    setEditingItemId(item.id);
                                                    setNewPrice(item.price);
                                                }}
                                                className="text-[10px] text-slate-400 hover:text-slate-700 ml-1"
                                                title="Narxni tahrirlash"
                                            >
                                                ✏️
                                            </button>
                                        </div>
                                    )}
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
            )}
        </div>
    );
}

export default Admin