
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, Material, SettingsData } from '@/types';
import { addTransaction, deleteTransaction, updateTransaction, getSettings } from '@/services/mockApi';
import { Plus, ArrowDownLeft, ArrowUpRight, Calendar, Info, Search, Edit, Trash2, Printer } from 'lucide-react';

interface TransactionsProps {
  transactions: Transaction[];
  materials: Material[];
  onDataChange: () => void;
  userRole: 'admin' | 'visitor';
}

const TransactionModal: React.FC<{ 
    materials: Material[], 
    editTransaction?: Transaction | null,
    onClose: () => void; 
    onSave: (transaction: any) => void; 
}> = ({ materials, editTransaction, onClose, onSave }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredMaterials = materials.filter(m => 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.barcode.includes(searchTerm)
    );
    
    const [materialId, setMaterialId] = useState(editTransaction?.materialId || filteredMaterials[0]?.id || '');
    const [quantity, setQuantity] = useState(editTransaction?.quantity || 1);
    const [recipient, setRecipient] = useState(editTransaction?.recipient || '');
    const [itemBarcode, setItemBarcode] = useState(editTransaction?.itemBarcode || '');
    const [notes, setNotes] = useState(editTransaction?.notes || '');
    const [color, setColor] = useState(editTransaction?.color || '');
    const [date, setDate] = useState(editTransaction ? new Date(editTransaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const [error, setError] = useState('');

    const selectedMaterial = materials.find(m => m.id === materialId);

    useEffect(() => {
        if (!editTransaction && selectedMaterial?.color) {
            setColor(selectedMaterial.color);
        }
    }, [materialId, selectedMaterial, editTransaction]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMaterial) { setError('الرجاء اختيار مادة.'); return; }
        
        // Stock check only for new "out" or if quantity increased significantly on "out"
        if (!editTransaction && selectedMaterial.currentStock < quantity) {
             setError('الكمية المسحوبة أكبر من المتاح.'); return; 
        }
        
        const payload = { 
            type: editTransaction?.type || 'out', 
            materialId, 
            quantity, 
            recipient, 
            itemBarcode,
            notes, 
            color,
            date: new Date(date).toISOString() 
        };

        if (editTransaction) {
            onSave({ ...editTransaction, ...payload, materialName: selectedMaterial.name, supplier: selectedMaterial.supplier, barcode: selectedMaterial.barcode, unit: selectedMaterial.unit });
        } else {
            onSave(payload);
        }
    };

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg border dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4 flex items-center text-gray-900 dark:text-white">
                {editTransaction ? <Edit className="ml-2 text-blue-500" /> : <ArrowDownLeft className="ml-2 text-red-500" />}
                {editTransaction ? 'تعديل الحركة' : 'إضافة حركة صرف (صادر)'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 space-y-2">
                        <label className="block mb-1 text-sm font-medium dark:text-gray-200">اختر المادة</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute right-2 top-2.5 text-gray-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="ابحث..." 
                                    value={searchTerm} 
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full p-2 pr-9 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                                    disabled={!!editTransaction}
                                />
                            </div>
                            <select 
                                value={materialId} 
                                onChange={(e) => setMaterialId(e.target.value)} 
                                required 
                                disabled={!!editTransaction}
                                className="flex-[1.5] p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 text-sm"
                            >
                                {filteredMaterials.length > 0 ? (
                                    filteredMaterials.map(m => <option key={m.id} value={m.id}>{m.name} (المتاح: {m.currentStock} {m.unit})</option>)
                                ) : (
                                    <option value="">لا توجد نتائج</option>
                                )}
                            </select>
                        </div>
                    </div>

                    <div className="md:col-span-2 bg-sky-50 dark:bg-sky-900/40 p-3 rounded-lg flex flex-wrap gap-4 text-[10px] md:text-xs text-sky-800 dark:text-sky-200 border dark:border-sky-800">
                        <div className="flex items-center"><Info size={14} className="ml-1"/> <strong>المورد:</strong> {selectedMaterial?.supplier || '-'}</div>
                        <div className="flex items-center"><Info size={14} className="ml-1"/> <strong>الباركود:</strong> {selectedMaterial?.barcode || '-'}</div>
                        <div className="flex items-center"><Info size={14} className="ml-1"/> <strong>الفئة:</strong> {selectedMaterial?.category || '-'}</div>
                    </div>

                    <div>
                        <label className="block mb-1 text-sm font-medium dark:text-gray-200">الكمية</label>
                        <input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} min="1" required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>

                    <div>
                        <label className="block mb-1 text-sm font-medium dark:text-gray-200">اللون</label>
                        <input type="text" value={color} onChange={(e) => setColor(e.target.value)} placeholder="اللون..." className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>

                    <div>
                        <label className="block mb-1 text-sm font-medium dark:text-gray-200">اسم المستلم</label>
                        <input type="text" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="الجهة أو الشخص" required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>

                    <div>
                        <label className="block mb-1 text-sm font-medium dark:text-gray-200">باركود الصنف / القصة</label>
                        <input type="text" value={itemBarcode} onChange={(e) => setItemBarcode(e.target.value)} placeholder="باركود الصنف المراد تسليمه" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>

                    <div>
                        <label className="block mb-1 text-sm font-medium dark:text-gray-200">تاريخ الحركة</label>
                        <div className="relative">
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full p-2 pr-10 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            <Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block mb-1 text-sm font-medium dark:text-gray-200">ملاحظات</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="تفاصيل إضافية..." className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" rows={2}></textarea>
                </div>

                {error && <div className="p-2 text-sm text-red-600 bg-red-100 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-800">{error}</div>}

                <div className="flex justify-end space-x-2 space-x-reverse pt-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">إلغاء</button>
                    <button type="submit" className="px-6 py-2 bg-sky-600 text-white rounded shadow hover:bg-sky-700 transition-colors">
                        {editTransaction ? 'تحديث' : 'حفظ'}
                    </button>
                </div>
            </form>
        </div>
      </div>
    );
};

