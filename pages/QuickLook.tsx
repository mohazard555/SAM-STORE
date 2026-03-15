
import React, { useState, useMemo } from 'react';
import { Material, Transaction, User, SettingsData } from '@/types';
import { usePrint } from '@/services/PrintContext';
import { 
  Table, Filter, Search, ChevronUp, ChevronDown, Printer, Download 
} from 'lucide-react';
import { exportToExcel } from '@/utils/excelExport';

interface QuickLookProps {
  materials: Material[];
  transactions: Transaction[];
  user?: User;
  settings?: SettingsData | null;
}

const QuickLook: React.FC<QuickLookProps> = ({ materials, transactions, user, settings }) => {
  const { triggerPrint } = usePrint();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const suppliers = useMemo(() => Array.from(new Set(materials.map(m => m.supplier))), [materials]);
  const categories = useMemo(() => Array.from(new Set(materials.map(m => m.category))), [materials]);

  const tableData = useMemo(() => {
    return materials.map(m => {
      const used = transactions
        .filter(t => t.materialId === m.id && t.type === 'out')
        .reduce((sum, t) => sum + t.quantity, 0);
      const totalIn = transactions
        .filter(t => t.materialId === m.id && t.type === 'in')
        .reduce((sum, t) => sum + t.quantity, 0);
      
      return {
        ...m,
        fullBalance: totalIn,
        usedQuantity: used,
        remainingQuantity: m.currentStock
      };
    });
  }, [materials, transactions]);

  const filteredData = useMemo(() => {
    let result = tableData.filter(m => 
      (m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.barcode.includes(searchTerm)) &&
      (filterSupplier === '' || m.supplier === filterSupplier) &&
      (filterCategory === '' || m.category === filterCategory)
    );

    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = (a as any)[sortConfig.key];
        const bValue = (b as any)[sortConfig.key];
        if (aValue === undefined || bValue === undefined) return 0;
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [tableData, searchTerm, filterSupplier, filterCategory, sortConfig]);

  const totalFilteredRemaining = filteredData.reduce((sum, m) => sum + m.remainingQuantity, 0);

  const handleSort = (key: any) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleExport = async () => {
    const dataToExport = filteredData.map(m => ({
      "اسم المادة": m.name,
      "اللون": m.color || '-',
      "الفئة": m.category,
      "الوحدة": m.unit,
      "الرصيد الكامل": m.fullBalance,
      "الكمية المستخدمة": m.usedQuantity,
      "الكمية المتبقية": m.remainingQuantity,
      "المورد": m.supplier
    }));
    await exportToExcel(dataToExport, "quick_look_report", "نظرة سريعة");
  };

  const handlePrint = () => {
    const reportTitle = `تقرير نظرة سريعة للمواد`;
    const html = `
      <div class="print-container">
        <style>
          .print-container { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; background: white; color: black; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 0.9em; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
          th { background-color: #f2f2f2; }
          .footer { margin-top: 20px; font-weight: bold; text-align: left; }
          h2 { text-align: center; margin-top: 0; }
        </style>
        <div class="header">
          ${settings?.companyLogo ? `<img src="${settings.companyLogo}" style="max-width:80px">` : '<div></div>'}
          <div>
            <h2>${settings?.companyName || ''}</h2>
            <p>${settings?.companyAddress || ''}</p>
          </div>
        </div>
        <h2>${reportTitle}</h2>
        <table>
          <thead>
            <tr>
              <th>اسم المادة</th>
              <th>اللون</th>
              <th>الفئة</th>
              <th>الوحدة</th>
              <th>الرصيد الكامل</th>
              <th>الكمية المستخدمة</th>
              <th>الكمية المتبقية</th>
              <th>المورد</th>
            </tr>
          </thead>
          <tbody>
            ${filteredData.map(m => `
              <tr>
                <td>${m.name}</td>
                <td>${m.color || '-'}</td>
                <td>${m.category}</td>
                <td>${m.unit}</td>
                <td>${m.fullBalance}</td>
                <td>${m.usedQuantity}</td>
                <td>${m.remainingQuantity}</td>
                <td>${m.supplier}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          إجمالي الكمية المتبقية: ${totalFilteredRemaining}
        </div>
      </div>
    `;
    triggerPrint(html);
  };

  const canExport = user?.role === 'admin' || user?.permissions?.canExport;
  const canPrint = user?.role === 'admin' || user?.permissions?.canPrint;

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">نظرة سريعة للمواد</h1>
          <div className="flex gap-2">
            {canExport && (
              <button 
                onClick={handleExport}
                className="flex items-center px-4 py-2 bg-emerald-500 text-white rounded-lg shadow hover:bg-emerald-600 transition-colors"
              >
                <Download className="ml-2" size={18} />
                تصدير XLSX
              </button>
            )}
            {canPrint && (
              <button 
                onClick={handlePrint}
                className="flex items-center px-4 py-2 bg-sky-500 text-white rounded-lg shadow hover:bg-sky-600 transition-colors"
              >
                <Printer className="ml-2" size={18} />
                طباعة
              </button>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h3 className="font-bold text-xl text-gray-900 dark:text-white flex items-center gap-2">
              <Table size={24} className="text-sky-500" />
              جدول المواد
            </h3>
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="بحث عن مادة أو باركود..." 
                  className="w-full pr-10 pl-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select 
                className="p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none"
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
              >
                <option value="">كل الموردين</option>
                {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select 
                className="p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">كل الفئات</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200">
                  <th className="p-4 border-b dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1">اسم المادة {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}</div>
                  </th>
                  <th className="p-4 border-b dark:border-gray-600">اللون</th>
                  <th className="p-4 border-b dark:border-gray-600">الفئة</th>
                  <th className="p-4 border-b dark:border-gray-600">الوحدة</th>
                  <th className="p-4 border-b dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('fullBalance')}>
                    <div className="flex items-center gap-1">الرصيد الكامل {sortConfig?.key === 'fullBalance' && (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}</div>
                  </th>
                  <th className="p-4 border-b dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('usedQuantity')}>
                    <div className="flex items-center gap-1">الكمية المستخدمة {sortConfig?.key === 'usedQuantity' && (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}</div>
                  </th>
                  <th className="p-4 border-b dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('remainingQuantity')}>
                    <div className="flex items-center gap-1">الكمية المتبقية {sortConfig?.key === 'remainingQuantity' && (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}</div>
                  </th>
                  <th className="p-4 border-b dark:border-gray-600">المورد</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {filteredData.length > 0 ? filteredData.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="p-4 text-gray-900 dark:text-white font-medium">{m.name}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400 text-xs">{m.color || '-'}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">{m.category}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">{m.unit}</td>
                    <td className="p-4 text-emerald-600 dark:text-emerald-400 font-bold">{m.fullBalance}</td>
                    <td className="p-4 text-amber-600 dark:text-amber-400 font-bold">{m.usedQuantity}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${m.remainingQuantity < m.minStock ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                        {m.remainingQuantity}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">{m.supplier}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500 dark:text-gray-400 italic">لا توجد مواد تطابق البحث</td>
                  </tr>
                )}
              </tbody>
              {filteredData.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-100 dark:bg-gray-700 font-bold">
                    <td colSpan={5} className="p-4 text-left">إجمالي الكمية المتبقية للمواد المفلترة:</td>
                    <td className="p-4 text-sky-600 dark:text-sky-400 text-xl">{totalFilteredRemaining}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
    </div>
  );
};

export default QuickLook;
