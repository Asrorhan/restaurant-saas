import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';

export default function App() {
  const [tenant, setTenant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // 1. Restoran ma'lumotlarini (Tenant) va Kill-Switch holatini olish
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', 'riga-bistro')
        .single();

      setTenant(tenantData);

      // 2. Menyudagi ovqatlarni bazadan yuklash
      if (tenantData) {
        const { data: items } = await supabase
          .from('menu_items')
          .select('*');
        setMenuItems(items || []);
      }

      setLoading(false);
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-sans">
        <p className="animate-pulse font-bold">Riga Bistro bazaga ulanmoqda...</p>
      </div>
    );
  }

  // Remote Kill-Switch ishlasa
  if (!tenant || !tenant.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-950 text-red-200 font-sans p-4 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Service Temporarily Suspended</h1>
          <p className="text-sm opacity-80">Ushbu restoranning litsenziyasi faol emas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800 font-sans">
      <header className="max-w-xl mx-auto border-b pb-4 mb-6">
        <h1 className="text-2xl font-bold">{tenant.name}</h1>
        <p className="text-xs text-emerald-600 font-semibold">● Supabase Realtime Database Connected</p>
      </header>

      <main className="max-w-xl mx-auto space-y-4">
        <h2 className="font-bold text-lg">Menu Items from Supabase ({menuItems.length})</h2>
        <div className="grid gap-3">
          {menuItems.map(item => (
            <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center">
              <div>
                <h3 className="font-bold">{item.name}</h3>
                <p className="text-xs text-slate-500">{item.description}</p>
              </div>
              <span className="font-extrabold text-sky-600">{item.price} €</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}