const Transactions: React.FC<TransactionsProps> = ({ transactions, materials, onDataChange, userRole }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

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
      return result.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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

  const handleDelete = (id: string) => {
      deleteTransaction(id);
      onDataChange();
      setDeleteConfirm(null);
  };

  const handlePrintVoucher = (t: Transaction) => {
    const settings = getSettings();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>سند حركة مخزنية</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
            body { font-family: 'Cairo', sans-serif; direction: rtl; margin: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double #333; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { max-width: 100px; }
            .voucher-title { text-align: center; font-size: 24px; font-weight: bold; border: 2px solid #333; padding: 10px; width: fit-content; margin: 0 auto 30px; }
            .details-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
            .detail-item { border-bottom: 1px dashed #ccc; padding: 5px 0; }
            .detail-label { font-weight: bold; color: #666; width: 120px; display: inline-block; }
            .signatures { display: grid; grid-template-cols: 1fr 1fr 1fr; gap: 40px; margin-top: 80px; text-align: center; }
            .sig-line { border-top: 1px solid #000; margin-top: 50px; }
            .type-badge { padding: 5px 15px; border-radius: 5px; font-weight: bold; }
            .type-in { background: #d1fae5; color: #065f46; }
            .type-out { background: #fee2e2; color: #991b1b; }
          </style>
        </head>
        <body>
          <div class="header">
            ${settings.companyLogo ? `<img src="${settings.companyLogo}" class="logo" />` : '<div></div>'}
            <div style="text-align:left">
              <h2 style="margin:0">${settings.companyName}</h2>
              <p style="margin:5px 0">${settings.companyAddress}</p>
            </div>
          </div>
          <div class="voucher-title">سند ${t.type === 'in' ? 'توريد' : 'صرف'} مخزني</div>
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
          <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">الحركات اليومية</h1>
        {userRole === 'admin' && (
            <button onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }} className="flex items-center px-4 py-2 bg-sky-500 text-white rounded-lg shadow hover:bg-sky-600 disabled:bg-sky-300 transition-all" disabled={materials.length === 0}>
                <Plus className="ml-2" size={20} /> إضافة حركة صرف
            </button>
        )}
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border dark:border-gray-700 flex flex-wrap items-center gap-4">
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

      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-x-auto border dark:border-gray-700">
        <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 border-b dark:border-gray-600">
            <tr>
              <th scope="col" className="px-6 py-3">التاريخ</th>
              <th scope="col" className="px-6 py-3">النوع</th>
              <th scope="col" className="px-6 py-3">المادة / اللون</th>
              <th scope="col" className="px-6 py-3">باركود المادة</th>
              <th scope="col" className="px-6 py-3">باركود الصنف</th>
              <th scope="col" className="px-6 py-3">الكمية</th>
              <th scope="col" className="px-6 py-3">المستلم / المورد</th>
              <th scope="col" className="px-6 py-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map(transaction => (
              <tr key={transaction.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="px-6 py-4 text-xs whitespace-nowrap">{new Date(transaction.date).toLocaleDateString('ar-EG')}</td>
                <td className="px-6 py-4">
                    {transaction.type === 'in' ? (
                        <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-bold text-xs bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">
                            <ArrowUpRight size={14} className="ml-1"/> وارد
                        </span>
                    ) : (
                        <span className="flex items-center text-red-600 dark:text-red-400 font-bold text-xs bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                            <ArrowDownLeft size={14} className="ml-1"/> صادر
                        </span>
                    )}
                </td>
                <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 dark:text-white">{transaction.materialName}</div>
                    {transaction.color && <div className="text-[10px] text-gray-400">اللون: {transaction.color}</div>}
                </td>
                <td className="px-6 py-4 font-mono text-xs">{transaction.barcode}</td>
                <td className="px-6 py-4 font-mono text-xs text-blue-500 font-bold">{transaction.itemBarcode || '-'}</td>
                <td className={`px-6 py-4 font-black ${transaction.type === 'in' ? 'text-emerald-500' : 'text-red-500'}`}>
                    {transaction.type === 'in' ? '+' : '-'}{transaction.quantity} {transaction.unit}
                </td>
                <td className="px-6 py-4">
                    <div className="font-medium text-gray-700 dark:text-gray-300">{transaction.recipient}</div>
                </td>
                <td className="px-6 py-4 flex items-center gap-3">
                    <button onClick={() => handlePrintVoucher(transaction)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" title="طباعة سند"><Printer size={18}/></button>
                    {userRole === 'admin' && (
                        <>
                            <button onClick={() => { setEditingTransaction(transaction); setIsModalOpen(true); }} className="text-blue-500 hover:text-blue-700" title="تعديل"><Edit size={18}/></button>
                            <button onClick={() => setDeleteConfirm(transaction.id)} className="text-red-500 hover:text-red-700" title="حذف"><Trash2 size={18}/></button>
                        </>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredTransactions.length === 0 && <div className="p-12 text-center text-gray-500 dark:text-gray-400">لا توجد حركات مسجلة للفترة المحددة.</div>}
      </div>

      {isModalOpen && <TransactionModal materials={materials} editTransaction={editingTransaction} onClose={() => { setIsModalOpen(false); setEditingTransaction(null); }} onSave={handleSave} />}
      
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
