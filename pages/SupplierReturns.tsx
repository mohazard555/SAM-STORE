
import React, { useState, useMemo } from 'react';
import { Transaction, Material, User } from '@/types';
import { 
  RotateCcw, Search, Filter, Calendar, Printer, Download, 
  ArrowLeftRight, Package, User as UserIcon, FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface SupplierReturnsProps {
  transactions: Transaction[];
  materials: Material[];
  user: User;
}

const SupplierReturns: React.FC<SupplierReturnsProps> = ({ transactions, materials, user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const suppliers = useMemo(() => Array.from(new Set(materials.map(m => m.supplier))), [materials]);

  const filteredReturns = useMemo(() => {
    return transactions.filter(t => {
      const isReturn = t.type === 'return';
      const matchesSearch = t.materialName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSupplier = filterSupplier === '' || t.supplier === filterSupplier;
      
      const tDate = new Date(t.date);
      const matchesStartDate = startDate === '' || tDate >= new Date(startDate);
      const matchesEndDate = endDate === '' || tDate <= new Date(endDate + 'T23:59:59');

      return isReturn && matchesSearch && matchesSupplier && matchesStartDate && matchesEndDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, filterSupplier, startDate, endDate]);

  const totalQuantity = filteredReturns.reduce((sum, t) => sum + t.quantity, 0);

  const handleExportExcel = () => {
    const data = filteredReturns.map(t => ({
      'رقم العملية': t.id,
      'التاريخ': new Date(t.date).toLocaleDateString('ar-EG'),
      'المورد': t.supplier,
      'اسم المادة': t.materialName,
      'الكمية': t.quantity,
      'الوحدة': t.unit,
      'الملاحظات': t.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "مرتجعات الموردين");
    XLSX.writeFile(wb, "supplier_returns.xlsx");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <RotateCcw className="text-red-500" size={32} />
          مرتجعات الموردين
        </h1>
        <div className="flex gap-3 no-print">
          {user.permissions?.canPrint && (
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              <Printer size={18} />
              طباعة التقرير
            </button>
          )}
          {user.permissions?.canExport && (
            <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
              <Download size={18} />
              تصدير Excel
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 no-print">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="بحث عن مادة أو رقم عملية..." 
              className="w-full pr-10 pl-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="relative">
            <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select 
              className="w-full pr-10 pl-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-red-500 appearance-none"
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
            >
              <option value="">كل الموردين</option>
              {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="relative">
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="date" 
              className="w-full pr-10 pl-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-red-500"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="relative">
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="date" 
              className="w-full pr-10 pl-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-red-500"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Summary Stat */}
      <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500 rounded-lg text-white">
            <Package size={20} />
          </div>
          <span className="font-bold text-gray-700 dark:text-gray-200">إجمالي كميات المرتجعات المفلترة:</span>
        </div>
        <span className="text-2xl font-black text-red-600 dark:text-red-400">{totalQuantity}</span>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200">
                <th className="p-4 border-b dark:border-gray-600">رقم العملية</th>
                <th className="p-4 border-b dark:border-gray-600">تاريخ المرتجع</th>
                <th className="p-4 border-b dark:border-gray-600">اسم المورد</th>
                <th className="p-4 border-b dark:border-gray-600">اسم المادة</th>
                <th className="p-4 border-b dark:border-gray-600 text-center">الكمية</th>
                <th className="p-4 border-b dark:border-gray-600">الوحدة</th>
                <th className="p-4 border-b dark:border-gray-600">الملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {filteredReturns.length > 0 ? filteredReturns.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="p-4 font-mono text-xs text-gray-500 dark:text-gray-400">{t.id}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-300">{new Date(t.date).toLocaleDateString('ar-EG')}</td>
                  <td className="p-4 font-bold text-gray-900 dark:text-white">{t.supplier}</td>
                  <td className="p-4 text-gray-900 dark:text-white">{t.materialName}</td>
                  <td className="p-4 text-center font-black text-red-600 dark:text-red-400">{t.quantity}</td>
                  <td className="p-4 text-gray-500 dark:text-gray-400">{t.unit}</td>
                  <td className="p-4 text-gray-500 dark:text-gray-400 text-sm max-w-xs truncate" title={t.notes}>
                    {t.notes || '---'}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-gray-500 dark:text-gray-400 italic">
                    لا توجد حركات مرتجعات تطابق البحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SupplierReturns;
