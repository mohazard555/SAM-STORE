
import React, { useState, useMemo } from 'react';
import { Transaction, Material, SettingsData } from '@/types';
import { Download, Printer, Search } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ReportsProps {
  transactions: Transaction[];
  materials: Material[];
  settings: SettingsData | null;
}

type ReportType = 'daily' | 'weekly' | 'monthly' | 'byMaterial' | 'byCategory' | 'byBarcode' | 'byItemBarcode' | 'totalCount' | 'all' | 'bySupplier' | 'mostUsed' | 'inactive' | 'lowStock';

const Reports: React.FC<ReportsProps> = ({ transactions, materials, settings }) => {
  const [filterType, setFilterType] = useState<ReportType>('all');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMaterialId, setSelectedMaterialId] = useState(materials[0]?.id || '');
  const [selectedBarcode, setSelectedBarcode] = useState('');
  const [selectedItemBarcode, setSelectedItemBarcode] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');

  // Search terms for dropdowns
  const [searchFilterType, setSearchFilterType] = useState('');
  const [searchMaterial, setSearchMaterial] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [searchSupplier, setSearchSupplier] = useState('');
  const [searchBarcode, setSearchBarcode] = useState('');
  const [searchItemBarcode, setSearchItemBarcode] = useState('');

  const uniqueCategories = useMemo(() => {
    const categories = materials.map(m => m.category);
    return [...new Set(categories)].filter(Boolean);
  }, [materials]);
  
  const uniqueSuppliers = useMemo(() => {
    const suppliers = materials.map(m => m.supplier);
    return [...new Set(suppliers)].filter(Boolean);
  }, [materials]);

  const uniqueBarcodes = useMemo(() => {
    const barcodes = materials.map(m => m.barcode);
    return [...new Set(barcodes)].filter(Boolean);
  }, [materials]);

  const uniqueItemBarcodes = useMemo(() => {
    const barcodes = transactions.map(t => t.itemBarcode);
    return [...new Set(barcodes)].filter(Boolean);
  }, [transactions]);

  const handleFilterChange = (type: ReportType) => {
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
    }
  }

  const dateFilteredTransactions = useMemo(() => {
    const timeSensitiveReports: ReportType[] = ['daily', 'weekly', 'monthly', 'byMaterial', 'byCategory', 'byBarcode', 'byItemBarcode', 'bySupplier', 'mostUsed', 'all'];
    if (!timeSensitiveReports.includes(filterType)) {
        return transactions;
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
    
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= start && tDate <= end;
    });
  }, [transactions, filterType, startDate, endDate]);

  const reportData = useMemo(() => {
    switch(filterType) {
      case 'totalCount':
        return materials;
      
      case 'lowStock':
        return materials.filter(m => m.currentStock < m.minStock);
      
      case 'mostUsed': {
        const usage = dateFilteredTransactions.reduce((acc, t) => {
            if (t.type === 'out') acc[t.materialId] = (acc[t.materialId] || 0) + t.quantity;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(usage)
            .map(([materialId, totalQuantity]) => {
                const material = materials.find(m => m.id === materialId);
                return material ? { ...material, totalQuantity } : null;
            })
            .filter((item): item is (Material & {totalQuantity: number}) => item !== null)
            .sort((a, b) => b.totalQuantity - a.totalQuantity);
      }
      
      case 'inactive': {
        const activeMaterialIds = new Set(transactions.map(t => t.materialId));
        return materials.filter(m => !activeMaterialIds.has(m.id));
      }

      default: // Transaction-based reports
        let result = dateFilteredTransactions;
        if (filterType === 'byMaterial' && selectedMaterialId) {
            result = result.filter(t => t.materialId === selectedMaterialId);
        }
        if (filterType === 'byCategory' && selectedCategory) {
            const materialIdsInCategory = materials.filter(m => m.category === selectedCategory).map(m => m.id);
            result = result.filter(t => materialIdsInCategory.includes(t.materialId));
        }
        if (filterType === 'bySupplier' && selectedSupplier) {
            const materialIdsFromSupplier = materials.filter(m => m.supplier === selectedSupplier).map(m => m.id);
            result = result.filter(t => materialIdsFromSupplier.includes(t.materialId));
        }
        if (filterType === 'byBarcode' && selectedBarcode) {
            result = result.filter(t => t.barcode === selectedBarcode);
        }
        if (filterType === 'byItemBarcode' && selectedItemBarcode) {
            result = result.filter(t => t.itemBarcode === selectedItemBarcode);
        }
        return [...result].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  }, [materials, transactions, dateFilteredTransactions, filterType, selectedMaterialId, selectedCategory, selectedSupplier, selectedBarcode]);
  
  const exportToXLSX = () => {
    let dataToExport: any[] = [];
    let fileName = 'report.xlsx';

    switch(filterType) {
        case 'totalCount':
        case 'lowStock':
        case 'inactive':
            dataToExport = (reportData as Material[]).map(m => ({
                "اسم المادة": m.name, "نوع المادة": m.materialType, "الفئة": m.category,
                "المورد": m.supplier, "الباركود": m.barcode, "الكمية الحالية": m.currentStock,
                "الحد الأدنى": m.minStock, "وحدة القياس": m.unit,
            }));
            fileName = `${filterType}_report.xlsx`;
            break;
        case 'mostUsed':
            dataToExport = (reportData as (Material & {totalQuantity: number})[]).map(m => ({
                "اسم المادة": m.name, "نوع المادة": m.materialType, "الفئة": m.category,
                "المورد": m.supplier, "الباركود": m.barcode, "إجمالي الكمية المسحوبة": m.totalQuantity,
            }));
            fileName = 'most_used_materials.xlsx';
            break;
        default: // Transaction reports
            dataToExport = (reportData as Transaction[]).map(t => ({
                'التاريخ والوقت': new Date(t.date).toLocaleString('ar-EG'), 'اسم المادة': t.materialName,
                'نوع المادة': t.materialType, 'الفئة': t.category, 'الباركود': t.barcode,
                'باركود الصنف': t.itemBarcode || '-',
                'المورد': t.supplier, 'الكمية المسحوبة': `${t.quantity} ${t.unit}`, 'المستلم': t.recipient,
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
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let tableContent;
    let tableHeaders;

    switch(filterType) {
        case 'totalCount':
        case 'lowStock':
        case 'inactive':
            reportTitle = filterType === 'totalCount' ? 'تقرير إجمالي جرد المخزون' : filterType === 'lowStock' ? 'تقرير المواد منخفضة الكمية' : 'تقرير المواد الراكدة';
            tableHeaders = `<th>اسم المادة</th><th>الفئة</th><th>الباركود</th><th>المورد</th><th>الكمية الحالية</th><th>الحد الأدنى</th>`;
            tableContent = (reportData as Material[]).map(m => `<tr><td>${m.name}</td><td>${m.category}</td><td>${m.barcode}</td><td>${m.supplier}</td><td>${m.currentStock} ${m.unit}</td><td>${m.minStock} ${m.unit}</td></tr>`).join('');
            break;
        case 'mostUsed':
            reportTitle = `تقرير المواد الأكثر استخداماً`;
            tableHeaders = `<th>اسم المادة</th><th>الفئة</th><th>الباركود</th><th>المورد</th><th>إجمالي المسحوب</th>`;
            tableContent = (reportData as (Material & {totalQuantity: number})[]).map(m => `<tr><td>${m.name}</td><td>${m.category}</td><td>${m.barcode}</td><td>${m.supplier}</td><td>${m.totalQuantity} ${m.unit}</td></tr>`).join('');
            break;
        default: // Transaction reports
            reportTitle = `تقرير حركات`;
            tableHeaders = `<th>التاريخ والوقت</th><th>اسم المادة</th><th>باركود المادة</th><th>باركود الصنف</th><th>المورد</th><th>الكمية</th><th>المستلم</th><th>ملاحظات</th>`;
            tableContent = (reportData as Transaction[]).map(t => `<tr><td>${new Date(t.date).toLocaleString('ar-EG')}</td><td>${t.materialName}</td><td>${t.barcode}</td><td>${t.itemBarcode || '-'}</td><td>${t.supplier}</td><td>${t.quantity} ${t.unit}</td><td>${t.recipient}</td><td>${t.notes || ''}</td></tr>`).join('');
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
  
  const canPerformAction = reportData && reportData.length > 0;
  const showDatePickers = ['all', 'daily', 'weekly', 'monthly', 'byMaterial', 'byCategory', 'byBarcode', 'byItemBarcode', 'bySupplier', 'mostUsed'].includes(filterType);

  // Helper for filtered report options
  const reportOptions = [
    { value: 'all', label: 'كل الحركات' },
    { value: 'daily', label: 'تقرير يومي' },
    { value: 'weekly', label: 'تقرير أسبوعي' },
    { value: 'monthly', label: 'تقرير شهري' },
    { value: 'byMaterial', label: 'تقرير حسب المادة' },
    { value: 'byCategory', label: 'تقرير حسب الفئة' },
    { value: 'bySupplier', label: 'تقرير حسب المورد' },
    { value: 'byBarcode', label: 'تقرير حسب باركود المادة' },
    { value: 'byItemBarcode', label: 'تقرير حسب باركود الصنف/القصة' },
    { value: 'totalCount', label: 'جرد إجمالي للمخزون' },
    { value: 'mostUsed', label: 'تقرير بالمواد الأكثر استخداماً' },
    { value: 'inactive', label: 'تقرير بالمواد الراكدة' },
    { value: 'lowStock', label: 'تقرير بالمواد منخفضة الكمية' },
  ].filter(opt => opt.label.includes(searchFilterType));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">التقارير والجرد</h1>

      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md space-y-4 border dark:border-gray-700 transition-colors">
        <div className="flex flex-wrap items-end gap-4">
           <div className="space-y-1">
             <label className="text-xs font-bold text-gray-400">نوع التقرير</label>
             <div className="flex gap-1">
                <div className="relative">
                    <Search className="absolute right-2 top-2.5 text-gray-400" size={14} />
                    <input type="text" placeholder="بحث..." value={searchFilterType} onChange={e => setSearchFilterType(e.target.value)} className="w-20 p-1.5 pr-7 border rounded text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
                <select 
                    value={filterType} 
                    onChange={(e) => handleFilterChange(e.target.value as ReportType)}
                    className="p-1.5 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-48 font-bold"
                >
                    {reportOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
             </div>
           </div>
            
            {showDatePickers && (
              <div className="flex gap-2 items-end">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400">من تاريخ</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-1.5 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
                {filterType !== 'daily' && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400">إلى تاريخ</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-1.5 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                  </div>
                )}
              </div>
            )}

            {filterType === 'byMaterial' && (
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400">اختر المادة</label>
                    <div className="flex gap-1">
                        <input type="text" placeholder="بحث..." value={searchMaterial} onChange={e => setSearchMaterial(e.target.value)} className="w-20 p-1.5 border rounded text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        <select value={selectedMaterialId} onChange={e => setSelectedMaterialId(e.target.value)} className="p-1.5 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-40" disabled={materials.length === 0}>
                            {materials.filter(m => m.name.includes(searchMaterial)).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </div>
                </div>
            )}
            
            {filterType === 'byCategory' && (
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400">اختر الفئة</label>
                    <div className="flex gap-1">
                        <input type="text" placeholder="بحث..." value={searchCategory} onChange={e => setSearchCategory(e.target.value)} className="w-20 p-1.5 border rounded text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="p-1.5 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-40" disabled={uniqueCategories.length === 0}>
                            <option value="">-- اختر الفئة --</option>
                            {uniqueCategories.filter(c => c.includes(searchCategory)).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
            )}

            {filterType === 'bySupplier' && (
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400">اختر المورد</label>
                    <div className="flex gap-1">
                        <input type="text" placeholder="بحث..." value={searchSupplier} onChange={e => setSearchSupplier(e.target.value)} className="w-20 p-1.5 border rounded text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} className="p-1.5 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-40" disabled={uniqueSuppliers.length === 0}>
                            <option value="">-- اختر المورد --</option>
                            {uniqueSuppliers.filter(s => s.includes(searchSupplier)).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
            )}

            {filterType === 'byBarcode' && (
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400">اختر باركود المادة</label>
                    <div className="flex gap-1">
                        <input type="text" placeholder="بحث..." value={searchBarcode} onChange={e => setSearchBarcode(e.target.value)} className="w-20 p-1.5 border rounded text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        <select value={selectedBarcode} onChange={e => setSelectedBarcode(e.target.value)} className="p-1.5 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-40" disabled={uniqueBarcodes.length === 0}>
                            <option value="">-- اختر الباركود --</option>
                            {uniqueBarcodes.filter(b => b.includes(searchBarcode)).map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                </div>
            )}

            {filterType === 'byItemBarcode' && (
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400">اختر باركود الصنف</label>
                    <div className="flex gap-1">
                        <input type="text" placeholder="بحث..." value={searchItemBarcode} onChange={e => setSearchItemBarcode(e.target.value)} className="w-20 p-1.5 border rounded text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        <select value={selectedItemBarcode} onChange={e => setSelectedItemBarcode(e.target.value)} className="p-1.5 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-40" disabled={uniqueItemBarcodes.length === 0}>
                            <option value="">-- اختر الباركود --</option>
                            {uniqueItemBarcodes.filter(b => b && b.includes(searchItemBarcode)).map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                </div>
            )}

            <div className="flex gap-2">
                <button onClick={exportToXLSX} className="flex items-center px-4 py-2 bg-emerald-500 text-white rounded-lg shadow hover:bg-emerald-600 disabled:bg-emerald-300 transition-colors" disabled={!canPerformAction}>
                    <Download className="ml-2" size={18}/>
                    تصدير XLSX
                </button>
                <button onClick={handlePrint} className="flex items-center px-4 py-2 bg-sky-500 text-white rounded-lg shadow hover:bg-sky-600 disabled:bg-sky-300 transition-colors" disabled={!canPerformAction}>
                    <Printer className="ml-2" size={18}/>
                    طباعة التقرير
                </button>
            </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-x-auto border dark:border-gray-700 transition-colors">
        { (filterType === 'totalCount' || filterType === 'lowStock' || filterType === 'inactive') ? (
             <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        <th scope="col" className="px-6 py-3">اسم المادة</th>
                        <th scope="col" className="px-6 py-3">الباركود</th>
                        <th scope="col" className="px-6 py-3">الفئة</th>
                        <th scope="col" className="px-6 py-3">المورد</th>
                        <th scope="col" className="px-6 py-3">الكمية الحالية</th>
                        <th scope="col" className="px-6 py-3">الحد الأدنى</th>
                    </tr>
                </thead>
                <tbody>
                    {(reportData as Material[]).map(material => (
                        <tr key={material.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                            <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap dark:text-white">{material.name}</td>
                            <td className="px-6 py-4 font-mono text-xs">{material.barcode}</td>
                            <td className="px-6 py-4">{material.category}</td>
                            <td className="px-6 py-4">{material.supplier}</td>
                            <td className={`px-6 py-4 font-black ${material.currentStock < material.minStock ? 'text-red-500' : 'text-emerald-500'}`}>
                                {material.currentStock} {material.unit}
                            </td>
                            <td className="px-6 py-4 text-gray-400">{material.minStock} {material.unit}</td>
                        </tr>
                    ))}
                </tbody>
             </table>
        ) : (filterType === 'mostUsed') ? (
            <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                  <tr>
                      <th scope="col" className="px-6 py-3">اسم المادة</th>
                      <th scope="col" className="px-6 py-3">الباركود</th>
                      <th scope="col" className="px-6 py-3">الفئة</th>
                      <th scope="col" className="px-6 py-3">المورد</th>
                      <th scope="col" className="px-6 py-3">إجمالي الكمية المسحوبة</th>
                  </tr>
              </thead>
              <tbody>
                  {(reportData as (Material & {totalQuantity: number})[]).map(material => (
                      <tr key={material.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                          <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap dark:text-white">{material.name}</td>
                          <td className="px-6 py-4 font-mono text-xs">{material.barcode}</td>
                          <td className="px-6 py-4">{material.category}</td>
                          <td className="px-6 py-4">{material.supplier}</td>
                          <td className="px-6 py-4 font-black text-blue-500">{material.totalQuantity} {material.unit}</td>
                      </tr>
                  ))}
              </tbody>
           </table>
        ) : (
            <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                    <th scope="col" className="px-6 py-3 text-xs">التاريخ والوقت</th>
                    <th scope="col" className="px-6 py-3">المادة / اللون</th>
                    <th scope="col" className="px-6 py-3">باركود المادة</th>
                    <th scope="col" className="px-6 py-3">باركود الصنف</th>
                    <th scope="col" className="px-6 py-3">الفئة</th>
                    <th scope="col" className="px-6 py-3">المورد</th>
                    <th scope="col" className="px-6 py-3">الكمية</th>
                    <th scope="col" className="px-6 py-3">المستلم</th>
                    </tr>
                </thead>
                <tbody>
                    {(reportData as Transaction[]).map(transaction => (
                    <tr key={transaction.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                        <td className="px-6 py-4 text-xs">{new Date(transaction.date).toLocaleString('ar-EG')}</td>
                        <td className="px-6 py-4">
                            <div className="font-bold text-gray-900 dark:text-white">{transaction.materialName}</div>
                            {transaction.color && <div className="text-[10px] text-gray-400">{transaction.color}</div>}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">{transaction.barcode}</td>
                        <td className="px-6 py-4 font-mono text-xs text-blue-500 font-bold">{transaction.itemBarcode || '-'}</td>
                        <td className="px-6 py-4 text-xs">{transaction.category}</td>
                        <td className="px-6 py-4 text-xs">{transaction.supplier}</td>
                        <td className={`px-6 py-4 font-black ${transaction.type === 'in' ? 'text-emerald-500' : 'text-red-500'}`}>
                            {transaction.type === 'in' ? '+' : '-'}{transaction.quantity} {transaction.unit}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">{transaction.recipient}</td>
                    </tr>
                    ))}
                </tbody>
            </table>
        )}
        {!canPerformAction && <div className="p-12 text-center text-gray-400">لا توجد بيانات تطابق الفلتر المختار.</div>}
      </div>
    </div>
  );
};

export default Reports;
