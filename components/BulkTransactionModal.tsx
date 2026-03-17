import React, { useState, useEffect } from 'react';
import { Material, Warehouse } from '@/types';
import { Plus, Trash2, Save, X } from 'lucide-react';

interface BulkTransactionItem {
    id: string;
    materialId: string;
    quantity: number;
    color: string;
    itemBarcode: string;
    notes: string;
    searchTerm?: string;
}

interface BulkTransactionModalProps {
    materials: Material[];
    warehouses: Warehouse[];
    onClose: () => void;
    onSave: (transactions: any[]) => void;
}

const BulkTransactionModal: React.FC<BulkTransactionModalProps> = ({ materials, warehouses, onClose, onSave }) => {
    const [type, setType] = useState<'out' | 'transfer' | 'return' | 'return_in'>('out');
    const [warehouseId, setWarehouseId] = useState(warehouses.length > 0 ? warehouses[0].id : '');
    const [toWarehouseId, setToWarehouseId] = useState('');
    const [recipient, setRecipient] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [items, setItems] = useState<BulkTransactionItem[]>([
        { id: Date.now().toString(), materialId: materials[0]?.id || '', quantity: 1, color: '', itemBarcode: '', notes: '', searchTerm: '' }
    ]);
    const [error, setError] = useState('');

    const handleAddItem = () => {
        setItems([...items, { id: Date.now().toString(), materialId: materials[0]?.id || '', quantity: 1, color: '', itemBarcode: '', notes: '', searchTerm: '' }]);
    };

    const handleRemoveItem = (id: string) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== id));
        }
    };

    const handleItemChange = (id: string, field: keyof BulkTransactionItem, value: any) => {
        setItems(items.map(item => {
            if (item.id === id) {
                const updatedItem = { ...item, [field]: value };
                if (field === 'materialId') {
                    const material = materials.find(m => m.id === value);
                    if (material) {
                        updatedItem.color = material.color || '';
                    }
                } else if (field === 'searchTerm') {
                    const filtered = materials.filter(m => m.name.toLowerCase().includes((value || '').toLowerCase()) || m.barcode.includes(value || ''));
                    if (filtered.length > 0 && !filtered.find(m => m.id === updatedItem.materialId)) {
                        updatedItem.materialId = filtered[0].id;
                        updatedItem.color = filtered[0].color || '';
                    }
                }
                return updatedItem;
            }
            return item;
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!warehouseId) { setError('الرجاء اختيار المستودع.'); return; }
        if (type === 'transfer' && !toWarehouseId) { setError('الرجاء اختيار المستودع المحول إليه.'); return; }
        if (type === 'transfer' && warehouseId === toWarehouseId) { setError('لا يمكن التحويل لنفس المستودع.'); return; }
        if (!recipient) { setError('الرجاء إدخال اسم المستلم / الجهة.'); return; }

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.materialId) {
                setError(`الرجاء اختيار مادة للبند رقم ${i + 1}.`);
                return;
            }
            if (item.quantity <= 0) {
                setError(`الكمية يجب أن تكون أكبر من صفر للبند رقم ${i + 1}.`);
                return;
            }

            const material = materials.find(m => m.id === item.materialId);
            if (material && (type === 'out' || type === 'transfer' || type === 'return')) {
                const currentStock = material.stocks?.[warehouseId] || 0;
                if (currentStock < item.quantity) {
                    setError(`الكمية المطلوبة (${item.quantity}) أكبر من المتاح (${currentStock}) للمادة ${material.name} في المستودع المحدد.`);
                    return;
                }
            }
        }

        const transactions = items.map(item => ({
            type,
            materialId: item.materialId,
            warehouseId,
            toWarehouseId: type === 'transfer' ? toWarehouseId : undefined,
            quantity: item.quantity,
            recipient,
            itemBarcode: item.itemBarcode,
            notes: item.notes,
            color: item.color,
            date: new Date(date).toISOString()
        }));

        onSave(transactions);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-5xl border dark:border-gray-700 my-auto max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h2 className="text-xl font-bold flex items-center text-gray-900 dark:text-white">
                        <Plus className="ml-2 text-sky-500" />
                        إضافة حركة مجمعة (عدة بنود)
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X size={24} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                    <form id="bulk-transaction-form" onSubmit={handleSubmit} className="space-y-6">
                        {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-bold border border-red-200">{error}</div>}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border dark:border-gray-700">
                            <div>
                                <label className="block mb-1.5 text-sm font-bold text-gray-700 dark:text-gray-300">نوع الحركة</label>
                                <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none text-sm">
                                    <option value="out">صرف (سحب)</option>
                                    <option value="return">مرتجع للمورد</option>
                                    <option value="return_in">مرتجع من مستلم (إدخال)</option>
                                    <option value="transfer">نقل بين المستودعات</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block mb-1.5 text-sm font-bold text-gray-700 dark:text-gray-300">
                                    {type === 'transfer' ? 'من مستودع' : 'المستودع'}
                                </label>
                                <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} required className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none text-sm">
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>

                            {type === 'transfer' && (
                                <div>
                                    <label className="block mb-1.5 text-sm font-bold text-gray-700 dark:text-gray-300">إلى مستودع</label>
                                    <select value={toWarehouseId} onChange={(e) => setToWarehouseId(e.target.value)} required className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none text-sm">
                                        <option value="">اختر المستودع...</option>
                                        {warehouses.filter(w => w.id !== warehouseId).map(w => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block mb-1.5 text-sm font-bold text-gray-700 dark:text-gray-300">
                                    {type === 'return' ? 'الجهة المرجعة' : type === 'transfer' ? 'سبب التحويل' : 'اسم المستلم / الجهة'}
                                </label>
                                <input type="text" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="الجهة أو الشخص" required className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none text-sm" />
                            </div>

                            <div>
                                <label className="block mb-1.5 text-sm font-bold text-gray-700 dark:text-gray-300">التاريخ</label>
                                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none text-sm" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">البنود ({items.length})</h3>
                                <button type="button" onClick={handleAddItem} className="flex items-center px-3 py-1.5 bg-emerald-500 text-white rounded-lg shadow hover:bg-emerald-600 transition-all text-sm font-bold">
                                    <Plus size={16} className="ml-1" /> إضافة بند
                                </button>
                            </div>

                            {items.map((item, index) => (
                                <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-sm relative group">
                                    <div className="md:col-span-3">
                                        <label className="block mb-1 text-xs font-bold text-gray-500 dark:text-gray-400">المادة</label>
                                        <div className="flex gap-1">
                                            <input 
                                                type="text" 
                                                placeholder="بحث..." 
                                                value={item.searchTerm || ''} 
                                                onChange={(e) => handleItemChange(item.id, 'searchTerm', e.target.value)}
                                                className="w-1/3 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-xs focus:ring-2 focus:ring-sky-500 outline-none"
                                            />
                                            <select value={item.materialId} onChange={(e) => handleItemChange(item.id, 'materialId', e.target.value)} required className="w-2/3 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none text-xs">
                                                {materials.filter(m => m.name.toLowerCase().includes((item.searchTerm || '').toLowerCase()) || m.barcode.includes(item.searchTerm || '')).map(m => (
                                                    <option key={m.id} value={m.id}>{m.name} - {m.barcode}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block mb-1 text-xs font-bold text-gray-500 dark:text-gray-400">الكمية</label>
                                        <input type="number" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))} step="any" min="0" required className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none text-sm" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block mb-1 text-xs font-bold text-gray-500 dark:text-gray-400">اللون</label>
                                        <input type="text" value={item.color} onChange={(e) => handleItemChange(item.id, 'color', e.target.value)} placeholder="اللون..." className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none text-sm" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block mb-1 text-xs font-bold text-gray-500 dark:text-gray-400">باركود الصنف</label>
                                        <input type="text" value={item.itemBarcode} onChange={(e) => handleItemChange(item.id, 'itemBarcode', e.target.value)} placeholder="الباركود..." className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none text-sm" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block mb-1 text-xs font-bold text-gray-500 dark:text-gray-400">ملاحظات</label>
                                        <input type="text" value={item.notes} onChange={(e) => handleItemChange(item.id, 'notes', e.target.value)} placeholder="ملاحظات..." className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none text-sm" />
                                    </div>
                                    <div className="md:col-span-1 flex items-end justify-center pb-1">
                                        <button type="button" onClick={() => handleRemoveItem(item.id)} disabled={items.length === 1} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="حذف البند">
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </form>
                </div>

                <div className="mt-6 pt-4 border-t dark:border-gray-700 flex justify-end gap-3 shrink-0">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-xl font-bold transition-colors">
                        إلغاء
                    </button>
                    <button type="submit" form="bulk-transaction-form" className="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold shadow-lg shadow-sky-500/30 transition-all flex items-center">
                        <Save className="ml-2" size={20} /> حفظ الحركة المجمعة
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkTransactionModal;
