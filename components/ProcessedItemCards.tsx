import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, Material, ProcessedItemCard } from '@/types';
import { getProcessedItemCards, updateProcessedItemCard, deleteProcessedItemCard, updateProcessedItemCardQuantities } from '@/services/mockApi';
import { Search, Filter, CheckCircle, Clock, Trash2, Printer, Copy, Package, Calendar, Edit2, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProcessedItemCardsProps {
  transactions: Transaction[];
  materials: Material[];
}

export const ProcessedItemCards: React.FC<ProcessedItemCardsProps> = ({ transactions, materials }) => {
  const [cards, setCards] = useState<ProcessedItemCard[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [editingBarcode, setEditingBarcode] = useState<string | null>(null);
  const [editQuantities, setEditQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    setCards(getProcessedItemCards());
  }, []);

  const handleStatusChange = (itemBarcode: string, newStatus: 'pending' | 'delivered') => {
    const newCard: ProcessedItemCard = { itemBarcode, status: newStatus };
    updateProcessedItemCard(newCard);
    setCards(getProcessedItemCards());
  };

  const handleEditClick = (data: any) => {
    setEditingBarcode(data.itemBarcode);
    const initialQuantities: Record<string, number> = {};
    data.materialsList.forEach((m: any) => {
      initialQuantities[m.materialId] = m.quantity;
    });
    setEditQuantities(initialQuantities);
  };

  const handleSaveEdit = (itemBarcode: string) => {
    const updatedMaterials = Object.entries(editQuantities).map(([materialId, newQuantity]) => ({
      materialId,
      newQuantity
    }));
    updateProcessedItemCardQuantities(itemBarcode, updatedMaterials);
    setEditingBarcode(null);
    window.location.reload();
  };

  const handleCancelEdit = () => {
    setEditingBarcode(null);
    setEditQuantities({});
  };

  const handleDelete = (itemBarcode: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه البطاقة وجميع الحركات الصادرة المرتبطة بها؟')) {
      deleteProcessedItemCard(itemBarcode);
      setCards(getProcessedItemCards());
      // Note: We might need to refresh transactions in the parent component if they are passed as props, 
      // but since this is a report view, it will refresh when navigating away and back.
      // For immediate UI update, we can just filter the local transactions or trigger a re-fetch.
      window.location.reload(); // Simple way to refresh all data after deletion
    }
  };

  const handleCopy = (cardData: any) => {
    const text = `
بطاقة صنف: ${cardData.itemBarcode}
الحالة: ${cardData.status === 'delivered' ? 'تم التسليم' : 'قيد الانتظار'}
إجمالي الكمية: ${cardData.totalQuantity}
إجمالي التكلفة: ${cardData.totalCost}
المواد:
${cardData.materialsList.map((m: any) => `- ${m.name}: ${m.quantity} (السعر: ${m.price}, الإجمالي: ${m.total})`).join('\n')}
    `.trim();
    navigator.clipboard.writeText(text);
    alert('تم نسخ البطاقة بنجاح');
  };

  const handlePrint = (cardData: any) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>طباعة بطاقة صنف</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
              th { background-color: #f2f2f2; }
              .header { margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>بطاقة صنف: ${cardData.itemBarcode}</h2>
              <p>الحالة: ${cardData.status === 'delivered' ? 'تم التسليم' : 'قيد الانتظار'}</p>
              <p>إجمالي الكمية: ${cardData.totalQuantity}</p>
              <p>إجمالي التكلفة: ${cardData.totalCost}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>المادة</th>
                  <th>الكمية</th>
                  <th>السعر الإفرادي</th>
                  <th>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                ${cardData.materialsList.map((m: any) => `
                  <tr>
                    <td>${m.name}</td>
                    <td>${m.quantity}</td>
                    <td>${m.price}</td>
                    <td>${m.total}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <script>
              window.onload = () => { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const processedData = useMemo(() => {
    // 1. Filter out transactions
    let outTransactions = transactions.filter(t => t.type === 'out' && t.itemBarcode);

    // Filter by date
    if (dateFrom) {
      outTransactions = outTransactions.filter(t => t.date >= dateFrom);
    }
    if (dateTo) {
      outTransactions = outTransactions.filter(t => t.date <= dateTo);
    }

    // Group by itemBarcode
    const grouped = outTransactions.reduce((acc, t) => {
      const barcode = t.itemBarcode!;
      if (!acc[barcode]) {
        acc[barcode] = {
          itemBarcode: barcode,
          transactions: [],
          totalQuantity: 0,
          totalCost: 0,
          materialsMap: {} as Record<string, { quantity: number, cost: number, name: string, price: number }>
        };
      }
      
      acc[barcode].transactions.push(t);
      acc[barcode].totalQuantity += t.quantity;
      
      const material = materials.find(m => m.id === t.materialId);
      const price = material?.price || 0;
      const cost = t.quantity * price;
      acc[barcode].totalCost += cost;

      if (!acc[barcode].materialsMap[t.materialId]) {
        acc[barcode].materialsMap[t.materialId] = {
          materialId: t.materialId,
          quantity: 0,
          cost: 0,
          name: material?.name || 'مادة غير معروفة',
          price: price
        };
      }
      acc[barcode].materialsMap[t.materialId].quantity += t.quantity;
      acc[barcode].materialsMap[t.materialId].cost += cost;

      return acc;
    }, {} as Record<string, any>);

    // Convert to array and attach status
    let result = Object.values(grouped).map(group => {
      const cardStatus = cards.find(c => c.itemBarcode === group.itemBarcode)?.status || 'pending';
      return {
        ...group,
        status: cardStatus,
        materialsList: Object.values(group.materialsMap).map((m: any) => ({
          materialId: m.materialId,
          name: m.name,
          quantity: m.quantity,
          price: m.price,
          total: m.cost
        }))
      };
    });

    // Filter by search term
    if (searchTerm) {
      result = result.filter(r => r.itemBarcode.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    return result;
  }, [transactions, materials, cards, searchTerm, dateFrom, dateTo]);

  const stats = useMemo(() => {
    return {
      delivered: processedData.filter(d => d.status === 'delivered').length,
      pending: processedData.filter(d => d.status === 'pending').length,
      totalCost: processedData.reduce((sum, d) => sum + d.totalCost, 0),
      totalQuantity: processedData.reduce((sum, d) => sum + d.totalQuantity, 0)
    };
  }, [processedData]);

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Package className="text-emerald-500" />
            بطاقات أصناف مرحلة
          </h2>
          
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="بحث برقم الباركود..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-4 pr-10 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none w-full sm:w-64"
              />
            </div>
            
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-1 rounded-lg border border-gray-200 dark:border-gray-600">
              <Calendar size={18} className="text-gray-500 mr-2" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-200"
              />
              <span className="text-gray-400">-</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-200"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border-l-4 border-emerald-500">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">تم التسليم</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.delivered}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border-l-4 border-amber-500">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">قيد الانتظار</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.pending}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">إجمالي الكميات</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalQuantity.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border-l-4 border-purple-500">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">إجمالي التكلفة</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalCost.toLocaleString()}</p>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence>
          {processedData.map((data) => (
            <motion.div
              key={data.itemBarcode}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
            >
              {/* Card Header */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start bg-gray-50 dark:bg-gray-800/50">
                <div>
                  <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                    <Package size={20} className="text-gray-500" />
                    {data.itemBarcode}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {data.transactions.length} حركات صادر
                  </p>
                </div>
                
                {/* Status Toggle */}
                <button
                  onClick={() => handleStatusChange(data.itemBarcode, data.status === 'pending' ? 'delivered' : 'pending')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    data.status === 'delivered' 
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400' 
                      : 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}
                >
                  {data.status === 'delivered' ? <CheckCircle size={16} /> : <Clock size={16} />}
                  {data.status === 'delivered' ? 'تم التسليم' : 'قيد الانتظار'}
                </button>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">إجمالي الكمية</p>
                    <p className="font-bold text-gray-800 dark:text-white">{data.totalQuantity}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">إجمالي التكلفة</p>
                    <p className="font-bold text-gray-800 dark:text-white">{data.totalCost.toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700 pb-2">المواد الداخلة:</p>
                  <div className="max-h-32 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                    {data.materialsList.map((m: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-400 truncate max-w-[120px]" title={m.name}>{m.name}</span>
                        <div className="flex gap-3 text-gray-800 dark:text-gray-200 items-center">
                          {editingBarcode === data.itemBarcode ? (
                            <input 
                              type="number" 
                              min="0"
                              step="0.01"
                              value={editQuantities[m.materialId] ?? m.quantity}
                              onChange={(e) => setEditQuantities({...editQuantities, [m.materialId]: Number(e.target.value)})}
                              className="w-20 px-2 py-1 border rounded text-center dark:bg-gray-700 dark:border-gray-600"
                            />
                          ) : (
                            <span className="font-medium bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{m.quantity}</span>
                          )}
                          <span className="text-gray-500 w-16 text-left">({(editingBarcode === data.itemBarcode ? (editQuantities[m.materialId] ?? m.quantity) * m.price : m.total).toLocaleString()})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-3 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2 bg-gray-50 dark:bg-gray-800/50">
                {editingBarcode === data.itemBarcode ? (
                  <>
                    <button 
                      onClick={() => handleSaveEdit(data.itemBarcode)}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="حفظ"
                    >
                      <Save size={18} />
                    </button>
                    <button 
                      onClick={handleCancelEdit}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="إلغاء"
                    >
                      <X size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => handleEditClick(data)}
                      className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="تعديل"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleCopy(data)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="نسخ"
                    >
                      <Copy size={18} />
                    </button>
                    <button 
                      onClick={() => handlePrint(data)}
                      className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="طباعة"
                    >
                      <Printer size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(data.itemBarcode)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="حذف"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {processedData.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
            <Package size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg">لا توجد بطاقات أصناف مرحلة مطابقة للبحث</p>
          </div>
        )}
      </div>
    </div>
  );
};
