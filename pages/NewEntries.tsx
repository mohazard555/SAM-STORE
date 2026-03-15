
import React, { useState, useMemo } from 'react';
import { Material, User, SettingsData } from '@/types';
import { AlertTriangle, Search, Printer, Download, Calendar } from 'lucide-react';
import { usePrint } from '@/services/PrintContext';
import { exportToExcel } from '@/utils/excelExport';

interface NewEntriesProps {
  materials: Material[];
  user: User;
  settings?: SettingsData;
}

const NewEntries: React.FC<NewEntriesProps> = ({ materials, user, settings }) => {
  const { triggerPrint } = usePrint();
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const matchesSearch = 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.materialType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.barcode.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!m.createdAt) return matchesSearch && !startDate && !endDate;

      // Normalize Arabic numerals if any
      const dateStr = m.createdAt.replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());
      const mDate = new Date(dateStr);
      
      if (isNaN(mDate.getTime())) return matchesSearch && !startDate && !endDate;

      const matchesStartDate = !startDate || mDate >= new Date(startDate);
      const matchesEndDate = !endDate || mDate <= new Date(endDate + 'T23:59:59');

      return matchesSearch && matchesStartDate && matchesEndDate;
    }).sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
    });
  }, [materials, searchTerm, startDate, endDate]);

  const handleExportExcel = async () => {
    const data = filteredMaterials.map(m => ({
      'اسم المادة': m.name,
      'التاريخ': m.createdAt ? new Date(m.createdAt).toLocaleDateString('ar-EG') : '-',
      'نوع المادة': m.materialType,
      'الفئة': m.category,
      'الباركود': m.barcode,
      'الكمية': m.currentStock,
      'الوحدة': m.unit,
      'المورد': m.supplier,
      'المواصفات': m.specifications
    }));

    await exportToExcel(data, "new_entries", "إدخالات المواد الجديدة");
  };

  const handlePrint = () => {
    const tableContent = filteredMaterials.map(m => `
      <tr>
        <td>${m.name}</td>
        <td>${m.createdAt ? new Date(m.createdAt).toLocaleDateString('ar-EG') : '-'}</td>
        <td>${m.materialType}</td>
        <td>${m.category}</td>
        <td>${m.barcode}</td>
        <td>${m.currentStock} ${m.unit}</td>
        <td>${m.supplier}</td>
      </tr>
    `).join('');

    const html = `
      <div class="print-container">
        <style>
          .print-container { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; background: white; color: black; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }
          .header img { max-width: 80px; max-height: 80px; }
          .company-info { text-align: right; }
          .report-title { text-align: center; margin-bottom: 20px; font-size: 1.5em; }
          table { width: 100%; border-collapse: collapse; font-size: 0.9em; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
          th { background-color: #f2f2f2; }
        </style>
        <div class="header">
          ${settings?.companyLogo ? `<img src="${settings.companyLogo}" alt="Logo">` : '<div></div>'}
          <div class="company-info">
            <h2>${settings?.companyName || ''}</h2>
            <p>${settings?.companyAddress || ''}</p>
          </div>
        </div>
        <h2 class="report-title">تقرير إدخالات المواد الجديدة</h2>
        <table>
          <thead>
            <tr>
              <th>اسم المادة</th>
              <th>التاريخ</th>
              <th>النوع</th>
              <th>الفئة</th>
              <th>الباركود</th>
              <th>الكمية</th>
              <th>المورد</th>
            </tr>
          </thead>
          <tbody>
            ${tableContent}
          </tbody>
        </table>
      </div>
    `;
    triggerPrint(html);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">إدخالات المواد الجديدة</h1>
        
        <div className="flex gap-3 no-print">
          {user.permissions?.canPrint && (
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              <Printer size={18} />
              طباعة
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="بحث سريع (اسم، نوع، مورد، باركود)..." 
              className="w-full pr-10 pl-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative">
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="date" 
              className="w-full pr-10 pl-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="من تاريخ"
            />
          </div>

          <div className="relative">
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="date" 
              className="w-full pr-10 pl-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="إلى تاريخ"
            />
          </div>
        </div>
      </div>
      
       <div className="bg-blue-100 dark:bg-blue-900/30 border-r-4 border-blue-500 text-blue-700 dark:text-blue-300 p-4 rounded-l-lg" role="alert">
          <p className="font-bold">ملاحظة</p>
          <p>هذه قائمة بالمواد التي تم إضافتها حديثاً. يمكنك تأكيد استلامها من صفحة "إدارة المواد" لإزالتها من هذه القائمة.</p>
        </div>

      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-x-auto">
        <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">اسم المادة</th>
              <th scope="col" className="px-6 py-3">تاريخ الإضافة</th>
              <th scope="col" className="px-6 py-3">نوع المادة</th>
              <th scope="col" className="px-6 py-3">الفئة</th>
              <th scope="col" className="px-6 py-3">الباركود</th>
              <th scope="col" className="px-6 py-3">الكمية المدخلة</th>
              <th scope="col" className="px-6 py-3">المورد</th>
              <th scope="col" className="px-6 py-3">المواصفات</th>
            </tr>
          </thead>
          <tbody>
            {filteredMaterials.map(material => (
              <tr key={material.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{material.name}</td>
                <td className="px-6 py-4 text-xs">{material.createdAt ? new Date(material.createdAt).toLocaleDateString('ar-EG') : '-'}</td>
                <td className="px-6 py-4">{material.materialType}</td>
                <td className="px-6 py-4">{material.category}</td>
                <td className="px-6 py-4 font-mono">{material.barcode}</td>
                <td className={`px-6 py-4 font-bold ${material.currentStock < material.minStock ? 'text-red-500' : 'text-emerald-500'}`}>
                    {material.currentStock} {material.unit}
                    {material.currentStock < material.minStock && <AlertTriangle className="inline-block mr-1 text-red-500" size={16}/>}
                </td>
                <td className="px-6 py-4 text-xs">{material.supplier}</td>
                <td className="px-6 py-4 whitespace-pre-wrap max-w-xs text-xs">{material.specifications}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredMaterials.length === 0 && (
          <div className="text-center p-8">
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm || startDate || endDate ? 'لا توجد نتائج تطابق بحثك.' : 'لا توجد إدخالات جديدة حالياً.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewEntries;
