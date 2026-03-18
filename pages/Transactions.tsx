
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, Material, SettingsData, User, Warehouse } from '@/types';
import { addTransaction, deleteTransaction, updateTransaction, getSettings } from '@/services/mockApi';
import { usePrint } from '@/services/PrintContext';
import { Plus, ArrowDownLeft, ArrowUpRight, Calendar, Info, Search, Edit, Trash2, Printer, RotateCcw, Layers, Archive } from 'lucide-react';
import BulkTransactionModal from '@/components/BulkTransactionModal';

interface TransactionsProps {
  transactions: Transaction[];
  materials: Material[];
  warehouses: Warehouse[];
  onDataChange: () => void;
  user: User;
}

const TransactionModal: React.FC<{ 
    materials: Material[], 
    warehouses: Warehouse[],
    editTransaction?: Transaction | null,
    onClose: () => void; 
    onSave: (transaction: any) => void; 
}> = ({ materials, warehouses, editTransaction, onClose, onSave }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredMaterials = materials.filter(m => 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.barcode.includes(searchTerm)
    );
    
    const [materialId, setMaterialId] = useState(editTransaction?.materialId || filteredMaterials[0]?.id || '');
    const [type, setType] = useState<'out' | 'transfer' | 'return' | 'return_in'>(
        editTransaction?.type === 'transfer' ? 'transfer' : 
        editTransaction?.type === 'return' ? 'return' : 
        editTransaction?.type === 'return_in' ? 'return_in' : 'out'
    );
    const [warehouseId, setWarehouseId] = useState(editTransaction?.warehouseId || (warehouses.length > 0 ? warehouses[0].id : ''));
    const [toWarehouseId, setToWarehouseId] = useState(editTransaction?.toWarehouseId || '');
    const [quantity, setQuantity] = useState(editTransaction?.quantity || 1);
    const [recipient, setRecipient] = useState(editTransaction?.recipient || '');
    const [itemBarcode, setItemBarcode] = useState(editTransaction?.itemBarcode || '');
    const [notes, setNotes] = useState(editTransaction?.notes || '');
    const [color, setColor] = useState(editTransaction?.color || '');
    const [date, setDate] = useState(editTransaction ? new Date(editTransaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const [error, setError] = useState('');
    const [affectInventory, setAffectInventory] = useState(true);

    const selectedMaterial = materials.find(m => m.id === materialId);

    useEffect(() => {
        if (!editTransaction && filteredMaterials.length > 0 && !filteredMaterials.find(m => m.id === materialId)) {
            setMaterialId(filteredMaterials[0].id);
        }
    }, [searchTerm]);

    useEffect(() => {
        if (!editTransaction && selectedMaterial?.color) {
            setColor(selectedMaterial.color);
        }
    }, [materialId, selectedMaterial, editTransaction]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMaterial) { setError('الرجاء اختيار مادة.'); return; }
        if (!warehouseId) { setError('الرجاء اختيار المستودع.'); return; }
        if (type === 'transfer' && !toWarehouseId) { setError('الرجاء اختيار المستودع المحول إليه.'); return; }
        if (type === 'transfer' && warehouseId === toWarehouseId) { setError('لا يمكن التحويل لنفس المستودع.'); return; }
        
        const currentStock = selectedMaterial.stocks?.[warehouseId] || 0;

        if (!editTransaction && (type === 'out' || type === 'transfer' || type === 'return') && currentStock < quantity) {
             setError(`الكمية المطلوبة أكبر من المتاح في المستودع المحدد (${currentStock}).`); return; 
        }
        
        const payload = { 
            type: type, 
            materialId, 
            warehouseId,
            toWarehouseId: type === 'transfer' ? toWarehouseId : undefined,
            quantity, 
            recipient, 
            itemBarcode,
            notes, 
            color,
            date: new Date(date).toISOString(),
            affectInventory: editTransaction ? affectInventory : true
        };

        if (editTransaction) {
            onSave({ ...editTransaction, ...payload, materialName: selectedMaterial.name, supplier: selectedMaterial.supplier, barcode: selectedMaterial.barcode, unit: selectedMaterial.unit });
        } else {
            onSave(payload);
        }
    };

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-2xl border dark:border-gray-700 my-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center text-gray-900 dark:text-white">
                    {editTransaction ? <Edit className="ml-2 text-blue-500" /> : <Plus className="ml-2 text-sky-500" />}
                    {editTransaction ? 'تعديل الحركة' : 'إضافة حركة جديدة'}
                </h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <Trash2 size={20} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {editTransaction && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800 mb-4">
                        <label className="block text-sm font-bold text-amber-800 dark:text-amber-200 mb-2">هل تريد أن تؤثر على المخزون أم مجرد خطأ إدخال؟</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="affectInventory" checked={affectInventory} onChange={() => setAffectInventory(true)} className="w-4 h-4 text-amber-600" />
                                <span className="text-sm text-gray-700 dark:text-gray-300">تأثير على المخزون</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="affectInventory" checked={!affectInventory} onChange={() => setAffectInventory(false)} className="w-4 h-4 text-amber-600" />
                                <span className="text-sm text-gray-700 dark:text-gray-300">مجرد خطأ إدخال (لا يؤثر)</span>
                            </label>
                        </div>
                    </div>
                )}
                {!editTransaction && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border dark:border-gray-700">
                        <label className="block mb-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">نوع الحركة</label>
                        <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input type="radio" name="type" value="out" checked={type === 'out'} onChange={() => setType('out')} className="w-4 h-4 text-sky-600 focus:ring-sky-500" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-sky-600 transition-colors">صرف (صادر)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input type="radio" name="type" value="return_in" checked={type === 'return_in'} onChange={() => setType('return_in')} className="w-4 h-4 text-amber-600 focus:ring-amber-500" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-amber-600 transition-colors">إرجاع من مستلم</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input type="radio" name="type" value="transfer" checked={type === 'transfer'} onChange={() => setType('transfer')} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition-colors">تحويل بين المستودعات</span>
                            </label>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div className="md:col-span-2 space-y-2">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">المادة</label>
                        <div className="flex gap-2">
                            <div className="relative flex-[1]">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="بحث..." 
                                    value={searchTerm} 
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full p-2.5 pr-10 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                                    disabled={!!editTransaction}
                                />
                            </div>
                            <select 
                                value={materialId} 
                                onChange={(e) => setMaterialId(e.target.value)} 
                                required 
                                disabled={!!editTransaction}
                                className="flex-[2] p-2.5 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none text-sm"
                            >
                                {filteredMaterials.length > 0 ? (
                                    filteredMaterials.map(m => <option key={m.id} value={m.id}>{m.name} (المتاح: {m.currentStock} {m.unit})</option>)
                                ) : (
                                    <option value="">لا توجد نتائج</option>
                                )}
                            </select>
                        </div>
                    </div>

                    <div className="md:col-span-2 grid grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1.5 text-sm font-bold text-gray-700 dark:text-gray-300">
                                {type === 'transfer' ? 'من مستودع' : 'المستودع'}
                            </label>
                            <select 
                                value={warehouseId} 
                                onChange={(e) => setWarehouseId(e.target.value)} 
                                required 
                                disabled={!!editTransaction}
                                className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none text-sm"
                            >
                                {warehouses.map(w => (
                                    <option key={w.id} value={w.id}>{w.name} (المتاح: {selectedMaterial?.stocks?.[w.id] || 0})</option>
                                ))}
                            </select>
                        </div>

                        {type === 'transfer' ? (
                            <div>
                                <label className="block mb-1.5 text-sm font-bold text-gray-700 dark:text-gray-300">إلى مستودع</label>
                                <select 
                                    value={toWarehouseId} 
                                    onChange={(e) => setToWarehouseId(e.target.value)} 
                                    required 
                                    disabled={!!editTransaction}
                                    className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none text-sm"
                                >
                                    <option value="">اختر المستودع...</option>
                                    {warehouses.filter(w => w.id !== warehouseId).map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="flex items-end">
                                <div className="w-full bg-sky-50 dark:bg-sky-900/30 p-2.5 rounded-lg border border-sky-100 dark:border-sky-800 text-[10px] text-sky-700 dark:text-sky-300 grid grid-cols-2 gap-1">
                                    <div><strong>المورد:</strong> {selectedMaterial?.supplier || '-'}</div>
                                    <div><strong>الباركود:</strong> {selectedMaterial?.barcode || '-'}</div>
                                    <div className="col-span-2"><strong>الفئة:</strong> {selectedMaterial?.category || '-'}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1.5 text-sm font-bold text-gray-700 dark:text-gray-300">الكمية</label>
                            <input type="number" value={quantity} onChange={(e) => setQuantity(parseFloat(e.target.value))} step="0.1" min="0" required className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none text-sm" />
                        </div>
                        <div>
                            <label className="block mb-1.5 text-sm font-bold text-gray-700 dark:text-gray-300">اللون</label>
                            <input type="text" value={color} onChange={(e) => setColor(e.target.value)} placeholder="اللون..." className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none text-sm" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1.5 text-sm font-bold text-gray-700 dark:text-gray-300">
                                {type === 'return' ? 'الجهة المرجعة' : type === 'transfer' ? 'سبب التحويل' : 'اسم المستلم / الجهة'}
                            </label>
                            <input type="text" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="الجهة أو الشخص" required className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none text-sm" />
                        </div>
                        <div>
                            <label className="block mb-1.5 text-sm font-bold text-gray-700 dark:text-gray-300">باركود الصنف / القصة</label>
                            <input type="text" value={itemBarcode} onChange={(e) => setItemBarcode(e.target.value)} placeholder="باركود الصنف" className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none text-sm" />
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block mb-1.5 text-sm font-bold text-gray-700 dark:text-gray-300">تاريخ الحركة</label>
                        <div className="relative">
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full p-2.5 pr-10 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none text-sm" />
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block mb-1.5 text-sm font-bold text-gray-700 dark:text-gray-300">ملاحظات</label>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="تفاصيل إضافية..." className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none text-sm" rows={2}></textarea>
                    </div>
                </div>

                {error && <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800 flex items-center gap-2">
                    <Info size={16} /> {error}
                </div>}

                <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                    <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">إلغاء</button>
                    <button type="submit" className="px-8 py-2.5 bg-sky-600 text-white text-sm font-bold rounded-lg shadow-lg hover:bg-sky-700 hover:shadow-sky-500/20 transition-all">
                        {editTransaction ? 'تحديث البيانات' : 'حفظ الحركة'}
                    </button>
                </div>
            </form>
        </div>
      </div>
    );
};

const Transactions: React.FC<TransactionsProps> = ({ transactions, materials, warehouses, onDataChange, user }) => {
  const { triggerPrint } = usePrint();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [showArchive, setShowArchive] = useState(false);

  const canPrint = user.role === 'admin' || user.permissions?.canPrint;
  const isAdmin = user.role === 'admin';

  const handleReturnAction = (t: Transaction) => {
      // Create a new transaction based on the old one but with 'return_in' type
      const returnData = {
          ...t,
          id: undefined, // New ID will be generated
          type: 'return_in',
          date: new Date().toISOString(),
          notes: `مرتجع من الحركة رقم: ${t.id.slice(-6).toUpperCase()}`
      };
      setEditingTransaction(returnData as any);
      setIsModalOpen(true);
  };

  const filteredTransactions = useMemo(() => {
      let result = [...transactions];
      if (filterStartDate) {
          const start = new Date(filterStartDate);
          start.setHours(0,0,0,0);
          result = result.filter(t => new Date(t.date) >= start);
      }
      if (filterEndDate) {
          const end = new Date(filterEndDate);
          end.setHours(23,59,59,999);
          result = result.filter(t => new Date(t.date) <= end);
      }
      return result.sort((a,b) => {
          const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (dateDiff !== 0) return dateDiff;
          return b.id.localeCompare(a.id);
      });
  }, [transactions, filterStartDate, filterEndDate]);

  const handleSave = (transaction: any) => {
    try {
        if (editingTransaction) {
            updateTransaction(transaction);
        } else {
            addTransaction(transaction);
        }
        onDataChange();
        setIsModalOpen(false);
        setEditingTransaction(null);
    } catch (err: any) {
        alert(err.message);
    }
  };

  const handleSaveBulk = (bulkTransactions: any[]) => {
    try {
        bulkTransactions.forEach(t => addTransaction(t));
        onDataChange();
        setIsBulkModalOpen(false);
    } catch (err: any) {
        alert(err.message);
    }
  };

  const handleDelete = (id: string) => {
      deleteTransaction(id);
      onDataChange();
      setDeleteConfirm(null);
  };

  const handlePrintVoucher = (t: Transaction) => {
    const settings = getSettings();
    const html = `
      <div class="print-container">
        <style>
          .print-container { font-family: 'Cairo', sans-serif; direction: rtl; padding: 40px; color: #333; background: white; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double #333; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { max-width: 100px; }
          .voucher-title { text-align: center; font-size: 24px; font-weight: bold; border: 2px solid #333; padding: 10px; width: fit-content; margin: 0 auto 30px; }
          .details-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
          .detail-item { border-bottom: 1px dashed #ccc; padding: 5px 0; display: flex; align-items: center; }
          .detail-label { font-weight: bold; color: #666; width: 150px; flex-shrink: 0; }
          .signatures { display: grid; grid-template-cols: 1fr 1fr 1fr; gap: 40px; margin-top: 80px; text-align: center; }
          .sig-line { border-top: 1px solid #000; margin-top: 50px; }
        </style>
        <div class="header">
          ${settings.companyLogo ? `<img src="${settings.companyLogo}" class="logo" />` : '<div></div>'}
          <div style="text-align:left">
            <h2 style="margin:0">${settings.companyName}</h2>
            <p style="margin:5px 0">${settings.companyAddress}</p>
          </div>
        </div>
        <div class="voucher-title">سند ${t.type === 'in' ? 'توريد' : t.type === 'transfer' ? 'تحويل' : t.type === 'return' ? 'مرتجع' : 'صرف'} مخزني</div>
        <div class="details-grid">
          <div class="detail-item"><span class="detail-label">رقم الحركة:</span> <span>${t.id.slice(-6).toUpperCase()}</span></div>
          <div class="detail-item"><span class="detail-label">تاريخ الحركة:</span> <span>${new Date(t.date).toLocaleDateString('ar-EG')}</span></div>
          <div class="detail-item"><span class="detail-label">اسم المادة:</span> <span>${t.materialName}</span></div>
          <div class="detail-item"><span class="detail-label">الباركود:</span> <span>${t.barcode}</span></div>
          <div class="detail-item"><span class="detail-label">باركود الصنف/القصة:</span> <span>${t.itemBarcode || '-'}</span></div>
          <div class="detail-item"><span class="detail-label">اللون:</span> <span>${t.color || '-'}</span></div>
          <div class="detail-item"><span class="detail-label">الكمية:</span> <strong>${t.quantity} ${t.unit}</strong></div>
          <div class="detail-item"><span class="detail-label">${t.type === 'in' ? 'المورد:' : 'المستلم:'}</span> <span>${t.recipient}</span></div>
          <div class="detail-item"><span class="detail-label">ملاحظات:</span> <span>${t.notes || '-'}</span></div>
        </div>
        <div class="signatures">
          <div><p>${settings.signatureNames.keeper}</p><div class="sig-line"></div></div>
          <div><p>${settings.signatureNames.accountant}</p><div class="sig-line"></div></div>
          <div><p>${settings.signatureNames.manager}</p><div class="sig-line"></div></div>
        </div>
      </div>
    `;
    triggerPrint(html);
  };
  
  return (
    <div className="space-y-4 pb-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">الحركات اليومية</h1>
        <div className="flex gap-3">
            <button onClick={() => setShowArchive(!showArchive)} className={`flex items-center px-4 py-2 rounded-lg shadow transition-all ${showArchive ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                <Archive className="ml-2" size={20} /> أرشيف
            </button>
            {isAdmin && (
                <>
                    <button onClick={() => setIsBulkModalOpen(true)} className="flex items-center px-4 py-2 bg-emerald-500 text-white rounded-lg shadow hover:bg-emerald-600 disabled:bg-emerald-300 transition-all" disabled={materials.length === 0}>
                        <Layers className="ml-2" size={20} /> حركة مجمعة
                    </button>
                    <button onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }} className="flex items-center px-4 py-2 bg-sky-500 text-white rounded-lg shadow hover:bg-sky-600 disabled:bg-sky-300 transition-all" disabled={materials.length === 0}>
                        <Plus className="ml-2" size={20} /> إضافة حركة صرف
                    </button>
                </>
            )}
        </div>
      </div>

      {/* Date Filter Bar */}
      {showArchive && (
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border dark:border-gray-700 flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                  <label className="text-sm font-bold text-gray-500 dark:text-gray-400">من تاريخ:</label>
                  <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="p-1.5 border rounded text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div className="flex items-center gap-2">
                  <label className="text-sm font-bold text-gray-500 dark:text-gray-400">إلى تاريخ:</label>
                  <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="p-1.5 border rounded text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              {(filterStartDate || filterEndDate) && (
                  <button onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }} className="text-xs text-red-500 hover:underline">إلغاء الفلتر</button>
              )}
          </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-x-auto border dark:border-gray-700">
        <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 border-b dark:border-gray-600">
            <tr>
              <th scope="col" className="px-4 py-3">التاريخ</th>
              <th scope="col" className="px-4 py-3">النوع</th>
              <th scope="col" className="px-4 py-3">المادة / اللون</th>
              <th scope="col" className="px-4 py-3">المستودع</th>
              <th scope="col" className="px-4 py-3">باركود المادة</th>
              <th scope="col" className="px-4 py-3">باركود الصنف</th>
              <th scope="col" className="px-4 py-3">الكمية</th>
              <th scope="col" className="px-4 py-3">المستلم / المورد</th>
              <th scope="col" className="px-4 py-3">الملاحظات</th>
              <th scope="col" className="px-4 py-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map(transaction => (
              <tr key={transaction.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="px-4 py-3 text-xs whitespace-nowrap">{new Date(transaction.date).toLocaleDateString('ar-EG')}</td>
                <td className="px-4 py-3">
                    {transaction.type === 'in' ? (
                        <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-bold text-xs bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">
                            <ArrowUpRight size={14} className="ml-1"/> وارد
                        </span>
                    ) : transaction.type === 'return_in' ? (
                        <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-bold text-xs bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">
                            <RotateCcw size={14} className="ml-1"/> مرتجع من مستلم
                        </span>
                    ) : transaction.type === 'transfer' ? (
                        <span className="flex items-center text-blue-600 dark:text-blue-400 font-bold text-xs bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                            <ArrowDownLeft size={14} className="ml-1"/> تحويل
                        </span>
                    ) : transaction.type === 'return' ? (
                        <span className="flex items-center text-amber-600 dark:text-amber-400 font-bold text-xs bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
                            <ArrowDownLeft size={14} className="ml-1"/> مرتجع لمورد
                        </span>
                    ) : (
                        <span className="flex items-center text-red-600 dark:text-red-400 font-bold text-xs bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                            <ArrowDownLeft size={14} className="ml-1"/> صادر
                        </span>
                    )}
                </td>
                <td className="px-4 py-3">
                    <div className="font-bold text-gray-900 dark:text-white">{transaction.materialName}</div>
                    {transaction.color && <div className="text-[10px] text-gray-400">اللون: {transaction.color}</div>}
                </td>
                <td className="px-4 py-3 text-xs">
                    <div className="font-bold text-gray-900 dark:text-white">{warehouses.find(w => w.id === transaction.warehouseId)?.name || '-'}</div>
                    {transaction.type === 'transfer' && transaction.toWarehouseId && (
                        <div className="text-[10px] text-blue-500 mt-1">
                            إلى: {warehouses.find(w => w.id === transaction.toWarehouseId)?.name || '-'}
                        </div>
                    )}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{transaction.barcode}</td>
                <td className="px-4 py-3 font-mono text-xs text-blue-500 font-bold">{transaction.itemBarcode || '-'}</td>
                <td className={`px-4 py-3 font-black ${transaction.type === 'in' || transaction.type === 'return' ? 'text-emerald-500' : transaction.type === 'transfer' ? 'text-blue-500' : 'text-red-500'}`}>
                    {transaction.type === 'in' || transaction.type === 'return' ? '+' : transaction.type === 'transfer' ? '' : '-'}{transaction.quantity} {transaction.unit}
                </td>
                <td className="px-4 py-3">
                    <div className="font-medium text-gray-700 dark:text-gray-300">{transaction.recipient}</div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{transaction.notes || '-'}</td>
                <td className="px-4 py-3 flex items-center gap-2">
                    {canPrint && <button onClick={() => handlePrintVoucher(transaction)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" title="طباعة سند"><Printer size={18}/></button>}
                    {isAdmin && (
                        <>
                            {transaction.type === 'out' && (
                                <button onClick={() => handleReturnAction(transaction)} className="text-amber-500 hover:text-amber-700" title="إرجاع للمستودع">
                                    <RotateCcw size={18}/>
                                </button>
                            )}
                            <button onClick={() => { setEditingTransaction(transaction); setIsModalOpen(true); }} className="text-blue-500 hover:text-blue-700" title="تعديل"><Edit size={18}/></button>
                            <button onClick={() => setDeleteConfirm(transaction.id)} className="text-red-500 hover:text-red-700" title="حذف"><Trash2 size={18}/></button>
                        </>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredTransactions.length === 0 && <div className="p-8 text-center text-gray-500 dark:text-gray-400">لا توجد حركات مسجلة للفترة المحددة.</div>}
      </div>

      {isModalOpen && <TransactionModal materials={materials} warehouses={warehouses} editTransaction={editingTransaction} onClose={() => { setIsModalOpen(false); setEditingTransaction(null); }} onSave={handleSave} />}
      
      {isBulkModalOpen && <BulkTransactionModal materials={materials} warehouses={warehouses} onClose={() => setIsBulkModalOpen(false)} onSave={handleSaveBulk} />}

      {deleteConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex justify-center items-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full text-center border dark:border-gray-700 shadow-2xl">
                  <h3 className="text-lg font-bold mb-2 dark:text-white">حذف الحركة؟</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">سيتم حذف الحركة وتعديل كمية المخزون بشكل آلي. هل أنت متأكد؟</p>
                  <div className="flex gap-4 justify-center">
                      <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg dark:text-white">إلغاء</button>
                      <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-md transition-all">تأكيد الحذف</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Transactions;
