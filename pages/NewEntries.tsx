import React, { useState, useMemo, useRef } from 'react';
import { Material, User, SettingsData, Warehouse } from '@/types';
import { 
  AlertTriangle, Search, Printer, Download, Calendar, 
  FileText, X, Image as ImageIcon, FileSpreadsheet, Sparkles, Layers,
  ArrowUp, ArrowDown, ChevronDown, ChevronUp
} from 'lucide-react';
import { usePrint } from '@/services/PrintContext';
import { exportToExcel } from '@/utils/excelExport';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

interface NewEntriesProps {
  materials: Material[];
  user: User;
  settings?: SettingsData;
  warehouses?: Warehouse[];
}

interface EntryVoucherData {
  id: string;
  date: string;
  dateFormatted: string;
  warehouseName: string;
  supplier: string;
  isBatch?: boolean;
  items: {
    no: number;
    barcode: string;
    name: string;
    specifications: string;
    quantity: number;
    unit: string;
    price: number;
    total: number;
  }[];
  totalQuantity: number;
  totalValue: number;
  notes: string;
}

const NewEntries: React.FC<NewEntriesProps> = ({ materials, user, settings, warehouses = [] }) => {
  const { triggerPrint } = usePrint();
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Voucher preview modal state
  const [selectedVoucher, setSelectedVoucher] = useState<EntryVoucherData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape' | 'auto'>('auto');
  const previewRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);

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

  const defaultWarehouseName = useMemo(() => {
    return warehouses.length > 0 ? warehouses[0].name : 'المستودع الرئيسي';
  }, [warehouses]);

  // Open single voucher
  const handleOpenSingleVoucher = (material: Material) => {
    const price = material.price || 0;
    const qty = material.currentStock || 0;
    const total = price * qty;
    const dateObj = material.createdAt ? new Date(material.createdAt) : new Date();
    const dateFormatted = isNaN(dateObj.getTime()) 
      ? new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : dateObj.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const voucher: EntryVoucherData = {
      id: `IN-${material.id.slice(-6).toUpperCase()}-${Date.now().toString().slice(-4)}`,
      date: material.createdAt || new Date().toISOString(),
      dateFormatted,
      warehouseName: defaultWarehouseName,
      supplier: material.supplier || 'مورد عام',
      isBatch: false,
      items: [
        {
          no: 1,
          barcode: material.barcode,
          name: material.name,
          specifications: material.specifications || material.materialType || 'بدون مواصفات',
          quantity: qty,
          unit: material.unit || 'قطعة',
          price: price,
          total: total
        }
      ],
      totalQuantity: qty,
      totalValue: total,
      notes: 'تم فحص المواد واستلامها بالمستودع بحالة ممتازة ومطابقة للمواصفات الفنية المعتمدة.'
    };

    setSelectedVoucher(voucher);
  };

  // Open batch voucher for all filtered materials
  const handleOpenBatchVoucher = () => {
    if (filteredMaterials.length === 0) return;

    let totalQty = 0;
    let totalVal = 0;
    const items = filteredMaterials.map((m, index) => {
      const price = m.price || 0;
      const qty = m.currentStock || 0;
      const total = price * qty;
      totalQty += qty;
      totalVal += total;

      return {
        no: index + 1,
        barcode: m.barcode,
        name: m.name,
        specifications: m.specifications || m.materialType || '---',
        quantity: qty,
        unit: m.unit || 'قطعة',
        price: price,
        total: total
      };
    });

    // Unique suppliers
    const uniqueSuppliers = Array.from(new Set(filteredMaterials.map(m => m.supplier))).filter(Boolean);
    const supplierStr = uniqueSuppliers.length === 1 ? uniqueSuppliers[0] : (uniqueSuppliers.length > 1 ? `${uniqueSuppliers[0]} وموردون آخرون` : 'موردون متعددون');

    const voucher: EntryVoucherData = {
      id: `IN-BATCH-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      dateFormatted: new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      warehouseName: defaultWarehouseName,
      supplier: supplierStr,
      isBatch: true,
      items,
      totalQuantity: totalQty,
      totalValue: totalVal,
      notes: `سند استلام وتوريد مجمع لعدد (${filteredMaterials.length}) صنف تم فحصها واستلامها في المستودع.`
    };

    setSelectedVoucher(voucher);
  };

  // Print single or batch voucher
  const handlePrintSingleVoucher = (v: EntryVoucherData) => {
    const tableRows = v.items.map(item => `
      <tr>
        <td style="text-align: center;">${item.no}</td>
        <td style="font-family: monospace;">${item.barcode}</td>
        <td style="font-weight: bold;">${item.name} <span style="font-size: 0.8em; color: #64748b; display: block;">${item.specifications}</span></td>
        <td style="text-align: center; font-weight: 900; color: #0284c7;">${item.quantity}</td>
        <td>${item.unit}</td>
        <td style="text-align: left;">${item.price.toLocaleString('ar-EG')} ${settings?.currencySymbol || 'ل.س'}</td>
        <td style="text-align: left; font-weight: bold;">${item.total.toLocaleString('ar-EG')} ${settings?.currencySymbol || 'ل.س'}</td>
      </tr>
    `).join('');

    const pageOrientationRule = printOrientation === 'landscape'
      ? '@page { size: landscape; margin: 8mm; }'
      : printOrientation === 'portrait'
        ? '@page { size: portrait; margin: 10mm; }'
        : '@page { size: auto; margin: 10mm; }';

    const html = `
      <div class="print-container">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
          * { box-sizing: border-box; }
          body { font-family: 'Cairo', sans-serif; direction: rtl; margin: 0; padding: 0; color: #1e293b; background: white; -webkit-print-color-adjust: exact; }
          ${pageOrientationRule}
          .print-container { width: 100% !important; max-width: 100% !important; padding: 5px !important; margin: 0 !important; border: none !important; border-radius: 0 !important; box-shadow: none !important; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double #cbd5e1; padding-bottom: 12px; margin-bottom: 15px; }
          .logo-placeholder { font-size: 2.5rem; }
          .company-info h2 { font-size: 1.4rem; font-weight: 700; margin: 0 0 5px 0; color: #0f172a; }
          .company-info p { font-size: 0.85rem; margin: 0; color: #64748b; }
          .doc-title { text-align: center; margin: 12px 0; }
          .doc-title h1 { display: inline-block; font-size: 1.25rem; font-weight: 700; color: #0284c7; border: 2px solid #0284c7; padding: 6px 20px; border-radius: 6px; background-color: #f0f9ff; margin: 0; }
          .metadata-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-bottom: 15px; }
          .meta-item { font-size: 0.85rem; }
          .meta-label { font-weight: 700; color: #475569; margin-left: 5px; }
          .meta-val { color: #0f172a; }
          table { width: 100% !important; border-collapse: collapse !important; margin-bottom: 15px; page-break-inside: auto !important; }
          thead { display: table-header-group !important; }
          tfoot { display: table-footer-group !important; }
          tr { page-break-inside: avoid !important; page-break-after: auto !important; }
          th, td { border: 1px solid #cbd5e1 !important; padding: 6px 8px !important; text-align: right; font-size: 0.85rem !important; }
          th { background-color: #f1f5f9 !important; color: #334155 !important; font-weight: 700; }
          td { color: #0f172a !important; }
          .totals-section { display: flex; justify-content: flex-end; margin-bottom: 20px; page-break-inside: avoid; }
          .totals-box { border: 1px solid #cbd5e1; border-radius: 6px; background-color: #fafafa; width: 320px; }
          .totals-row { display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 0.85rem; }
          .totals-row:last-child { border-bottom: none; font-weight: 700; font-size: 0.95rem; color: #0284c7; background-color: #f0f9ff; border-radius: 0 0 6px 6px; }
          .notes-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; background-color: #f8fafc; margin-bottom: 20px; font-size: 0.85rem; page-break-inside: avoid; }
          .notes-title { font-weight: 700; color: #475569; margin-bottom: 4px; }
          .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 25px; text-align: center; page-break-inside: avoid; }
          .sig-item p { margin: 0 0 35px 0; font-weight: 700; color: #475569; font-size: 0.85rem; }
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
          <h1>سند إدخال مواد ومخزون ${v.isBatch ? '(مجمع)' : ''}</h1>
        </div>
        <div class="metadata-grid">
          <div class="meta-item"><span class="meta-label">رقم السند:</span><span class="meta-val">${v.id}</span></div>
          <div class="meta-item"><span class="meta-label">تاريخ المعاملة:</span><span class="meta-val">${v.dateFormatted}</span></div>
          <div class="meta-item"><span class="meta-label">المستودع المستلم:</span><span class="meta-val">${v.warehouseName}</span></div>
          <div class="meta-item"><span class="meta-label">اسم المورد:</span><span class="meta-val">${v.supplier}</span></div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 50px; text-align: center;">م</th>
              <th>كود / باركود الصنف</th>
              <th>اسم الصنف والمواصفات</th>
              <th style="text-align: center;">الكمية المدخلة</th>
              <th>الوحدة</th>
              <th style="text-align: left;">سعر الوحدة</th>
              <th style="text-align: left;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="totals-section">
          <div class="totals-box">
            <div class="totals-row">
              <span>إجمالي الكمية المدخلة:</span>
              <span>${v.totalQuantity}</span>
            </div>
            <div class="totals-row">
              <span>صافي القيمة المالية للسند:</span>
              <span>${v.totalValue.toLocaleString('ar-EG')} ${settings?.currencySymbol || 'ل.س'}</span>
            </div>
          </div>
        </div>
        <div class="notes-box">
          <div class="notes-title">ملاحظات التوريد والفحص:</div>
          <p style="margin: 0; color: #334155;">${v.notes}</p>
        </div>
        <div class="signatures">
          <div class="sig-item">
            <p>أمين المستودع (المستلم)</p>
            <div class="sig-line"></div>
            <p style="margin-top: 10px; font-weight: normal; color: #64748b; font-size: 0.85rem;">${settings?.signatureNames?.keeper || 'أمين المستودع'}</p>
          </div>
          <div class="sig-item">
            <p>مراجعة الحسابات (المالية)</p>
            <div class="sig-line"></div>
            <p style="margin-top: 10px; font-weight: normal; color: #64748b; font-size: 0.85rem;">${settings?.signatureNames?.accountant || 'رئيس الحسابات'}</p>
          </div>
          <div class="sig-item">
            <p>اعتماد إدارة المستودعات</p>
            <div class="sig-line"></div>
            <p style="margin-top: 10px; font-weight: normal; color: #64748b; font-size: 0.85rem;">${settings?.signatureNames?.manager || 'مدير المستودعات'}</p>
          </div>
        </div>
      </div>
    `;
    triggerPrint(html);
  };

  // Export voucher as high-res PNG image
  const handleExportSingleImage = async () => {
    const element = previewRef.current;
    if (!element || !selectedVoucher) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(element, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const fullFileName = `سند_ادخال_${selectedVoucher.id}.png`;

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

  // Export voucher as Excel XLSX
  const handleExportSingleExcel = async (v: EntryVoucherData) => {
    setIsGenerating(true);
    try {
      const aoaData: any[][] = [
        [settings?.companyName || 'شركة أمين المستودع'],
        [settings?.companyAddress || 'العنوان الرئيسي'],
        [],
        [`سند إدخال مواد ومخزون ${v.isBatch ? '(مجمع)' : ''}`],
        [],
        ['رقم السند:', v.id, '', 'تاريخ المعاملة:', v.dateFormatted],
        ['اسم المورد:', v.supplier, '', 'المستودع المستلم:', v.warehouseName],
        [],
        ['م', 'كود / باركود الصنف', 'اسم الصنف والمواصفات', 'الكمية المدخلة', 'الوحدة', 'سعر الوحدة', 'القيمة الإجمالية']
      ];

      v.items.forEach(item => {
        aoaData.push([
          item.no,
          item.barcode,
          `${item.name} (${item.specifications})`,
          item.quantity,
          item.unit,
          item.price,
          item.total
        ]);
      });

      aoaData.push([]);
      aoaData.push(['إجمالي الكمية المدخلة:', v.totalQuantity, '', 'صافي القيمة المالية للسند:', `${v.totalValue} ${settings?.currencySymbol || 'ل.س'}`]);
      aoaData.push([]);
      aoaData.push(['ملاحظات التوريد والفحص:', v.notes]);
      aoaData.push([]);
      aoaData.push([]);
      aoaData.push(['توقيع أمين المستودع المستلم', '', 'توقيع مراجعة الحسابات والمالية', '', 'اعتماد إدارة المستودعات']);
      aoaData.push([
        settings?.signatureNames?.keeper || 'أمين المستودع',
        '',
        settings?.signatureNames?.accountant || 'رئيس الحسابات',
        '',
        settings?.signatureNames?.manager || 'مدير المستودعات'
      ]);

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
        { wch: 30 },
        { wch: 15 },
        { wch: 10 },
        { wch: 15 },
        { wch: 18 }
      ];
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'سند إدخال');

      const fullFileName = `سند_ادخال_${v.id}.xlsx`;
      
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

  const handleExportExcel = () => {
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

    exportToExcel(data, "new_entries", "إدخالات المواد الجديدة");
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
    <div className="space-y-4 pb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">إدخالات المواد الجديدة</h1>
        
        <div className="flex flex-wrap gap-3 no-print">
          {filteredMaterials.length > 0 && (
            <button 
              onClick={handleOpenBatchVoucher} 
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow-sm transition-colors text-sm font-bold"
              title="توليد سند إدخال موحد لكافة المواد المعروضة"
            >
              <Layers size={18} />
              توليد سند مجمع
            </button>
          )}

          {user.permissions?.canPrint && (
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm">
              <Printer size={18} />
              طباعة الجدول
            </button>
          )}
          {user.permissions?.canExport && (
            <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm">
              <Download size={18} />
              تصدير Excel
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 no-print">
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
      
      <div className="bg-blue-100 dark:bg-blue-900/30 border-r-4 border-blue-500 text-blue-700 dark:text-blue-300 p-3 rounded-l-lg text-sm" role="alert">
        <p className="font-bold">ملاحظة</p>
        <p>هذه قائمة بالمواد التي تم إضافتها حديثاً. يمكنك توليد سند إدخال رسمي لكل صنف أو سند مجمع، وتأكيد استلامها من صفحة "إدارة المواد" لإزالتها من هذه القائمة.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-x-auto">
        <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-4 py-3">اسم المادة</th>
              <th scope="col" className="px-4 py-3">تاريخ الإضافة</th>
              <th scope="col" className="px-4 py-3">نوع المادة</th>
              <th scope="col" className="px-4 py-3">الفئة</th>
              <th scope="col" className="px-4 py-3">الباركود</th>
              <th scope="col" className="px-4 py-3">الكمية المدخلة</th>
              <th scope="col" className="px-4 py-3">المورد</th>
              <th scope="col" className="px-4 py-3">المواصفات</th>
              <th scope="col" className="px-4 py-3 text-center">سند الإدخال</th>
            </tr>
          </thead>
          <tbody>
            {filteredMaterials.map(material => (
              <tr key={material.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap dark:text-white">{material.name}</td>
                <td className="px-4 py-3 text-xs">{material.createdAt ? new Date(material.createdAt).toLocaleDateString('ar-EG') : '-'}</td>
                <td className="px-4 py-3">{material.materialType}</td>
                <td className="px-4 py-3">{material.category}</td>
                <td className="px-4 py-3 font-mono">{material.barcode}</td>
                <td className={`px-4 py-3 font-bold ${material.currentStock < material.minStock ? 'text-red-500' : 'text-emerald-500'}`}>
                    {material.currentStock} {material.unit}
                    {material.currentStock < material.minStock && <AlertTriangle className="inline-block mr-1 text-red-500" size={16}/>}
                </td>
                <td className="px-4 py-3 text-xs">{material.supplier}</td>
                <td className="px-4 py-3 whitespace-pre-wrap max-w-xs text-xs">{material.specifications}</td>
                <td className="px-4 py-3 text-center">
                  <button 
                    onClick={() => handleOpenSingleVoucher(material)} 
                    className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/20 dark:hover:bg-sky-900/40 text-sky-600 dark:text-sky-400 font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-sm border border-sky-200 dark:border-sky-900/30"
                  >
                    <FileText size={14} />
                    توليد سند
                  </button>
                </td>
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

      {/* Entry Voucher Generation Modal popup */}
      {selectedVoucher && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex justify-center items-center p-4 overflow-y-auto">
          <div className="bg-gray-100 dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-5xl my-8 flex flex-col lg:flex-row overflow-hidden border dark:border-gray-800 animate-in fade-in zoom-in-95 duration-250">
            
            {/* Sidebar Controls */}
            <div className="w-full lg:w-80 bg-white dark:bg-gray-900 p-6 border-b lg:border-b-0 lg:border-l border-gray-200 dark:border-gray-800 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <Sparkles size={18} className="text-sky-500 animate-pulse" />
                    تصدير وتوليد سند إدخال
                  </h3>
                  <button 
                    onClick={() => setSelectedVoucher(null)} 
                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="bg-sky-50 dark:bg-sky-950/10 border border-sky-100 dark:border-sky-900/30 rounded-xl p-4 mb-6">
                  <span className="font-bold text-xs text-sky-800 dark:text-sky-400 uppercase tracking-wider block mb-1">المستند الحالي</span>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    سند إدخال واستلام مواد ومخزون رسمي معتمد. يمكنك إرسال هذا السند لقسم المحاسبة والمالية فوراً.
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5 mb-6 text-xs space-y-2">
                  <div className="flex justify-between items-center font-bold text-gray-700 dark:text-gray-300">
                    <span>إجمالي الأصناف:</span>
                    <span className="text-sky-600 dark:text-sky-400 font-black">{selectedVoucher.items.length} صنف</span>
                  </div>
                  <div className="flex justify-between items-center font-bold text-gray-700 dark:text-gray-300">
                    <span>الصفحات المتوقعة للطباعة:</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-black">~{Math.max(1, Math.ceil(selectedVoucher.items.length / 10))} صفحة A4</span>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200 dark:border-gray-700">
                    💡 يمكنك التمرير (Scroll) لأسفل نافذة المعاينة لمراجعة كافة الصفحات والمجاميع والتواقيع قبل الطباعة.
                  </p>
                </div>

                {/* Page Orientation Selector */}
                <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-3 mb-4 text-xs">
                  <span className="font-bold text-gray-700 dark:text-gray-300 block mb-2">توجيه صفحة الطباعة (Layout):</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPrintOrientation('portrait')}
                      className={`py-1.5 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 border transition-all ${
                        printOrientation === 'portrait'
                          ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      طولي (عمودي)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintOrientation('landscape')}
                      className={`py-1.5 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 border transition-all ${
                        printOrientation === 'landscape'
                          ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      عرضي (أفقي)
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={() => handlePrintSingleVoucher(selectedVoucher)}
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
                    onClick={() => handleExportSingleExcel(selectedVoucher)}
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
                  onClick={() => setSelectedVoucher(null)}
                  className="w-full py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-colors"
                >
                  إغلاق المعاينة والتراجع
                </button>
              </div>
            </div>

            {/* Document Live Preview Area */}
            <div 
              ref={previewScrollRef}
              className="flex-1 p-4 lg:p-8 overflow-y-auto max-h-[85vh] flex flex-col items-center bg-gray-100 dark:bg-gray-950 relative custom-scrollbar"
            >
              {/* Sticky Top Navigation & Scroll Controls Bar */}
              <div className="sticky top-0 z-20 w-full max-w-[850px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-gray-200 dark:border-gray-700 px-4 py-2.5 rounded-xl shadow-md mb-4 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    معاينة السند الكامل:
                  </span>
                  <span className="font-black text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
                    {selectedVoucher.items.length} صنف
                  </span>
                  <span className="hidden sm:inline text-gray-500 text-[11px]">
                    (تظهر كافة الأصناف بالتمرير)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => previewScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="flex items-center gap-1 px-3 py-1.5 font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg transition-all shadow-sm"
                    title="الرجوع لأعلى السند"
                  >
                    <ArrowUp size={14} className="text-sky-600" />
                    <span>للأعلى ↑</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => previewScrollRef.current?.scrollTo({ top: previewScrollRef.current.scrollHeight, behavior: 'smooth' })}
                    className="flex items-center gap-1 px-3 py-1.5 font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow-sm transition-all"
                    title="الانتقال لأسفل السند لرؤية كافة الأصناف والمجاميع والتواقيع"
                  >
                    <ArrowDown size={14} />
                    <span>للأسفل (التواقيع) ↓</span>
                  </button>
                </div>
              </div>

              {/* Floating Action Scroll Buttons */}
              <div className="sticky top-20 left-4 self-start z-30 flex flex-col gap-2 no-print -mr-12 mb-[-80px]">
                <button
                  type="button"
                  onClick={() => previewScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 text-gray-700 dark:text-gray-200 rounded-full shadow-2xl border-2 border-sky-500 transition-all hover:scale-110 active:scale-95"
                  title="الرجوع لأعلى المستند"
                >
                  <ChevronUp size={22} className="text-sky-600" />
                </button>
                <button
                  type="button"
                  onClick={() => previewScrollRef.current?.scrollTo({ top: previewScrollRef.current.scrollHeight, behavior: 'smooth' })}
                  className="p-3 bg-sky-600 hover:bg-sky-700 text-white rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95"
                  title="الانتقال لأسفل المستند لرؤية باقي المواد والتواقيع"
                >
                  <ChevronDown size={22} />
                </button>
              </div>

              <div className={`shadow-xl rounded-lg overflow-hidden border dark:border-gray-800 bg-white text-gray-900 w-full ${printOrientation === 'landscape' ? 'max-w-[1100px]' : 'max-w-[850px]'} shrink-0 p-8 relative flex flex-col`}>
                
                {/* HTML Capture Target */}
                <div id="entry-invoice-capture" ref={previewRef} className="p-6 bg-white text-gray-900 w-full flex-1 flex flex-col text-right" style={{ direction: 'rtl' }}>
                  
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
                    <span className="inline-block px-6 py-2 border-2 border-sky-500 bg-sky-50 text-sky-600 font-bold text-sm tracking-wide rounded-lg">
                      سند إدخال مواد ومخزون {selectedVoucher.isBatch ? '(مجمع)' : ''}
                    </span>
                  </div>

                  {/* Metadata fields */}
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-xs">
                    <div>
                      <span className="font-bold text-gray-500 ml-1">رقم السند:</span>
                      <span className="font-mono text-gray-900">{selectedVoucher.id}</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-500 ml-1">تاريخ المعاملة:</span>
                      <span className="text-gray-900">{selectedVoucher.dateFormatted}</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-500 ml-1">المستودع المستلم:</span>
                      <span className="text-gray-900 font-bold">{selectedVoucher.warehouseName}</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-500 ml-1">اسم المورد:</span>
                      <span className="text-gray-900 font-bold">{selectedVoucher.supplier}</span>
                    </div>
                  </div>

                  {/* Items Table */}
                  <table className="w-full text-sm border-collapse border border-gray-300 text-right mb-6">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700 font-bold text-xs">
                        <th className="p-3 border border-gray-300 text-center w-12">م</th>
                        <th className="p-3 border border-gray-300">كود / باركود الصنف</th>
                        <th className="p-3 border border-gray-300">اسم الصنف والمواصفات</th>
                        <th className="p-3 border border-gray-300 text-center">الكمية المدخلة</th>
                        <th className="p-3 border border-gray-300">الوحدة</th>
                        <th className="p-3 border border-gray-300 text-left">سعر الوحدة</th>
                        <th className="p-3 border border-gray-300 text-left">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedVoucher.items.map(item => (
                        <tr key={item.no} className="text-xs text-gray-900">
                          <td className="p-3 border border-gray-300 text-center">{item.no}</td>
                          <td className="p-3 border border-gray-300 font-mono text-gray-500">{item.barcode}</td>
                          <td className="p-3 border border-gray-300 font-bold">
                            {item.name}
                            <span className="block text-[10px] text-gray-500 font-normal">{item.specifications}</span>
                          </td>
                          <td className="p-3 border border-gray-300 text-center font-black text-sky-600 text-sm">{item.quantity}</td>
                          <td className="p-3 border border-gray-300">{item.unit}</td>
                          <td className="p-3 border border-gray-300 text-left">
                            {item.price.toLocaleString('ar-EG')} {settings?.currencySymbol || 'ل.س'}
                          </td>
                          <td className="p-3 border border-gray-300 text-left font-bold text-gray-950">
                            {item.total.toLocaleString('ar-EG')} {settings?.currencySymbol || 'ل.س'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals Section */}
                  <div className="flex justify-end mb-6">
                    <div className="w-72 bg-gray-50 border border-gray-200 rounded-lg text-xs overflow-hidden">
                      <div className="flex justify-between p-2.5 border-b border-gray-200">
                        <span className="text-gray-500 font-bold">إجمالي الكمية المدخلة:</span>
                        <span className="font-bold text-gray-900">{selectedVoucher.totalQuantity}</span>
                      </div>
                      <div className="flex justify-between p-2.5 bg-sky-50 text-sky-700 font-black">
                        <span>صافي القيمة المالية للسند:</span>
                        <span>
                          {selectedVoucher.totalValue.toLocaleString('ar-EG')} {settings?.currencySymbol || 'ل.س'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notes Area */}
                  <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 text-xs mb-8 flex-1">
                    <span className="font-bold text-gray-500 block mb-1">الملاحظات والتوصيات:</span>
                    <p className="text-gray-700 leading-relaxed">{selectedVoucher.notes}</p>
                  </div>

                  {/* Standard signatures panel */}
                  <div className="grid grid-cols-3 gap-4 text-center mt-auto text-[11px] text-gray-600">
                    <div>
                      <p className="font-bold text-gray-800 mb-10">أمين المستودع (المستلم)</p>
                      <div className="border-t border-dashed border-gray-400 w-3/4 mx-auto my-2"></div>
                      <p className="text-gray-400 font-light mt-1">{settings?.signatureNames?.keeper || 'أمين المستودع'}</p>
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 mb-10">مراجعة الحسابات (المالية)</p>
                      <div className="border-t border-dashed border-gray-400 w-3/4 mx-auto my-2"></div>
                      <p className="text-gray-400 font-light mt-1">{settings?.signatureNames?.accountant || 'رئيس الحسابات'}</p>
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 mb-10">اعتماد إدارة المستودعات</p>
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

export default NewEntries;
