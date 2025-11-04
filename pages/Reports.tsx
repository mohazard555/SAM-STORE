import React, { useState, useMemo } from 'react';
import { Transaction, Material, SettingsData } from '@/types';
import { Download, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ReportsProps {
  transactions: Transaction[];
  materials: Material[];
  settings: SettingsData | null;
}

const Reports: React.FC<ReportsProps> = ({ transactions, materials, settings }) => {
  const [filterType, setFilterType] = useState<'daily' | 'weekly' | 'monthly' | 'byMaterial' | 'byCategory' | 'byBarcode' | 'totalCount' | 'all'>('all');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMaterialId, setSelectedMaterialId] = useState(materials[0]?.id || '');
  const [barcode, setBarcode] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const uniqueCategories = useMemo(() => {
    const categories = materials.map(m => m.category);
    return [...new Set(categories)].filter(Boolean);
  }, [materials]);

  const handleFilterChange = (type: typeof filterType) => {
    setFilterType(type);
    const today = new Date();
     if (type === 'weekly') {
      const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
      const lastDay = new Date(firstDay);
      lastDay.setDate(lastDay.getDate() + 6);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    } else if (type === 'monthly') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    } else if (type === 'byCategory') {
      setSelectedCategory(uniqueCategories[0] || '');
    }
  }

  const filteredTransactions = useMemo(() => {
    let result = transactions;

    if (filterType === 'all' || filterType === 'totalCount') {
      return result;
    }
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    let end: Date;

    if (filterType === 'daily') {
        end = new Date(start);
        end.setHours(23, 59, 59, 999);
    } else {
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
    }
    
    result = result.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= start && tDate <= end;
    });

    if (filterType === 'byMaterial' && selectedMaterialId) {
        result = result.filter(t => t.materialId === selectedMaterialId);
    }
    
    if (filterType === 'byCategory' && selectedCategory) {
        const materialIdsInCategory = materials.filter(m => m.category === selectedCategory).map(m => m.id);
        result = result.filter(t => materialIdsInCategory.includes(t.materialId));
    }

    if (filterType === 'byBarcode' && barcode) {
        const material = materials.find(m => m.barcode === barcode);
        result = material ? result.filter(t => t.materialId === material.id) : [];
    }


    return result;
  }, [transactions, materials, filterType, startDate, endDate, selectedMaterialId, selectedCategory, barcode]);
  
  const sortedTransactions = [...filteredTransactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const exportToXLSX = () => {
    let dataToExport;
    let fileName = 'report.xlsx';

    if (filterType === 'totalCount') {
        dataToExport = materials.map(m => ({
            "اسم المادة": m.name,
            "نوع المادة": m.materialType,
            "الفئة": m.category,
            "الباركود": m.barcode,
            "الكمية الحالية": m.currentStock,
            "وحدة القياس": m.unit,
        }));
        fileName = 'inventory_summary.xlsx';
    } else {
        dataToExport = sortedTransactions.map(t => ({
            'التاريخ والوقت': new Date(t.date).toLocaleString('ar-EG'),
            'اسم المادة': t.materialName,
            'الكمية المسحوبة': t.quantity,
            'المستلم': t.recipient,
            'ملاحظات': t.notes || '',
        }));
        fileName = 'transactions_report.xlsx';
    }
    
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, fileName);
  };
  
  const handlePrint = () => {
    let reportTitle = `تقرير`;
    if (filterType !== 'all') {
        reportTitle += ` ${filterType === 'daily' ? `يومي لـ ${startDate}` : `من ${startDate} إلى ${endDate}`}`;
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let tableContent;
    let tableHeaders;

    if (filterType === 'totalCount') {
        reportTitle = 'تقرير إجمالي عددي للمخزون';
        tableHeaders = `<th>اسم المادة</th><th>الفئة</th><th>الباركود</th><th>الكمية الحالية</th>`;
        tableContent = materials.map(m => `
            <tr>
                <td>${m.name}</td>
                <td>${m.category}</td>
                <td>${m.barcode}</td>
                <td>${m.currentStock} ${m.unit}</td>
            </tr>
        `).join('');
    } else {
        tableHeaders = `<th>التاريخ والوقت</th><th>اسم المادة</th><th>الكمية</th><th>المستلم</th><th>ملاحظات</th>`;
        tableContent = sortedTransactions.map(t => `
            <tr>
              <td>${new Date(t.date).toLocaleString('ar-EG')}</td>
              <td>${t.materialName}</td>
              <td>${t.quantity}</td>
              <td>${t.recipient}</td>
              <td>${t.notes || ''}</td>
            </tr>
        `).join('');
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
            body { font-family: 'Cairo', sans-serif; direction: rtl; margin: 20px; }
            @media print { body { -webkit-print-color-adjust: exact; } .no-print { display: none; } }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }
            .header img { max-width: 80px; max-height: 80px; }
            .company-info { text-align: right; }
            .report-title { text-align: center; margin-bottom: 20px; font-size: 1.5em; }
            table { width: 100%; border-collapse: collapse; font-size: 0.9em; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
            th { background-color: #f2f2f2; }
            .signatures { margin-top: 50px; display: flex; justify-content: space-around; text-align: center; }
            .signature-box { padding-top: 10px; }
            .signature-box p { margin: 0; padding: 0; }
            .signature-box .line { border-bottom: 1px solid #000; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="header">
            ${settings?.companyLogo ? `<img src="${settings.companyLogo}" alt="Logo">` : ''}
            <div class="company-info">
              <h2>${settings?.companyName || ''}</h2>
              <p>${settings?.companyAddress || ''}</p>
            </div>
          </div>
          <h2 class="report-title">${reportTitle}</h2>
          <table><thead><tr>${tableHeaders}</tr></thead><tbody>${tableContent}</tbody></table>
          <div class="signatures">
            <div class="signature-box"><p>${settings?.signatureNames?.keeper}</p><div class="line"></div></div>
            <div class="signature-box"><p>${settings?.signatureNames?.accountant}</p><div class="line"></div></div>
            <div class="signature-box"><p>${settings?.signatureNames?.manager}</p><div class="line"></div></div>
          </div>
          <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };
  
  const canPerformAction = filterType === 'totalCount' ? materials.length > 0 : sortedTransactions.length > 0;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">التقارير والجرد</h1>

      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md space-y-4">
        <div className="flex flex-wrap items-center gap-4">
           <select 
             value={filterType} 
             onChange={(e) => handleFilterChange(e.target.value as any)}
             className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
           >
                <option value="all">كل الحركات</option>
                <option value="daily">تقرير يومي</option>
                <option value="weekly">تقرير أسبوعي</option>
                <option value="monthly">تقرير شهري</option>
                <option value="byMaterial">تقرير حسب المادة</option>
                <option value="byCategory">تقرير حسب الفئة</option>
                <option value="byBarcode">تقرير حسب الباركود</option>
                <option value="totalCount">تقرير إجمالي عددي</option>
            </select>
            
            {filterType === 'daily' && (
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
            )}

            {(filterType === 'weekly' || filterType === 'monthly' || filterType === 'byMaterial' || filterType === 'byCategory' || filterType === 'byBarcode') && (
                <>
                  <label>من:</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                  <label>إلى:</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                </>
            )}

            {filterType === 'byMaterial' && (
                 <select value={selectedMaterialId} onChange={e => setSelectedMaterialId(e.target.value)} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600" disabled={materials.length === 0}>
                    {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                 </select>
            )}
            
            {filterType === 'byCategory' && (
                 <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600" disabled={uniqueCategories.length === 0}>
                    {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
            )}

            {filterType === 'byBarcode' && (
                 <input type="text" value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="أدخل الباركود" className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
            )}

            <button onClick={exportToXLSX} className="flex items-center px-4 py-2 bg-emerald-500 text-white rounded-lg shadow hover:bg-emerald-600 disabled:bg-emerald-300" disabled={!canPerformAction}>
                <Download className="ml-2" size={20}/>
                تصدير XLSX
            </button>
             <button onClick={handlePrint} className="flex items-center px-4 py-2 bg-sky-500 text-white rounded-lg shadow hover:bg-sky-600 disabled:bg-sky-300" disabled={!canPerformAction}>
                <Printer className="ml-2" size={20}/>
                طباعة التقرير
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-x-auto">
        {filterType === 'totalCount' ? (
             <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        <th scope="col" className="px-6 py-3">اسم المادة</th>
                        <th scope="col" className="px-6 py-3">الفئة</th>
                        <th scope="col" className="px-6 py-3">الباركود</th>
                        <th scope="col" className="px-6 py-3">الكمية الحالية</th>
                        <th scope="col" className="px-6 py-3">الحد الأدنى للمخزون</th>
                    </tr>
                </thead>
                <tbody>
                    {materials.map(material => (
                        <tr key={material.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                            <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{material.name}</td>
                            <td className="px-6 py-4">{material.category}</td>
                            <td className="px-6 py-4 font-mono">{material.barcode}</td>
                            <td className={`px-6 py-4 font-bold ${material.currentStock < material.minStock ? 'text-red-500' : 'text-emerald-500'}`}>
                                {material.currentStock} {material.unit}
                            </td>
                            <td className="px-6 py-4">{material.minStock} {material.unit}</td>
                        </tr>
                    ))}
                </tbody>
             </table>
        ) : (
            <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                    <th scope="col" className="px-6 py-3">التاريخ والوقت</th>
                    <th scope="col" className="px-6 py-3">اسم المادة</th>
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
                        <td className="px-6 py-4">{transaction.quantity}</td>
                        <td className="px-6 py-4">{transaction.recipient}</td>
                        <td className="px-6 py-4">{transaction.notes}</td>
                    </tr>
                    ))}
                </tbody>
            </table>
        )}
        {!canPerformAction && <p className="text-center p-4">لا توجد بيانات لعرضها حسب الفلتر المختار.</p>}
      </div>
    </div>
  );
};

export default Reports;