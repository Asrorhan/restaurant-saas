import React, { useState } from 'react';
import { supabase } from '../supabase';

function Login({ onLoginSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setErrorMsg("Email yoki parol xato!");
        } else if (data.session) {
            onLoginSuccess(data.session);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm w-full max-w-md">
                <h1 className="text-xl font-black text-slate-800 text-center mb-2">Admin Kirish</h1>
                <p className="text-xs text-slate-500 text-center mb-6">Boshqaruv paneliga kirish uchun ma'lumotlarni kiriting</p>

                {errorMsg && (
                    <div className="bg-rose-50 text-rose-600 border border-rose-200 p-3 rounded-xl text-xs font-bold mb-4 text-center">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Email</label>
                        <input
                            type="email"
                            required
                            placeholder="admin@restaurant.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full text-xs p-3 rounded-xl border border-slate-200 outline-none focus:border-slate-800 transition"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Parol</label>
                        <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full text-xs p-3 rounded-xl border border-slate-200 outline-none focus:border-slate-800 transition"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl text-xs hover:bg-slate-800 transition disabled:opacity-50"
                    >
                        {loading ? 'Tekshirilmoqda...' : 'Tizimga Kirish'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Login;