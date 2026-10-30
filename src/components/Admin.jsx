import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Login from './Login';
import Workbook from 'exceljs';
import OrderStats from '../components/OrderStats';
import OrderList from '../components/OrderList';
import MenuManager from '../components/MenuManager';

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
    const [dateFilter, setDateFilter] = useState('today');

    const filteredOrders = orders.filter((order) => {
        if (dateFilter === 'all') return true;
        const orderDate = new Date(order.created_at);
        const now = new Date();

        if (dateFilter === 'today') return orderDate.toDateString() === now.toDateString();
        if (dateFilter === 'week') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(now.getDate() - 7);
            return orderDate >= oneWeekAgo;
        }
        if (dateFilter === 'month') {
            return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
        }
        return true;
    });

    const totalRevenue = filteredOrders.reduce((sum, order) => sum + Number(order.total_price || 0), 0);
    const totalOrdersCount = filteredOrders.length;
    const myCommission = Number((totalRevenue * (commisionRate / 100))).toFixed(2);
    const dineInOrders = filteredOrders.filter(o => o.order_type === 'dine_in').length;
    const takeawayOrders = filteredOrders.filter(o => o.order_type === 'takeaway').length;

    const exportToExcel = async () => {
        const workbook = new Workbook.Workbook();
        const worksheet = workbook.addWorksheet('Orders_Report');
        worksheet.columns = [
            { header: 'Buyurtma ID', key: 'id', width: 15 },
            { header: 'Stol #', key: 'table', width: 10 },
            { header: 'Turi', key: 'type', width: 15 },
            { header: 'Jami Summa (€)', key: 'price', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Sana', key: 'date', width: 22 },
        ];

        filteredOrders.forEach((o) => {
            worksheet.addRow({
                id: o.id,
                table: o.table_number,
                type: o.order_type,
                price: Number(o.total_price || 0).toFixed(2),
                status: o.status,
                date: new Date(o.created_at).toLocaleString(),
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `Orders_Report_${dateFilter}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        anchor.click();
        window.URL.revokeObjectURL(url);
    };

    useEffect(() => {
        fetchData();

        const orderChannel = supabase
            .channel('admin-orders-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
            .subscribe();

        const menuChannel = supabase
            .channel('admin-menu-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => fetchData())
            .subscribe();

        return () => {
            supabase.removeChannel(orderChannel);
            supabase.removeChannel(menuChannel);
        };
    }, []);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
        return () => subscription.unsubscribe();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: catData } = await supabase.from('categories').select('*');
        if (catData) {
            setCategories(catData);
            if (catData.length > 0) setCategoryId(catData[0].id);
        }

        const { data: tenantData } = await supabase.from('tenants').select('id').limit(1);
        if (tenantData && tenantData.length > 0) setTenantId(tenantData[0].id);

        const { data: itemData } = await supabase.from('menu_items').select('*').order('created_at', { ascending: false });
        if (itemData) setMenuItems(itemData);

        const { data: ordersData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (ordersData) setOrders(ordersData);

        setLoading(false);
    };

    const toggleAvailability = async (item) => {
        const newStatus = !item.is_available;
        const { error } = await supabase.from('menu_items').update({ is_available: newStatus }).eq('id', item.id);
        if (!error) {
            setMenuItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_available: newStatus } : i)));
        }
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!name || !price || !categoryId) return alert("Barcha maydonlarni to'ldiring!");

        const tenantId = categories[0]?.tenant_id;
        const { data, error } = await supabase.from('menu_items').insert([
            { tenant_id: tenantId, category_id: categoryId, name, description, price: parseFloat(price), is_available: true }
        ]).select().single();

        if (!error && data) {
            setMenuItems([data, ...menuItems]);
            setName(''); setPrice(''); setDescription('');
            alert("Yangi taom qo'shildi!");
        }
    };

    const handleDeleteItem = async (itemId) => {
        if (!window.confirm("Rostdan ham bu taomni bazadan o'chirmoqchimisiz?")) return;
        const { error } = await supabase.from('menu_items').delete().eq('id', itemId);
        if (!error) setMenuItems((prev) => prev.filter((item) => item.id !== itemId));
    };

    const handleUpdatePrice = async (itemId) => {
        if (!newPrice || isNaN(newPrice)) return alert("To'g'ri narx kiriting!");
        const { error } = await supabase.from('menu_items').update({ price: parseFloat(newPrice) }).eq('id', itemId);
        if (!error) {
            setMenuItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, price: parseFloat(newPrice) } : item)));
            setEditingItemId(null); setNewPrice('');
        }
    };

    const handleUpdateStatus = async (orderId, newStatus) => {
        await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    };

    if (!session) return <Login onLoginSuccess={(sess) => setSession(sess)} />;
    if (loading) return <div className="p-8 text-center font-bold text-slate-500">Admin panel yuklanmoqda...</div>;

    return (
        <div className="max-w-4xl mx-auto p-6 font-sans">
            <div className="flex justify-between items-center border-b pb-4 mb-6">
                <h1 className="text-2xl font-black text-slate-800">Boshqaruv Paneli (Admin)</h1>
                <button
                    onClick={() => supabase.auth.signOut()}
                    className="text-xs bg-rose-50 text-rose-600 border border-rose-200 px-3 py-1.5 rounded-xl font-bold hover:bg-rose-500 hover:text-white transition"
                >
                    Chiqish (Logout)
                </button>
            </div>

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

            {activeTab === 'orders' && (
                <>
                    <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 mb-6 gap-3 shadow-sm">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">Vaqt filtri:</span>
                            {['today', 'week', 'month'].map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setDateFilter(filter)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition capitalize ${dateFilter === filter ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    {filter === 'today' ? 'Bugun' : filter === 'week' ? 'Shu Hafta' : 'Shu Oy'}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={exportToExcel}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-2 shadow-sm"
                        >
                            📥 Excel Hisobot (.xlsx)
                        </button>
                    </div>

                    <OrderStats
                        totalRevenue={totalRevenue}
                        totalOrdersCount={totalOrdersCount}
                        commisionRate={commisionRate}
                        myCommission={myCommission}
                        dineInOrders={dineInOrders}
                        takeawayOrders={takeawayOrders}
                    />

                    <OrderList orders={filteredOrders} handleUpdateStatus={handleUpdateStatus} />
                </>
            )}

            {activeTab === 'menu' && (
                <MenuManager
                    categories={categories}
                    categoryId={categoryId}
                    setCategoryId={setCategoryId}
                    name={name}
                    setName={setName}
                    price={price}
                    setPrice={setPrice}
                    description={description}
                    setDescription={setDescription}
                    handleAddItem={handleAddItem}
                    menuItems={menuItems}
                    editingItemId={editingItemId}
                    setEditingItemId={setEditingItemId}
                    newPrice={newPrice}
                    setNewPrice={setNewPrice}
                    handleUpdatePrice={handleUpdatePrice}
                    toggleAvailability={toggleAvailability}
                    handleDeleteItem={handleDeleteItem}
                />
            )}
        </div>
    );
}

export default Admin;