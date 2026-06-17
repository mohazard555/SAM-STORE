
import React, { useState, useMemo, useRef } from 'react';
import { Transaction, Material, User, Warehouse, SettingsData } from '@/types';
import { usePrint } from '@/services/PrintContext';
import { 
  RotateCcw, Search, Filter, Calendar, Printer, Download, 
  ArrowLeftRight, Package, User as UserIcon, FileText,
  X, Image as ImageIcon, FileSpreadsheet, Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { exportToExcel } from '@/utils/excelExport';
import html2canvas from 'html2canvas';

interface SupplierReturnsProps {
  transactions: Transaction[];
  materials: Material[];
  warehouses: Warehouse[];
  user: User;
  settings?: SettingsData;
}

const SupplierReturns: React.FC<SupplierReturnsProps> = ({ transactions, materials, warehouses, user, settings }) => {
  const { triggerPrint } = usePrint();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [selectedReturn, setSelectedReturn] = useState<Transaction | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const handlePrintSingleVoucher = (t: Transaction) => {
    const material = materials.find(m => m.id === t.materialId);
    const price = material?.price || 0;
    const total = price * t.quantity;
    const warehouse = warehouses.find(w => w.id === t.warehouseId)?.name || 'المستودع الرئيسي';

    const html = `
      <div class="print-container">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
          * { box-sizing: border-box; }
          body { font-family: 'Cairo', sans-serif; direction: rtl; margin: 0; padding: 0; color: #1e293b; background: white; -webkit-print-color-adjust: exact; }
          .print-container { padding: 40px; max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double #cbd5e1; padding-bottom: 20px; margin-bottom: 25px; }
          .logo-placeholder { font-size: 2.5rem; }
          .company-info h2 { font-size: 1.6rem; font-weight: 700; margin: 0 0 5px 0; color: #0f172a; }
          .company-info p { font-size: 0.9rem; margin: 0; color: #64748b; }
          .doc-title { text-align: center; margin: 20px 0; }
          .doc-title h1 { display: inline-block; font-size: 1.4rem; font-weight: 700; color: #ef4444; border: 2px solid #ef4444; padding: 8px 24px; border-radius: 6px; background-color: #fef2f2; margin: 0; }
          .metadata-grid { display: grid; grid-template-cols: repeat(2, 1fr); gap: 15px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 25px; }
          .meta-item { font-size: 0.95rem; }
          .meta-label { font-weight: 700; color: #475569; margin-left: 5px; }
          .meta-val { color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: right; font-size: 0.95rem; }
          th { background-color: #f1f5f9; color: #334155; font-weight: 700; }
          td { color: #0f172a; }
          .totals-section { display: flex; justify-content: flex-end; margin-bottom: 30px; }
          .totals-box { border: 1px solid #cbd5e1; border-radius: 8px; background-color: #fafafa; width: 320px; }
          .totals-row { display: flex; justify-content: space-between; padding: 10px 15px; border-bottom: 1px solid #e2e8f0; font-size: 0.95rem; }
          .totals-row:last-child { border-bottom: none; font-weight: 700; font-size: 1.1rem; color: #ef4444; background-color: #fef2f2; border-radius: 0 0 8px 8px; }
          .notes-box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 15px; background-color: #f8fafc; margin-bottom: 40px; font-size: 0.9rem; }
          .notes-title { font-weight: 700; color: #475569; margin-bottom: 5px; }
          .signatures { display: grid; grid-template-cols: repeat(3, 1fr); gap: 20px; margin-top: 50px; text-align: center; }
          .sig-item p { margin: 0 0 45px 0; font-weight: 700; color: #475569; font-size: 0.9rem; }
          .sig-line { border-top: 1.5px dashed #94a3b8; width: 80%; margin: 0 auto; }
        </style>
        <div class="header">
          ${settings?.companyLogo ? `<img src="${settings.companyLogo}" style="max-height: 75px; max-width: 150px; object-fit: contain;">` : '<div class="logo-placeholder">📦</div>'}
          <div class="company-info">
            <h2>${settings?.companyName || 'شركة أمين المستودع'}</h2>
            <p>${settings?.companyAddress || 'العنوان الرئيسي'}</p>
          </div>
        </div>
        <div class="doc-title">
          <h1>سند إرجاع أصناف لمورد</h1>
        </div>
        <div class="metadata-grid">
          <div class="meta-item"><span class="meta-label">رقم السند:</span><span class="meta-val">${t.id}</span></div>
          <div class="meta-item"><span class="meta-label">تاريخ المستند:</span><span class="meta-val">${new Date(t.date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
          <div class="meta-item"><span class="meta-label">المستند المصدر لمستودع:</span><span class="meta-val">${warehouse}</span></div>
          <div class="meta-item"><span class="meta-label">المورد الموجه إليه:</span><span class="meta-val">${t.supplier}</span></div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 60px; text-align: center;">م</th>
              <th>الباركود</th>
              <th>اسم الصنف / المواصفات</th>
              <th style="text-align: center;">الكمية</th>
              <th>الوحدة</th>
              <th style="text-align: left;">سعر الوحدة</th>
              <th style="text-align: left;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: center;">1</td>
              <td style="font-family: monospace;">${t.barcode}</td>
              <td style="font-weight: bold;">${t.materialName}</td>
              <td style="text-align: center; font-weight: 900; color: #ef4444;">${t.quantity}</td>
              <td>${t.unit}</td>
              <td style="text-align: left;">${price.toLocaleString('ar-EG')} ${settings?.currencySymbol || 'ج.م'}</td>
              <td style="text-align: left; font-weight: bold;">${total.toLocaleString('ar-EG')} ${settings?.currencySymbol || 'ج.م'}</td>
            </tr>
          </tbody>
        </table>
        <div class="totals-section">
          <div class="totals-box">
            <div class="totals-row">
              <span>إجمالي الكمية المرتجعة:</span>
              <span>${t.quantity} ${t.unit}</span>
            </div>
            <div class="totals-row">
              <span>صافي قيمة السند المالي:</span>
              <span>${total.toLocaleString('ar-EG')} ${settings?.currencySymbol || 'ج.م'}</span>
            </div>
          </div>
        </div>
        <div class="notes-box">
          <div class="notes-title">الملاحظات والتوصيات:</div>
          <p style="margin: 0; color: #334155;">${t.notes || 'سند مرتجع مورد آلي ومعتمد بدون ملاحظات إضافية.'}</p>
        </div>
        <div class="signatures">
          <div class="sig-item">
            <p>أمين المستودع (المسلم)</p>
            <div class="sig-line"></div>
            <p style="margin-top: 10px; font-weight: normal; color: #64748b; font-size: 0.85rem;">${settings?.signatureNames?.keeper || 'أمين المستودع'}</p>
          </div>
          <div class="sig-item">
            <p>مراجعة الحسابات (المالية)</p>
            <div class="sig-line"></div>
            <p style="margin-top: 10px; font-weight: normal; color: #64748b; font-size: 0.85rem;">${settings?.signatureNames?.accountant || 'رئيس الحسابات'}</p>
          </div>
          <div class="sig-item">
            <p>مدير الإدارة (الاعتماد)</p>
            <div class="sig-line"></div>
            <p style="margin-top: 10px; font-weight: normal; color: #64748b; font-size: 0.85rem;">${settings?.signatureNames?.manager || 'مدير المستودعات'}</p>
          </div>
        </div>
      </div>
    `;
    triggerPrint(html);
  };

  const handleExportSingleImage = async () => {
    const element = previewRef.current;
    if (!element || !selectedReturn) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(element, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const fullFileName = `سند_مرتجع_${selectedReturn.id}.png`;

      if ((window as any).AppCompatibility) {
        (window as any).AppCompatibility.safeDownload(dataUrl, fullFileName, 'image/png');
      } else {
        const link = document.createElement('a');
        link.download = fullFileName;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error('Error generating image:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportSingleExcel = async (t: Transaction) => {
    setIsGenerating(true);
    try {
      const material = materials.find(m => m.id === t.materialId);
      const price = material?.price || 0;
      const total = price * t.quantity;
      const warehouse = warehouses.find(w => w.id === t.warehouseId)?.name || 'المستودع الرئيسي';

      const aoaData = [
        [settings?.companyName || 'شركة أمين المستودع'],
        [settings?.companyAddress || 'العنوان الرئيسي'],
        [],
        ['سند إرجاع أصناف لمورد (سند مرتجع)'],
        [],
        ['رقم العملية (السند):', t.id, '', 'تاريخ العملية:', new Date(t.date).toLocaleDateString('ar-EG')],
        ['اسم المورد:', t.supplier, '', 'المستودع المصدر:', warehouse],
        [],
        ['م', 'الباركود', 'اسم المادة والمواصفات', 'الكمية المرتجعة', 'الوحدة', 'سعر الوحدة', 'القيمة الإجمالية'],
        [1, t.barcode || material?.barcode || '', t.materialName, t.quantity, t.unit, price, total],
        [],
        ['إجمالي الكمية المفرزة:', t.quantity, '', 'إجمالي القيمة المسترجعة:', `${total} ${settings?.currencySymbol || 'ج.م'}`],
        [],
        ['الملاحظات والتوصيات:', t.notes || '---'],
        [],
        [],
        ['توقيع أمين المستودع', '', 'توقيع الحسابات والمراجعة', '', 'اعتماد مدير الإدارة'],
        [settings?.signatureNames?.keeper || 'أمين المستودع', '', settings?.signatureNames?.accountant || 'رئيس الحسابات', '', settings?.signatureNames?.manager || 'مدير المستودعات']
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(aoaData);

      if (!worksheet['!views']) worksheet['!views'] = [];
      worksheet['!views'].push({ RTL: true });

      worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } }
      ];

      const colWidths = [
        { wch: 5 },
        { wch: 18 },
        { wch: 28 },
        { wch: 15 },
        { wch: 10 },
        { wch: 15 },
        { wch: 18 }
      ];
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'سند المرتجع');

      const fullFileName = `سند_مرتجع_${t.id}.xlsx`;
      
      if ((window as any).AppCompatibility) {
        const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        const env = (window as any).AppCompatibility.getEnvironment();
        if (env === 'android-webview' || env === 'appcreator24') {
          const excelBase64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
          (window as any).AppCompatibility.safeDownload(`data:${mimeType};base64,${excelBase64}`, fullFileName, mimeType);
        } else {
          const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
          const blob = new Blob([excelBuffer], { type: mimeType });
          const url = URL.createObjectURL(blob);
          (window as any).AppCompatibility.safeDownload(url, fullFileName, mimeType);
          setTimeout(() => URL.revokeObjectURL(url), 60000);
        }
      } else {
        XLSX.writeFile(workbook, fullFileName);
      }
    } catch (err) {
      console.error('Error generating Excel:', err);
    } finally {
      setIsGenerating(false);
    }
  };

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
  const totalValue = useMemo(() => {
    return filteredReturns.reduce((sum, t) => {
      const material = materials.find(m => m.id === t.materialId);
      const price = material?.price || 0;
      return sum + (t.quantity * price);
    }, 0);
  }, [filteredReturns, materials]);

  const handleExportExcel = async () => {
    const data = filteredReturns.map(t => {
      const material = materials.find(m => m.id === t.materialId);
      const price = material?.price || 0;
      return {
        'رقم العملية': t.id,
        'التاريخ': new Date(t.date).toLocaleDateString('ar-EG'),
        'المورد': t.supplier,
        'اسم المادة': t.materialName,
        'الكمية': t.quantity,
        'الوحدة': t.unit,
        'السعر': price,
        'القيمة الإجمالية': t.quantity * price,
        'الملاحظات': t.notes || ''
      };
    });

    await exportToExcel(data, "supplier_returns", "مرتجعات الموردين");
  };

  const handlePrint = () => {
    const tableContent = filteredReturns.map(t => {
      const material = materials.find(m => m.id === t.materialId);
      const price = material?.price || 0;
      return `
        <tr>
          <td>${t.id}</td>
          <td>${new Date(t.date).toLocaleDateString('ar-EG')}</td>
          <td>${t.supplier}</td>
          <td>${t.materialName}</td>
          <td>${t.quantity}</td>
          <td>${t.unit}</td>
          <td>${price.toLocaleString('ar-EG')}</td>
          <td>${(t.quantity * price).toLocaleString('ar-EG')}</td>
          <td>${t.notes || ''}</td>
        </tr>
      `;
    }).join('');

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
          .total-row { margin-top: 20px; text-align: left; font-weight: bold; font-size: 1.1em; }
        </style>
        <div class="header">
          ${settings?.companyLogo ? `<img src="${settings.companyLogo}" alt="Logo">` : '<div></div>'}
          <div class="company-info">
            <h2>${settings?.companyName || ''}</h2>
            <p>${settings?.companyAddress || ''}</p>
          </div>
        </div>
        <h2 class="report-title">تقرير مرتجعات الموردين</h2>
        <table>
          <thead>
            <tr>
              <th>رقم العملية</th>
              <th>التاريخ</th>
              <th>المورد</th>
              <th>المادة</th>
              <th>الكمية</th>
              <th>الوحدة</th>
              <th>السعر</th>
              <th>القيمة</th>
              <th>الملاحظات</th>
            </tr>
          </thead>
          <tbody>
            ${tableContent}
          </tbody>
        </table>
        <div class="total-row">إجمالي الكمية: ${totalQuantity}</div>
        <div class="total-row">إجمالي القيمة: ${totalValue.toLocaleString('ar-EG')} ${settings?.currencySymbol || 'ج.م'}</div>
      </div>
    `;
    triggerPrint(html);
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500 rounded-lg text-white">
                <Package size={20} />
            </div>
            <span className="font-bold text-gray-700 dark:text-gray-200">إجمالي الكميات:</span>
            </div>
            <span className="text-2xl font-black text-red-600 dark:text-red-400">{totalQuantity}</span>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-lg text-white">
                <FileText size={20} />
            </div>
            <span className="font-bold text-gray-700 dark:text-gray-200">إجمالي القيمة المالية:</span>
            </div>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{totalValue.toLocaleString('ar-EG')} {settings?.currencySymbol || 'ج.م'}</span>
        </div>
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
                <th className="p-4 border-b dark:border-gray-600">السعر</th>
                <th className="p-4 border-b dark:border-gray-600">القيمة</th>
                <th className="p-4 border-b dark:border-gray-600">الملاحظات</th>
                <th className="p-4 border-b dark:border-gray-600 text-center">سند الصرف المرتجع</th>
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
                  <td className="p-4 text-gray-500 dark:text-gray-400 text-xs">
                    {materials.find(m => m.id === t.materialId)?.price?.toLocaleString('ar-EG') || '0'} {settings?.currencySymbol || 'ج.م'}
                  </td>
                  <td className="p-4 font-bold text-gray-900 dark:text-white">
                    {((materials.find(m => m.id === t.materialId)?.price || 0) * t.quantity).toLocaleString('ar-EG')} {settings?.currencySymbol || 'ج.م'}
                  </td>
                  <td className="p-4 text-gray-500 dark:text-gray-400 text-sm max-w-xs truncate" title={t.notes}>
                    {t.notes || '---'}
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => setSelectedReturn(t)} 
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-sm border border-red-200 dark:border-red-900/30"
                    >
                      <FileText size={14} />
                      توليد سند
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={10} className="p-10 text-center text-gray-500 dark:text-gray-400 italic">
                    لا توجد حركات مرتجعات تطابق البحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Return Invoice Generation Modal popup */}
      {selectedReturn && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex justify-center items-center p-4 overflow-y-auto">
          <div className="bg-gray-100 dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-5xl my-8 flex flex-col lg:flex-row overflow-hidden border dark:border-gray-800 animate-in fade-in zoom-in-95 duration-250">
            
            {/* Sidebar Controls */}
            <div className="w-full lg:w-80 bg-white dark:bg-gray-900 p-6 border-b lg:border-b-0 lg:border-l border-gray-200 dark:border-gray-800 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <Sparkles size={18} className="text-red-500 animate-pulse" />
                    تصدير وتوليد سند
                  </h3>
                  <button 
                    onClick={() => setSelectedReturn(null)} 
                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="bg-red-50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/30 rounded-xl p-4 mb-6">
                  <span className="font-bold text-xs text-red-800 dark:text-red-400 uppercase tracking-wider block mb-1">المستند الحالي</span>
                  <p className="text-xs text-gray-600 dark:text-gray-300">سند مرتجع للمورد بقيمة مالية معتمدة. يمكنك إرسال هذا السند لقسم المحاسبة والمالية فوراً.</p>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={() => handlePrintSingleVoucher(selectedReturn)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-red-500/10 active:scale-[0.98]"
                  >
                    <span className="flex items-center gap-2">
                      <Printer size={16} />
                      طباعة السند الورقي
                    </span>
                    <span className="text-[10px] bg-red-500 text-red-100 px-1.5 py-0.5 rounded">PDF</span>
                  </button>

                  <button 
                    onClick={handleExportSingleImage}
                    disabled={isGenerating}
                    className="w-full flex items-center justify-between px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-indigo-500/10 active:scale-[0.98] disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <ImageIcon size={16} />
                      {isGenerating ? 'جاري التحويل...' : 'تحميل وحفظ كصورة'}
                    </span>
                    <span className="text-[10px] bg-indigo-500 text-indigo-100 px-1.5 py-0.5 rounded">PNG</span>
                  </button>

                  <button 
                    onClick={() => handleExportSingleExcel(selectedReturn)}
                    disabled={isGenerating}
                    className="w-full flex items-center justify-between px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-emerald-500/10 active:scale-[0.98] disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <FileSpreadsheet size={16} />
                      {isGenerating ? 'جاري التصدير...' : 'تحميل كملف إكسل'}
                    </span>
                    <span className="text-[10px] bg-emerald-500 text-emerald-100 px-1.5 py-0.5 rounded">XLSX</span>
                  </button>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-100 dark:border-gray-800 text-center">
                <button 
                  onClick={() => setSelectedReturn(null)}
                  className="w-full py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-colors"
                >
                  إغلاق المعاينة والتراجع
                </button>
              </div>
            </div>

            {/* Document Live Preview Area */}
            <div className="flex-1 p-6 lg:p-10 overflow-y-auto max-h-[80vh] flex justify-center bg-gray-100 dark:bg-gray-950">
              <div className="shadow-xl rounded-lg overflow-hidden border dark:border-gray-800 bg-white text-gray-900 w-full max-w-[720px] shrink-0 p-8 relative flex flex-col" style={{ minHeight: '842px' }}>
                
                {/* HTML Capture Target */}
                <div id="return-invoice-capture" ref={previewRef} className="p-6 bg-white text-gray-900 w-full flex-1 flex flex-col text-right" style={{ direction: 'rtl' }}>
                  
                  {/* Top Letterhead */}
                  <div className="flex justify-between items-center border-b-2 border-gray-300 pb-4 mb-6">
                    {settings?.companyLogo ? (
                      <img src={settings.companyLogo} alt="Corporate Logo" className="max-h-16 max-w-[140px] object-contain" />
                    ) : (
                      <div className="text-3xl">📦</div>
                    )}
                    <div className="text-right">
                      <h2 className="text-lg font-black text-gray-950">{settings?.companyName || 'شركة أمين المستودع'}</h2>
                      <p className="text-xs text-gray-500">{settings?.companyAddress || 'العنوان الرئيسي للشركة / المستودعات'}</p>
                    </div>
                  </div>

                  {/* Voucher Title */}
                  <div className="text-center my-4">
                    <span className="inline-block px-6 py-2 border-2 border-red-500 bg-red-50 text-red-600 font-bold text-sm tracking-wide rounded-lg">
                      سند إرجاع مواد ومخزون للمورد
                    </span>
                  </div>

                  {/* Metadata fields */}
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-xs">
                    <div>
                      <span className="font-bold text-gray-500 ml-1">رقم السند:</span>
                      <span className="font-mono text-gray-900">{selectedReturn.id}</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-500 ml-1">تاريخ المعاملة:</span>
                      <span className="text-gray-900">{new Date(selectedReturn.date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-500 ml-1">المستودع المصدر:</span>
                      <span className="text-gray-900">
                        {warehouses.find(w => w.id === selectedReturn.warehouseId)?.name || 'المستودع الرئيسي'}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-500 ml-1">المورد المرتجع إليه:</span>
                      <span className="text-gray-900 font-bold">{selectedReturn.supplier}</span>
                    </div>
                  </div>

                  {/* Items Table */}
                  <table className="w-full text-sm border-collapse border border-gray-300 text-right mb-6">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700 font-bold text-xs">
                        <th className="p-3 border border-gray-300 text-center w-12">م</th>
                        <th className="p-3 border border-gray-300">كود / باركود الصنف</th>
                        <th className="p-3 border border-gray-300">اسم الصنف والمواصفات</th>
                        <th className="p-3 border border-gray-300 text-center">الكمية المرتجعة</th>
                        <th className="p-3 border border-gray-300">الوحدة</th>
                        <th className="p-3 border border-gray-300 text-left">أحدث سعر</th>
                        <th className="p-3 border border-gray-300 text-left">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-xs text-gray-900">
                        <td className="p-3 border border-gray-300 text-center">1</td>
                        <td className="p-3 border border-gray-300 font-mono text-gray-500">{selectedReturn.barcode}</td>
                        <td className="p-3 border border-gray-300 font-bold">{selectedReturn.materialName}</td>
                        <td className="p-3 border border-gray-300 text-center font-black text-red-650 text-sm">{selectedReturn.quantity}</td>
                        <td className="p-3 border border-gray-300">{selectedReturn.unit}</td>
                        <td className="p-3 border border-gray-300 text-left">
                          {(materials.find(m => m.id === selectedReturn.materialId)?.price || 0).toLocaleString('ar-EG')} {settings?.currencySymbol || 'ج.م'}
                        </td>
                        <td className="p-3 border border-gray-300 text-left font-bold text-gray-950">
                          {((materials.find(m => m.id === selectedReturn.materialId)?.price || 0) * selectedReturn.quantity).toLocaleString('ar-EG')} {settings?.currencySymbol || 'ج.م'}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Totals Section */}
                  <div className="flex justify-end mb-6">
                    <div className="w-72 bg-gray-50 border border-gray-200 rounded-lg text-xs overflow-hidden">
                      <div className="flex justify-between p-2.5 border-b border-gray-200">
                        <span className="text-gray-500 font-bold">إجمالي كمية الصنف:</span>
                        <span className="font-bold text-gray-900">{selectedReturn.quantity} {selectedReturn.unit}</span>
                      </div>
                      <div className="flex justify-between p-2.5 bg-red-50 text-red-700 font-black">
                        <span>قيمة السند المالي المرتجع:</span>
                        <span>
                          {((materials.find(m => m.id === selectedReturn.materialId)?.price || 0) * selectedReturn.quantity).toLocaleString('ar-EG')} {settings?.currencySymbol || 'ج.م'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notes Area */}
                  <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 text-xs mb-8 flex-1">
                    <span className="font-bold text-gray-500 block mb-1">الملاحظات والتوصيات:</span>
                    <p className="text-gray-700 leading-relaxed">{selectedReturn.notes || 'لقد تم جرد هذه الشحنة وإرجاعها للمورد آلياً بموجب خلل أو تلف في التوريد المعتمد.'}</p>
                  </div>

                  {/* Standard signatures panel */}
                  <div className="grid grid-cols-3 gap-4 text-center mt-auto text-[11px] text-gray-600">
                    <div>
                      <p className="font-bold text-gray-800 mb-10">أمين المستودع (المسلم)</p>
                      <div className="border-t border-dashed border-gray-400 w-3/4 mx-auto my-2"></div>
                      <p className="text-gray-400 font-light mt-1">{settings?.signatureNames?.keeper || 'أمين المستودع'}</p>
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 mb-10">مراجعة الحسابات (المالية)</p>
                      <div className="border-t border-dashed border-gray-400 w-3/4 mx-auto my-2"></div>
                      <p className="text-gray-400 font-light mt-1">{settings?.signatureNames?.accountant || 'رئيس الحسابات'}</p>
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 mb-10">اعتماد الإدارة (المستودعات)</p>
                      <div className="border-t border-dashed border-gray-400 w-3/4 mx-auto my-2"></div>
                      <p className="text-gray-400 font-light mt-1">{settings?.signatureNames?.manager || 'مدير المستودعات'}</p>
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierReturns;
