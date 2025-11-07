
import React, { useState } from 'react';
import { Transaction, Material } from '@/types';
import { addTransaction } from '@/services/mockApi';
import { Plus } from 'lucide-react';

interface TransactionsProps {
  transactions: Transaction[];
  materials: Material[];
  onDataChange: () => void;
  userRole: 'admin' | 'visitor';
}

const TransactionModal: React.FC<{ materials: Material[], onClose: () => void; onSave: (transaction: Omit<Transaction, 'id' | 'materialName' | 'date' | 'supplier' | 'category' | 'barcode' | 'unit' | 'materialType'>) => void; }> = ({ materials, onClose, onSave }) => {
    const [materialId, setMaterialId] = useState(materials[0]?.id || '');
    const [quantity, setQuantity] = useState(1);
    const [recipient, setRecipient] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const selectedMaterial = materials.find(m => m.id === materialId);
        if (!selectedMaterial) {
            setError('الرجاء اختيار مادة.');
            return;
        }
        if (quantity > selectedMaterial.currentStock) {
            setError('الكمية المسحوبة أكبر من الكمية المتاحة في المخزون.');
            return;
        }
        setError('');
        onSave({ materialId, quantity, recipient, notes });
    };

    const selectedMaterial = materials.find(m => m.id === materialId);
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">إضافة حركة صرف</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block mb-1">المادة</label>
                    <select value={materialId} onChange={(e) => setMaterialId(e.target.value)} required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
                        {materials.length > 0 ? materials.map(m => <option key={m.id} value={m.id}>{m.name} (المتاح: {m.currentStock} {m.unit})</option>) : <option disabled>لا توجد مواد</option>}
                    </select>
                </div>
                 {selectedMaterial && (
                    <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-700/50 rounded text-sm space-y-1 border border-gray-200 dark:border-gray-600">
                        <p><span className="font-semibold text-gray-600 dark:text-gray-300">الفئة:</span> {selectedMaterial.category}</p>
                        <p><span className="font-semibold text-gray-600 dark:text-gray-300">الباركود:</span> <span className="font-mono">{selectedMaterial.barcode}</span></p>
                    </div>
                )}
                <input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} placeholder="الكمية المسحوبة" min="1" max={selectedMaterial?.currentStock} required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                <input type="text" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="اسم المستلم" required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"></textarea>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="flex justify-end space-x-2 space-x-reverse">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded">إلغاء</button>
                    <button type="submit" className="px-4 py-2 bg-sky-500 text-white rounded" disabled={materials.length === 0}>حفظ الحركة</button>
                </div>
            </form>
        </div>
      </div>
    );
};

const Transactions: React.FC<TransactionsProps> = ({ transactions, materials, onDataChange, userRole }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const sortedTransactions = [...transactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleSave = (transaction: Omit<Transaction, 'id' | 'materialName' | 'date' | 'supplier' | 'category' | 'barcode' | 'unit' | 'materialType'>) => {
    addTransaction(transaction);
    onDataChange();
    setIsModalOpen(false);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">الحركات اليومية</h1>
        {userRole === 'admin' && (
            <button onClick={() => setIsModalOpen(true)} className="flex items-center px-4 py-2 bg-sky-500 text-white rounded-lg shadow hover:bg-sky-600 disabled:bg-sky-300" disabled={materials.length === 0} title={materials.length === 0 ? "يجب إضافة مواد أولاً" : ""}>
                <Plus className="ml-2" size={20} />
                إضافة حركة
            </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-x-auto">
        <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">التاريخ والوقت</th>
              <th scope="col" className="px-6 py-3">اسم المادة</th>
              <th scope="col" className="px-6 py-3">نوع المادة</th>
              <th scope="col" className="px-6 py-3">الفئة</th>
              <th scope="col" className="px-6 py-3">الباركود</th>
              <th scope="col" className="px-6 py-3">المورد</th>
              <th scope="col" className="px-6 py-3">الكمية المسحوبة</th>
              <th scope="col" className="px-6 py-3">المستلم</th>
              <th scope="col" className="px-6 py-3">ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {sortedTransactions.map(transaction => (
              <tr key={transaction.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                <td className="px-6 py-4">{new Date(transaction.date).toLocaleString('ar-EG')}</td>
                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{transaction.materialName}</td>
                <td className="px-6 py-4">{transaction.materialType}</td>
                <td className="px-6 py-4">{transaction.category}</td>
                <td className="px-6 py-4 font-mono">{transaction.barcode}</td>
                <td className="px-6 py-4">{transaction.supplier}</td>
                <td className="px-6 py-4">{transaction.quantity} {transaction.unit}</td>
                <td className="px-6 py-4">{transaction.recipient}</td>
                <td className="px-6 py-4">{transaction.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
         {transactions.length === 0 && <p className="text-center p-4">لا توجد حركات لعرضها.</p>}
      </div>

      {isModalOpen && <TransactionModal materials={materials.filter(m => m.currentStock > 0)} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
    </div>
  );
};

export default Transactions;