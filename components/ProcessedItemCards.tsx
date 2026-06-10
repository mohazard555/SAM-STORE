import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, Material, ProcessedItemCard } from '@/types';
import { getProcessedItemCards, updateProcessedItemCard, deleteProcessedItemCard, updateProcessedItemCardQuantities } from '@/services/mockApi';
import { Search, Filter, CheckCircle, Clock, Trash2, Printer, Copy, Package, Calendar, Edit2, Save, X, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePrint } from '@/services/PrintContext';

interface ProcessedItemCardsProps {
  transactions: Transaction[];
  materials: Material[];
}

export const ProcessedItemCards: React.FC<ProcessedItemCardsProps> = ({ transactions, materials }) => {
  const { triggerPrint } = usePrint();
  const [cards, setCards] = useState<ProcessedItemCard[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [editingBarcode, setEditingBarcode] = useState<string | null>(null);
  const [editQuantities, setEditQuantities] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<'pending' | 'delivered'>('pending');
  const [previewCard, setPreviewCard] = useState<any | null>(null);

  useEffect(() => {
    setCards(getProcessedItemCards());
  }, []);

  const handleStatusChange = (itemBarcode: string, newStatus: 'pending' | 'delivered') => {
    const newCard: ProcessedItemCard = { itemBarcode, status: newStatus };
    updateProcessedItemCard(newCard);
    setCards(getProcessedItemCards());
    
    // If we're previewing the card that was updated, update its local status in preview too
    if (previewCard && previewCard.itemBarcode === itemBarcode) {
      setPreviewCard((prev: any) => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const handleEditClick = (data: any) => {
    setEditingBarcode(data.itemBarcode);
    const initialQuantities: Record<string, number> = {};
    data.materialsList.forEach((m: any) => {
      initialQuantities[m.materialId] = m.quantity;
    });
    setEditQuantities(initialQuantities);
    setPreviewCard(data); // Open in preview modal to edit
  };

  const handleSaveEdit = (itemBarcode: string) => {
    const updatedMaterials = Object.entries(editQuantities).map(([materialId, newQuantity]) => ({
      materialId,
      newQuantity
    }));
    updateProcessedItemCardQuantities(itemBarcode, updatedMaterials);
    setEditingBarcode(null);
    setPreviewCard(null);
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
      setPreviewCard(null);
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
    const html = `
      <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
        <div style="margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px;">
          <h2>بطاقة صنف: ${cardData.itemBarcode}</h2>
          <p>الحالة: ${cardData.status === 'delivered' ? 'تم التسليم' : 'قيد الانتظار'}</p>
          <p>إجمالي الكمية: ${cardData.totalQuantity}</p>
          <p>إجمالي التكلفة: ${cardData.totalCost}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right; background-color: #f2f2f2;">المادة</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right; background-color: #f2f2f2;">الكمية</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right; background-color: #f2f2f2;">السعر الإفرادي</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right; background-color: #f2f2f2;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${cardData.materialsList.map((m: any) => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${m.name}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${m.quantity}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${m.price}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${m.total}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    triggerPrint(html);
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

  // Split view data based on the active tab of processing status
  const visibleCards = useMemo(() => {
    return processedData.filter(card => card.status === activeTab);
  }, [processedData, activeTab]);

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
                id="stage-items-search-input"
                type="text"
                placeholder="بحث برقم الباركود..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-4 pr-10 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none w-full sm:w-64 animate-none"
              />
            </div>
            
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-1 rounded-lg border border-gray-200 dark:border-gray-600 font-sans">
              <Calendar size={18} className="text-gray-500 mr-2" />
              <input
                id="stage-items-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-200"
              />
              <span className="text-gray-400">-</span>
              <input
                id="stage-items-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-200"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats row with interactive tab filtering links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button 
          id="stat-box-delivered"
          onClick={() => setActiveTab('delivered')}
          className={`text-right p-4 rounded-xl shadow-sm border-r-4 transition-all duration-250 cursor-pointer ${
            activeTab === 'delivered' 
              ? 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-500 ring-2 ring-emerald-500/50' 
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700'
          }`}
        >
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">تم التسليم (أرشيف)</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <CheckCircle className="text-emerald-500" size={20} />
            {stats.delivered}
          </p>
        </button>

        <button 
          id="stat-box-pending"
          onClick={() => setActiveTab('pending')}
          className={`text-right p-4 rounded-xl shadow-sm border-r-4 transition-all duration-250 cursor-pointer ${
            activeTab === 'pending' 
              ? 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-500 ring-2 ring-amber-500/50' 
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700'
          }`}
        >
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">قيد الانتظار</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Clock className="text-amber-500" size={20} />
            {stats.pending}
          </p>
        </button>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border-r-4 border-blue-500">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">إجمالي كميات الفلتر</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalQuantity.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border-r-4 border-purple-500">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">إجمالي تكلفة الفلتر</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalCost.toLocaleString()}</p>
        </div>
      </div>

      {/* Tabs Layout Switcher */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 p-1.5 rounded-xl gap-2 max-w-md">
        <button
          id="tab-btn-pending"
          onClick={() => setActiveTab('pending')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 ${
            activeTab === 'pending'
              ? 'bg-amber-500 text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <Clock size={16} />
          <span>بطاقات قيد الانتظار ({stats.pending})</span>
        </button>
        <button
          id="tab-btn-delivered"
          onClick={() => setActiveTab('delivered')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 ${
            activeTab === 'delivered'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <CheckCircle size={16} />
          <span>أرشيف البطاقات المسلمة ({stats.delivered})</span>
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {visibleCards.map((data) => (
            <motion.div
              layout
              key={data.itemBarcode}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
            >
              {/* Card Header */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start bg-gray-50/50 dark:bg-gray-850">
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
                  id={`status-toggle-${data.itemBarcode}`}
                  onClick={() => handleStatusChange(data.itemBarcode, data.status === 'pending' ? 'delivered' : 'pending')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                    data.status === 'delivered' 
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400' 
                      : 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}
                  title="تغيير الحالة"
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

                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3 flex justify-between items-center text-sm border border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">أنواع الأصناف والـمـواد:</span>
                  <span className="font-bold text-gray-700 dark:text-gray-200">{data.materialsList.length}</span>
                </div>

                {/* Primary Preview Action Button inside Card Body */}
                <button
                  id={`preview-action-btn-${data.itemBarcode}`}
                  onClick={() => setPreviewCard(data)}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl text-sm transition-colors cursor-pointer border border-gray-200/50 dark:border-gray-600/30"
                >
                  <Eye size={16} />
                  <span>معاينة محتويات البطاقة</span>
                </button>
              </div>

              {/* Card Footer Actions */}
              <div className="p-3 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2 bg-gray-50/50 dark:bg-gray-850">
                <button 
                  id={`card-edit-btn-${data.itemBarcode}`}
                  onClick={() => handleEditClick(data)}
                  className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-lg transition-colors cursor-pointer"
                  title="تعديل المواد والكميات"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  id={`card-copy-btn-${data.itemBarcode}`}
                  onClick={() => handleCopy(data)}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors cursor-pointer"
                  title="نسخ بيانات البطاقة"
                >
                  <Copy size={18} />
                </button>
                <button 
                  id={`card-print-btn-${data.itemBarcode}`}
                  onClick={() => handlePrint(data)}
                  className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg transition-colors cursor-pointer"
                  title="طباعة البطاقة"
                >
                  <Printer size={18} />
                </button>
                <button 
                  id={`card-delete-btn-${data.itemBarcode}`}
                  onClick={() => handleDelete(data.itemBarcode)}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer"
                  title="حذف البطاقة بالكامل"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {visibleCards.length === 0 && (
          <div className="col-span-full py-16 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
            <Package size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-bold">
              {activeTab === 'pending' ? 'لا توجد بطاقات قيد الانتظار للبحث الحالي' : 'لا توجد بطاقات مسلمة في الأرشيف مطابقة للبحث'}
            </p>
            <p className="text-sm text-gray-400 mt-1">امسح الفلاتر أو جرب كتابة رقم باركود مختلف.</p>
          </div>
        )}
      </div>

      {/* Beautiful Animated Preview & Edit Dialog/Modal */}
      <AnimatePresence>
        {previewCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (editingBarcode) {
                  if (window.confirm('لديك تعديلات غير محفوظة. هل تريد الإلغاء؟')) {
                    handleCancelEdit();
                    setPreviewCard(null);
                  }
                } else {
                  setPreviewCard(null);
                }
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Dialog Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 max-w-2xl w-full p-6 text-right overflow-hidden flex flex-col max-h-[85vh]"
              dir="rtl"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <Package size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white" id="modal-title-barcode">
                      معاينة بطاقة صنف: {previewCard.itemBarcode}
                    </h3>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
                      {previewCard.transactions.length} حركات صرف صادر مسجلة
                    </p>
                  </div>
                </div>

                <button
                  id="close-preview-modal-btn"
                  onClick={() => {
                    if (editingBarcode) {
                      if (window.confirm('لديك تعديلات غير محفوظة. هل تريد الإلغاء؟')) {
                        handleCancelEdit();
                        setPreviewCard(null);
                      }
                    } else {
                      setPreviewCard(null);
                    }
                  }}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content Scroll Area */}
              <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-6 custom-scrollbar">
                {/* General Stats and Status */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/40">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">إجمالي الكمية</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{previewCard.totalQuantity}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/40">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">إجمالي التكلفة</p>
                    <p className="text-lg font-bold text-purple-650 dark:text-purple-400">{previewCard.totalCost.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/40 flex flex-col justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">حالة البطاقة</span>
                    <button
                      id={`modal-inner-status-${previewCard.itemBarcode}`}
                      onClick={() => handleStatusChange(previewCard.itemBarcode, previewCard.status === 'pending' ? 'delivered' : 'pending')}
                      className={`flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        previewCard.status === 'delivered' 
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400' 
                          : 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}
                    >
                      {previewCard.status === 'delivered' ? <CheckCircle size={14} /> : <Clock size={14} />}
                      {previewCard.status === 'delivered' ? 'تم التسليم' : 'قيد الانتظار'}
                    </button>
                  </div>
                </div>

                {/* Materials list */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-base font-bold text-gray-700 dark:text-gray-300">محتويات المواد والتكلفة الإفرادية:</p>
                    {editingBarcode === previewCard.itemBarcode ? (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/20 px-2 py-1 rounded-md">
                        نمط التعديل نشط
                      </span>
                    ) : null}
                  </div>
                  <div className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden bg-gray-50/20 dark:bg-gray-800">
                    <table className="w-full text-right border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200 font-bold border-b border-gray-150 dark:border-gray-705">
                          <th className="p-3">المادة</th>
                          <th className="p-3 text-center">الكمية</th>
                          <th className="p-3 text-center">سعر الدبوس</th>
                          <th className="p-3 text-left">التكلفة الإجمالية</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {previewCard.materialsList.map((m: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50/45 dark:hover:bg-gray-700/20 transition-colors">
                            <td className="p-3 font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[200px]" title={m.name}>
                              {m.name}
                            </td>
                            <td className="p-3 text-center">
                              {editingBarcode === previewCard.itemBarcode ? (
                                <input
                                  id={`edit-quant-input-${m.materialId}`}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={editQuantities[m.materialId] ?? m.quantity}
                                  onChange={(e) => setEditQuantities({...editQuantities, [m.materialId]: Number(e.target.value)})}
                                  className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 font-bold"
                                />
                              ) : (
                                <span className="font-bold bg-gray-100 dark:bg-gray-700/80 text-gray-800 dark:text-gray-200 px-2.5 py-1 rounded-lg">
                                  {m.quantity}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center text-gray-500 dark:text-gray-400">
                              {(m.price || 0).toLocaleString()}
                            </td>
                            <td className="p-3 text-left font-bold text-gray-700 dark:text-gray-200">
                              {(editingBarcode === previewCard.itemBarcode 
                                ? (editQuantities[m.materialId] ?? m.quantity) * m.price 
                                : m.total
                              ).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Modal Footer (Controls) */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center gap-3">
                {/* Left controls: primary Save/Discard modifications */}
                {editingBarcode === previewCard.itemBarcode ? (
                  <div className="flex gap-2">
                    <button
                      id="modal-save-btn"
                      onClick={() => handleSaveEdit(previewCard.itemBarcode)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-md cursor-pointer"
                    >
                      <Save size={16} />
                      <span>حفظ التعديلات</span>
                    </button>
                    <button
                      id="modal-discard-btn"
                      onClick={handleCancelEdit}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-750 dark:hover:bg-gray-700 text-gray-750 dark:text-gray-200 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                    >
                      <X size={16} />
                      <span>إلغاء</span>
                    </button>
                  </div>
                ) : (
                  <button
                    id="modal-edit-toggle-btn"
                    onClick={() => handleEditClick(previewCard)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-all shadow-md cursor-pointer"
                  >
                    <Edit2 size={16} />
                    <span>تعديل الكميات</span>
                  </button>
                )}

                {/* Right controls: quick output actions */}
                <div className="flex gap-2">
                  <button
                    id="modal-copy-btn"
                    onClick={() => handleCopy(previewCard)}
                    className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-xl transition-all cursor-pointer"
                    title="نسخ بيانات البطاقة"
                  >
                    <Copy size={18} />
                  </button>
                  <button
                    id="modal-print-btn"
                    onClick={() => handlePrint(previewCard)}
                    className="p-2.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-xl transition-all cursor-pointer"
                    title="طباعة البطاقة"
                  >
                    <Printer size={18} />
                  </button>
                  <button
                    id="modal-delete-btn"
                    onClick={() => handleDelete(previewCard.itemBarcode)}
                    className="p-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all cursor-pointer"
                    title="حذف البطاقة"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
