
import React, { useState, useMemo } from 'react';
import { Transaction, Material, SettingsData } from '@/types';
import { Download, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ReportsProps {
  transactions: Transaction[];
  materials: Material[];
  settings: SettingsData | null;
}

type ReportType = 'daily' | 'weekly' | 'monthly' | 'byMaterial' | 'byCategory' | 'byBarcode' | 'totalCount' | 'all' | 'bySupplier' | 'mostUsed' | 'inactive' | 'lowStock';

const Reports: React.FC<ReportsProps> = ({ transactions, materials, settings }) => {
  const [filterType, setFilterType] = useState<ReportType>('all');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMaterialId, setSelectedMaterialId] = useState(materials[0]?.id || '');
  const [barcode, setBarcode] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');

  const uniqueCategories = useMemo(() => {
    const categories = materials.map(m => m.category);
    return [...new Set(categories)].filter(Boolean);
  }, [materials]);
  
  const uniqueSuppliers = useMemo(() => {
    const suppliers = materials.map(m => m.supplier);
    return [...new Set(suppliers)].filter(Boolean);
  }, [materials]);

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
    } else if (type === 'byCategory') {
      setSelectedCategory(uniqueCategories[0] || '');
    } else if (type === 'bySupplier') {
      setSelectedSupplier(uniqueSuppliers[0] || '');
    }
  }

  const dateFilteredTransactions = useMemo(() => {
    const timeSensitiveReports: ReportType[] = ['daily', 'weekly', 'monthly', 'byMaterial', 'byCategory', 'byBarcode', 'bySupplier', 'mostUsed', 'inactive'];
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
      case 'lowStock':
        return materials.filter(m => m.currentStock < m.minStock);
      
      case 'mostUsed': {
        const usage = dateFilteredTransactions.reduce((acc, t) => {
            acc[t.materialId] = (acc[t.materialId] || 0) + t.quantity;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(usage)
            .map(([materialId, totalQuantity]) => {
                const material = materials.find(m => m.id === materialId);
                return { ...material, totalQuantity };
            })
            .filter(item => item.id)
            .sort((a, b) => b.totalQuantity - a.totalQuantity);
      }
      
      case 'inactive': {
        const activeMaterialIds = new Set(dateFilteredTransactions.map(t => t.materialId));
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
        if (filterType === 'byBarcode' && barcode) {
            const material = materials.find(m => m.barcode === barcode);
            result = material ? result.filter(t => t.materialId === material.id) : [];
        }
        return [...result].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  }, [materials, dateFilteredTransactions, filterType, selectedMaterialId, selectedCategory, selectedSupplier, barcode]);
  
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
                'المورد': t.supplier, 'الكمية المسحوبة': t.quantity, 'المستلم': t.recipient,
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
            tableHeaders = `<th>اسم المادة</th><th>الفئة</th><th>المورد</th><th>الباركود</th><th>الكمية الحالية</th><th>الحد الأدنى</th>`;
            tableContent = (reportData as Material[]).map(m => `<tr><td>${m.name}</td><td>${m.category}</td><td>${m.supplier}</td><td>${m.barcode}</td><td>${m.currentStock} ${m.unit}</td><td>${m.minStock} ${m.unit}</td></tr>`).join('');
            break;
        case 'mostUsed':
            reportTitle = `تقرير المواد الأكثر استخداماً`;
            tableHeaders = `<th>اسم المادة</th><th>الفئة</th><th>المورد</th><th>الباركود</th><th>إجمالي المسحوب</th>`;
            tableContent = (reportData as (Material & {totalQuantity: number})[]).map(m => `<tr><td>${m.name}</td><td>${m.category}</td><td>${m.supplier}</td><td>${m.barcode}</td><td>${m.totalQuantity} ${m.unit}</td></tr>`).join('');
            break;
        default: // Transaction reports
            reportTitle = `تقرير حركات`;
            tableHeaders = `<th>التاريخ والوقت</th><th>اسم المادة</th><th>نوع المادة</th><th>المورد</th><th>الكمية</th><th>المستلم</th><th>ملاحظات</th>`;
            tableContent = (reportData as Transaction[]).map(t => `<tr><td>${new Date(t.date).toLocaleString('ar-EG')}</td><td>${t.materialName}</td><td>${t.materialType}</td><td>${t.supplier}</td><td>${t.quantity}</td><td>${t.recipient}</td><td>${t.notes || ''}</td></tr>`).join('');
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
  const showDatePickers = ['daily', 'weekly', 'monthly', 'byMaterial', 'byCategory', 'byBarcode', 'bySupplier', 'mostUsed', 'inactive'].includes(filterType);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">التقارير والجرد</h1>

      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md space-y-4">
        <div className="flex flex-wrap items-center gap-4">
           <select 
             value={filterType} 
             onChange={(e) => handleFilterChange(e.target.value as ReportType)}
             className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
           >
                <option value="all">كل الحركات</option>
                <option value="daily">تقرير يومي</option>
                <option value="weekly">تقرير أسبوعي</option>
                <option value="monthly">تقرير شهري</option>
                <option value="byMaterial">تقرير حسب المادة</option>
                <option value="byCategory">تقرير حسب الفئة</option>
                <option value="bySupplier">تقرير حسب المورد</option>
                <option value="byBarcode">تقرير حسب الباركود</option>
                <option value="totalCount">جرد إجمالي للمخزون</option>
                <option value="mostUsed">تقرير بالمواد الأكثر استخداماً</option>
                <option value="inactive">تقرير بالمواد الراكدة</option>
                <option value="lowStock">تقرير بالمواد منخفضة الكمية</option>
            </select>
            
            {showDatePickers && (
              <>
                <label>من:</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                {filterType !== 'daily' && (
                  <>
                  <label>إلى:</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                  </>
                )}
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

            {filterType === 'bySupplier' && (
                 <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600" disabled={uniqueSuppliers.length === 0}>
                    {uniqueSuppliers.map(s => <option key={s} value={s}>{s}</option>)}
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
        { (filterType === 'totalCount' || filterType === 'lowStock' || filterType === 'inactive') ? (
             <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        <th scope="col" className="px-6 py-3">اسم المادة</th>
                        <th scope="col" className="px-6 py-3">الفئة</th>
                        <th scope="col" className="px-6 py-3">المورد</th>
                        <th scope="col" className="px-6 py-3">الباركود</th>
                        <th scope="col" className="px-6 py-3">الكمية الحالية</th>
                        <th scope="col" className="px-6 py-3">الحد الأدنى للمخزون</th>
                    </tr>
                </thead>
                <tbody>
                    {(reportData as Material[]).map(material => (
                        <tr key={material.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                            <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{material.name}</td>
                            <td className="px-6 py-4">{material.category}</td>
                            <td className="px-6 py-4">{material.supplier}</td>
                            <td className="px-6 py-4 font-mono">{material.barcode}</td>
                            <td className={`px-6 py-4 font-bold ${material.currentStock < material.minStock ? 'text-red-500' : 'text-emerald-500'}`}>
                                {material.currentStock} {material.unit}
                            </td>
                            <td className="px-6 py-4">{material.minStock} {material.unit}</td>
                        </tr>
                    ))}
                </tbody>
             </table>
        ) : (filterType === 'mostUsed') ? (
            <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                  <tr>
                      <th scope="col" className="px-6 py-3">اسم المادة</th>
                      <th scope="col" className="px-6 py-3">الفئة</th>
                      <th scope="col" className="px-6 py-3">المورد</th>
                      <th scope="col" className="px-6 py-3">الباركود</th>
                      <th scope="col" className="px-6 py-3">إجمالي الكمية المسحوبة</th>
                  </tr>
              </thead>
              <tbody>
                  {(reportData as (Material & {totalQuantity: number})[]).map(material => (
                      <tr key={material.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                          <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{material.name}</td>
                          <td className="px-6 py-4">{material.category}</td>
                          <td className="px-6 py-4">{material.supplier}</td>
                          <td className="px-6 py-4 font-mono">{material.barcode}</td>
                          <td className="px-6 py-4 font-bold text-blue-500">{material.totalQuantity} {material.unit}</td>
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
                    <th scope="col" className="px-6 py-3">نوع المادة</th>
                    <th scope="col" className="px-6 py-3">الفئة</th>
                    <th scope="col" className="px-6 py-3">المورد</th>
                    <th scope="col" className="px-6 py-3">الكمية المسحوبة</th>
                    <th scope="col" className="px-6 py-3">المستلم</th>
                    <th scope="col" className="px-6 py-3">ملاحظات</th>
                    </tr>
                </thead>
                <tbody>
                    {(reportData as Transaction[]).map(transaction => (
                    <tr key={transaction.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                        <td className="px-6 py-4">{new Date(transaction.date).toLocaleString('ar-EG')}</td>
                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{transaction.materialName}</td>
                        <td className="px-6 py-4">{transaction.materialType}</td>
                        <td className="px-6 py-4">{transaction.category}</td>
                        <td className="px-6 py-4">{transaction.supplier}</td>
                        <td className="px-6 py-4">{transaction.quantity} {transaction.unit}</td>
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