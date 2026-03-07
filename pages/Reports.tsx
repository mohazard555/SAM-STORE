
import React, { useState, useMemo } from 'react';
import { Transaction, Material, SettingsData, User, Warehouse } from '@/types';
import { usePrint } from '@/services/PrintContext';
import { 
  Download, 
  Printer, 
  Search, 
  History, 
  CalendarDays, 
  CalendarRange, 
  Calendar, 
  Package, 
  Layers, 
  Truck, 
  Barcode, 
  QrCode, 
  ClipboardList, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { exportToExcel } from '@/utils/excelExport';

interface ReportsProps {
  transactions: Transaction[];
  materials: Material[];
  warehouses: Warehouse[];
  settings: SettingsData | null;
  user: User;
}

type ReportType = 'daily' | 'weekly' | 'monthly' | 'byMaterial' | 'byCategory' | 'byBarcode' | 'byItemBarcode' | 'totalCount' | 'all' | 'bySupplier' | 'mostUsed' | 'inactive' | 'lowStock' | 'inventoryValue';

const Reports: React.FC<ReportsProps> = ({ transactions, materials, warehouses, settings, user }) => {
  const { triggerPrint } = usePrint();
  const [filterType, setFilterType] = useState<ReportType>('all');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMaterialId, setSelectedMaterialId] = useState(materials[0]?.id || '');
  const [selectedBarcode, setSelectedBarcode] = useState('');
  const [selectedItemBarcode, setSelectedItemBarcode] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');

  const canPrint = user.role === 'admin' || user.permissions?.canPrint;
  const canExport = user.role === 'admin' || user.permissions?.canExport;

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

      case 'inventoryValue': {
        return materials.map(m => {
            const stock = selectedWarehouseId 
                ? (m.stocks[selectedWarehouseId] || 0)
                : m.currentStock;
            return {
                ...m,
                displayStock: stock,
                totalValue: stock * (m.price || 0)
            };
        }).filter(m => m.displayStock > 0);
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
    let fileName = 'report';
    let sheetName = 'تقرير';

    switch(filterType) {
        case 'totalCount':
        case 'lowStock':
        case 'inactive':
            dataToExport = (reportData as Material[]).map(m => ({
                "اسم المادة": m.name, "نوع المادة": m.materialType, "الفئة": m.category,
                "المورد": m.supplier, "الباركود": m.barcode, "الكمية الحالية": m.currentStock,
                "الحد الأدنى": m.minStock, "وحدة القياس": m.unit,
            }));
            fileName = `${filterType}_report`;
            sheetName = filterType === 'totalCount' ? 'جرد إجمالي' : filterType === 'lowStock' ? 'نقص المخزون' : 'المواد الراكدة';
            break;
        case 'mostUsed':
            dataToExport = (reportData as (Material & {totalQuantity: number})[]).map(m => ({
                "اسم المادة": m.name, "نوع المادة": m.materialType, "الفئة": m.category,
                "المورد": m.supplier, "الباركود": m.barcode, "إجمالي الكمية المسحوبة": m.totalQuantity,
            }));
            fileName = 'most_used_materials';
            sheetName = 'الأكثر استخداماً';
            break;
        case 'inventoryValue':
            dataToExport = (reportData as any[]).map(m => ({
                "اسم المادة": m.name, "الباركود": m.barcode, "المستودع": selectedWarehouseId ? warehouses.find(w => w.id === selectedWarehouseId)?.name : "الكل",
                "الكمية": m.displayStock, "السعر": m.price || 0, "القيمة الإجمالية": m.totalValue
            }));
            fileName = 'inventory_value_report';
            sheetName = 'قيمة المخزون';
            break;
        default: // Transaction reports
            dataToExport = (reportData as Transaction[]).map(t => ({
                'التاريخ والوقت': new Date(t.date).toLocaleString('ar-EG'), 'اسم المادة': t.materialName,
                'نوع المادة': t.materialType, 'الفئة': t.category, 'الباركود': t.barcode,
                'باركود الصنف': t.itemBarcode || '-',
                'المورد': t.supplier, 'الكمية المسحوبة': `${t.quantity} ${t.unit}`, 'المستلم': t.recipient,
                'ملاحظات': t.notes || '',
            }));
            fileName = 'transactions_report';
            sheetName = 'حركات المخزن';
    }
    
    exportToExcel(dataToExport, fileName, sheetName);
  };
  
  const handlePrint = () => {
    let reportTitle = `تقرير`;
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
        case 'inventoryValue':
            reportTitle = `تقرير قيمة المخزون - ${selectedWarehouseId ? warehouses.find(w => w.id === selectedWarehouseId)?.name : 'جميع المستودعات'}`;
            tableHeaders = `<th>اسم المادة</th><th>الباركود</th><th>الكمية</th><th>السعر</th><th>القيمة الإجمالية</th>`;
            tableContent = (reportData as any[]).map(m => `<tr><td>${m.name}</td><td>${m.barcode}</td><td>${m.displayStock} ${m.unit}</td><td>${(m.price || 0).toLocaleString('ar-EG')}</td><td>${m.totalValue.toLocaleString('ar-EG')}</td></tr>`).join('');
            const totalInventoryValue = (reportData as any[]).reduce((sum, m) => sum + m.totalValue, 0);
            tableContent += `<tr><td colspan="4" style="text-align:left; font-weight:bold;">إجمالي قيمة المخزون:</td><td style="font-weight:bold;">${totalInventoryValue.toLocaleString('ar-EG')} ج.م</td></tr>`;
            break;
        default: // Transaction reports
            reportTitle = `تقرير حركات`;
            tableHeaders = `<th>التاريخ والوقت</th><th>اسم المادة</th><th>باركود المادة</th><th>باركود الصنف</th><th>المورد</th><th>الكمية</th><th>المستلم</th><th>ملاحظات</th>`;
            tableContent = (reportData as Transaction[]).map(t => `<tr><td>${new Date(t.date).toLocaleString('ar-EG')}</td><td>${t.materialName}</td><td>${t.barcode}</td><td>${t.itemBarcode || '-'}</td><td>${t.supplier}</td><td>${t.quantity} ${t.unit}</td><td>${t.recipient}</td><td>${t.notes || ''}</td></tr>`).join('');
    }

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
          .signatures { margin-top: 50px; display: flex; justify-content: space-around; text-align: center; }
          .signature-box { padding-top: 10px; }
          .signature-box p { margin: 0; padding: 0; }
          .signature-box .line { border-bottom: 1px solid #000; margin-top: 40px; }
        </style>
        <div class="header">
          ${settings?.companyLogo ? `<img src="${settings.companyLogo}" alt="Logo">` : '<div></div>'}
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
      </div>
    `;
    triggerPrint(html);
  };
  
  const canPerformAction = reportData && reportData.length > 0;
  const showDatePickers = ['all', 'daily', 'weekly', 'monthly', 'byMaterial', 'byCategory', 'byBarcode', 'byItemBarcode', 'bySupplier', 'mostUsed'].includes(filterType);

  // Helper for filtered report options
  const reportOptions = [
    { value: 'all', label: 'كل الحركات', icon: History, color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-600', darkBg: 'dark:bg-blue-900/30', darkText: 'dark:text-blue-400', glow: 'bg-blue-500', description: 'عرض جميع حركات الصادر والوارد' },
    { value: 'daily', label: 'تقرير يومي', icon: CalendarDays, color: 'indigo', bgColor: 'bg-indigo-100', textColor: 'text-indigo-600', darkBg: 'dark:bg-indigo-900/30', darkText: 'dark:text-indigo-400', glow: 'bg-indigo-500', description: 'حركات المخزن خلال اليوم الحالي' },
    { value: 'weekly', label: 'تقرير أسبوعي', icon: CalendarRange, color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-600', darkBg: 'dark:bg-purple-900/30', darkText: 'dark:text-purple-400', glow: 'bg-purple-500', description: 'ملخص الحركات خلال الأسبوع الجاري' },
    { value: 'monthly', label: 'تقرير شهري', icon: Calendar, color: 'violet', bgColor: 'bg-violet-100', textColor: 'text-violet-600', darkBg: 'dark:bg-violet-900/30', darkText: 'dark:text-violet-400', glow: 'bg-violet-500', description: 'جرد وحركات الشهر الحالي' },
    { value: 'byMaterial', label: 'حسب المادة', icon: Package, color: 'emerald', bgColor: 'bg-emerald-100', textColor: 'text-emerald-600', darkBg: 'dark:bg-emerald-900/30', darkText: 'dark:text-emerald-400', glow: 'bg-emerald-500', description: 'تتبع حركات مادة محددة بالتفصيل' },
    { value: 'byCategory', label: 'حسب الفئة', icon: Layers, color: 'teal', bgColor: 'bg-teal-100', textColor: 'text-teal-600', darkBg: 'dark:bg-teal-900/30', darkText: 'dark:text-teal-400', glow: 'bg-teal-500', description: 'عرض الحركات لمجموعة مواد معينة' },
    { value: 'bySupplier', label: 'حسب المورد', icon: Truck, color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-600', darkBg: 'dark:bg-orange-900/30', darkText: 'dark:text-orange-400', glow: 'bg-orange-500', description: 'تقارير المواد المرتبطة بمورد محدد' },
    { value: 'byBarcode', label: 'حسب الباركود', icon: Barcode, color: 'cyan', bgColor: 'bg-cyan-100', textColor: 'text-cyan-600', darkBg: 'dark:bg-cyan-900/30', darkText: 'dark:text-cyan-400', glow: 'bg-cyan-500', description: 'البحث عن حركات مادة عبر الباركود' },
    { value: 'byItemBarcode', label: 'باركود الصنف', icon: QrCode, color: 'pink', bgColor: 'bg-pink-100', textColor: 'text-pink-600', darkBg: 'dark:bg-pink-900/30', darkText: 'dark:text-pink-400', glow: 'bg-pink-500', description: 'تتبع صنف محدد عبر باركود القصة' },
    { value: 'totalCount', label: 'جرد إجمالي', icon: ClipboardList, color: 'slate', bgColor: 'bg-slate-100', textColor: 'text-slate-600', darkBg: 'dark:bg-slate-900/30', darkText: 'dark:text-slate-400', glow: 'bg-slate-500', description: 'حالة المخزون الحالية لجميع المواد' },
    { value: 'mostUsed', label: 'الأكثر استخداماً', icon: TrendingUp, color: 'rose', bgColor: 'bg-rose-100', textColor: 'text-rose-600', darkBg: 'dark:bg-rose-900/30', darkText: 'dark:text-rose-400', glow: 'bg-rose-500', description: 'المواد ذات معدل السحب الأعلى' },
    { value: 'inactive', label: 'المواد الراكدة', icon: Clock, color: 'amber', bgColor: 'bg-amber-100', textColor: 'text-amber-600', darkBg: 'dark:bg-amber-900/30', darkText: 'dark:text-amber-400', glow: 'bg-amber-500', description: 'مواد لم يتم تحريكها منذ فترة' },
    { value: 'lowStock', label: 'نقص المخزون', icon: AlertTriangle, color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-600', darkBg: 'dark:bg-red-900/30', darkText: 'dark:text-red-400', glow: 'bg-red-500', description: 'المواد التي وصلت للحد الأدنى' },
    { value: 'inventoryValue', label: 'قيمة المخزون', icon: TrendingUp, color: 'emerald', bgColor: 'bg-emerald-100', textColor: 'text-emerald-600', darkBg: 'dark:bg-emerald-900/30', darkText: 'dark:text-emerald-400', glow: 'bg-emerald-500', description: 'حساب القيمة المالية للمخزون الحالي' },
  ] as const;

  const filteredOptions = reportOptions.filter(opt => 
    opt.label.includes(searchFilterType) || opt.description.includes(searchFilterType)
  );

  return (
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">التقارير والجرد</h1>
        <div className="relative w-64">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="بحث عن نوع تقرير..." 
            value={searchFilterType} 
            onChange={e => setSearchFilterType(e.target.value)} 
            className="w-full p-2 pr-10 border rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Report Type Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredOptions.map((opt) => {
          const Icon = opt.icon;
          const isActive = filterType === opt.value;
          
          return (
            <motion.button
              key={opt.value}
              whileHover={{ 
                scale: 1.05, 
                rotateY: 5, 
                rotateX: -5,
                z: 50
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleFilterChange(opt.value as ReportType)}
              className={`
                relative group p-5 rounded-2xl border-2 text-right transition-all duration-300
                flex flex-col items-start gap-3 overflow-hidden
                ${isActive 
                  ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/20 dark:border-blue-400 shadow-lg shadow-blue-500/20' 
                  : 'bg-white border-transparent hover:border-gray-200 dark:bg-gray-800 dark:hover:border-gray-700 shadow-sm hover:shadow-xl'
                }
              `}
              style={{ perspective: '1000px' }}
            >
              {/* Decorative background glow */}
              <div className={`
                absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-10 transition-opacity group-hover:opacity-20
                ${isActive ? 'opacity-30' : ''}
                ${opt.glow}
              `} />

              <div className={`
                p-3 rounded-xl transition-colors
                ${isActive 
                  ? 'bg-blue-500 text-white' 
                  : `${opt.bgColor} ${opt.textColor} ${opt.darkBg} ${opt.darkText}`
                }
              `}>
                <Icon size={24} />
              </div>
              
              <div>
                <h3 className={`font-bold text-lg ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'}`}>
                  {opt.label}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                  {opt.description}
                </p>
              </div>

              {isActive && (
                <motion.div 
                  layoutId="active-indicator"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500"
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Filters and Actions Section */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={filterType}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border dark:border-gray-700 space-y-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex flex-wrap items-end gap-4">
              {showDatePickers && (
                <div className="flex gap-4 items-end bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border dark:border-gray-700">
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 block mr-1">من تاريخ</label>
                      <input 
                        type="date" 
                        value={startDate} 
                        onChange={e => setStartDate(e.target.value)} 
                        className="p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                      />
                  </div>
                  {filterType !== 'daily' && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 block mr-1">إلى تاريخ</label>
                      <input 
                        type="date" 
                        value={endDate} 
                        onChange={e => setEndDate(e.target.value)} 
                        className="p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                      />
                    </div>
                  )}
                </div>
              )}

              {filterType === 'byMaterial' && (
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 block mr-1">اختر المادة</label>
                      <div className="flex gap-2">
                          <div className="relative">
                            <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input type="text" placeholder="بحث..." value={searchMaterial} onChange={e => setSearchMaterial(e.target.value)} className="w-24 p-2 pr-7 border rounded-lg text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                          </div>
                          <select value={selectedMaterialId} onChange={e => setSelectedMaterialId(e.target.value)} className="p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-48 focus:ring-2 focus:ring-blue-500 outline-none" disabled={materials.length === 0}>
                              {materials.filter(m => m.name.includes(searchMaterial)).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                      </div>
                  </div>
              )}
              
              {filterType === 'byCategory' && (
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 block mr-1">اختر الفئة</label>
                      <div className="flex gap-2">
                          <div className="relative">
                            <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input type="text" placeholder="بحث..." value={searchCategory} onChange={e => setSearchCategory(e.target.value)} className="w-24 p-2 pr-7 border rounded-lg text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                          </div>
                          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-48 focus:ring-2 focus:ring-blue-500 outline-none" disabled={uniqueCategories.length === 0}>
                              <option value="">-- اختر الفئة --</option>
                              {uniqueCategories.filter(c => c.includes(searchCategory)).map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                      </div>
                  </div>
              )}

              {filterType === 'bySupplier' && (
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 block mr-1">اختر المورد</label>
                      <div className="flex gap-2">
                          <div className="relative">
                            <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input type="text" placeholder="بحث..." value={searchSupplier} onChange={e => setSearchSupplier(e.target.value)} className="w-24 p-2 pr-7 border rounded-lg text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                          </div>
                          <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} className="p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-48 focus:ring-2 focus:ring-blue-500 outline-none" disabled={uniqueSuppliers.length === 0}>
                              <option value="">-- اختر المورد --</option>
                              {uniqueSuppliers.filter(s => s.includes(searchSupplier)).map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                      </div>
                  </div>
              )}

              {filterType === 'byBarcode' && (
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 block mr-1">اختر باركود المادة</label>
                      <div className="flex gap-2">
                          <div className="relative">
                            <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input type="text" placeholder="بحث..." value={searchBarcode} onChange={e => setSearchBarcode(e.target.value)} className="w-24 p-2 pr-7 border rounded-lg text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                          </div>
                          <select value={selectedBarcode} onChange={e => setSelectedBarcode(e.target.value)} className="p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-48 focus:ring-2 focus:ring-blue-500 outline-none" disabled={uniqueBarcodes.length === 0}>
                              <option value="">-- اختر الباركود --</option>
                              {uniqueBarcodes.filter(b => b.includes(searchBarcode)).map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                      </div>
                  </div>
              )}

              {filterType === 'byItemBarcode' && (
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 block mr-1">اختر باركود الصنف</label>
                      <div className="flex gap-2">
                          <div className="relative">
                            <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input type="text" placeholder="بحث..." value={searchItemBarcode} onChange={e => setSearchItemBarcode(e.target.value)} className="w-24 p-2 pr-7 border rounded-lg text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                          </div>
                          <select value={selectedItemBarcode} onChange={e => setSelectedItemBarcode(e.target.value)} className="p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-48 focus:ring-2 focus:ring-blue-500 outline-none" disabled={uniqueItemBarcodes.length === 0}>
                              <option value="">-- اختر الباركود --</option>
                              {uniqueItemBarcodes.filter(b => b && b.includes(searchItemBarcode)).map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                      </div>
                  </div>
              )}

              {filterType === 'inventoryValue' && (
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 block mr-1">اختر المستودع</label>
                      <select 
                        value={selectedWarehouseId} 
                        onChange={e => setSelectedWarehouseId(e.target.value)} 
                        className="p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-48 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                          <option value="">جميع المستودعات</option>
                          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                  </div>
              )}
            </div>

            <div className="flex gap-3">
                {canExport && (
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={exportToXLSX} 
                      className="flex items-center px-6 py-3 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 disabled:bg-emerald-300 disabled:shadow-none transition-all font-bold" 
                      disabled={!canPerformAction}
                    >
                        <Download className="ml-2" size={20}/>
                        تصدير Excel
                    </motion.button>
                )}
                {canPrint && (
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handlePrint} 
                      className="flex items-center px-6 py-3 bg-sky-500 text-white rounded-xl shadow-lg shadow-sky-500/20 hover:bg-sky-600 disabled:bg-sky-300 disabled:shadow-none transition-all font-bold" 
                      disabled={!canPerformAction}
                    >
                        <Printer className="ml-2" size={20}/>
                        طباعة التقرير
                    </motion.button>
                )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-2xl overflow-hidden border dark:border-gray-700 transition-all">
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
                                {material.currentStock.toLocaleString('ar-EG')} {material.unit}
                            </td>
                            <td className="px-6 py-4 text-gray-400">{material.minStock.toLocaleString('ar-EG')} {material.unit}</td>
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
                          <td className="px-6 py-4 font-black text-blue-500">{material.totalQuantity.toLocaleString('ar-EG')} {material.unit}</td>
                      </tr>
                  ))}
              </tbody>
           </table>
        ) : (filterType === 'inventoryValue') ? (
            <div className="space-y-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl flex justify-between items-center">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300">إجمالي قيمة المخزون المفلتر:</span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {(reportData as any[]).reduce((sum, m) => sum + m.totalValue, 0).toLocaleString('ar-EG')} ج.م
                    </span>
                </div>
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="px-6 py-3">اسم المادة</th>
                            <th scope="col" className="px-6 py-3">الباركود</th>
                            <th scope="col" className="px-6 py-3">الكمية</th>
                            <th scope="col" className="px-6 py-3">السعر</th>
                            <th scope="col" className="px-6 py-3">القيمة الإجمالية</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(reportData as any[]).map(material => (
                            <tr key={material.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                                <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap dark:text-white">{material.name}</td>
                                <td className="px-6 py-4 font-mono text-xs">{material.barcode}</td>
                                <td className="px-6 py-4 font-bold">{material.displayStock.toLocaleString('ar-EG')} {material.unit}</td>
                                <td className="px-6 py-4">{(material.price || 0).toLocaleString('ar-EG')}</td>
                                <td className="px-6 py-4 font-black text-emerald-500">{material.totalValue.toLocaleString('ar-EG')} ج.م</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
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
                        <td className={`px-6 py-4 font-black ${(transaction.type === 'in' || transaction.type === 'return_in') ? 'text-emerald-500' : 'text-red-500'}`}>
                            {(transaction.type === 'in' || transaction.type === 'return_in') ? '+' : '-'}{transaction.quantity.toLocaleString('ar-EG')} {transaction.unit}
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
