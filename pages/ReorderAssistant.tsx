import React, { useState, useMemo, useRef } from 'react';
import { Material, Transaction, User, SettingsData, Warehouse } from '@/types';
import { 
  ShoppingBag, Search, Filter, Printer, Download, Sparkles, 
  AlertTriangle, CheckCircle, Clock, ArrowUpDown, FileText, 
  X, Image as ImageIcon, FileSpreadsheet, CheckSquare, Square,
  TrendingDown, RefreshCw, Camera,
  ArrowUp, ArrowDown, ChevronDown, ChevronUp
} from 'lucide-react';
import { usePrint } from '@/services/PrintContext';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import CameraBarcodeScannerModal from '@/components/common/CameraBarcodeScannerModal';

interface ReorderAssistantProps {
  materials: Material[];
  transactions: Transaction[];
  warehouses: Warehouse[];
  user: User;
  settings?: SettingsData | null;
}

interface ReorderItem {
  material: Material;
  currentStock: number;
  minStock: number;
  deficit: number;
  suggestedQty: number;
  customQty: number;
  selected: boolean;
  status: 'out' | 'critical' | 'warning' | 'safe';
  totalUsedPast: number;
  estimatedPrice: number;
  totalCost: number;
}

interface PurchaseOrderVoucher {
  id: string;
  date: string;
  dateFormatted: string;
  supplier: string;
  items: {
    id: string;
    barcode: string;
    name: string;
    specifications: string;
    quantity: number;
    unit: string;
    price: number;
    total: number;
  }[];
  totalQuantity: number;
  totalEstimatedAmount: number;
  notes: string;
}

