
import React, { useState, useEffect } from 'react';
import { Transaction, Material } from '@/types';
import { addTransaction } from '@/services/mockApi';
import { Plus, ArrowDownLeft, ArrowUpRight, Calendar, Info, Search } from 'lucide-react';

interface TransactionsProps {
  transactions: Transaction[];
  materials: Material[];
  onDataChange: () => void;
  userRole: 'admin' | 'visitor';
}

const TransactionModal: React.FC<{ 
    materials: Material[], 
    onClose: () => void; 
    onSave: (transaction: Omit<Transaction, 'id' | 'materialName' | 'supplier' | 'category' | 'barcode' | 'unit' | 'materialType'>) => void; 
}> = ({ materials, onClose, onSave }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredMaterials = materials.filter(m => 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.barcode.includes(searchTerm)
    );
    
    const [materialId, setMaterialId] = useState(filteredMaterials[0]?.id || '');
    const [quantity, setQuantity] = useState(1);
    const [recipient, setRecipient] = useState('');
    const [notes, setNotes] = useState('');
    const [color, setColor] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [error, setError] = useState('');

    const selectedMaterial = materials.find(m => m.id === materialId);

    // Sync color with material default if exists, when material changes
    useEffect(() => {
        if (selectedMaterial?.color) {
            setColor(selectedMaterial.color);
        } else {
            setColor('');
        }
    }, [materialId, selectedMaterial]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMaterial) { setError('الرجاء اختيار مادة.'); return; }
        if (quantity > selectedMaterial.currentStock) { setError('الكمية المسحوبة أكبر من المتاح.'); return; }
        
        onSave({ 
            type: 'out', 
            materialId, 
            quantity, 
            recipient, 
            notes, 
            color,
            date: new Date(date).toISOString() 
        });
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4 flex items-center text-gray-900 dark:text-white">
                <ArrowDownLeft className="ml-2 text-red-500" /> إضافة حركة صرف (صادر)
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 space-y-2">
                        <label className="block mb-1 text-sm font-medium">اختر المادة</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute right-2 top-2.5 text-gray-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="ابحث باسم المادة أو الباركود..." 
                                    value={searchTerm} 
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full p-2 pr-9 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                                />
                            </div>
                            <select 
                                value={materialId} 
                                onChange={(e) => setMaterialId(e.target.value)} 
                                required 
                                className="flex-[1.5] p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 text-sm"
                            >
                                {filteredMaterials.length > 0 ? (
                                    filteredMaterials.map(m => <option key={m.id} value={m.id}>{m.name} (المتاح: {m.currentStock} {m.unit})</option>)
                                ) : (
                                    <option value="">لا توجد نتائج للبحث</option>
                                )}
                            </select>
                        </div>
                    </div>

                    {/* Auto-filled fields info section */}
                    <div className="md:col-span-2 bg-sky-50 dark:bg-sky-900/20 p-3 rounded-lg flex flex-wrap gap-4 text-[10px] md:text-xs text-sky-800 dark:text-sky-300">
                        <div className="flex items-center"><Info size={14} className="ml-1"/> <strong>المورد:</strong> {selectedMaterial?.supplier || '-'}</div>
                        <div className="flex items-center"><Info size={14} className="ml-1"/> <strong>الباركود:</strong> {selectedMaterial?.barcode || '-'}</div>
                        <div className="flex items-center"><Info size={14} className="ml-1"/> <strong>الفئة:</strong> {selectedMaterial?.category || '-'}</div>
                    </div>

                    <div>
                        <label className="block mb-1 text-sm font-medium">الكمية المسحوبة</label>
                        <input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} min="1" required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>

                    <div>
                        <label className="block mb-1 text-sm font-medium">اللون</label>
                        <input type="text" value={color} onChange={(e) => setColor(e.target.value)} placeholder="مثلاً: أحمر، فضي..." className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>

                    <div>
                        <label className="block mb-1 text-sm font-medium">اسم المستلم</label>
                        <input type="text" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="الجهة أو الشخص" required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>

                    <div>
                        <label className="block mb-1 text-sm font-medium">تاريخ الحركة</label>
                        <div className="relative">
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full p-2 pr-10 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            <Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block mb-1 text-sm font-medium">ملاحظات</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="تفاصيل إضافية..." className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" rows={2}></textarea>
                </div>

                {error && <div className="p-2 text-sm text-red-600 bg-red-100 dark:bg-red-900/30 rounded">{error}</div>}

                <div className="flex justify-end space-x-2 space-x-reverse pt-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 dark:text-white rounded hover:bg-gray-300 transition-colors">إلغاء</button>
                    <button type="submit" className="px-6 py-2 bg-sky-600 text-white rounded shadow hover:bg-sky-700 transition-colors">حفظ الحركة</button>
                </div>
            </form>
        </div>
      </div>
    );
};

const Transactions: React.FC<TransactionsProps> = ({ transactions, materials, onDataChange, userRole }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const sortedTransactions = [...transactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleSave = (transaction: any) => {
    addTransaction(transaction);
    onDataChange();
    setIsModalOpen(false);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">الحركات اليومية</h1>
        {userRole === 'admin' && (
            <button onClick={() => setIsModalOpen(true)} className="flex items-center px-4 py-2 bg-sky-500 text-white rounded-lg shadow hover:bg-sky-600 disabled:bg-sky-300 transition-all" disabled={materials.length === 0}>
                <Plus className="ml-2" size={20} /> إضافة حركة صرف
            </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-x-auto border dark:border-gray-700">
        <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">التاريخ</th>
              <th scope="col" className="px-6 py-3">النوع</th>
              <th scope="col" className="px-6 py-3">المادة / اللون</th>
              <th scope="col" className="px-6 py-3">الباركود</th>
              <th scope="col" className="px-6 py-3">الكمية</th>
              <th scope="col" className="px-6 py-3">المستلم / المورد</th>
              <th scope="col" className="px-6 py-3">ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {sortedTransactions.map(transaction => (
              <tr key={transaction.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                <td className="px-6 py-4 text-xs whitespace-nowrap">{new Date(transaction.date).toLocaleDateString('ar-EG')}</td>
                <td className="px-6 py-4">
                    {transaction.type === 'in' ? (
                        <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                            <ArrowUpRight size={14} className="ml-1"/> وارد
                        </span>
                    ) : (
                        <span className="flex items-center text-red-600 dark:text-red-400 font-bold text-xs">
                            <ArrowDownLeft size={14} className="ml-1"/> صادر
                        </span>
                    )}
                </td>
                <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 dark:text-white">{transaction.materialName}</div>
                    {transaction.color && <div className="text-[10px] text-gray-400">اللون: {transaction.color}</div>}
                </td>
                <td className="px-6 py-4 font-mono text-xs">{transaction.barcode}</td>
                <td className={`px-6 py-4 font-black ${transaction.type === 'in' ? 'text-emerald-500' : 'text-red-500'}`}>
                    {transaction.type === 'in' ? '+' : '-'}{transaction.quantity} {transaction.unit}
                </td>
                <td className="px-6 py-4">
                    <div className="font-medium">{transaction.recipient}</div>
                    <div className="text-[10px] text-gray-400">{transaction.supplier}</div>
                </td>
                <td className="px-6 py-4 text-xs truncate max-w-[150px]" title={transaction.notes}>{transaction.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedTransactions.length === 0 && <div className="p-8 text-center text-gray-500">لا توجد حركات مسجلة حالياً.</div>}
      </div>

      {isModalOpen && <TransactionModal materials={materials.filter(m => m.currentStock > 0)} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
    </div>
  );
};

export default Transactions;
