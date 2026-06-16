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
    const [outputType, setOutputType] = useState<'scrap' | 'rulers' | 'waste' | 'none'>('none');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [items, setItems] = useState<BulkTransactionItem[]>([
        { id: Date.now().toString(), materialId: materials[0]?.id || '', quantity: 1, color: '', itemBarcode: '', notes: '', searchTerm: '' }
    ]);
    const [error, setError] = useState('');

    // Smart Multi-Select States
    const [isMultiChooseOpen, setIsMultiChooseOpen] = useState(false);
    const [multiSearch, setMultiSearch] = useState('');
    const [multiSelected, setMultiSelected] = useState<Record<string, { quantity: number; color: string; barcode: string; notes: string }>>({});
    const [globalQty, setGlobalQty] = useState<number>(1);
    const [globalColor, setGlobalColor] = useState<string>('');
    const [globalBarcode, setGlobalBarcode] = useState<string>('');
    const [globalNotes, setGlobalNotes] = useState<string>('');

    const handleApplyGlobal = () => {
        const updated = { ...multiSelected };
        Object.keys(updated).forEach(mid => {
            updated[mid] = {
                quantity: globalQty || 1,
                color: globalColor || updated[mid].color || '',
                barcode: globalBarcode || updated[mid].barcode || '',
                notes: globalNotes || updated[mid].notes || ''
            };
        });
        setMultiSelected(updated);
    };

    const handleToggleMultiSelect = (material: Material) => {
        const isSelected = !!multiSelected[material.id];
        if (isSelected) {
            const updated = { ...multiSelected };
            delete updated[material.id];
            setMultiSelected(updated);
        } else {
            setMultiSelected({
                ...multiSelected,
                [material.id]: {
                    quantity: globalQty || 1,
                    color: globalColor || material.color || '',
                    barcode: globalBarcode || '',
                    notes: globalNotes || ''
                }
            });
        }
    };

    const handleRemoveMultiSelected = (mid: string) => {
        const updated = { ...multiSelected };
        delete updated[mid];
        setMultiSelected(updated);
    };

    const handleUpdateMultiItem = (mid: string, field: 'quantity' | 'color' | 'barcode' | 'notes', value: any) => {
        setMultiSelected({
            ...multiSelected,
            [mid]: {
                ...multiSelected[mid],
                [field]: value
            }
        });
    };

    const handleInsertMultiSelected = () => {
        const newItems: BulkTransactionItem[] = Object.entries(multiSelected).map(([mid, data]) => ({
            id: `multi-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            materialId: mid,
            quantity: data.quantity,
            color: data.color,
            itemBarcode: data.barcode,
            notes: data.notes,
            searchTerm: ''
        }));

        let currentItems = [...items];
        // If there is only one default empty item in the list, remove it to prevent blank lines
        if (
            currentItems.length === 1 &&
            (!currentItems[0].materialId || currentItems[0].materialId === (materials[0]?.id || '')) &&
            currentItems[0].quantity === 1 &&
            !currentItems[0].color &&
            !currentItems[0].itemBarcode &&
            !currentItems[0].notes
        ) {
            currentItems = [];
        }

        setItems([...currentItems, ...newItems]);
        setIsMultiChooseOpen(false);
        setMultiSelected({});
    };

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

        const parts = date.split('-');
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        const now = new Date();
        d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
        const finalDate = d.toISOString();

        const transactions = items.map(item => ({
            type,
            materialId: item.materialId,
            warehouseId,
            toWarehouseId: type === 'transfer' ? toWarehouseId : undefined,
            quantity: item.quantity,
            outputType,
            recipient,
            itemBarcode: item.itemBarcode,
            notes: item.notes,
            color: item.color,
            date: finalDate
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

                            <div>
                                <label className="block mb-1.5 text-sm font-bold text-gray-700 dark:text-gray-300">نوع الإخراج</label>
                                <select 
                                    value={outputType} 
                                    onChange={(e) => setOutputType(e.target.value as any)} 
                                    className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none text-sm"
                                >
                                    <option value="none">بدون</option>
                                    <option value="scrap">سقط</option>
                                    <option value="rulers">مساطر</option>
                                    <option value="waste">هدر</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-gray-50 dark:bg-gray-700/20 p-3 rounded-xl border dark:border-gray-700/60">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">البنود ({items.length})</h3>
                                <div className="flex gap-2">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsMultiChooseOpen(!isMultiChooseOpen)} 
                                        className={`flex items-center px-3 py-1.5 rounded-lg shadow-sm font-bold text-sm transition-all gap-1 cursor-pointer border ${
                                            isMultiChooseOpen 
                                                ? 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800' 
                                                : 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent'
                                        }`}
                                    >
                                        <span>إضافة ذكية لعدة مواد دفعة واحدة ⚡</span>
                                    </button>
                                    <button type="button" onClick={handleAddItem} className="flex items-center px-3 py-1.5 bg-emerald-550 hover:bg-emerald-650 text-white rounded-lg shadow-sm transition-all text-sm font-bold cursor-pointer">
                                        <Plus size={16} className="ml-1" /> إضافة بند يدوي
                                    </button>
                                </div>
                            </div>

                            {/* Collapsible Smart Multi-Choose UI Section */}
                            {isMultiChooseOpen && (
                                <div className="bg-purple-50/40 dark:bg-purple-950/15 p-5 rounded-2xl border-2 border-dashed border-purple-200 dark:border-purple-800/80 space-y-4 animate-fadeIn">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-sm font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                                            <span>أداة التحديد المجمع للمواد والكميات ⚡</span>
                                        </h4>
                                        <button 
                                            type="button" 
                                            onClick={() => { setIsMultiChooseOpen(false); setMultiSelected({}); }}
                                            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                        >
                                            إلغاء النافذة
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                        اختر المواد التي ترغب في إضافتها معاً من القائمة الجانبية، وحدد تفاصيلها، ثم اضغط على زر الإدراج بالأسفل ليتم تنزيلها دفعة واحدة كبنود مستقلة في القائمة الرئيسية.
                                    </p>

                                    {/* Global Preset Inputs for Auto-fill */}
                                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-750 space-y-3 shadow-xs">
                                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                            تعبئة تلقائية ذكية للقيم المشتركة (تطبيق سريع على المواد المختارة):
                                        </p>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div>
                                                <label className="block text-[11px] text-gray-400 dark:text-gray-500 mb-1 font-semibold">كمية موحدة للكل</label>
                                                <input 
                                                    type="number" 
                                                    value={globalQty} 
                                                    onChange={(e) => setGlobalQty(parseFloat(e.target.value) || 0)} 
                                                    step="0.1" 
                                                    min="0.1"
                                                    placeholder="الكمية..."
                                                    className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-1 focus:ring-purple-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] text-gray-400 dark:text-gray-500 mb-1 font-semibold">لون موحد</label>
                                                <input 
                                                    type="text" 
                                                    value={globalColor} 
                                                    placeholder="الأبيض، الأسود..." 
                                                    onChange={(e) => setGlobalColor(e.target.value)} 
                                                    className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-1 focus:ring-purple-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] text-gray-400 dark:text-gray-500 mb-1 font-semibold">باركود الصنف</label>
                                                <input 
                                                    type="text" 
                                                    value={globalBarcode} 
                                                    placeholder="رقم باركود الصنف..." 
                                                    onChange={(e) => setGlobalBarcode(e.target.value)} 
                                                    className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-1 focus:ring-purple-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] text-gray-400 dark:text-gray-500 mb-1 font-semibold">ملاحظات مشتركة</label>
                                                <input 
                                                    type="text" 
                                                    value={globalNotes} 
                                                    placeholder="تكتب ملاحظاتها هنا..." 
                                                    onChange={(e) => setGlobalNotes(e.target.value)} 
                                                    className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-1 focus:ring-purple-500"
                                                />
                                            </div>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={handleApplyGlobal} 
                                            className="w-full py-2 bg-purple-50 hover:bg-purple-100/80 dark:bg-purple-950/20 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-lg transition-colors border border-purple-200/50 dark:border-purple-900/50 cursor-pointer"
                                        >
                                            تطبيق هذه التعبئة التلقائية على كافة المواد المختارة بالأسفل 🔗
                                        </button>
                                    </div>

                                    {/* Selection Catalog Layout (Two Columns) */}
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                                        {/* Catalog list selection (Left Column) */}
                                        <div className="md:col-span-5 bg-white dark:bg-gray-800 p-3 rounded-xl border dark:border-gray-750 flex flex-col h-72">
                                            <div className="mb-2.5">
                                                <input 
                                                    type="text" 
                                                    value={multiSearch} 
                                                    onChange={(e) => setMultiSearch(e.target.value)} 
                                                    placeholder="ابحث عن مادة من الكتالوج..." 
                                                    className="w-full p-2 border border-gray-205 dark:border-gray-600 rounded-lg text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-1 focus:ring-purple-500"
                                                />
                                            </div>
                                            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                                                {materials
                                                    .filter(m => m.name.toLowerCase().includes(multiSearch.toLowerCase()) || m.barcode.includes(multiSearch))
                                                    .map(m => {
                                                        const isSelected = !!multiSelected[m.id];
                                                        return (
                                                            <label 
                                                                key={m.id} 
                                                                className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer text-xs border transition-colors ${
                                                                    isSelected 
                                                                        ? 'bg-purple-50/50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800/80 font-bold' 
                                                                        : 'hover:bg-gray-50 dark:hover:bg-gray-750/30 border-transparent'
                                                                }`}
                                                            >
                                                                <input 
                                                                    id={`bulkselect-checkbox-${m.id}`}
                                                                    type="checkbox" 
                                                                    checked={isSelected} 
                                                                    onChange={() => handleToggleMultiSelect(m)}
                                                                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-gray-900 dark:text-white truncate">{m.name}</div>
                                                                    <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                                                                        باركود: {m.barcode} | الكود التعريفي: {m.id}
                                                                    </div>
                                                                </div>
                                                            </label>
                                                        );
                                                    })
                                                }
                                            </div>
                                        </div>

                                        {/* Configuration overrides list (Right Column) */}
                                        <div className="md:col-span-7 bg-white dark:bg-gray-800 p-3 rounded-xl border dark:border-gray-750 flex flex-col h-72">
                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2.5 block border-b pb-1 dark:border-gray-700">
                                                المواد المختارة للتعديل الفردي والمراجعة ({Object.keys(multiSelected).length})
                                            </span>
                                            <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                                                {Object.keys(multiSelected).length === 0 ? (
                                                    <div className="h-full flex flex-col items-center justify-center opacity-40 text-center py-6">
                                                        <Plus size={36} className="text-purple-400" />
                                                        <span className="text-xs font-semibold mt-1"> لم تقم باختيار أي مواد بعد من القائمة الجانبية</span>
                                                    </div>
                                                ) : (
                                                    Object.entries(multiSelected).map(([mid, data]) => {
                                                        const material = materials.find(m => m.id === mid);
                                                        if (!material) return null;
                                                        return (
                                                            <div key={mid} className="bg-gray-50 dark:bg-gray-750/40 p-3 rounded-lg border dark:border-gray-700/80 text-xs space-y-2">
                                                                <div className="flex justify-between items-center pb-1.5 border-b border-gray-200 dark:border-gray-600/50">
                                                                    <span className="font-bold text-purple-700 dark:text-purple-400">{material.name}</span>
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => handleRemoveMultiSelected(mid)} 
                                                                        className="text-red-500 hover:text-red-700 font-bold hover:underline"
                                                                    >
                                                                        إلغاء التحديد
                                                                    </button>
                                                                </div>
                                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                                    <div>
                                                                        <label className="text-[10px] text-gray-400 dark:text-gray-500 block mb-0.5">الكمية</label>
                                                                        <input 
                                                                            type="number" 
                                                                            value={data.quantity} 
                                                                            onChange={(e) => handleUpdateMultiItem(mid, 'quantity', parseFloat(e.target.value) || 0)}
                                                                            step="0.1" 
                                                                            min="0.1"
                                                                            placeholder="كمية..."
                                                                            className="w-full p-1 border border-gray-200 dark:border-gray-600 rounded text-[11px] dark:bg-gray-700 dark:text-white"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] text-gray-400 dark:text-gray-500 block mb-0.5">اللون</label>
                                                                        <input 
                                                                            type="text" 
                                                                            value={data.color} 
                                                                            onChange={(e) => handleUpdateMultiItem(mid, 'color', e.target.value)}
                                                                            className="w-full p-1 border border-gray-200 dark:border-gray-600 rounded text-[11px] dark:bg-gray-700 dark:text-white"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] text-gray-400 dark:text-gray-500 block mb-0.5">باركود الصنف</label>
                                                                        <input 
                                                                            type="text" 
                                                                            value={data.barcode} 
                                                                            onChange={(e) => handleUpdateMultiItem(mid, 'barcode', e.target.value)}
                                                                            className="w-full p-1 border border-gray-200 dark:border-gray-600 rounded text-[11px] dark:bg-gray-700 dark:text-white"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] text-gray-400 dark:text-gray-500 block mb-0.5">ملاحظات</label>
                                                                        <input 
                                                                            type="text" 
                                                                            value={data.notes} 
                                                                            onChange={(e) => handleUpdateMultiItem(mid, 'notes', e.target.value)}
                                                                            className="w-full p-1 border border-gray-200 dark:border-gray-600 rounded text-[11px] dark:bg-gray-700 dark:text-white"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Insert Triggers inside the smart panel */}
                                    <div className="flex justify-end gap-2 pt-2 border-t dark:border-gray-800">
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                setIsMultiChooseOpen(false);
                                                setMultiSelected({});
                                            }} 
                                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                                        >
                                            إغلاق التحديد الذكي
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={handleInsertMultiSelected} 
                                            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-purple-600/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                            disabled={Object.keys(multiSelected).length === 0}
                                        >
                                            تأكيد وتنزيل المواد المحددة في قائمة البنود أدناه ({Object.keys(multiSelected).length}) 📥
                                        </button>
                                    </div>
                                </div>
                            )}

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
                                        <input type="number" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value))} step="0.1" min="0" required className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none text-sm" />
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