const ReorderAssistant: React.FC<ReorderAssistantProps> = ({
  materials,
  transactions,
  warehouses,
  user,
  settings
}) => {
  const { triggerPrint } = usePrint();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'need_reorder' | 'out_of_stock'>('need_reorder');
  const [customQuantities, setCustomQuantities] = useState<Record<string, number>>({});
  const [selectedItemIds, setSelectedItemIds] = useState<Record<string, boolean>>({});
  
  // Camera scanner modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Purchase Order Preview Modal
  const [selectedVoucher, setSelectedVoucher] = useState<PurchaseOrderVoucher | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape' | 'auto'>('portrait');
  const previewRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);

  // Calculate usage and reorder data for each material
  const reorderList: ReorderItem[] = useMemo(() => {
    return materials.map(m => {
      // Calculate historical usage from transactions
      const usedQty = transactions
        .filter(t => t.materialId === m.id && (t.type === 'out' || t.type === 'return'))
        .reduce((sum, t) => sum + t.quantity, 0);

      const minStock = m.minStock || 0;
      const currentStock = m.currentStock || 0;
      const deficit = Math.max(0, minStock - currentStock);

      let status: 'out' | 'critical' | 'warning' | 'safe' = 'safe';
      if (currentStock <= 0) {
        status = 'out';
      } else if (currentStock < minStock) {
        status = 'critical';
      } else if (currentStock <= minStock * 1.3) {
        status = 'warning';
      }

      // Smart suggested quantity: deficit + buffer for safe operations
      const baseSuggested = deficit > 0 ? deficit + Math.ceil(minStock * 0.5) : Math.ceil(minStock * 0.5);
      const suggestedQty = Math.max(1, baseSuggested);
      const customQty = customQuantities[m.id] !== undefined ? customQuantities[m.id] : suggestedQty;

      const estimatedPrice = m.price || 0;
      const totalCost = estimatedPrice * customQty;

      const isSelected = selectedItemIds[m.id] !== undefined 
        ? selectedItemIds[m.id] 
        : (status === 'out' || status === 'critical');

      return {
        material: m,
        currentStock,
        minStock,
        deficit,
        suggestedQty,
        customQty,
        selected: isSelected,
        status,
        totalUsedPast: usedQty,
        estimatedPrice,
        totalCost
      };
    });
  }, [materials, transactions, customQuantities, selectedItemIds]);

  // Unique suppliers
  const suppliers = useMemo(() => {
    return Array.from(new Set(materials.map(m => m.supplier).filter(Boolean)));
  }, [materials]);

  // Filtered list
  const filteredList = useMemo(() => {
    return reorderList.filter(item => {
      const matchesSearch = 
        item.material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.material.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.material.materialType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.material.supplier.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSupplier = !filterSupplier || item.material.supplier === filterSupplier;

      let matchesStatus = true;
      if (filterStatus === 'need_reorder') {
        matchesStatus = item.status === 'out' || item.status === 'critical' || item.status === 'warning';
      } else if (filterStatus === 'out_of_stock') {
        matchesStatus = item.status === 'out';
      }

      return matchesSearch && matchesSupplier && matchesStatus;
    });
  }, [reorderList, searchTerm, filterSupplier, filterStatus]);

  // Summary KPIs
  const summary = useMemo(() => {
    const outCount = reorderList.filter(i => i.status === 'out').length;
    const criticalCount = reorderList.filter(i => i.status === 'critical').length;
    const warningCount = reorderList.filter(i => i.status === 'warning').length;
    const selectedCount = filteredList.filter(i => i.selected).length;
    const selectedCost = filteredList.filter(i => i.selected).reduce((sum, i) => sum + i.totalCost, 0);

    return { outCount, criticalCount, warningCount, selectedCount, selectedCost };
  }, [reorderList, filteredList]);

  // Handle custom quantity change
  const handleQuantityChange = (id: string, value: number) => {
    setCustomQuantities(prev => ({
      ...prev,
      [id]: Math.max(1, value || 1)
    }));
  };

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setSelectedItemIds(prev => ({
      ...prev,
      [id]: !(prev[id] ?? reorderList.find(i => i.material.id === id)?.selected)
    }));
  };

  const handleSelectAll = (select: boolean) => {
    const updated: Record<string, boolean> = {};
    filteredList.forEach(item => {
      updated[item.material.id] = select;
    });
    setSelectedItemIds(prev => ({ ...prev, ...updated }));
  };

  // Generate Purchase Order
  const handleGeneratePurchaseOrder = (targetSupplier?: string) => {
    const itemsToOrder = reorderList.filter(i => {
      if (targetSupplier) {
        return i.material.supplier === targetSupplier && i.selected;
      }
      return i.selected;
    });

    if (itemsToOrder.length === 0) {
      alert('يرجى تحديد مادة واحدة على الأقل لإنشاء طلب الشراء.');
      return;
    }

    const supplierTitle = targetSupplier 
      ? targetSupplier 
      : filterSupplier 
        ? filterSupplier 
        : Array.from(new Set(itemsToOrder.map(i => i.material.supplier))).length === 1 
          ? itemsToOrder[0].material.supplier 
          : 'طلب توريد عام / موردون معتمدون';

    const orderId = `PO-${Date.now().toString().slice(-6)}`;
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const totalQuantity = itemsToOrder.reduce((sum, i) => sum + i.customQty, 0);
    const totalEstimatedAmount = itemsToOrder.reduce((sum, i) => sum + i.totalCost, 0);

    setSelectedVoucher({
      id: orderId,
      date: now.toISOString(),
      dateFormatted,
      supplier: supplierTitle,
      items: itemsToOrder.map(i => ({
        id: i.material.id,
        barcode: i.material.barcode,
        name: i.material.name,
        specifications: i.material.specifications || '',
        quantity: i.customQty,
        unit: i.material.unit,
        price: i.estimatedPrice,
        total: i.totalCost
      })),
      totalQuantity,
      totalEstimatedAmount,
      notes: 'يرجى التكرم بتجهيز وتوريد الأصناف والكميات المحددة أعلاه لمستودعاتنا وفق المواصفات والأسعار المعتمدة في أسرع وقت.'
    });
  };

  // Print voucher
  const handlePrintVoucher = (v: PurchaseOrderVoucher) => {
    const rowsHtml = v.items.map((it, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="font-family: monospace;">${it.barcode || '---'}</td>
        <td style="font-weight: bold;">
          ${it.name}
          ${it.specifications ? `<div style="font-size: 0.8rem; font-weight: normal; color: #64748b;">${it.specifications}</div>` : ''}
        </td>
        <td style="text-align: center; font-weight: 900; color: #0284c7;">${it.quantity}</td>
        <td>${it.unit}</td>
        <td style="text-align: left;">${it.price.toLocaleString('ar-EG')} ${settings?.currencySymbol || 'ل.س'}</td>
        <td style="text-align: left; font-weight: bold;">${it.total.toLocaleString('ar-EG')} ${settings?.currencySymbol || 'ل.س'}</td>
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
          .print-container { width: 100% !important; max-width: 100% !important; padding: 10px !important; margin: 0 !important; border: none !important; border-radius: 0 !important; box-shadow: none !important; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double #cbd5e1; padding-bottom: 15px; margin-bottom: 20px; }
          .company-info h2 { font-size: 1.5rem; font-weight: 700; margin: 0 0 5px 0; color: #0f172a; }
          .company-info p { font-size: 0.85rem; margin: 0; color: #64748b; }
          .doc-title { text-align: center; margin: 15px 0; }
          .doc-title h1 { display: inline-block; font-size: 1.3rem; font-weight: 700; color: #0284c7; border: 2px solid #0284c7; padding: 6px 20px; border-radius: 6px; background-color: #f0f9ff; margin: 0; }
          .metadata-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 20px; }
          .meta-item { font-size: 0.9rem; }
          .meta-label { font-weight: 700; color: #475569; margin-left: 5px; }
          .meta-val { color: #0f172a; }
          table { width: 100% !important; border-collapse: collapse !important; margin-bottom: 20px; page-break-inside: auto !important; table-layout: fixed; }
          thead { display: table-header-group !important; }
          tfoot { display: table-footer-group !important; }
          tr { page-break-inside: avoid !important; page-break-after: auto !important; }
          th, td { border: 1px solid #cbd5e1 !important; padding: 8px 6px !important; text-align: right; font-size: 0.85rem !important; word-break: break-word; overflow: hidden; }
          th { background-color: #f1f5f9 !important; color: #334155 !important; font-weight: 700; }
          td { color: #0f172a !important; }
          .totals-section { display: flex; justify-content: flex-end; margin-bottom: 25px; page-break-inside: avoid; }
          .totals-box { border: 1px solid #cbd5e1; border-radius: 6px; background-color: #fafafa; width: 320px; }
          .totals-row { display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 0.9rem; }
          .totals-row:last-child { border-bottom: none; font-weight: 700; font-size: 1rem; color: #0284c7; background-color: #f0f9ff; border-radius: 0 0 6px 6px; }
          .notes-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; background-color: #f8fafc; margin-bottom: 30px; font-size: 0.85rem; page-break-inside: avoid; }
          .notes-title { font-weight: 700; color: #475569; margin-bottom: 5px; }
          .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 40px; text-align: center; page-break-inside: avoid; }
          .sig-item p { margin: 0 0 35px 0; font-weight: 700; color: #475569; font-size: 0.85rem; }
          .sig-line { border-top: 1.5px dashed #94a3b8; width: 80%; margin: 0 auto; }
        </style>
        <div class="header">
          ${settings?.companyLogo ? `<img src="${settings.companyLogo}" style="max-height: 75px; max-width: 150px; object-fit: contain;">` : '<div style="font-size: 2.5rem;">📦</div>'}
          <div class="company-info">
            <h2>${settings?.companyName || 'شركة أمين المستودع'}</h2>
            <p>${settings?.companyAddress || 'العنوان الرئيسي'}</p>
          </div>
        </div>
        <div class="doc-title">
          <h1>طلب شراء وتوريد مواد ومخزون</h1>
        </div>
        <div class="metadata-grid">
          <div class="meta-item"><span class="meta-label">رقم الطلب:</span><span class="meta-val">${v.id}</span></div>
          <div class="meta-item"><span class="meta-label">تاريخ الطلب:</span><span class="meta-val">${v.dateFormatted}</span></div>
          <div class="meta-item"><span class="meta-label">المورد الموجه إليه:</span><span class="meta-val">${v.supplier}</span></div>
          <div class="meta-item"><span class="meta-label">مستودع الاستلام:</span><span class="meta-val">${warehouses[0]?.name || 'المستودع الرئيسي'}</span></div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 50px; text-align: center;">م</th>
              <th>الباركود</th>
              <th>اسم الصنف / المواصفات</th>
              <th style="text-align: center;">الكمية المطلوبة</th>
              <th>الوحدة</th>
              <th style="text-align: left;">السعر التقديري</th>
              <th style="text-align: left;">التكلفة التقديرية</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="totals-section">
          <div class="totals-box">
            <div class="totals-row">
              <span>إجمالي الكميات المطلوبة:</span>
              <span>${v.totalQuantity}</span>
            </div>
            <div class="totals-row">
              <span>إجمالي التكلفة التقديرية:</span>
              <span>${v.totalEstimatedAmount.toLocaleString('ar-EG')} ${settings?.currencySymbol || 'ل.س'}</span>
            </div>
          </div>
        </div>
        <div class="notes-box">
          <div class="notes-title">الملاحظات والشروط:</div>
          <p style="margin: 0; color: #334155;">${v.notes}</p>
        </div>
        <div class="signatures">
          <div class="sig-item">
            <p>أمين المستودع (مُقدّم الطلب)</p>
            <div class="sig-line"></div>
            <p style="margin-top: 10px; font-weight: normal; color: #64748b; font-size: 0.85rem;">${settings?.signatureNames?.keeper || 'أمين المستودع'}</p>
          </div>
          <div class="sig-item">
            <p>إدارة المشتريات والمالية</p>
            <div class="sig-line"></div>
            <p style="margin-top: 10px; font-weight: normal; color: #64748b; font-size: 0.85rem;">${settings?.signatureNames?.accountant || 'رئيس الحسابات'}</p>
          </div>
          <div class="sig-item">
            <p>اعتماد الإدارة العامة</p>
            <div class="sig-line"></div>
            <p style="margin-top: 10px; font-weight: normal; color: #64748b; font-size: 0.85rem;">${settings?.signatureNames?.manager || 'مدير المستودعات'}</p>
          </div>
        </div>
      </div>
    `;
    triggerPrint(html);
  };

  // Export voucher to Image (PNG)
  const handleExportVoucherImage = async () => {
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
      const fullFileName = `طلب_شراء_${selectedVoucher.id}.png`;

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

  // Export voucher to Excel (XLSX)
  const handleExportVoucherExcel = async (v: PurchaseOrderVoucher) => {
    setIsGenerating(true);
    try {
      const aoaData: any[][] = [
        [settings?.companyName || 'شركة أمين المستودع'],
        [settings?.companyAddress || 'العنوان الرئيسي'],
        [],
        ['طلب شراء وتوريد مواد ومخزون'],
        [],
        ['رقم الطلب:', v.id, '', 'تاريخ الطلب:', v.dateFormatted],
        ['المورد الموجه إليه:', v.supplier, '', 'المستودع المستلم:', warehouses[0]?.name || 'المستودع الرئيسي'],
        [],
        ['م', 'الباركود', 'اسم المادة والمواصفات', 'الكمية المطلوبة', 'الوحدة', 'السعر التقديري', 'التكلفة التقديرية'],
        ...v.items.map((it, idx) => [
          idx + 1,
          it.barcode || '---',
          it.name + (it.specifications ? ` (${it.specifications})` : ''),
          it.quantity,
          it.unit,
          it.price,
          it.total
        ]),
        [],
        ['إجمالي الكميات المطلوبة:', v.totalQuantity, '', 'صافي القيمة التقديرية:', `${v.totalEstimatedAmount} ${settings?.currencySymbol || 'ل.س'}`],
        [],
        ['الملاحظات والشروط:', v.notes || '---'],
        [],
        [],
        ['توقيع أمين المستودع (مقدم الطلب)', '', 'توقيع المشتريات والمالية', '', 'اعتماد الإدارة العامة'],
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

      worksheet['!cols'] = [
        { wch: 6 },
        { wch: 18 },
        { wch: 32 },
        { wch: 15 },
        { wch: 10 },
        { wch: 15 },
        { wch: 18 }
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'طلب الشراء');

      const fullFileName = `طلب_شراء_${v.id}.xlsx`;

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

  return (
    <div className="space-y-5 pb-8 text-right" style={{ direction: 'rtl' }}>
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
            <ShoppingBag className="text-sky-500" size={28} />
            مساعد إعادة الطلب وطلبات الشراء الذكية
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            رصد المواد النافذة والمشرفة على النفاد وحساب الكميات المطلوبة بدقة مع توليد أوامر شراء رسمية للموردين
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 rounded-xl hover:bg-sky-100 transition-colors text-xs font-bold shadow-sm"
          >
            <Camera size={16} />
            مسح باركود بالكاميرا
          </button>

          <button
            onClick={() => handleGeneratePurchaseOrder()}
            disabled={summary.selectedCount === 0}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-md shadow-sky-500/10 font-bold text-xs"
          >
            <Sparkles size={16} />
            توليد طلب شراء للمواد المحددة ({summary.selectedCount})
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-red-100 dark:border-red-950/30 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">مواد نفدت تماماً (رصيد 0)</span>
            <span className="text-2xl font-black text-red-600 dark:text-red-400">{summary.outCount}</span>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 rounded-2xl">
            <AlertTriangle size={24} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-amber-100 dark:border-amber-950/30 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">تحت حد الأمان الأدنى</span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{summary.criticalCount}</span>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-2xl">
            <TrendingDown size={24} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-yellow-100 dark:border-yellow-950/30 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">قريبة من حد الطلب</span>
            <span className="text-2xl font-black text-yellow-600 dark:text-yellow-400">{summary.warningCount}</span>
          </div>
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/40 text-yellow-600 rounded-2xl">
            <Clock size={24} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-sky-100 dark:border-sky-950/30 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">التكلفة التقديرية للطلب</span>
            <span className="text-xl font-black text-sky-600 dark:text-sky-400">
              {summary.selectedCost.toLocaleString('ar-EG')} {settings?.currencySymbol || 'ل.س'}
            </span>
          </div>
          <div className="p-3 bg-sky-50 dark:bg-sky-950/40 text-sky-600 rounded-2xl">
            <ShoppingBag size={24} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4 justify-between items-center no-print">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="بحث باسم المادة، الباركود، النوع، أو المورد..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 text-xs rounded-xl border dark:border-gray-700 dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="w-full sm:w-56">
            <select
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border dark:border-gray-700 dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">جميع الموردين ({suppliers.length})</option>
              {suppliers.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-56">
            <select
              value={filterStatus}
              onChange={(e: any) => setFilterStatus(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border dark:border-gray-700 dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="need_reorder">المواد المحتاجة للطلب فقط (حرجة ونافذة)</option>
              <option value="out_of_stock">النافذة تماماً فقط (رصيد 0)</option>
              <option value="all">كافة المواد في المستودع</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => handleSelectAll(true)}
            className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 text-xs font-bold transition-all"
          >
            تحديد الكل
          </button>
          <button
            onClick={() => handleSelectAll(false)}
            className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 text-xs font-bold transition-all"
          >
            إلغاء التحديد
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 font-bold uppercase text-[11px] border-b dark:border-gray-700">
              <tr>
                <th className="p-4 text-center w-12">
                  <span className="sr-only">تحديد</span>
                </th>
                <th className="p-4">اسم الصنف والمواصفات</th>
                <th className="p-4">الباركود</th>
                <th className="p-4">المورد المعتمد</th>
                <th className="p-4 text-center">الرصيد الفعلي</th>
                <th className="p-4 text-center">حد الأمان</th>
                <th className="p-4 text-center">حالة الصنف</th>
                <th className="p-4 text-center w-36">الكمية المطلوبة للشراء</th>
                <th className="p-4 text-left">السعر التقديري</th>
                <th className="p-4 text-left">إجمالي التكلفة</th>
                <th className="p-4 text-center">طلب شراء خاص</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {filteredList.length > 0 ? (
                filteredList.map((item) => (
                  <tr 
                    key={item.material.id} 
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors ${
                      item.selected ? 'bg-sky-50/40 dark:bg-sky-950/10' : ''
                    }`}
                  >
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleSelect(item.material.id)}
                        className="text-sky-600 dark:text-sky-400 focus:outline-none"
                      >
                        {item.selected ? <CheckSquare size={18} /> : <Square size={18} className="text-gray-400" />}
                      </button>
                    </td>

                    <td className="p-4 font-bold text-gray-900 dark:text-white">
                      {item.material.name}
                      {item.material.specifications && (
                        <span className="block text-[11px] font-normal text-gray-400 mt-0.5 truncate max-w-xs">
                          {item.material.specifications}
                        </span>
                      )}
                    </td>

                    <td className="p-4 font-mono text-gray-500 dark:text-gray-400">
                      {item.material.barcode || '---'}
                    </td>

                    <td className="p-4 font-semibold text-gray-800 dark:text-gray-200">
                      {item.material.supplier || 'مورد عام'}
                    </td>

                    <td className={`p-4 text-center font-black ${
                      item.status === 'out' ? 'text-red-600 dark:text-red-400' :
                      item.status === 'critical' ? 'text-amber-600 dark:text-amber-400' :
                      item.status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : 'text-emerald-600'
                    }`}>
                      {item.currentStock} {item.material.unit}
                    </td>

                    <td className="p-4 text-center text-gray-500 dark:text-gray-400 font-semibold">
                      {item.minStock} {item.material.unit}
                    </td>

                    <td className="p-4 text-center">
                      {item.status === 'out' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                          نفد تماماً 🔴
                        </span>
                      )}
                      {item.status === 'critical' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                          حرج تحت الحد ⚠️
                        </span>
                      )}
                      {item.status === 'warning' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400">
                          قريب من النفاد 🟡
                        </span>
                      )}
                      {item.status === 'safe' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                          آمن ومستقر 🟢
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          min="1"
                          value={item.customQty}
                          onChange={(e) => handleQuantityChange(item.material.id, parseFloat(e.target.value) || 1)}
                          className="w-20 px-2 py-1 text-center font-black text-sky-700 dark:text-sky-300 bg-white dark:bg-gray-900 border border-sky-300 dark:border-sky-800 rounded-lg outline-none focus:ring-2 focus:ring-sky-500"
                        />
                        <span className="text-[11px] text-gray-500">{item.material.unit}</span>
                      </div>
                    </td>

                    <td className="p-4 text-left font-semibold text-gray-700 dark:text-gray-300">
                      {item.estimatedPrice.toLocaleString('ar-EG')} {settings?.currencySymbol || 'ل.س'}
                    </td>

                    <td className="p-4 text-left font-black text-gray-900 dark:text-white">
                      {item.totalCost.toLocaleString('ar-EG')} {settings?.currencySymbol || 'ل.س'}
                    </td>

                    <td className="p-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleGeneratePurchaseOrder(item.material.supplier)}
                        className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 mx-auto"
                        title={`توليد طلب شراء فوري لمورد الصنف: ${item.material.supplier}`}
                      >
                        <FileText size={13} />
                        طلب للمورد
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-gray-400">
                    لا توجد مواد تطابق خيارات الفلترة المحددة.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Camera Barcode Scanner Modal */}
      <CameraBarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(code) => {
          setSearchTerm(code);
        }}
        title="البحث عن مادة لإعادة الطلب"
        description="وجّه الكاميرا نحو باركود الصنف للتحقق من رصيده وحالته فوراً"
      />

      {/* Purchase Order Voucher Modal - Unified Corporate Layout */}
      {selectedVoucher && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex justify-center items-center p-4 overflow-y-auto">
          <div className="bg-gray-100 dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-5xl my-8 flex flex-col lg:flex-row overflow-hidden border dark:border-gray-800 animate-in fade-in zoom-in-95 duration-250">
            
            {/* Sidebar Controls */}
            <div className="w-full lg:w-80 bg-white dark:bg-gray-900 p-6 border-b lg:border-b-0 lg:border-l border-gray-200 dark:border-gray-800 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <Sparkles size={18} className="text-sky-500 animate-pulse" />
                    تصدير وتوليد سند
                  </h3>
                  <button 
                    onClick={() => setSelectedVoucher(null)} 
                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30 rounded-xl p-4 mb-6">
                  <span className="font-bold text-xs text-sky-800 dark:text-sky-400 uppercase tracking-wider block mb-1">المستند الحالي</span>
                  <p className="text-xs text-gray-600 dark:text-gray-300">طلب شراء وتوريد مواد للموردين معتمد بكميات ومواصفات وتكلفة تقديرية للرفع المالي والإداري.</p>
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
                    onClick={() => handlePrintVoucher(selectedVoucher)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-red-500/10 active:scale-[0.98]"
                  >
                    <span className="flex items-center gap-2">
                      <Printer size={16} />
                      طباعة السند الورقي
                    </span>
                    <span className="text-[10px] bg-red-500 text-red-100 px-1.5 py-0.5 rounded">PDF</span>
                  </button>

                  <button 
                    onClick={handleExportVoucherImage}
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
                    onClick={() => handleExportVoucherExcel(selectedVoucher)}
                    disabled={isGenerating}
                    className="w-full flex items-center justify-between px-4 py-3 bg-[#7252f5] hover:bg-[#603de8] text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-purple-500/10 active:scale-[0.98] disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <FileSpreadsheet size={16} />
                      {isGenerating ? 'جاري التصدير...' : 'تحميل كملف إكسل'}
                    </span>
                    <span className="text-[10px] bg-purple-400 text-purple-100 px-1.5 py-0.5 rounded">XLSX</span>
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
                    معاينة طلب الشراء الكامل:
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
                    title="الرجوع لأعلى طلب الشراء"
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
                <div id="purchase-order-capture" ref={previewRef} className="p-6 bg-white text-gray-900 w-full flex-1 flex flex-col text-right" style={{ direction: 'rtl' }}>
                  
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
                    <span className="inline-block px-6 py-2 border-2 border-sky-600 bg-sky-50 text-sky-700 font-bold text-sm tracking-wide rounded-lg">
                      طلب شراء وتوريد مواد ومخزون
                    </span>
                  </div>

                  {/* Metadata fields */}
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-xs">
                    <div>
                      <span className="font-bold text-gray-500 ml-1">رقم الطلب:</span>
                      <span className="font-mono text-gray-900">{selectedVoucher.id}</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-500 ml-1">تاريخ الطلب:</span>
                      <span className="text-gray-900">{selectedVoucher.dateFormatted}</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-500 ml-1">المورد الموجه إليه:</span>
                      <span className="text-gray-900 font-bold">{selectedVoucher.supplier}</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-500 ml-1">مستودع الاستلام:</span>
                      <span className="text-gray-900 font-semibold">{warehouses[0]?.name || 'المستودع الرئيسي'}</span>
                    </div>
                  </div>

                  {/* Items Table */}
                  <table className="w-full text-sm border-collapse border border-gray-300 text-right mb-6">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700 font-bold text-xs">
                        <th className="p-3 border border-gray-300 text-center w-12">م</th>
                        <th className="p-3 border border-gray-300">كود / باركود الصنف</th>
                        <th className="p-3 border border-gray-300">اسم الصنف والمواصفات</th>
                        <th className="p-3 border border-gray-300 text-center">الكمية المطلوبة</th>
                        <th className="p-3 border border-gray-300">الوحدة</th>
                        <th className="p-3 border border-gray-300 text-left">السعر التقديري</th>
                        <th className="p-3 border border-gray-300 text-left">التكلفة التقديرية</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedVoucher.items.map((it, idx) => (
                        <tr key={it.id || idx} className="text-xs text-gray-900">
                          <td className="p-3 border border-gray-300 text-center">{idx + 1}</td>
                          <td className="p-3 border border-gray-300 font-mono text-gray-500">{it.barcode || '---'}</td>
                          <td className="p-3 border border-gray-300 font-bold">
                            {it.name}
                            {it.specifications && (
                              <div className="text-[11px] font-normal text-gray-500 mt-0.5">{it.specifications}</div>
                            )}
                          </td>
                          <td className="p-3 border border-gray-300 text-center font-black text-sky-600 text-sm">
                            {it.quantity}
                          </td>
                          <td className="p-3 border border-gray-300">{it.unit}</td>
                          <td className="p-3 border border-gray-300 text-left">
                            {it.price.toLocaleString('ar-EG')} {settings?.currencySymbol || 'ل.س'}
                          </td>
                          <td className="p-3 border border-gray-300 text-left font-bold text-gray-950">
                            {it.total.toLocaleString('ar-EG')} {settings?.currencySymbol || 'ل.س'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals Section */}
                  <div className="flex justify-end mb-6">
                    <div className="w-72 bg-gray-50 border border-gray-200 rounded-lg text-xs overflow-hidden">
                      <div className="flex justify-between p-2.5 border-b border-gray-200">
                        <span className="text-gray-500 font-bold">إجمالي الكميات المطلوبة:</span>
                        <span className="font-bold text-gray-900">{selectedVoucher.totalQuantity}</span>
                      </div>
                      <div className="flex justify-between p-2.5 bg-sky-50 text-sky-700 font-black">
                        <span>إجمالي التكلفة التقديرية:</span>
                        <span>
                          {selectedVoucher.totalEstimatedAmount.toLocaleString('ar-EG')} {settings?.currencySymbol || 'ل.س'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notes Area */}
                  <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 text-xs mb-8 flex-1">
                    <span className="font-bold text-gray-500 block mb-1">الملاحظات والشروط:</span>
                    <p className="text-gray-700 leading-relaxed">{selectedVoucher.notes}</p>
                  </div>

                  {/* Standard signatures panel */}
                  <div className="grid grid-cols-3 gap-4 text-center mt-auto text-[11px] text-gray-600">
                    <div>
                      <p className="font-bold text-gray-800 mb-10">أمين المستودع (مقدم الطلب)</p>
                      <div className="border-t border-dashed border-gray-400 w-3/4 mx-auto my-2"></div>
                      <p className="text-gray-400 font-light mt-1">{settings?.signatureNames?.keeper || 'أمين المستودع'}</p>
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 mb-10">مراجعة الحسابات والمالية</p>
                      <div className="border-t border-dashed border-gray-400 w-3/4 mx-auto my-2"></div>
                      <p className="text-gray-400 font-light mt-1">{settings?.signatureNames?.accountant || 'رئيس الحسابات'}</p>
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 mb-10">اعتماد الإدارة العامة</p>
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

export default ReorderAssistant;
