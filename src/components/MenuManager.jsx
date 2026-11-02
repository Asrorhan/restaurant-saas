import React from 'react';

function MenuManager({
    categories,
    categoryId,
    setCategoryId,
    name,
    setName,
    price,
    setPrice,
    description,
    setDescription,
    handleAddItem,
    menuItems,
    editingItemId,
    setEditingItemId,
    newPrice,
    setNewPrice,
    handleUpdatePrice,
    toggleAvailability,
    handleDeleteItem,
    setImageFile, // 📸 Rasm faylini tanlash funksiyasi
    uploading,    // 📸 Yuklanish holati
}) {
    return (
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

                    {/* 📸 Telefondan rasm faylini tanlash inputi */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Taom Rasmi</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setImageFile(e.target.files[0])}
                            className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={uploading}
                        className="w-full bg-slate-900 disabled:bg-slate-400 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-slate-800 transition"
                    >
                        {uploading ? "Rasm yuklanmoqda..." : "+ Qo'shish"}
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
                        <div className="flex items-center gap-3">
                            {/* 📸 Taom rasmini ko'rsatuvchi box */}
                            {item.image_url ? (
                                <img
                                    src={item.image_url}
                                    alt={item.name}
                                    className="w-12 h-12 object-cover rounded-xl border border-slate-200 flex-shrink-0"
                                />
                            ) : (
                                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                                    🍽️
                                </div>
                            )}

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
    );
}

export default MenuManager;