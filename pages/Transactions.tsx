import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Transaction, Material, SettingsData, User, Warehouse } from '@/types';
import { addTransaction, deleteTransaction, updateTransaction, getSettings } from '@/services/mockApi';
import { usePrint } from '@/services/PrintContext';
import { 
  Plus, ArrowDownLeft, ArrowUpRight, Calendar, Info, Search, Edit, 
  Trash2, Printer, RotateCcw, Layers, Archive, Camera, FileText, 
  X, Image as ImageIcon, FileSpreadsheet, Sparkles 
} from 'lucide-react';
import BulkTransactionModal from '@/components/BulkTransactionModal';
import CameraBarcodeScannerModal from '@/components/common/CameraBarcodeScannerModal';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

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
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    const filteredMaterials = useMemo(() => {
        return materials.filter(m => 
            m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            m.barcode.includes(searchTerm)
        );
    }, [materials, searchTerm]);
    
    const [materialId, setMaterialId] = useState(editTransaction?.materialId || filteredMaterials[0]?.id || '');
    const [type, setType] = useState<'out' | 'transfer' | 'return' | 'return_in'>(
        editTransaction?.type === 'transfer' ? 'transfer' : 
        editTransaction?.type === 'return' ? 'return' : 
        editTransaction?.type === 'return_in' ? 'return_in' : 'out'
    );
    const [warehouseId, setWarehouseId] = useState(editTransaction?.warehouseId || (warehouses.length > 0 ? warehouses[0].id : ''));
    const [toWarehouseId, setToWarehouseId] = useState(editTransaction?.toWarehouseId || '');
    const [quantity, setQuantity] = useState(editTransaction?.quantity || 1);
    const [quantityStr, setQuantityStr] = useState(editTransaction ? String(editTransaction.quantity) : '1');
    const [outputType, setOutputType] = useState<'scrap' | 'rulers' | 'waste' | 'none'>(editTransaction?.outputType || 'none');
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
    }, [filteredMaterials, materialId, editTransaction]);

    useEffect(() => {
        if (!editTransaction && selectedMaterial?.color) {
            setColor(selectedMaterial.color);
        }
    }, [materialId, selectedMaterial, editTransaction]);

    const handleCameraScan = (scannedCode: string) => {
        setSearchTerm(scannedCode);
        const match = materials.find(m => m.barcode.toLowerCase() === scannedCode.toLowerCase());
        if (match) {
            setMaterialId(match.id);
        }
    };

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
        
        let finalDate = new Date(date).toISOString();
        if (editTransaction) {
            const originalDay = new Date(editTransaction.date).toISOString().split('T')[0];
            if (date === originalDay) {
                finalDate = editTransaction.date;
            } else {
                const parts = date.split('-');
                const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                const now = new Date();
                d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
                finalDate = d.toISOString();
            }
        } else {
            const parts = date.split('-');
            const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            const now = new Date();
            d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
            finalDate = d.toISOString();
        }

        const payload = { 
            type: type, 
            materialId, 
            warehouseId,
            toWarehouseId: type === 'transfer' ? toWarehouseId : undefined,
            quantity, 
            outputType,
            recipient, 
            itemBarcode,
            notes, 
            color,
            date: finalDate,
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
                                    placeholder="بحث بالاسم أو الباركود..." 
                                    value={searchTerm} 
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full p-2.5 pr-10 pl-10 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                                    disabled={!!editTransaction}
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsScannerOpen(true)}
                                    className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                                    title="مسح الباركود بكاميرا الجهاز"
                                >
                                    <Camera size={16} />
                                </button>
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
                                    className="w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none text-sm"
                                >
                                    <option value="">اختر المستودع المستلم</option>
                                    {warehouses.filter(w => w.id !== warehouseId).map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div>
                                <label className="block mb-1.5 text-sm font-bold text-gray-700 dark:text-gray-300">
                                    {type === 'return' ? 'المورد المرتجع إليه' : 'المستلم أو الجهة'}
                                </label>
                                <input 
                                    type="text" 
                                    value={recipient} 
                                    onChange={(e) => setRecipient(e.target.value)} 
                                    placeholder={type === 'return' ? 'اسم المورد' : 'اسم المستلم أو القسم'} 
                                    required 
                                    className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none text-sm" 
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1.5 text-sm font-bold text-gray-700 dark:text-gray-300">
                                الكمية ({selectedMaterial?.unit || 'وحدة'})
                            </label>
                            <input 
                                type="text" 
                                inputMode="decimal"
                                value={quantityStr} 
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setQuantityStr(val);
                                    setQuantity(parseFloat(val.replace(/,/g, '.')) || 0);
                                }} 
                                placeholder="الكمية..."
                                required 
                                className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none text-sm font-bold" 
                            />
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

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1.5 text-sm font-bold text-gray-700 dark:text-gray-300">اللون</label>
                            <input type="text" value={color} onChange={(e) => setColor(e.target.value)} placeholder="اللون..." className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none text-sm" />
                        </div>
                        <div>
                            <label className="block mb-1.5 text-sm font-bold text-gray-700 dark:text-gray-300">باركود الصنف / القصة</label>
                            <input type="text" value={itemBarcode} onChange={(e) => setItemBarcode(e.target.value)} placeholder="باركود الصنف..." className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none text-sm" />
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

        {/* Camera Barcode Scanner Modal inside TransactionModal */}
        <CameraBarcodeScannerModal
            isOpen={isScannerOpen}
            onClose={() => setIsScannerOpen(false)}
            onScan={handleCameraScan}
            title="مسح باركود المادة"
            description="وجّه الكاميرا نحو باركود المادة لاختيارها فوراً"
        />
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
  const [tableSearch, setTableSearch] = useState('');

  // Camera scanner in main page
  const [isMainScannerOpen, setIsMainScannerOpen] = useState(false);

  // Unified voucher preview modal
  const [selectedTransactionVoucher, setSelectedTransactionVoucher] = useState<Transaction | null>(null);
  const [isGeneratingVoucher, setIsGeneratingVoucher] = useState(false);
  const voucherPreviewRef = useRef<HTMLDivElement>(null);

  const canPrint = user.role === 'admin' || user.permissions?.canPrint;
  const isAdmin = user.role === 'admin';
  const settings = getSettings();

  const handleReturnAction = (t: Transaction) => {
      const returnData = {
          ...t,
          id: undefined,
          type: 'return_in',
          date: new Date().toISOString(),
          notes: `مرتجع من الحركة رقم: ${t.id.slice(-6).toUpperCase()}`
      };
      setEditingTransaction(returnData as any);
      setIsModalOpen(true);
  };

  const filteredTransactions = useMemo(() => {
      let result = [...transactions];
      if (tableSearch.trim()) {
          const s = tableSearch.toLowerCase().trim();
          result = result.filter(t => 
              t.materialName.toLowerCase().includes(s) ||
              t.barcode.toLowerCase().includes(s) ||
              (t.itemBarcode && t.itemBarcode.toLowerCase().includes(s)) ||
              t.recipient.toLowerCase().includes(s) ||
              t.supplier.toLowerCase().includes(s) ||
              t.id.toLowerCase().includes(s)
          );
      }
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
  }, [transactions, tableSearch, filterStartDate, filterEndDate]);

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

  // Helper for voucher titles
  const getVoucherTitleInfo = (t: Transaction) => {
    switch (t.type) {
      case 'out':
        return { title: 'سند صرف مواد ومخزون', color: '#ef4444', badge: 'bg-red-50 text-red-600 border-red-500' };
      case 'transfer':
        return { title: 'سند تحويل ومناقلة مخزنية', color: '#2563eb', badge: 'bg-blue-50 text-blue-600 border-blue-500' };
      case 'return_in':
        return { title: 'سند إرجاع مواد ومخزون للمستودع', color: '#059669', badge: 'bg-emerald-50 text-emerald-600 border-emerald-500' };
      case 'return':
        return { title: 'سند إرجاع مواد ومخزون للمورد', color: '#d97706', badge: 'bg-amber-50 text-amber-600 border-amber-500' };
      case 'in':
      default:
        return { title: 'سند توريد واستلام مخزني', color: '#0284c7', badge: 'bg-sky-50 text-sky-600 border-sky-500' };
    }
  };

  // Print voucher with corporate letterhead
  const handlePrintTransactionVoucher = (t: Transaction) => {
    const info = getVoucherTitleInfo(t);
    const material = materials.find(m => m.id === t.materialId);
    const price = material?.price || 0;
    const total = price * t.quantity;
    const fromWarehouse = warehouses.find(w => w.id === t.warehouseId)?.name || 'المستودع الرئيسي';
    const toWarehouse = t.toWarehouseId ? warehouses.find(w => w.id === t.toWarehouseId)?.name || '---' : null;

    const html = `
      <div class="print-container">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
          * { box-sizing: border-box; }
          body { font-family: 'Cairo', sans-serif; direction: rtl; margin: 0; padding: 0; color: #1e293b; background: white; -webkit-print-color-adjust: exact; }
          .print-container { padding: 40px; max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double #cbd5e1; padding-bottom: 20px; margin-bottom: 25px; }
          .logo-placeholder { font-size: 2.5rem; }
          .company-info h2 { font-size: 1.6rem; font-weight: 700; margin: 0 0 5px 0; color: #0f172a; }
          .company-info p { font-size: 0.9rem; margin: 0; color: #64748b; }
          .doc-title { text-align: center; margin: 20px 0; }
          .doc-title h1 { display: inline-block; font-size: 1.4rem; font-weight: 700; color: ${info.color}; border: 2px solid ${info.color}; padding: 8px 24px; border-radius: 6px; background-color: #f8fafc; margin: 0; }
          .metadata-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 25px; }
          .meta-item { font-size: 0.95rem; }
          .meta-label { font-weight: 700; color: #475569; margin-left: 5px; }
          .meta-val { color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: right; font-size: 0.9rem; }
          th { background-color: #f1f5f9; color: #334155; font-weight: 700; }
          td { color: #0f172a; }
          .totals-section { display: flex; justify-content: flex-end; margin-bottom: 30px; }
          .totals-box { border: 1px solid #cbd5e1; border-radius: 8px; background-color: #fafafa; width: 340px; }
          .totals-row { display: flex; justify-content: space-between; padding: 10px 15px; border-bottom: 1px solid #e2e8f0; font-size: 0.95rem; }
          .totals-row:last-child { border-bottom: none; font-weight: 700; font-size: 1.1rem; color: ${info.color}; background-color: #f8fafc; border-radius: 0 0 8px 8px; }
          .notes-box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 15px; background-color: #f8fafc; margin-bottom: 40px; font-size: 0.9rem; }
          .notes-title { font-weight: 700; color: #475569; margin-bottom: 5px; }
          .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 50px; text-align: center; }
          .sig-item p { margin: 0 0 45px 0; font-weight: 700; color: #475569; font-size: 0.9rem; }
          .sig-line { border-top: 1.5px dashed #94a3b8; width: 80%; margin: 0 auto; }
        </style>
        <div class="header">
          ${settings?.companyLogo ? `<img src="${settings.companyLogo}" style="max-height: 75px; max-width: 150px; object-fit: contain;">` : '<div class="logo-placeholder">📦</div>'}
          <div class="company-info">
            <h2>${settings?.companyName || 'شركة أمين المستودع'}</h2>
            <p>${settings?.companyAddress || 'العنوان الرئيسي'}</p>
          </div>
        </div>
        <div class="doc-title">
          <h1>${info.title}</h1>
        </div>
        <div class="metadata-grid">
          <div class="meta-item"><span class="meta-label">رقم السند:</span><span class="meta-val">${t.id}</span></div>
          <div class="meta-item"><span class="meta-label">تاريخ المعاملة:</span><span class="meta-val">${new Date(t.date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
          <div class="meta-item"><span class="meta-label">${t.type === 'transfer' ? 'المستودع المصدر:' : 'المستودع:'}</span><span class="meta-val">${fromWarehouse}</span></div>
          ${t.type === 'transfer' ? `<div class="meta-item"><span class="meta-label">المستودع المستلم:</span><span class="meta-val">${toWarehouse}</span></div>` : ''}
          <div class="meta-item"><span class="meta-label">${t.type === 'in' ? 'المورد:' : t.type === 'return' ? 'المورد المرتجع إليه:' : 'المستلم / الجهة:'}</span><span class="meta-val font-bold">${t.recipient || t.supplier || '---'}</span></div>
          ${t.outputType && t.outputType !== 'none' ? `<div class="meta-item"><span class="meta-label">نوع الإخراج:</span><span class="meta-val">${t.outputType === 'scrap' ? 'سقط' : t.outputType === 'rulers' ? 'مساطر' : 'هدر'}</span></div>` : ''}
          ${t.color ? `<div class="meta-item"><span class="meta-label">اللون:</span><span class="meta-val">${t.color}</span></div>` : ''}
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 50px; text-align: center;">م</th>
              <th>كود / باركود الصنف</th>
              <th>اسم الصنف والمواصفات</th>
              <th style="text-align: center;">الكمية</th>
              <th>الوحدة</th>
              <th style="text-align: left;">سعر الوحدة</th>
              <th style="text-align: left;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: center;">1</td>
              <td style="font-family: monospace;">${t.barcode} ${t.itemBarcode ? `<br><small style="color: #64748b;">(${t.itemBarcode})</small>` : ''}</td>
              <td style="font-weight: bold;">${t.materialName}</td>
              <td style="text-align: center; font-weight: 900; color: ${info.color};">${t.quantity}</td>
              <td>${t.unit}</td>
              <td style="text-align: left;">${price.toLocaleString('ar-EG')} ${settings?.currencySymbol || 'ل.س'}</td>
              <td style="text-align: left; font-weight: bold;">${total.toLocaleString('ar-EG')} ${settings?.currencySymbol || 'ل.س'}</td>
            </tr>
          </tbody>
        </table>
        <div class="totals-section">
          <div class="totals-box">
            <div class="totals-row">
              <span>إجمالي الكمية:</span>
              <span>${t.quantity} ${t.unit}</span>
            </div>
            <div class="totals-row">
              <span>صافي القيمة التقديرية:</span>
              <span>${total.toLocaleString('ar-EG')} ${settings?.currencySymbol || 'ل.س'}</span>
            </div>
          </div>
        </div>
        <div class="notes-box">
          <div class="notes-title">الملاحظات والتوصيات:</div>
          <p style="margin: 0; color: #334155;">${t.notes || 'سند معتمد وموثق بالنظام بدون ملاحظات إضافية.'}</p>
        </div>
        <div class="signatures">
          <div class="sig-item">
            <p>${t.type === 'transfer' ? 'أمين المستودع (المسلم)' : 'أمين المستودع المعني'}</p>
            <div class="sig-line"></div>
            <p style="margin-top: 10px; font-weight: normal; color: #64748b; font-size: 0.85rem;">${settings?.signatureNames?.keeper || 'أمين المستودع'}</p>
          </div>
          <div class="sig-item">
            <p>${t.type === 'transfer' ? 'أمين المستودع (المستلم)' : 'المستلم أو الجهة الطالبة'}</p>
            <div class="sig-line"></div>
            <p style="margin-top: 10px; font-weight: normal; color: #64748b; font-size: 0.85rem;">${t.recipient || settings?.signatureNames?.accountant || 'المستلم المعتمد'}</p>
          </div>
          <div class="sig-item">
            <p>اعتماد إدارة المستودعات والمالية</p>
            <div class="sig-line"></div>
            <p style="margin-top: 10px; font-weight: normal; color: #64748b; font-size: 0.85rem;">${settings?.signatureNames?.manager || 'مدير المستودعات'}</p>
          </div>
        </div>
      </div>
    `;
    triggerPrint(html);
  };

  // Export transaction voucher image
  const handleExportTransactionImage = async () => {
    const element = voucherPreviewRef.current;
    if (!element || !selectedTransactionVoucher) return;
    setIsGeneratingVoucher(true);
    try {
      const canvas = await html2canvas(element, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const fullFileName = `سند_حركة_${selectedTransactionVoucher.id}.png`;

      if ((window as any).AppCompatibility) {
        (window as any).AppCompatibility.safeDownload(dataUrl, fullFileName, 'image/png');
      } else {
        const link = document.createElement('a');
        link.download = fullFileName;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error('Error generating image:', err);
    } finally {
      setIsGeneratingVoucher(false);
    }
  };

  // Export transaction voucher Excel
  const handleExportTransactionExcel = async (t: Transaction) => {
    setIsGeneratingVoucher(true);
    try {
      const info = getVoucherTitleInfo(t);
      const material = materials.find(m => m.id === t.materialId);
      const price = material?.price || 0;
      const total = price * t.quantity;
      const fromWarehouse = warehouses.find(w => w.id === t.warehouseId)?.name || 'المستودع الرئيسي';
      const toWarehouse = t.toWarehouseId ? warehouses.find(w => w.id === t.toWarehouseId)?.name || '---' : null;

      const aoaData: any[][] = [
        [settings?.companyName || 'شركة أمين المستودع'],
        [settings?.companyAddress || 'العنوان الرئيسي'],
        [],
        [info.title],
        [],
        ['رقم السند:', t.id, '', 'تاريخ المعاملة:', new Date(t.date).toLocaleDateString('ar-EG')],
        ['المستودع المصدر:', fromWarehouse, '', t.type === 'transfer' ? 'المستودع المستلم:' : 'المستلم / المورد:', t.type === 'transfer' ? toWarehouse : (t.recipient || t.supplier || '---')],
        [],
        ['م', 'كود / باركود الصنف', 'اسم الصنف والمواصفات', 'الكمية', 'الوحدة', 'سعر الوحدة', 'القيمة الإجمالية'],
        [1, t.barcode || '', `${t.materialName} ${t.color ? `(اللون: ${t.color})` : ''}`, t.quantity, t.unit, price, total],
        [],
        ['إجمالي الكمية:', t.quantity, '', 'صافي القيمة التقديرية:', `${total} ${settings?.currencySymbol || 'ل.س'}`],
        [],
        ['الملاحظات والتوصيات:', t.notes || '---'],
        [],
        [],
        ['توقيع المسلم', '', 'توقيع المستلم', '', 'اعتماد الإدارة والمالية'],
        [settings?.signatureNames?.keeper || 'أمين المستودع', '', t.recipient || 'المستلم المعتمد', '', settings?.signatureNames?.manager || 'مدير المستودعات']
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(aoaData);

      if (!worksheet['!views']) worksheet['!views'] = [];
      worksheet['!views'].push({ RTL: true });

      worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } }
      ];

      const colWidths = [
        { wch: 5 },
        { wch: 18 },
        { wch: 30 },
        { wch: 15 },
        { wch: 10 },
        { wch: 15 },
        { wch: 18 }
      ];
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'سند الحركة');

      const fullFileName = `سند_حركة_${t.id}.xlsx`;
      
      if ((window as any).AppCompatibility) {
        const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        const env = (window as any).AppCompatibility.getEnvironment();
        if (env === 'android-webview' || env === 'appcreator24') {
          const excelBase64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
          (window as any).AppCompatibility.safeDownload(`data:${mimeType};base64,${excelBase64}`, fullFileName, mimeType);
        } else {
          const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
          const blob = new Blob([excelBuffer], { type: mimeType });
          const url = URL.createObjectURL(blob);
          (window as any).AppCompatibility.safeDownload(url, fullFileName, mimeType);
          setTimeout(() => URL.revokeObjectURL(url), 60000);
        }
      } else {
        XLSX.writeFile(workbook, fullFileName);
      }
    } catch (err) {
      console.error('Error generating Excel:', err);
    } finally {
      setIsGeneratingVoucher(false);
    }
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

      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border dark:border-gray-700 flex flex-col md:flex-row gap-4 items-center justify-between no-print">
        <div className="relative w-full md:w-96">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="بحث في الحركات (مادة، باركود، مستلم، رقم)..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            className="w-full pr-10 pl-10 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-sky-500 text-sm"
          />
          <button 
            type="button"
            onClick={() => setIsMainScannerOpen(true)}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
            title="مسح باركود بالكاميرا"
          >
            <Camera size={18} />
          </button>
        </div>

        {showArchive && (
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            <div className="flex items-center gap-2">
                <label className="text-sm font-bold text-gray-500 dark:text-gray-400">من:</label>
                <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="p-1.5 border rounded text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div className="flex items-center gap-2">
                <label className="text-sm font-bold text-gray-500 dark:text-gray-400">إلى:</label>
                <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="p-1.5 border rounded text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            {(filterStartDate || filterEndDate) && (
                <button onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }} className="text-xs text-red-500 hover:underline">إلغاء الفلتر</button>
            )}
          </div>
        )}
      </div>

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
              <th scope="col" className="px-4 py-3">نوع الإخراج</th>
              <th scope="col" className="px-4 py-3">المستلم / المورد</th>
              <th scope="col" className="px-4 py-3">الملاحظات</th>
              <th scope="col" className="px-4 py-3 text-center">إجراءات وسندات</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map(transaction => (
              <tr key={transaction.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="px-4 py-3 text-xs whitespace-nowrap">
                    <div>{new Date(transaction.date).toLocaleDateString('ar-EG')}</div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">
                        {new Date(transaction.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                </td>
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
                <td className="px-4 py-3 text-xs">
                    {transaction.outputType === 'scrap' ? 'سقط' : 
                     transaction.outputType === 'rulers' ? 'مساطر' : 
                     transaction.outputType === 'waste' ? 'هدر' : 'بدون'}
                </td>
                <td className="px-4 py-3">
                    <div className="font-medium text-gray-700 dark:text-gray-300">{transaction.recipient || transaction.supplier || '-'}</div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{transaction.notes || '-'}</td>
                <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                        <button 
                            onClick={() => setSelectedTransactionVoucher(transaction)}
                            className="px-2 py-1 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/20 dark:hover:bg-sky-900/40 text-sky-600 dark:text-sky-400 font-bold text-xs rounded transition-colors inline-flex items-center gap-1 border border-sky-200 dark:border-sky-900/30"
                            title="توليد وتصدير سند رسمي"
                        >
                            <FileText size={13} />
                            <span>سند</span>
                        </button>
                        {isAdmin && (
                            <>
                                {transaction.type === 'out' && (
                                    <button onClick={() => handleReturnAction(transaction)} className="p-1 text-amber-500 hover:text-amber-700" title="إرجاع للمستودع">
                                        <RotateCcw size={16}/>
                                    </button>
                                )}
                                <button onClick={() => { setEditingTransaction(transaction); setIsModalOpen(true); }} className="p-1 text-blue-500 hover:text-blue-700" title="تعديل"><Edit size={16}/></button>
                                <button onClick={() => setDeleteConfirm(transaction.id)} className="p-1 text-red-500 hover:text-red-700" title="حذف"><Trash2 size={16}/></button>
                            </>
                        )}
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredTransactions.length === 0 && <div className="p-8 text-center text-gray-500 dark:text-gray-400">لا توجد حركات مسجلة للفترة أو البحث المحدد.</div>}
      </div>

      {isModalOpen && <TransactionModal materials={materials} warehouses={warehouses} editTransaction={editingTransaction} onClose={() => { setIsModalOpen(false); setEditingTransaction(null); }} onSave={handleSave} />}
      
      {isBulkModalOpen && <BulkTransactionModal materials={materials} warehouses={warehouses} onClose={() => setIsBulkModalOpen(false)} onSave={handleSaveBulk} />}

      {/* Main Page Camera Barcode Scanner Modal */}
      <CameraBarcodeScannerModal
          isOpen={isMainScannerOpen}
          onClose={() => setIsMainScannerOpen(false)}
          onScan={(scanned) => setTableSearch(scanned)}
          title="مسح الباركود للبحث عن حركة"
          description="وجّه الكاميرا نحو الباركود لعرض الحركات المرتبطة به فوراً"
      />

      {/* Unified Transaction Voucher Preview Modal */}
      {selectedTransactionVoucher && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex justify-center items-center p-4 overflow-y-auto">
          <div className="bg-gray-100 dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-5xl my-8 flex flex-col lg:flex-row overflow-hidden border dark:border-gray-800 animate-in fade-in zoom-in-95 duration-250">
            
            {/* Sidebar Controls */}
            <div className="w-full lg:w-80 bg-white dark:bg-gray-900 p-6 border-b lg:border-b-0 lg:border-l border-gray-200 dark:border-gray-800 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <Sparkles size={18} className="text-sky-500 animate-pulse" />
                    تصدير وتوليد سند رسمي
                  </h3>
                  <button 
                    onClick={() => setSelectedTransactionVoucher(null)} 
                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="bg-sky-50 dark:bg-sky-950/10 border border-sky-100 dark:border-sky-900/30 rounded-xl p-4 mb-6">
                  <span className="font-bold text-xs text-sky-800 dark:text-sky-400 uppercase tracking-wider block mb-1">
                    {getVoucherTitleInfo(selectedTransactionVoucher).title}
                  </span>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    سند رسمي معتمد للحركات المخزنية. يمكنك إرسال هذا السند لقسم الحسابات والإدارة فوراً.
                  </p>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={() => handlePrintTransactionVoucher(selectedTransactionVoucher)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-red-500/10 active:scale-[0.98]"
                  >
                    <span className="flex items-center gap-2">
                      <Printer size={16} />
                      طباعة السند الورقي
                    </span>
                    <span className="text-[10px] bg-red-500 text-red-100 px-1.5 py-0.5 rounded">PDF</span>
                  </button>

                  <button 
                    onClick={handleExportTransactionImage}
                    disabled={isGeneratingVoucher}
                    className="w-full flex items-center justify-between px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-indigo-500/10 active:scale-[0.98] disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <ImageIcon size={16} />
                      {isGeneratingVoucher ? 'جاري التحويل...' : 'تحميل وحفظ كصورة'}
                    </span>
                    <span className="text-[10px] bg-indigo-500 text-indigo-100 px-1.5 py-0.5 rounded">PNG</span>
                  </button>

                  <button 
                    onClick={() => handleExportTransactionExcel(selectedTransactionVoucher)}
                    disabled={isGeneratingVoucher}
                    className="w-full flex items-center justify-between px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-emerald-500/10 active:scale-[0.98] disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <FileSpreadsheet size={16} />
                      {isGeneratingVoucher ? 'جاري التصدير...' : 'تحميل كملف إكسل'}
                    </span>
                    <span className="text-[10px] bg-emerald-500 text-emerald-100 px-1.5 py-0.5 rounded">XLSX</span>
                  </button>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-100 dark:border-gray-800 text-center">
                <button 
                  onClick={() => setSelectedTransactionVoucher(null)}
                  className="w-full py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-colors"
                >
                  إغلاق المعاينة والتراجع
                </button>
              </div>
            </div>

            {/* Document Live Preview Area */}
            <div className="flex-1 p-6 lg:p-10 overflow-y-auto max-h-[80vh] flex justify-center bg-gray-100 dark:bg-gray-950">
              <div className="shadow-xl rounded-lg overflow-hidden border dark:border-gray-800 bg-white text-gray-900 w-full max-w-[720px] shrink-0 p-8 relative flex flex-col" style={{ minHeight: '842px' }}>
                
                {/* HTML Capture Target */}
                <div id="transaction-voucher-capture" ref={voucherPreviewRef} className="p-6 bg-white text-gray-900 w-full flex-1 flex flex-col text-right" style={{ direction: 'rtl' }}>
                  
                  {/* Top Letterhead */}
                  <div className="flex justify-between items-center border-b-2 border-gray-300 pb-4 mb-6">
                    {settings?.companyLogo ? (
                      <img src={settings.companyLogo} alt="Corporate Logo" className="max-h-16 max-w-[140px] object-contain" />
                    ) : (
                      <div className="text-3xl">📦</div>
                    )}
                    <div className="text-right">
                      <h2 className="text-lg font-black text-gray-950">{settings?.companyName || 'شركة أمين المستودع'}</h2>
                      <p className="text-xs text-gray-500">{settings?.companyAddress || 'العنوان الرئيسي للشركة / المستودعات'}</p>
                    </div>
                  </div>

                  {/* Voucher Title */}
                  <div className="text-center my-4">
                    <span className={`inline-block px-6 py-2 border-2 font-bold text-sm tracking-wide rounded-lg ${getVoucherTitleInfo(selectedTransactionVoucher).badge}`}>
                      {getVoucherTitleInfo(selectedTransactionVoucher).title}
                    </span>
                  </div>

                  {/* Metadata fields */}
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-xs">
                    <div>
                      <span className="font-bold text-gray-500 ml-1">رقم السند:</span>
                      <span className="font-mono text-gray-900">{selectedTransactionVoucher.id}</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-500 ml-1">تاريخ المعاملة:</span>
                      <span className="text-gray-900">{new Date(selectedTransactionVoucher.date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-500 ml-1">
                        {selectedTransactionVoucher.type === 'transfer' ? 'المستودع المصدر:' : 'المستودع:'}
                      </span>
                      <span className="text-gray-900 font-bold">
                        {warehouses.find(w => w.id === selectedTransactionVoucher.warehouseId)?.name || 'المستودع الرئيسي'}
                      </span>
                    </div>
                    {selectedTransactionVoucher.type === 'transfer' ? (
                      <div>
                        <span className="font-bold text-gray-500 ml-1">المستودع المستلم:</span>
                        <span className="text-gray-900 font-bold">
                          {warehouses.find(w => w.id === selectedTransactionVoucher.toWarehouseId)?.name || '---'}
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="font-bold text-gray-500 ml-1">
                          {selectedTransactionVoucher.type === 'in' ? 'المورد:' : selectedTransactionVoucher.type === 'return' ? 'المورد المرتجع إليه:' : 'المستلم / الجهة:'}
                        </span>
                        <span className="text-gray-900 font-bold">{selectedTransactionVoucher.recipient || selectedTransactionVoucher.supplier || '---'}</span>
                      </div>
                    )}
                    {selectedTransactionVoucher.outputType && selectedTransactionVoucher.outputType !== 'none' && (
                      <div>
                        <span className="font-bold text-gray-500 ml-1">نوع الإخراج:</span>
                        <span className="text-gray-900">
                          {selectedTransactionVoucher.outputType === 'scrap' ? 'سقط' : selectedTransactionVoucher.outputType === 'rulers' ? 'مساطر' : 'هدر'}
                        </span>
                      </div>
                    )}
                    {selectedTransactionVoucher.color && (
                      <div>
                        <span className="font-bold text-gray-500 ml-1">اللون:</span>
                        <span className="text-gray-900">{selectedTransactionVoucher.color}</span>
                      </div>
                    )}
                  </div>

                  {/* Items Table */}
                  <table className="w-full text-sm border-collapse border border-gray-300 text-right mb-6">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700 font-bold text-xs">
                        <th className="p-3 border border-gray-300 text-center w-12">م</th>
                        <th className="p-3 border border-gray-300">كود / باركود الصنف</th>
                        <th className="p-3 border border-gray-300">اسم الصنف والمواصفات</th>
                        <th className="p-3 border border-gray-300 text-center">الكمية</th>
                        <th className="p-3 border border-gray-300">الوحدة</th>
                        <th className="p-3 border border-gray-300 text-left">أحدث سعر</th>
                        <th className="p-3 border border-gray-300 text-left">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-xs text-gray-900">
                        <td className="p-3 border border-gray-300 text-center">1</td>
                        <td className="p-3 border border-gray-300 font-mono text-gray-500">
                          {selectedTransactionVoucher.barcode}
                          {selectedTransactionVoucher.itemBarcode && (
                            <span className="block text-[10px] text-blue-600 font-bold">({selectedTransactionVoucher.itemBarcode})</span>
                          )}
                        </td>
                        <td className="p-3 border border-gray-300 font-bold">
                          {selectedTransactionVoucher.materialName}
                          {selectedTransactionVoucher.color && (
                            <span className="block text-[10px] text-gray-500 font-normal">اللون: {selectedTransactionVoucher.color}</span>
                          )}
                        </td>
                        <td className="p-3 border border-gray-300 text-center font-black text-sm text-gray-900">
                          {selectedTransactionVoucher.quantity}
                        </td>
                        <td className="p-3 border border-gray-300">{selectedTransactionVoucher.unit}</td>
                        <td className="p-3 border border-gray-300 text-left">
                          {(materials.find(m => m.id === selectedTransactionVoucher.materialId)?.price || 0).toLocaleString('ar-EG')} {settings?.currencySymbol || 'ل.س'}
                        </td>
                        <td className="p-3 border border-gray-300 text-left font-bold text-gray-950">
                          {((materials.find(m => m.id === selectedTransactionVoucher.materialId)?.price || 0) * selectedTransactionVoucher.quantity).toLocaleString('ar-EG')} {settings?.currencySymbol || 'ل.س'}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Totals Section */}
                  <div className="flex justify-end mb-6">
                    <div className="w-72 bg-gray-50 border border-gray-200 rounded-lg text-xs overflow-hidden">
                      <div className="flex justify-between p-2.5 border-b border-gray-200">
                        <span className="text-gray-500 font-bold">إجمالي الكمية:</span>
                        <span className="font-bold text-gray-900">{selectedTransactionVoucher.quantity} {selectedTransactionVoucher.unit}</span>
                      </div>
                      <div className="flex justify-between p-2.5 bg-gray-100 text-gray-900 font-black">
                        <span>صافي القيمة التقديرية:</span>
                        <span>
                          {((materials.find(m => m.id === selectedTransactionVoucher.materialId)?.price || 0) * selectedTransactionVoucher.quantity).toLocaleString('ar-EG')} {settings?.currencySymbol || 'ل.س'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notes Area */}
                  <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 text-xs mb-8 flex-1">
                    <span className="font-bold text-gray-500 block mb-1">الملاحظات والتوصيات:</span>
                    <p className="text-gray-700 leading-relaxed">{selectedTransactionVoucher.notes || 'سند معتمد وموثق بالنظام بدون ملاحظات إضافية.'}</p>
                  </div>

                  {/* Standard signatures panel */}
                  <div className="grid grid-cols-3 gap-4 text-center mt-auto text-[11px] text-gray-600">
                    <div>
                      <p className="font-bold text-gray-800 mb-10">
                        {selectedTransactionVoucher.type === 'transfer' ? 'أمين المستودع (المسلم)' : 'أمين المستودع المعني'}
                      </p>
                      <div className="border-t border-dashed border-gray-400 w-3/4 mx-auto my-2"></div>
                      <p className="text-gray-400 font-light mt-1">{settings?.signatureNames?.keeper || 'أمين المستودع'}</p>
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 mb-10">
                        {selectedTransactionVoucher.type === 'transfer' ? 'أمين المستودع (المستلم)' : 'المستلم أو الجهة'}
                      </p>
                      <div className="border-t border-dashed border-gray-400 w-3/4 mx-auto my-2"></div>
                      <p className="text-gray-400 font-light mt-1">{selectedTransactionVoucher.recipient || settings?.signatureNames?.accountant || 'المستلم المعتمد'}</p>
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 mb-10">اعتماد الإدارة والمالية</p>
                      <div className="border-t border-dashed border-gray-400 w-3/4 mx-auto my-2"></div>
                      <p className="text-gray-400 font-light mt-1">{settings?.signatureNames?.manager || 'مدير المستودعات'}</p>
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      )}

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
