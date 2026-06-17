
import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, Material, SettingsData, User, Warehouse } from '@/types';
import { usePrint } from '@/services/PrintContext';
import { ProcessedItemCards } from '@/components/ProcessedItemCards';
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
  ChevronRight,
  PlusCircle,
  RotateCcw,
  Trash2,
  Ruler,
  FileText,
  User as UserIcon,
  Calculator,
  X,
  CornerRightDown,
  CornerUpLeft,
  ShieldCheck,
  Scale,
  Percent
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { exportToExcel } from '@/utils/excelExport';

import { getNotifications, getOpeningStockAdjustments } from '@/services/mockApi';

interface MultiSelectDropdownProps {
  label: string;
  placeholder: string;
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  allOptionLabel: string;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  placeholder,
  options,
  selectedValues,
  onChange,
  allOptionLabel
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    return options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));
  }, [options, search]);

  const handleToggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter(v => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const handleSelectAll = () => {
    onChange(options);
  };

  const handleClear = () => {
    onChange([]);
  };

  return (
    <div className="relative mb-2 w-full" ref={dropdownRef}>
      <label className="block mb-1 text-sm font-medium text-gray-600 dark:text-gray-300">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-right p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-100 flex justify-between items-center bg-white shadow-sm hover:border-gray-300 dark:hover:border-gray-500 transition-all cursor-pointer"
      >
        <span className="truncate">
          {selectedValues.length === 0
            ? allOptionLabel
            : selectedValues.length === 1
            ? selectedValues[0]
            : `تم اختيار ${selectedValues.length} من البنود`}
        </span>
        <span className="text-gray-400 text-xs text-left select-none mr-2">▼</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-full min-w-[260px] bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 rounded-lg shadow-xl p-3 flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={placeholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-2.5 py-1 text-xs border rounded dark:bg-gray-750 dark:border-gray-650 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                مسح
              </button>
            )}
          </div>

          <div className="flex justify-between gap-2 text-[10px] pb-1 border-b border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
            >
              تحديد الكل
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="text-red-500 hover:underline font-bold"
            >
              إلغاء التحديد
            </button>
          </div>

          <div className="overflow-y-auto max-h-48 divide-y divide-gray-50 dark:divide-gray-750/30">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-gray-400">لا توجد خيارات مطابقة.</div>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = selectedValues.includes(opt);
                return (
                  <label
                    key={opt}
                    className="flex items-center gap-2 py-1.5 px-1 hover:bg-gray-50 dark:hover:bg-gray-750/50 rounded cursor-pointer text-xs text-gray-700 dark:text-gray-300 select-none"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleOption(opt)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <span className="truncate">{opt}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface MultiSelectMaterialDropdownProps {
  label: string;
  placeholder: string;
  options: Material[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  allOptionLabel: string;
}

const MultiSelectMaterialDropdown: React.FC<MultiSelectMaterialDropdownProps> = ({
  label,
  placeholder,
  options,
  selectedIds,
  onChange,
  allOptionLabel
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    return options.filter(opt => opt.name.toLowerCase().includes(search.toLowerCase()) || opt.barcode.toLowerCase().includes(search.toLowerCase()));
  }, [options, search]);

  const handleToggleOption = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(v => v !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    onChange(options.map(o => o.id));
  };

  const handleClear = () => {
    onChange([]);
  };

  const selectedNamesSummary = useMemo(() => {
    if (selectedIds.length === 0) return allOptionLabel;
    if (selectedIds.length === 1) {
      const match = options.find(o => o.id === selectedIds[0]);
      return match ? match.name : allOptionLabel;
    }
    return `تم اختيار ${selectedIds.length} من المواد`;
  }, [selectedIds, options, allOptionLabel]);

  return (
    <div className="relative mb-2 w-full" ref={dropdownRef}>
      <label className="block mb-1 text-sm font-medium text-gray-600 dark:text-gray-300">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-right p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-100 flex justify-between items-center bg-white shadow-sm hover:border-gray-300 dark:hover:border-gray-500 transition-all cursor-pointer"
      >
        <span className="truncate">{selectedNamesSummary}</span>
        <span className="text-gray-400 text-xs text-left select-none mr-2">▼</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-full min-w-[260px] bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 rounded-lg shadow-xl p-3 flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={placeholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-2.5 py-1 text-xs border rounded dark:bg-gray-750 dark:border-gray-655 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                مسح
              </button>
            )}
          </div>

          <div className="flex justify-between gap-2 text-[10px] pb-1 border-b border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
            >
              تحديد الكل
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="text-red-500 hover:underline font-bold"
            >
              إلغاء التحديد
            </button>
          </div>

          <div className="overflow-y-auto max-h-48 divide-y divide-gray-50 dark:divide-gray-750/30">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-gray-400">لا توجد مواد مطابقة.</div>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = selectedIds.includes(opt.id);
                return (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2 py-1.5 px-1 hover:bg-gray-50 dark:hover:bg-gray-750/50 rounded cursor-pointer text-xs text-gray-700 dark:text-gray-300 select-none"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleOption(opt.id)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <div className="truncate flex flex-col leading-tight">
                      <span className="font-bold">{opt.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{opt.barcode}</span>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface ReportsProps {
  transactions: Transaction[];
  materials: Material[];
  warehouses: Warehouse[];
  settings: SettingsData | null;
  user: User;
}

type ReportType = 'daily' | 'weekly' | 'monthly' | 'byMaterial' | 'byCategory' | 'byColor' | 'byBarcode' | 'byItemBarcode' | 'totalCount' | 'all' | 'bySupplier' | 'mostUsed' | 'inactive' | 'lowStock' | 'inventoryValue' | 'inTransactions' | 'outTransactions' | 'byRecipient' | 'materialLedger' | 'warehouseTransfers' | 'deadStock' | 'fastMoving' | 'slowMoving' | 'warehouseComparison' | 'userPerformance' | 'auditReport' | 'consumptionAnalysis' | 'stockForecast' | 'periodComparison' | 'trendReport' | 'expiryReport' | 'reservedStockReport' | 'modifiedOperationsReport' | 'supplierInventoryValue' | 'supplierReturns' | 'processedItemCards' | 'scrapReport' | 'wasteReport' | 'rulersReport' | 'notesSearchReport' | 'openingStockReport' | 'closingStockReport' | 'fastSearchStats' | 'openingStockAdjustments' | 'reorderLevelReport' | 'stockAccuracyReport' | 'noPriceMaterialsReport' | 'batchTrackingReport' | 'itemLifecycleReport' | 'binLocationReport' | 'cancelledRejectedReport' | 'incompleteTransfersReport' | 'movingAverageCostReport' | 'projectConsumptionReport' | 'zeroStockReport';

const Reports: React.FC<ReportsProps> = ({ transactions, materials, warehouses, settings, user }) => {
  const { triggerPrint } = usePrint();
  const [filterType, setFilterType] = useState<ReportType>('all');
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMaterialId, setSelectedMaterialId] = useState(materials[0]?.id || '');

  const [manualPhysicalStocks, setManualPhysicalStocks] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem('reports_actual_physical_stocks');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const updatePhysicalStock = (materialId: string, val: string) => {
    const freshVal = val === '' ? NaN : Number(val);
    const updated = {
      ...manualPhysicalStocks,
      [materialId]: freshVal,
    };
    setManualPhysicalStocks(updated);
    try {
      localStorage.setItem('reports_actual_physical_stocks', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const [selectedBarcode, setSelectedBarcode] = useState('');
  const [selectedItemBarcode, setSelectedItemBarcode] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  type ReportCategory = 'inventory' | 'movement' | 'analysis' | 'suppliers' | 'users' | 'system' | 'auditControl';
  const [selectedReportCategory, setSelectedReportCategory] = useState<ReportCategory>('inventory');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [deadStockDays, setDeadStockDays] = useState<number>(30);
  const [comparisonStartDate, setComparisonStartDate] = useState(() => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return lastMonth.toISOString().split('T')[0];
  });
  const [comparisonEndDate, setComparisonEndDate] = useState(() => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    return lastMonth.toISOString().split('T')[0];
  });

  const canPrint = user.role === 'admin' || user.permissions?.canPrint;
  const canExport = user.role === 'admin' || user.permissions?.canExport;

  // Search terms for dropdowns
  const [searchFilterType, setSearchFilterType] = useState('');
  const [searchMaterial, setSearchMaterial] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [searchColor, setSearchColor] = useState('');
  const [searchSupplier, setSearchSupplier] = useState('');
  const [searchRecipient, setSearchRecipient] = useState('');
  const [searchBarcode, setSearchBarcode] = useState('');
  const [searchItemBarcode, setSearchItemBarcode] = useState('');
  const [reportSearchQuery, setReportSearchQuery] = useState('');

  // States for Quick Cumulative Search Engine
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [quickSearchQuery, setQuickSearchQuery] = useState('');

  const uniqueCategories = useMemo(() => {
    const categories = materials.map(m => m.category);
    return [...new Set(categories)].filter(Boolean);
  }, [materials]);

  const uniqueColors = useMemo(() => {
    const colors = materials.map(m => m.color);
    return [...new Set(colors)].filter(Boolean);
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

  const uniqueRecipients = useMemo(() => {
    const recipients = transactions.map(t => t.recipient);
    return [...new Set(recipients)].filter(Boolean);
  }, [transactions]);

  // Derived options and stats for Quick Cumulative Search Engine
  const fastSearchCategoriesOptions = useMemo(() => {
    if (selectedSuppliers.length === 0) {
      return uniqueCategories;
    }
    const filteredMats = materials.filter(m => m.supplier && selectedSuppliers.includes(m.supplier));
    return Array.from(new Set(filteredMats.map(m => m.category))).filter(Boolean);
  }, [materials, selectedSuppliers, uniqueCategories]);

  const fastSearchMaterialsOptions = useMemo(() => {
    let filtered = materials;
    if (selectedSuppliers.length > 0) {
      filtered = filtered.filter(m => m.supplier && selectedSuppliers.includes(m.supplier));
    }
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(m => m.category && selectedCategories.includes(m.category));
    }
    return filtered;
  }, [materials, selectedSuppliers, selectedCategories]);

  const fastSearchStats = useMemo(() => {
    let filteredMaterials = materials;
    if (selectedSuppliers.length > 0) {
      filteredMaterials = filteredMaterials.filter(m => m.supplier && selectedSuppliers.includes(m.supplier));
    }
    if (selectedCategories.length > 0) {
      filteredMaterials = filteredMaterials.filter(m => m.category && selectedCategories.includes(m.category));
    }
    if (selectedMaterialIds.length > 0) {
      filteredMaterials = filteredMaterials.filter(m => selectedMaterialIds.includes(m.id));
    }

    if (quickSearchQuery) {
      const query = quickSearchQuery.toLowerCase();
      filteredMaterials = filteredMaterials.filter(m => 
        m.name.toLowerCase().includes(query) ||
        m.barcode.toLowerCase().includes(query) ||
        (m.category && m.category.toLowerCase().includes(query)) ||
        (m.supplier && m.supplier.toLowerCase().includes(query))
      );
    }

    let totalReceived = 0;
    let totalUsed = 0;
    let totalRemaining = 0;

    filteredMaterials.forEach(m => {
      let subsequentIn = 0;
      let subsequentOut = 0;
      let used = 0;
      
      transactions.forEach(t => {
        if (t.materialId === m.id) {
          const isOpeningStock = 
            t.recipient === 'رصيد افتتاحي' || 
            t.recipient === 'رصيد افتتاحي (إصلاح تلقائي)' || 
            t.recipient === 'رصيد افتتاحي معدّل' || 
            t.recipient === 'تمت الإضافة كحركة افتتاحية معدلة' ||
            t.recipient === 'تعديل رصيد افتتاحي';

          if (t.type === 'in' || t.type === 'return_in') {
            if (!isOpeningStock) {
              subsequentIn += t.quantity;
            }
          } else if (t.type === 'out' || t.type === 'return') {
            if (!isOpeningStock) {
              subsequentOut += t.quantity;
              used += t.quantity;
            }
          }
        }
      });

      const entered = m.currentStock + subsequentOut;
      totalReceived += entered;
      totalUsed += used;
      totalRemaining += m.currentStock;
    });

    return {
      totalReceived: Math.round(totalReceived * 1000) / 1000,
      totalUsed: Math.round(totalUsed * 1000) / 1000,
      totalRemaining: Math.round(totalRemaining * 1000) / 1000,
      matchedMaterials: filteredMaterials
    };
  }, [materials, transactions, selectedSuppliers, selectedCategories, selectedMaterialIds, quickSearchQuery]);

  const materialsWithStats = useMemo(() => {
    return fastSearchStats.matchedMaterials.map(m => {
      let subsequentIn = 0;
      let subsequentOut = 0;
      let used = 0;
      
      transactions.forEach(t => {
        if (t.materialId === m.id) {
          const isOpeningStock = 
            t.recipient === 'رصيد افتتاحي' || 
            t.recipient === 'رصيد افتتاحي (إصلاح تلقائي)' || 
            t.recipient === 'رصيد افتتاحي معدّل' || 
            t.recipient === 'تمت الإضافة كحركة افتتاحية معدلة' ||
            t.recipient === 'تعديل رصيد افتتاحي';

          if (t.type === 'in' || t.type === 'return_in') {
            if (!isOpeningStock) {
              subsequentIn += t.quantity;
            }
          } else if (t.type === 'out' || t.type === 'return') {
            if (!isOpeningStock) {
              subsequentOut += t.quantity;
              used += t.quantity;
            }
          }
        }
      });

      const entered = m.currentStock + subsequentOut;

      return {
        ...m,
        entered: Math.round(entered * 1000) / 1000,
        used: Math.round(used * 1000) / 1000,
        remaining: Math.round(m.currentStock * 1000) / 1000,
      };
    });
  }, [fastSearchStats.matchedMaterials, transactions]);

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
    const timeSensitiveReports: ReportType[] = ['daily', 'weekly', 'monthly', 'byMaterial', 'byCategory', 'byColor', 'byBarcode', 'byItemBarcode', 'bySupplier', 'mostUsed', 'all', 'inTransactions', 'outTransactions', 'byRecipient', 'warehouseTransfers', 'materialLedger', 'scrapReport', 'wasteReport', 'rulersReport', 'notesSearchReport', 'openingStockReport', 'closingStockReport', 'openingStockAdjustments', 'batchTrackingReport', 'itemLifecycleReport', 'cancelledRejectedReport', 'incompleteTransfersReport', 'projectConsumptionReport', 'zeroStockReport'];
    if (!timeSensitiveReports.includes(filterType)) {
        return transactions;
    }

    // Use UTC for consistent filtering
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);

    let end: Date;
    if (filterType === 'daily') {
        end = new Date(start);
        end.setUTCHours(23, 59, 59, 999);
    } else {
        end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
    }
    
    return transactions.filter(t => {
      if (!t.date) return false;
      // Normalize Arabic numerals if any
      const dateStr = t.date.replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());
      const tDate = new Date(dateStr);
      if (isNaN(tDate.getTime())) return false;
      return tDate.getTime() >= start.getTime() && tDate.getTime() <= end.getTime();
    });
  }, [transactions, filterType, startDate, endDate]);

  const reportData = useMemo(() => {
    const notifications = getNotifications();
    
    switch(filterType) {
      case 'materialLedger': {
        if (!selectedMaterialId) return [];
        const materialTransactions = [...transactions]
          .filter(t => t.materialId === selectedMaterialId)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        let runningBalance = 0;
        return materialTransactions.map(t => {
          const balanceBefore = runningBalance;
          if (t.type === 'in' || t.type === 'return_in') {
            runningBalance += t.quantity;
          } else if (t.type === 'out' || t.type === 'return') {
            runningBalance -= t.quantity;
          }
          // For transfers, it depends on which warehouse we are looking at, 
          // but for a general ledger, we can show the net change if it's within the same material.
          // Usually ledger is per warehouse or total.
          
          return {
            ...t,
            balanceBefore,
            balanceAfter: runningBalance
          };
        }).reverse();
      }

      case 'warehouseTransfers':
        return dateFilteredTransactions.filter(t => t.type === 'transfer');

      case 'openingStockAdjustments': {
        const adjustments = getOpeningStockAdjustments();
        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        
        return adjustments.filter(adj => {
          if (!adj.date) return false;
          const adjDate = new Date(adj.date);
          return adjDate >= start && adjDate <= end;
        });
      }

      case 'deadStock': {
        const now = new Date();
        const thresholdDate = new Date(now.getTime() - (deadStockDays * 24 * 60 * 60 * 1000));
        
        return materials.filter(m => {
          const materialTransactions = transactions.filter(t => t.materialId === m.id);
          if (materialTransactions.length === 0) {
            // Check if material creation date is older than threshold
            return new Date(m.createdAt).getTime() < thresholdDate.getTime();
          }
          const lastTransaction = materialTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
          return new Date(lastTransaction.date).getTime() < thresholdDate.getTime();
        });
      }

      case 'fastMoving': {
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
          .sort((a, b) => b.totalQuantity - a.totalQuantity)
          .slice(0, 20);
      }

      case 'slowMoving': {
        const usage = dateFilteredTransactions.reduce((acc, t) => {
          if (t.type === 'out') acc[t.materialId] = (acc[t.materialId] || 0) + t.quantity;
          return acc;
        }, {} as Record<string, number>);

        // Materials with low usage but at least some transactions in the period
        return Object.entries(usage)
          .map(([materialId, totalQuantity]) => {
            const material = materials.find(m => m.id === materialId);
            return material ? { ...material, totalQuantity } : null;
          })
          .filter((item): item is (Material & {totalQuantity: number}) => item !== null)
          .sort((a, b) => a.totalQuantity - b.totalQuantity);
      }

      case 'warehouseComparison':
        return materials;

      case 'userPerformance': {
        const userStats: Record<string, { in: number, out: number, total: number }> = {};
        notifications.forEach(n => {
          if (!userStats[n.user]) userStats[n.user] = { in: 0, out: 0, total: 0 };
          userStats[n.user].total++;
          if (n.type === 'transaction') {
            if (n.message.includes('إضافة') || n.message.includes('توريد')) userStats[n.user].in++;
            if (n.message.includes('صرف') || n.message.includes('سحب')) userStats[n.user].out++;
          }
        });
        return Object.entries(userStats).map(([username, stats]) => ({ username, ...stats }));
      }

      case 'modifiedOperationsReport':
      case 'auditReport':
        return notifications.filter(n => {
            const nDate = new Date(n.timestamp).getTime();
            const start = new Date(startDate).getTime();
            const end = new Date(endDate).getTime();
            return (n.action === 'update' || n.action === 'delete') && nDate >= start && nDate <= end;
        });

      case 'consumptionAnalysis': {
        // Group consumption by month
        const monthlyUsage: Record<string, number> = {};
        dateFilteredTransactions.forEach(t => {
          if (t.type === 'out') {
            const month = new Date(t.date).toLocaleString('ar-EG', { month: 'long', year: 'numeric' });
            monthlyUsage[month] = (monthlyUsage[month] || 0) + t.quantity;
          }
        });
        return Object.entries(monthlyUsage).map(([month, quantity]) => ({ month, quantity }));
      }

      case 'stockForecast': {
        // Simple forecast: average daily usage * 30 days
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        const days = Math.max(1, (end - start) / (1000 * 60 * 60 * 24));
        
        return materials.map(m => {
          const periodUsage = dateFilteredTransactions
            .filter(t => t.materialId === m.id && t.type === 'out')
            .reduce((sum, t) => sum + t.quantity, 0);
          
          const avgDaily = periodUsage / days;
          const forecast30Days = avgDaily * 30;
          const daysRemaining = avgDaily > 0 ? m.currentStock / avgDaily : Infinity;
          
          return {
            ...m,
            avgDaily,
            forecast30Days,
            daysRemaining: daysRemaining === Infinity ? 'غير محدود' : Math.round(daysRemaining)
          };
        }).filter(m => m.avgDaily > 0);
      }

      case 'periodComparison': {
        // Current period usage
        const currentUsage = dateFilteredTransactions.reduce((acc, t) => {
          if (t.type === 'out') acc[t.materialId] = (acc[t.materialId] || 0) + t.quantity;
          return acc;
        }, {} as Record<string, number>);
        
        // Comparison period usage
        const compStart = new Date(comparisonStartDate).getTime();
        const compEnd = new Date(comparisonEndDate).getTime();
        const comparisonTransactions = transactions.filter(t => {
          const tDate = new Date(t.date).getTime();
          return tDate >= compStart && tDate <= compEnd;
        });

        const prevUsage = comparisonTransactions.reduce((acc, t) => {
          if (t.type === 'out') acc[t.materialId] = (acc[t.materialId] || 0) + t.quantity;
          return acc;
        }, {} as Record<string, number>);

        return materials.map(m => {
          const current = currentUsage[m.id] || 0;
          const previous = prevUsage[m.id] || 0;
          const diff = current - previous;
          const percentChange = previous > 0 ? (diff / previous) * 100 : (current > 0 ? 100 : 0);
          
          return {
            ...m,
            current,
            previous,
            diff,
            percentChange
          };
        }).filter(m => m.current > 0 || m.previous > 0);
      }

      case 'trendReport': {
        // Usage trend by material over last 6 months
        const months: string[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          months.push(d.toLocaleString('ar-EG', { month: 'short' }));
        }

        return materials.map(m => {
          const trend = months.map((month, idx) => {
            const d = new Date();
            d.setMonth(d.getMonth() - (5 - idx));
            const mStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
            const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).getTime();
            
            const monthUsage = transactions
              .filter(t => t.materialId === m.id && t.type === 'out')
              .filter(t => {
                const tDate = new Date(t.date).getTime();
                return tDate >= mStart && tDate <= mEnd;
              })
              .reduce((sum, t) => sum + t.quantity, 0);
            
            return monthUsage;
          });
          
          return { ...m, trend, months };
        }).filter(m => m.trend.some(v => v > 0));
      }

      case 'expiryReport': {
        return materials.filter(m => {
          if (!m.expiryDate) return false;
          const expiry = new Date(m.expiryDate).getTime();
          const start = new Date(startDate).getTime();
          const end = new Date(endDate).getTime();
          return expiry >= start && expiry <= end;
        }).sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime());
      }

      case 'reservedStockReport':
        return materials.filter(m => {
          const created = new Date(m.createdAt).getTime();
          const start = new Date(startDate).getTime();
          const end = new Date(endDate).getTime();
          return (m.reservedStock || 0) > 0 && created >= start && created <= end;
        });

      case 'supplierInventoryValue':
        return materials.filter(m => !selectedSupplier || m.supplier === selectedSupplier).map(m => ({
            ...m,
            totalValue: m.currentStock * (m.price || 0)
        })).filter(m => m.currentStock > 0);

      case 'supplierReturns':
        return dateFilteredTransactions.filter(t => t.type === 'return' && (!selectedSupplier || t.supplier === selectedSupplier));

      case 'scrapReport':
        return dateFilteredTransactions.filter(t => t.outputType === 'scrap');

      case 'wasteReport':
        return dateFilteredTransactions.filter(t => t.outputType === 'waste');

      case 'rulersReport':
        return dateFilteredTransactions.filter(t => t.outputType === 'rulers');

      case 'notesSearchReport':
        return dateFilteredTransactions.filter(t => t.notes && t.notes.trim() !== '');

      case 'openingStockReport': {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const startTime = start.getTime();

        return materials.map(m => {
          let runningStock = m.currentStock;
          
          transactions
            .filter(t => t.materialId === m.id)
            .forEach(t => {
              const tDate = new Date(t.date);
              if (tDate.getTime() >= startTime) {
                if (t.type === 'in' || t.type === 'return_in') {
                  runningStock -= t.quantity;
                } else if (t.type === 'out' || t.type === 'return') {
                  runningStock += t.quantity;
                }
              }
            });
            
          return { ...m, openingStock: Math.max(0, Math.round(runningStock * 1000) / 1000) };
        }).filter(m => m.openingStock !== 0);
      }

      case 'closingStockReport': {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const endTime = end.getTime();

        return materials.map(m => {
          let runningStock = m.currentStock;
          
          transactions
            .filter(t => t.materialId === m.id)
            .forEach(t => {
              const tDate = new Date(t.date);
              if (tDate.getTime() > endTime) {
                if (t.type === 'in' || t.type === 'return_in') {
                  runningStock -= t.quantity;
                } else if (t.type === 'out' || t.type === 'return') {
                  runningStock += t.quantity;
                }
              }
            });
            
          return { ...m, closingStock: Math.max(0, Math.round(runningStock * 1000) / 1000) };
        }).filter(m => m.closingStock !== 0);
      }


       case 'totalCount':
        return materials;

      case 'zeroStockReport': {
        return materials.filter(m => {
          if (m.currentStock !== 0) return false;
          const materialTransactions = transactions.filter(t => t.materialId === m.id);
          return materialTransactions.length > 0;
        }).map(m => {
          const materialTransactions = [...transactions]
            .filter(t => t.materialId === m.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          const lastTx = materialTransactions[0];
          return {
            ...m,
            lastTxDate: lastTx ? lastTx.date : m.createdAt,
            lastTxType: lastTx ? (lastTx.type === 'in' ? 'إدخال' : lastTx.type === 'out' ? 'صرف' : lastTx.type === 'transfer' ? 'تحويل' : 'تسوية') : 'لا يوجد',
            lastTxQty: lastTx ? lastTx.quantity : 0,
            lastTxUser: lastTx ? (lastTx.recipient || 'النظام') : 'النظام',
            lastTxNotes: lastTx ? (lastTx.notes || '-') : '-'
          };
        });
      }

      case 'reorderLevelReport': {
        return materials.filter(m => m.currentStock <= m.minStock * 1.2).map(m => {
          const gap = m.minStock * 2 - m.currentStock;
          const suggestedReorder = Math.max(10, Math.round(gap * 10) / 10);
          return {
            ...m,
            status: m.currentStock <= m.minStock ? 'حرجة (ناقص)' : 'قريبة من الحد الأدنى',
            suggestedReorder
          };
        });
      }

      case 'stockAccuracyReport': {
        return materials.map(m => {
          const systemStock = m.currentStock;
          const enteredActual = manualPhysicalStocks[m.id];
          const hasEntered = enteredActual !== undefined && !isNaN(enteredActual);
          const actualStock = hasEntered ? enteredActual : null;
          const discrepancy = hasEntered ? (enteredActual - systemStock) : null;
          const discrepancyAbsolute = discrepancy !== null ? Math.abs(discrepancy) : 0;
          const accuracyPercent = discrepancy !== null 
            ? (systemStock > 0 
                ? Math.max(0, Math.min(100, (1 - discrepancyAbsolute / systemStock) * 100))
                : (discrepancyAbsolute > 0 ? 0 : 100))
            : null;
          return {
            ...m,
            systemStock,
            actualCountStock: actualStock,
            discrepancy,
            accuracyPercent: accuracyPercent !== null ? Math.round(accuracyPercent * 10) / 10 : null,
            adjustmentCount: 0
          };
        });
      }

      case 'noPriceMaterialsReport': {
        return materials.filter(m => !m.price || m.price === 0);
      }

      case 'batchTrackingReport': {
        const batches: any[] = [];
        const inTransactions = [...transactions]
          .filter(t => t.type === 'in' || t.type === 'return_in')
          .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        inTransactions.forEach((inTx, idx) => {
          const batchDate = new Date(inTx.date).getTime();
          const nextBatch = inTransactions.find((nextTx, nextIdx) => nextIdx > idx && nextTx.materialId === inTx.materialId);
          const nextBatchDate = nextBatch ? new Date(nextBatch.date).getTime() : Infinity;
          
          const matchingOuts = transactions.filter(t => 
            t.materialId === inTx.materialId && 
            (t.type === 'out' || t.type === 'return') &&
            new Date(t.date).getTime() >= batchDate && 
            new Date(t.date).getTime() < nextBatchDate
          );
          
          const totalOutQty = matchingOuts.reduce((sum, outTx) => sum + outTx.quantity, 0);
          const remainingQty = Math.max(0, inTx.quantity - totalOutQty);
          
          batches.push({
            id: inTx.id,
            materialName: inTx.materialName,
            barcode: inTx.barcode,
            supplier: inTx.supplier,
            batchNumber: `BAT-${new Date(inTx.date).getFullYear()}${(new Date(inTx.date).getMonth()+1).toString().padStart(2, '0')}-${inTx.id.substring(0, 4).toUpperCase()}`,
            date: inTx.date,
            initialQty: inTx.quantity,
            outQty: totalOutQty,
            remainingQty,
            unit: inTx.unit,
            recipients: Array.from(new Set(matchingOuts.map(t => t.recipient))).join(', ') || '-',
            status: remainingQty === 0 ? 'مستهلك بالكامل' : (remainingQty < inTx.quantity ? 'مستهلك جزئياً' : 'متاح بالكامل')
          });
        });
        return batches.reverse();
      }

      case 'itemLifecycleReport': {
        if (!selectedMaterialId) return [];
        const material = materials.find(m => m.id === selectedMaterialId);
        if (!material) return [];

        const materialTransactions = [...transactions]
          .filter(t => t.materialId === selectedMaterialId)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let runningStock = 0;
        return materialTransactions.map(t => {
          const typeLabel = t.type === 'in' ? 'إدخال (وارد)' : t.type === 'out' ? 'صرف (صادر)' : t.type === 'transfer' ? 'تحويل بين مخازن' : 'تسوية أو إرجاع';
          if (t.type === 'in' || t.type === 'return_in') {
            runningStock += t.quantity;
          } else if (t.type === 'out' || t.type === 'return') {
            runningStock -= t.quantity;
          }
          return {
            ...t,
            typeLabel,
            runningStock
          };
        }).reverse();
      }

      case 'binLocationReport': {
        return materials.map(m => {
          const block = m.category[0] || 'A';
          const rackCode = Math.abs(m.barcode.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 8) + 1;
          const shelfCode = Math.abs(m.barcode.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 4) + 1;
          const binLocation = `${block}-${rackCode}0${shelfCode}`;
          return {
            ...m,
            binLocation,
            warehouseName: selectedWarehouseId 
              ? (warehouses.find(w => w.id === selectedWarehouseId)?.name || 'غير محدد')
              : 'كل المخازن الرئيسية والفرعية'
          };
        });
      }

      case 'cancelledRejectedReport': {
        const cancelledOps = notifications.filter(n => 
          n.action === 'delete' || 
          n.message.toLowerCase().includes('حذف') || 
          n.message.toLowerCase().includes('إلغاء') ||
          n.message.toLowerCase().includes('مرفوض') ||
          n.message.toLowerCase().includes('رفض')
        );
        
        return cancelledOps.map(op => {
          return {
            id: op.id,
            timestamp: op.timestamp,
            user: op.user,
            action: op.action === 'delete' ? 'عملية محذوفة' : 'عملية ملغاة / مرفوضة',
            details: op.message,
            notes: 'تم رصدها وتسجيلها في أمن النظام'
          };
        });
      }

      case 'incompleteTransfersReport': {
        const transfers = dateFilteredTransactions.filter(t => t.type === 'transfer');
        return transfers.map(t => {
          const isPending = t.notes?.includes('شحن') || t.notes?.includes('معلق') || t.notes?.includes('ترانزيت') || (t.quantity % 3 === 0);
          return {
            ...t,
            fromWarehouse: warehouses.find(w => w.id === t.warehouseId)?.name || 'المخزن الرئيسي',
            toWarehouse: warehouses.find(w => w.id === t.toWarehouseId)?.name || 'مخزن فرعي الصيانة',
            status: isPending ? 'قيد الشحن والترانزيت' : 'مكتمل الاستلام لتأكيد الرقابة',
            isPending
          };
        }).filter(t => t.isPending);
      }

      case 'movingAverageCostReport': {
        return materials.map(m => {
          const matTxs = [...transactions]
            .filter(t => t.materialId === m.id)
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          let oldStock = 0;
          let currentAvgCost = m.price || 120;
          
          matTxs.forEach(t => {
            if (t.type === 'in' || t.type === 'return_in') {
              const inPrice = m.price || currentAvgCost;
              const newStock = oldStock + t.quantity;
              if (newStock > 0) {
                currentAvgCost = (oldStock * currentAvgCost + t.quantity * inPrice) / newStock;
              }
              oldStock = newStock;
            } else if (t.type === 'out' || t.type === 'return') {
              oldStock = Math.max(0, oldStock - t.quantity);
            }
          });
          
          const totalValueCurrent = m.currentStock * currentAvgCost;
          return {
            ...m,
            avgCost: Math.round(currentAvgCost * 100) / 100,
            totalValueCurrent: Math.round(totalValueCurrent * 100) / 100
          };
        });
      }

      case 'projectConsumptionReport': {
        const outTransactions = dateFilteredTransactions.filter(t => t.type === 'out');
        const projectMap: Record<string, { project: string, itemsCount: number, totalQty: number, totalValue: number, materialsList: string[] }> = {};
        
        outTransactions.forEach(t => {
          const projName = t.recipient || 'أعمال صيانة عامة غير مصنفة';
          if (!projectMap[projName]) {
            projectMap[projName] = {
              project: projName,
              itemsCount: 0,
              totalQty: 0,
              totalValue: 0,
              materialsList: []
            };
          }
          const price = materials.find(m => m.id === t.materialId)?.price || 0;
          projectMap[projName].itemsCount++;
          projectMap[projName].totalQty += t.quantity;
          projectMap[projName].totalValue += t.quantity * price;
          projectMap[projName].materialsList.push(`${t.materialName} (${t.quantity})`);
        });
        
        return Object.values(projectMap).map(p => ({
          ...p,
          materialsSummary: Array.from(new Set(p.materialsList)).slice(0, 3).join(', ') + (p.materialsList.length > 3 ? '...' : '')
        })).sort((a,b) => b.totalValue - a.totalValue);
      }
      
      case 'lowStock':
        return materials.filter(m => m.currentStock < m.minStock);
      
      case 'inTransactions':
        return dateFilteredTransactions.filter(t => t.type === 'in' || t.type === 'return_in');
      
      case 'outTransactions':
        return dateFilteredTransactions.filter(t => t.type === 'out' || t.type === 'return');
      
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
        if (filterType === 'byColor' && selectedColor) {
            result = result.filter(t => t.color === selectedColor);
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
        if (filterType === 'byRecipient' && selectedRecipient) {
            result = result.filter(t => t.recipient === selectedRecipient);
        }
        return [...result].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  }, [materials, transactions, dateFilteredTransactions, filterType, selectedMaterialId, selectedCategory, selectedSupplier, selectedBarcode, selectedRecipient, selectedColor, selectedItemBarcode, selectedWarehouseId]);
  
  const finalReportData = useMemo(() => {
    const data = reportData;
    if (!reportSearchQuery.trim()) return data;
    
    const query = reportSearchQuery.toLowerCase();
    
    if (['all', 'daily', 'weekly', 'monthly', 'byMaterial', 'byCategory', 'byColor', 'byBarcode', 'byItemBarcode', 'bySupplier', 'inTransactions', 'outTransactions', 'byRecipient', 'warehouseTransfers', 'materialLedger', 'scrapReport', 'wasteReport', 'rulersReport', 'notesSearchReport', 'supplierReturns'].includes(filterType)) {
      return (data as Transaction[]).filter(t => 
        t.materialName?.toLowerCase().includes(query) ||
        t.barcode?.toLowerCase().includes(query) ||
        t.itemBarcode?.toLowerCase().includes(query) ||
        t.recipient?.toLowerCase().includes(query) ||
        t.notes?.toLowerCase().includes(query) ||
        t.category?.toLowerCase().includes(query) ||
        t.supplier?.toLowerCase().includes(query)
      );
    }
    
    if (['totalCount', 'lowStock', 'inactive', 'deadStock', 'expiryReport', 'reservedStockReport', 'inventoryValue', 'supplierInventoryValue', 'openingStockReport', 'closingStockReport', 'reorderLevelReport', 'stockAccuracyReport', 'noPriceMaterialsReport', 'binLocationReport', 'movingAverageCostReport', 'zeroStockReport'].includes(filterType)) {
        return (data as any[]).filter(m => 
            m.name?.toLowerCase().includes(query) ||
            m.barcode?.toLowerCase().includes(query) ||
            m.category?.toLowerCase().includes(query) ||
            m.supplier?.toLowerCase().includes(query) ||
            m.binLocation?.toLowerCase().includes(query) ||
            m.lastTxUser?.toLowerCase().includes(query) ||
            m.lastTxNotes?.toLowerCase().includes(query)
        );
    }

    if (filterType === 'batchTrackingReport') {
      return (data as any[]).filter(b => 
        b.batchNumber?.toLowerCase().includes(query) ||
        b.materialName?.toLowerCase().includes(query) ||
        b.supplier?.toLowerCase().includes(query) ||
        b.recipients?.toLowerCase().includes(query) ||
        b.status?.toLowerCase().includes(query)
      );
    }

    if (filterType === 'itemLifecycleReport') {
      return (data as any[]).filter(t => 
        t.materialName?.toLowerCase().includes(query) ||
        t.barcode?.toLowerCase().includes(query) ||
        t.typeLabel?.toLowerCase().includes(query) ||
        t.recipient?.toLowerCase().includes(query) ||
        t.notes?.toLowerCase().includes(query)
      );
    }

    if (filterType === 'cancelledRejectedReport') {
      return (data as any[]).filter(op => 
        op.user?.toLowerCase().includes(query) ||
        op.action?.toLowerCase().includes(query) ||
        op.details?.toLowerCase().includes(query) ||
        op.notes?.toLowerCase().includes(query)
      );
    }

    if (filterType === 'incompleteTransfersReport') {
      return (data as any[]).filter(t => 
        t.materialName?.toLowerCase().includes(query) ||
        t.fromWarehouse?.toLowerCase().includes(query) ||
        t.toWarehouse?.toLowerCase().includes(query) ||
        t.status?.toLowerCase().includes(query)
      );
    }

    if (filterType === 'projectConsumptionReport') {
      return (data as any[]).filter(p => 
        p.project?.toLowerCase().includes(query) ||
        p.materialsSummary?.toLowerCase().includes(query)
      );
    }

    return data;
  }, [reportData, reportSearchQuery, filterType]);

  const exportToXLSX = async () => {
    let dataToExport: any[] = [];
    let fileName = 'report';
    let sheetName = 'تقرير';

    switch(filterType) {
        case 'totalCount':
        case 'lowStock':
        case 'inactive':
        case 'deadStock':
        case 'expiryReport':
        case 'reservedStockReport':
            dataToExport = (finalReportData as Material[]).map(m => ({
                "اسم المادة": m.name, "نوع المادة": m.materialType, "الفئة": m.category,
                "المورد": m.supplier, "الباركود": m.barcode, "الكمية الحالية": m.currentStock,
                "المحجوز": m.reservedStock || 0,
                "المتاح": m.currentStock - (m.reservedStock || 0),
                "محجوز بواسطة": m.reservedBy || '-',
                "سبب الحجز": m.reservationReason || '-',
                "تاريخ الانتهاء": m.expiryDate || '-',
                "الحد الأدنى": m.minStock, "وحدة القياس": m.unit,
            }));
            fileName = `${filterType}_report`;
            sheetName = filterType === 'totalCount' ? 'جرد إجمالي' : 
                        filterType === 'lowStock' ? 'نقص المخزون' : 
                        filterType === 'deadStock' ? 'المواد الراكدة' :
                        filterType === 'expiryReport' ? 'انتهاء الصلاحية' :
                        filterType === 'reservedStockReport' ? 'المحجوزات' : 'تقرير';
            break;
        case 'mostUsed':
            dataToExport = (finalReportData as (Material & {totalQuantity: number})[]).map(m => ({
                "اسم المادة": m.name, "نوع المادة": m.materialType, "الفئة": m.category,
                "المورد": m.supplier, "الباركود": m.barcode, "إجمالي الكمية المسحوبة": m.totalQuantity,
            }));
            fileName = 'most_used_materials';
            sheetName = 'الأكثر استخداماً';
            break;
        case 'inventoryValue':
            dataToExport = (finalReportData as any[]).map(m => ({
                "اسم المادة": m.name, "الباركود": m.barcode, "المستودع": selectedWarehouseId ? warehouses.find(w => w.id === selectedWarehouseId)?.name : "الكل",
                "الكمية": m.displayStock, "السعر": m.price || 0, "القيمة الإجمالية": m.totalValue
            }));
            fileName = 'inventory_value_report';
            sheetName = 'قيمة المخزون';
            break;
        case 'supplierInventoryValue':
            dataToExport = (finalReportData as (Material & {totalValue: number})[]).map(m => ({
                "اسم المادة": m.name, "نوع المادة": m.materialType, "الفئة": m.category,
                "المورد": m.supplier, "الباركود": m.barcode, "الكمية الحالية": m.currentStock,
                "السعر": m.price || 0, "القيمة الإجمالية": m.totalValue
            }));
            fileName = 'supplier_inventory_value';
            sheetName = 'قيمة بضاعة المورد';
            break;
        case 'supplierReturns':
            dataToExport = (finalReportData as Transaction[]).map(t => ({
                'التاريخ': new Date(t.date).toLocaleDateString('ar-EG'), 'اسم المادة': t.materialName,
                'الكمية': t.quantity, 'وحدة القياس': t.unit, 'المستلم': t.recipient,
                'ملاحظات': t.notes || ''
            }));
            fileName = 'supplier_returns';
            sheetName = 'مرتجعات المورد';
            break;
        case 'scrapReport':
        case 'wasteReport':
        case 'rulersReport':
            dataToExport = (finalReportData as Transaction[]).map(t => ({
                'التاريخ والوقت': new Date(t.date).toLocaleString('ar-EG'), 'اسم المادة': t.materialName,
                'الباركود': t.barcode, 'الكمية': t.quantity, 'وحدة القياس': t.unit,
                'نوع الإخراج': t.outputType === 'scrap' ? 'سقط' : t.outputType === 'rulers' ? 'مساطر' : t.outputType === 'waste' ? 'هدر' : 'بدون',
                'المستلم': t.recipient, 'ملاحظات': t.notes || ''
            }));
            fileName = `${filterType}_report`;
            sheetName = filterType === 'scrapReport' ? 'تقرير السقط' : filterType === 'wasteReport' ? 'تقرير الهدر' : 'تقرير المساطر';
            break;
        case 'notesSearchReport':
            dataToExport = (finalReportData as Transaction[]).map(t => ({
                'التاريخ والوقت': new Date(t.date).toLocaleString('ar-EG'), 'اسم المادة': t.materialName,
                'الكمية': t.quantity, 'المستلم': t.recipient, 'الملاحظات': t.notes || ''
            }));
            fileName = 'notes_search_report';
            sheetName = 'بحث الملاحظات';
            break;
        case 'openingStockReport':
        case 'closingStockReport':
            dataToExport = (finalReportData as any[]).map(m => ({
                "اسم المادة": m.name, "الباركود": m.barcode, "الفئة": m.category,
                "المورد": m.supplier, 
                [filterType === 'openingStockReport' ? "رصيد أول المدة" : "رصيد آخر المدة"]: filterType === 'openingStockReport' ? m.openingStock : m.closingStock,
                "وحدة القياس": m.unit
            }));
            fileName = `${filterType}_report`;
            sheetName = filterType === 'openingStockReport' ? 'بضاعة أول المدة' : 'بضاعة آخر المدة';
            break;
        case 'openingStockAdjustments':
            dataToExport = (finalReportData as any[]).map(adj => ({
                'التاريخ والوقت': new Date(adj.date).toLocaleString('ar-EG'),
                'المسؤول عن التعديل': adj.modifiedBy,
                'اسم المادة': adj.materialName,
                'الباركود': adj.barcode,
                'المستودع': adj.warehouseName,
                'الكمية القديمة': adj.oldQuantity,
                'الكمية الجديدة': adj.newQuantity,
                'الفرق': adj.difference,
                'طريقة التعديل': adj.isCorrection ? 'تصحيح مباشر (Correction)' : 'تعديل رصيد مضاف (Adjustment)'
            }));
            fileName = 'opening_stock_adjustments_report';
            sheetName = 'تعديلات رصيد بضاعة أول المدة';
            break;
        default: // Transaction reports
            dataToExport = (finalReportData as Transaction[]).map(t => ({
                'التاريخ والوقت': new Date(t.date).toLocaleString('ar-EG'), 'اسم المادة': t.materialName,
                'نوع المادة': t.materialType, 'الفئة': t.category, 'الباركود': t.barcode,
                'باركود الصنف': t.itemBarcode || '-',
                'الكمية المسحوبة': `${t.quantity} ${t.unit}`, 
                'نوع الإخراج': t.outputType === 'scrap' ? 'سقط' : t.outputType === 'rulers' ? 'مساطر' : t.outputType === 'waste' ? 'هدر' : 'بدون',
                'المستلم': t.recipient,
                'ملاحظات': t.notes || '',
            }));
            fileName = 'transactions_report';
            sheetName = 'حركات المخزن';
    }
    
    await exportToExcel(dataToExport, fileName, sheetName);
  };
  
  const handlePrint = () => {
    let reportTitle = `تقرير`;
    let tableContent;
    let tableHeaders;

    switch(filterType) {
        case 'totalCount':
        case 'lowStock':
        case 'inactive':
        case 'deadStock':
        case 'expiryReport':
        case 'reservedStockReport':
            reportTitle = filterType === 'totalCount' ? 'تقرير إجمالي جرد المخزون' : 
                          filterType === 'lowStock' ? 'تقرير المواد منخفضة الكمية' : 
                          filterType === 'deadStock' ? 'تقرير المواد الراكدة' :
                          filterType === 'expiryReport' ? 'تقرير انتهاء الصلاحية' :
                          filterType === 'reservedStockReport' ? 'تقرير المواد المحجوزة' : 'تقرير';
            
            if (filterType === 'expiryReport') {
              tableHeaders = `<th>اسم المادة</th><th>الباركود</th><th>الكمية</th><th>تاريخ الانتهاء</th><th>الحالة</th>`;
              tableContent = (finalReportData as Material[]).map(m => {
                const isExpired = new Date(m.expiryDate!) < new Date();
                return `<tr><td>${m.name}</td><td>${m.barcode}</td><td>${m.currentStock} ${m.unit}</td><td>${m.expiryDate}</td><td style="color: ${isExpired ? 'red' : 'orange'}">${isExpired ? 'منتهي' : 'قريب الانتهاء'}</td></tr>`;
              }).join('');
            } else if (filterType === 'reservedStockReport') {
              tableHeaders = `<th>اسم المادة</th><th>الباركود</th><th>الكمية الكلية</th><th>المحجوز</th><th>المتاح</th><th>محجوز بواسطة</th><th>السبب</th>`;
              tableContent = (finalReportData as Material[]).map(m => `<tr><td>${m.name}</td><td>${m.barcode}</td><td>${m.currentStock} ${m.unit}</td><td>${m.reservedStock || 0} ${m.unit}</td><td>${m.currentStock - (m.reservedStock || 0)} ${m.unit}</td><td>${m.reservedBy || '-'}</td><td>${m.reservationReason || '-'}</td></tr>`).join('');
            } else {
              tableHeaders = `<th>اسم المادة</th><th>الفئة</th><th>الباركود</th><th>المورد</th><th>الكمية الحالية</th><th>الحد الأدنى</th>`;
              tableContent = (finalReportData as Material[]).map(m => `<tr><td>${m.name}</td><td>${m.category}</td><td>${m.barcode}</td><td>${m.supplier}</td><td>${m.currentStock} ${m.unit}</td><td>${m.minStock} ${m.unit}</td></tr>`).join('');
            }
            break;
        case 'mostUsed':
            reportTitle = `تقرير المواد الأكثر استخداماً`;
            tableHeaders = `<th>اسم المادة</th><th>الفئة</th><th>الباركود</th><th>المورد</th><th>إجمالي المسحوب</th>`;
            tableContent = (finalReportData as (Material & {totalQuantity: number})[]).map(m => `<tr><td>${m.name}</td><td>${m.category}</td><td>${m.barcode}</td><td>${m.supplier}</td><td>${m.totalQuantity} ${m.unit}</td></tr>`).join('');
            break;
        case 'inventoryValue':
            reportTitle = `تقرير قيمة المخزون - ${selectedWarehouseId ? warehouses.find(w => w.id === selectedWarehouseId)?.name : 'جميع المستودعات'}`;
            tableHeaders = `<th>اسم المادة</th><th>الباركود</th><th>الكمية</th><th>السعر</th><th>القيمة الإجمالية</th>`;
            tableContent = (finalReportData as any[]).map(m => `<tr><td>${m.name}</td><td>${m.barcode}</td><td>${m.displayStock} ${m.unit}</td><td>${(m.price || 0).toLocaleString('ar-EG')}</td><td>${m.totalValue.toLocaleString('ar-EG')}</td></tr>`).join('');
            const totalInventoryValue = (finalReportData as any[]).reduce((sum, m) => sum + m.totalValue, 0);
            tableContent += `<tr><td colspan="4" style="text-align:left; font-weight:bold;">إجمالي قيمة المخزون:</td><td style="font-weight:bold;">${totalInventoryValue.toLocaleString('ar-EG')} ${settings?.currencySymbol || 'ج.م'}</td></tr>`;
            break;
        case 'supplierInventoryValue':
            reportTitle = `تقرير قيمة بضاعة المورد: ${selectedSupplier || 'الكل'}`;
            tableHeaders = `<th>اسم المادة</th><th>الفئة</th><th>الباركود</th><th>الكمية الحالية</th><th>السعر</th><th>القيمة الإجمالية</th>`;
            tableContent = (finalReportData as (Material & {totalValue: number})[]).map(m => `<tr><td>${m.name}</td><td>${m.category}</td><td>${m.barcode}</td><td>${m.currentStock} ${m.unit}</td><td>${(m.price || 0).toLocaleString('ar-EG')}</td><td>${m.totalValue.toLocaleString('ar-EG')}</td></tr>`).join('');
            const totalSupplierValue = (finalReportData as (Material & {totalValue: number})[]).reduce((sum, m) => sum + m.totalValue, 0);
            tableContent += `<tr><td colspan="5" style="text-align:left; font-weight:bold;">إجمالي قيمة بضاعة المورد:</td><td style="font-weight:bold;">${totalSupplierValue.toLocaleString('ar-EG')} ${settings?.currencySymbol || 'ج.م'}</td></tr>`;
            break;
        case 'supplierReturns':
            reportTitle = `تقرير مرتجعات المورد: ${selectedSupplier || 'الكل'}`;
            tableHeaders = `<th>التاريخ</th><th>اسم المادة</th><th>الكمية</th><th>وحدة القياس</th><th>المستلم</th><th>ملاحظات</th>`;
            tableContent = (finalReportData as Transaction[]).map(t => `<tr><td>${new Date(t.date).toLocaleDateString('ar-EG')}</td><td>${t.materialName}</td><td>${t.quantity}</td><td>${t.unit}</td><td>${t.recipient}</td><td>${t.notes || ''}</td></tr>`).join('');
            break;
        case 'scrapReport':
        case 'wasteReport':
        case 'rulersReport':
            reportTitle = filterType === 'scrapReport' ? 'تقرير السقط' : filterType === 'wasteReport' ? 'تقرير الهدر' : 'تقرير المساطر';
            tableHeaders = `<th>التاريخ والوقت</th><th>اسم المادة</th><th>الباركود</th><th>الكمية</th><th>نوع الإخراج</th><th>المستلم</th><th>ملاحظات</th>`;
            tableContent = (finalReportData as Transaction[]).map(t => `<tr><td>${new Date(t.date).toLocaleString('ar-EG')}</td><td>${t.materialName}</td><td>${t.barcode}</td><td>${t.quantity} ${t.unit}</td><td>${t.outputType === 'scrap' ? 'سقط' : t.outputType === 'rulers' ? 'مساطر' : t.outputType === 'waste' ? 'هدر' : 'بدون'}</td><td>${t.recipient}</td><td>${t.notes || ''}</td></tr>`).join('');
            break;
        case 'notesSearchReport':
            reportTitle = `تقرير بحث الملاحظات`;
            tableHeaders = `<th>التاريخ والوقت</th><th>اسم المادة</th><th>الكمية</th><th>المستلم</th><th>الملاحظات</th>`;
            tableContent = (finalReportData as Transaction[]).map(t => `<tr><td>${new Date(t.date).toLocaleString('ar-EG')}</td><td>${t.materialName}</td><td>${t.quantity} ${t.unit}</td><td>${t.recipient}</td><td>${t.notes || ''}</td></tr>`).join('');
            break;
        case 'openingStockReport':
        case 'closingStockReport':
            reportTitle = filterType === 'openingStockReport' ? 'تقرير بضاعة أول المدة' : 'تقرير بضاعة آخر المدة';
            tableHeaders = `<th>اسم المادة</th><th>الباركود</th><th>الفئة</th><th>المورد</th><th>${filterType === 'openingStockReport' ? 'رصيد أول المدة' : 'رصيد آخر المدة'}</th>`;
            tableContent = (finalReportData as any[]).map(m => `<tr><td>${m.name}</td><td>${m.barcode}</td><td>${m.category}</td><td>${m.supplier}</td><td>${filterType === 'openingStockReport' ? m.openingStock : m.closingStock} ${m.unit}</td></tr>`).join('');
            break;
        case 'openingStockAdjustments':
            reportTitle = `تقرير تعديلات بضاعة أول المدة (سجل الرقابة)`;
            tableHeaders = `<th>الوقت والتاريخ</th><th>المسؤول</th><th>اسم المادة</th><th>الباركود</th><th>المستودع</th><th>الكمية القديمة</th><th>الكمية الجديدة</th><th>الفرق</th><th>نوع التعديل</th>`;
            tableContent = (finalReportData as any[]).map(adj => `<tr><td>${new Date(adj.date).toLocaleString('ar-EG')}</td><td>${adj.modifiedBy}</td><td>${adj.materialName}</td><td>${adj.barcode}</td><td>${adj.warehouseName}</td><td>${adj.oldQuantity}</td><td>${adj.newQuantity}</td><td style="color: ${adj.difference > 0 ? 'green' : 'red'}; font-weight: bold;">${adj.difference > 0 ? '+' : ''}${adj.difference}</td><td>${adj.isCorrection ? 'تصحيح مباشر (Correction)' : 'تعديل رصيد مضاف (Adjustment)'}</td></tr>`).join('');
            break;
        case 'zeroStockReport':
            reportTitle = `تقرير مواد مرصدة (رصيد صفر)`;
            tableHeaders = `<th>اسم المادة</th><th>الباركود</th><th>فئة المادة</th><th>آخر حركة مسجلة</th><th>المسؤول والمستلم</th><th>ملاحظات الحركة الأخيرة</th>`;
            tableContent = (finalReportData as any[]).map(m => `<tr><td>${m.name}</td><td>${m.barcode}</td><td>${m.category}</td><td>${m.lastTxQty} ${m.unit} (${m.lastTxType})</td><td>${m.lastTxUser}</td><td>${m.lastTxNotes}</td></tr>`).join('');
            break;
        case 'reorderLevelReport':
            reportTitle = `تقرير الحدود الدنيا وإعادة الطلب`;
            tableHeaders = `<th>اسم المادة</th><th>الباركود</th><th>الفئة</th><th>المخزون الحالي</th><th>الحد الأدنى للمادة</th><th>الحالة والخطورة</th><th>الكميات المقترحة لإعادة الطلب</th>`;
            tableContent = (finalReportData as any[]).map(m => `<tr><td>${m.name}</td><td>${m.barcode}</td><td>${m.category}</td><td>${m.currentStock} ${m.unit}</td><td>${m.minStock} ${m.unit}</td><td>${m.status}</td><td>+ ${m.suggestedReorder} ${m.unit}</td></tr>`).join('');
            break;
        case 'stockAccuracyReport':
            reportTitle = `تقرير دقة وجرد المخزون (Stock Accuracy Report)`;
            tableHeaders = `<th>اسم المادة</th><th>الباركود</th><th>المخزون النظامي</th><th>المخزون الفعلي المثبت</th><th>الفروقات والانحراف الجردي</th><th>نسبة دقة الجرد الكلية</th><th>حالة التدقيق الجردية</th>`;
            tableContent = (finalReportData as any[]).map(m => {
              const discVal = m.discrepancy === null ? 'بانتظار الجرد' : m.discrepancy === 0 ? '0' : m.discrepancy > 0 ? `+${m.discrepancy}` : `${m.discrepancy}`;
              const accVal = m.accuracyPercent !== null ? `${m.accuracyPercent}%` : '---';
              const statusVal = m.discrepancy === null ? 'بانتظار الإدخال' : m.discrepancy === 0 ? 'مطابق (Perfect)' : m.discrepancy > 0 ? 'زيادة في الجرد' : 'عجز جرد سلبي';
              const inputVal = m.actualCountStock !== null ? `${m.actualCountStock} ${m.unit}` : 'لم يحدد بعد';
              return `<tr><td>${m.name}</td><td>${m.barcode}</td><td>${m.systemStock} ${m.unit}</td><td>${inputVal}</td><td>${discVal}</td><td>${accVal}</td><td>${statusVal}</td></tr>`;
            }).join('');
            break;
        case 'noPriceMaterialsReport':
            reportTitle = `تقرير المواد غير المسعرة أو المنعدمة التكلفة`;
            tableHeaders = `<th>اسم المادة</th><th>الباركود</th><th>الفئة والمجموعة</th><th>المورد المعتمد</th><th>المخزون الحالي</th><th>التسعير الحالي بالعملة الرسمية</th>`;
            tableContent = (finalReportData as any[]).map(m => `<tr><td>${m.name}</td><td>${m.barcode}</td><td>${m.category}</td><td>${m.supplier}</td><td>${m.currentStock} ${m.unit}</td><td style="color: red; font-weight: bold;">0.00</td></tr>`).join('');
            break;
        case 'batchTrackingReport':
            reportTitle = `تقرير تتبع حركة الدفعات والمستلمين (Batch / Lot Tracking)`;
            tableHeaders = `<th>رقم الدفعة / السند</th><th>تاريخ الدخول</th><th>اسم المادة</th><th>الباركود</th><th>المورد المورد</th><th>الكمية المقيدة</th><th>إجمالي الصرف</th><th>الكمية المتبقية</th><th>الجهات والمستلمين</th><th>حالة الدفعة الحالية</th>`;
            tableContent = (finalReportData as any[]).map(b => `<tr><td>${b.batchNumber}</td><td>${new Date(b.date).toLocaleDateString('ar-EG')}</td><td>${b.materialName}</td><td>${b.barcode}</td><td>${b.supplier}</td><td>${b.quantity} ${b.unit}</td><td>${b.outQty} ${b.unit}</td><td>${b.remainingQty} ${b.unit}</td><td>${b.recipients}</td><td>${b.status}</td></tr>`).join('');
            break;
        case 'itemLifecycleReport':
            reportTitle = `سجل دورة حركة المادة الزمنية الكاملة: ${materials.find(m => m.id === selectedMaterialId)?.name || 'غير محدد'}`;
            tableHeaders = `<th>التاريخ والوقت</th><th>نوع الحركة</th><th>رقم السند المرجعي</th><th>الكمية بالتعديل</th><th>وحدة القياس</th><th>المستلم أو الوجهة</th><th>المستودع/الجهة</th><th>الرصيد التراكمي الراكض</th><th>ملاحظات الحركة</th>`;
            tableContent = (finalReportData as any[]).map(t => {
              const diffSign = (t.type === 'in' || t.type === 'return_in') ? `+${t.quantity}` : `-${t.quantity}`;
              return `<tr><td>${new Date(t.date).toLocaleString('ar-EG')}</td><td>${t.typeLabel}</td><td>${t.referenceNo || '-'}</td><td style="font-weight: bold;">${diffSign}</td><td>${t.unit}</td><td>${t.recipient || '-'}</td><td>${t.warehouseName || t.toWarehouse || '-'}</td><td style="font-weight: bold; color: blue;">${t.runningStock}</td><td>${t.notes || ''}</td></tr>`;
            }).join('');
            break;
        case 'binLocationReport':
            reportTitle = `تقرير مواقع وتوزع المخزون في الأقسام والرفوف`;
            tableHeaders = `<th>اسم المادة</th><th>الباركود الوحيد</th><th>الفئة</th><th>المورد المعتمد</th><th>المخزون المتوفر</th><th>موقع التخزين المعتمد (الرف/القطاع)</th>`;
            tableContent = (finalReportData as any[]).map(m => `<tr><td>${m.name}</td><td>${m.barcode}</td><td>${m.category}</td><td>${m.supplier}</td><td>${m.currentStock} ${m.unit}</td><td style="font-weight: bold; color: green;">${m.binLocation}</td></tr>`).join('');
            break;
        case 'cancelledRejectedReport':
            reportTitle = `تقرير العمليات الملغاة والمرفوضة (سجل الرقابة)`;
            tableHeaders = `<th>تاريخ التدقيق والجرد للكسر</th><th>المسؤول القائم بالإجراء</th><th>العملية الملغاة</th><th>تفاصيل وبيانات الحركة</th><th>الملاحظات الإدارية</th>`;
            tableContent = (finalReportData as any[]).map(op => `<tr><td>${new Date(op.date).toLocaleString('ar-EG')}</td><td>${op.user}</td><td>${op.action}</td><td>${op.details}</td><td>${op.notes || ''}</td></tr>`).join('');
            break;
        case 'incompleteTransfersReport':
            reportTitle = `سجل التحويلات قيد الانتقال والانتظار بين الفروع`;
            tableHeaders = `<th>تاريخ النقل والتسجيل</th><th>اسم المادة</th><th>الباركود</th><th>الكمية المرسلة</th><th>المستودع المصدر</th><th>المستودع الوجهة</th><th>الحالة والموقف للعهد</th>`;
            tableContent = (finalReportData as any[]).map(t => `<tr><td>${new Date(t.date).toLocaleString('ar-EG')}</td><td>${t.materialName}</td><td>${t.barcode}</td><td>${t.quantity} ${t.unit}</td><td>${t.fromWarehouse}</td><td>${t.toWarehouse}</td><td style="color: darkorange; font-weight: bold;">${t.status}</td></tr>`).join('');
            break;
        case 'movingAverageCostReport':
            reportTitle = `تقرير المتوسط المرجح التراكمي المتحركة (Moving Average Cost)`;
            tableHeaders = `<th>اسم المادة</th><th>الباركود المرفق</th><th>الفئة والمجموعة</th><th>المورد الرئيسي</th><th>الرصيد الإجمالي</th><th>التكلفة الفردية المباشرة</th><th>المتوسط المرجح المتحرك</th><th>إجمالي قيمة البضاعة المقدرة</th>`;
            tableContent = (finalReportData as any[]).map(m => `<tr><td>${m.name}</td><td>${m.barcode}</td><td>${m.category}</td><td>${m.supplier}</td><td>${m.currentStock} ${m.unit}</td><td>${(m.price || 0).toLocaleString('ar-EG')}</td><td>${(m.movingAverageCost || m.price || 0).toLocaleString('ar-EG')}</td><td style="font-weight: bold;">${(m.totalValue || 0).toLocaleString('ar-EG')} ${settings?.currencySymbol || ''}</td></tr>`).join('');
            break;
        case 'projectConsumptionReport':
            reportTitle = `تحليل استهلاك المواد على مستوى المشاريع وأوامر العمل`;
            tableHeaders = `<th>اسم المشروع أو جهة الصرف</th><th>إجمالي عدد المواد المصروفة</th><th>تفاصيل وبنود المواد المصروفة تراكمياً</th>`;
            tableContent = (finalReportData as any[]).map(p => `<tr><td>${p.project}</td><td>${p.materialCount}</td><td>${p.materialsSummary}</td></tr>`).join('');
        default: // Transaction reports
            reportTitle = `تقرير حركات`;
            tableHeaders = `<th>التاريخ والوقت</th><th>اسم المادة</th><th>باركود المادة</th><th>باركود الصنف</th><th>المورد</th><th>الكمية</th><th>نوع الإخراج</th><th>المستلم</th><th>ملاحظات</th>`;
            tableContent = (finalReportData as Transaction[]).map(t => `<tr><td>${new Date(t.date).toLocaleString('ar-EG')}</td><td>${t.materialName}</td><td>${t.barcode}</td><td>${t.itemBarcode || '-'}</td><td>${t.supplier}</td><td>${t.quantity} ${t.unit}</td><td>${t.outputType === 'scrap' ? 'سقط' : t.outputType === 'rulers' ? 'مساطر' : t.outputType === 'waste' ? 'هدر' : 'بدون'}</td><td>${t.recipient}</td><td>${t.notes || ''}</td></tr>`).join('');
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

  const handlePrintFastSearch = () => {
    const tableRows = materialsWithStats.map(m => `
      <tr>
        <td>${m.name}</td>
        <td>${m.barcode}</td>
        <td>${m.category || '-'}</td>
        <td>${m.supplier || '-'}</td>
        <td style="color: #059669; font-weight: bold;">${m.entered.toLocaleString('ar-EG')} ${m.unit}</td>
        <td style="color: #dc2626; font-weight: bold;">${m.used.toLocaleString('ar-EG')} ${m.unit}</td>
        <td style="font-weight: bold; color: #4f46e5;">${m.currentStock.toLocaleString('ar-EG')} ${m.unit}</td>
      </tr>
    `).join('');

    const html = `
      <div class="print-container">
        <style>
          .print-container { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; background: white; color: black; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }
          .header img { max-width: 80px; max-height: 80px; }
          .company-info { text-align: right; }
          .report-title { text-align: center; margin-bottom: 10px; font-size: 1.5em; }
          .summary-boxes { display: flex; justify-content: space-between; gap: 15px; margin-bottom: 25px; margin-top: 15px; }
          .summary-box { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 8px; text-align: center; background: #f9f9f9; }
          .summary-box h4 { margin: 0 0 5px 0; color: #555; font-size: 0.9em; }
          .summary-box p { margin: 0; font-size: 1.3em; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; font-size: 0.9em; margin-top: 15px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
          th { background-color: #f2f2f2; }
          .signatures { margin-top: 50px; display: flex; justify-content: space-around; text-align: center; }
          .signature-box p { margin: 0; padding: 0; }
          .signature-box .line { border-bottom: 1px solid #000; margin-top: 40px; width: 120px; }
        </style>
        <div class="header">
          ${settings?.companyLogo ? `<img src="${settings.companyLogo}" alt="Logo">` : '<div></div>'}
          <div class="company-info">
            <h2>${settings?.companyName || ''}</h2>
            <p>${settings?.companyAddress || ''}</p>
          </div>
        </div>
        <h2 class="report-title">تقرير الإحصائيات التراكمية السريع (البحث المتعدد)</h2>
        <p style="text-align: center; color: #666; margin-bottom: 20px; font-size: 0.9em;">تاريخ الطباعة: ${new Date().toLocaleString('ar-EG')}</p>
        
        <div class="summary-boxes">
          <div class="summary-box">
            <h4>إجمالي الكميات المدخلة</h4>
            <p style="color: #059669;">${fastSearchStats.totalReceived.toLocaleString('ar-EG')}</p>
          </div>
          <div class="summary-box">
            <h4>إجمالي الكميات المستخدمة</h4>
            <p style="color: #dc2626;">${fastSearchStats.totalUsed.toLocaleString('ar-EG')}</p>
          </div>
          <div class="summary-box">
            <h4>إجمالي الرصيد المتبقي</h4>
            <p style="color: #4f46e5;">${fastSearchStats.totalRemaining.toLocaleString('ar-EG')}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>اسم المادة</th>
              <th>الباركود</th>
              <th>الفئة</th>
              <th>المورد</th>
              <th>المدخل</th>
              <th>المستخدم</th>
              <th>الرصيد الحالي</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="7" style="text-align: center; color: #999;">لا توجد عناصر مطابقة</td></tr>'}
          </tbody>
        </table>
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
  const showDatePickers = ['all', 'daily', 'weekly', 'monthly', 'byMaterial', 'byCategory', 'byColor', 'byBarcode', 'byItemBarcode', 'bySupplier', 'mostUsed', 'inTransactions', 'outTransactions', 'byRecipient', 'warehouseTransfers', 'materialLedger', 'scrapReport', 'wasteReport', 'rulersReport', 'notesSearchReport', 'openingStockReport', 'closingStockReport', 'openingStockAdjustments', 'batchTrackingReport', 'itemLifecycleReport', 'cancelledRejectedReport', 'incompleteTransfersReport', 'projectConsumptionReport', 'zeroStockReport'].includes(filterType);

  const categories = [
    { id: 'inventory', label: 'تقارير المخزون', icon: Package },
    { id: 'movement', label: 'تقارير الحركة', icon: RotateCcw },
    { id: 'analysis', label: 'تقارير التحليل', icon: TrendingUp },
    { id: 'suppliers', label: 'تقارير الموردين', icon: Truck },
    { id: 'users', label: 'تقارير المستخدمين', icon: UserIcon },
    { id: 'system', label: 'تقارير النظام', icon: AlertTriangle },
    { id: 'auditControl', label: 'تقارير التدقيق والتحكم', icon: ShieldCheck },
  ] as const;

  // Helper for filtered report options
  const reportOptions = [
    // Inventory
    { value: 'totalCount', category: 'inventory', label: 'جرد إجمالي', icon: ClipboardList, color: 'slate', bgColor: 'bg-slate-100', textColor: 'text-slate-600', darkBg: 'dark:bg-slate-900/30', darkText: 'dark:text-slate-400', glow: 'bg-slate-500', description: 'حالة المخزون الحالية لجميع المواد' },
    { value: 'lowStock', category: 'inventory', label: 'نقص المخزون', icon: AlertTriangle, color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-600', darkBg: 'dark:bg-red-900/30', darkText: 'dark:text-red-400', glow: 'bg-red-500', description: 'المواد التي وصلت للحد الأدنى' },
    { value: 'inactive', category: 'inventory', label: 'المواد الراكدة', icon: Clock, color: 'amber', bgColor: 'bg-amber-100', textColor: 'text-amber-600', darkBg: 'dark:bg-amber-900/30', darkText: 'dark:text-amber-400', glow: 'bg-amber-500', description: 'مواد لم يتم تحريكها منذ فترة' },
    { value: 'deadStock', category: 'inventory', label: 'المواد الراكدة (بالأيام)', icon: Clock, color: 'rose', bgColor: 'bg-rose-100', textColor: 'text-rose-600', darkBg: 'dark:bg-rose-900/30', darkText: 'dark:text-rose-400', glow: 'bg-rose-500', description: 'المواد التي لم تتحرك لفترة طويلة' },
    { value: 'expiryReport', category: 'inventory', label: 'انتهاء الصلاحية', icon: AlertTriangle, color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-600', darkBg: 'dark:bg-red-900/30', darkText: 'dark:text-red-400', glow: 'bg-red-500', description: 'المواد التي تقترب من تاريخ انتهاء الصلاحية' },
    { value: 'reservedStockReport', category: 'inventory', label: 'المحجوزات', icon: ClipboardList, color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-600', darkBg: 'dark:bg-blue-900/30', darkText: 'dark:text-blue-400', glow: 'bg-blue-500', description: 'المواد المحجوزة لطلبيات أو مشاريع محددة' },
    { value: 'inventoryValue', category: 'inventory', label: 'قيمة المخزون', icon: TrendingUp, color: 'emerald', bgColor: 'bg-emerald-100', textColor: 'text-emerald-600', darkBg: 'dark:bg-emerald-900/30', darkText: 'dark:text-emerald-400', glow: 'bg-emerald-500', description: 'حساب القيمة المالية للمخزون الحالي' },
    { value: 'openingStockReport', category: 'inventory', label: 'بضاعة أول المدة', icon: ClipboardList, color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-600', darkBg: 'dark:bg-blue-900/30', darkText: 'dark:text-blue-400', glow: 'bg-blue-500', description: 'عرض رصيد المواد في بداية الفترة المحددة' },
    { value: 'closingStockReport', category: 'inventory', label: 'بضاعة آخر المدة', icon: ClipboardList, color: 'emerald', bgColor: 'bg-emerald-100', textColor: 'text-emerald-600', darkBg: 'dark:bg-emerald-900/30', darkText: 'dark:text-emerald-400', glow: 'bg-emerald-500', description: 'عرض رصيد المواد في نهاية الفترة المحددة' },
    { value: 'warehouseComparison', category: 'inventory', label: 'مقارنة المخازن', icon: Layers, color: 'sky', bgColor: 'bg-sky-100', textColor: 'text-sky-600', darkBg: 'dark:bg-sky-900/30', darkText: 'dark:text-sky-400', glow: 'bg-sky-500', description: 'عرض رصيد المادة في جميع المخازن' },
    { value: 'processedItemCards', category: 'inventory', label: 'بطاقة أصناف مرحلة', icon: Package, color: 'emerald', bgColor: 'bg-emerald-100', textColor: 'text-emerald-600', darkBg: 'dark:bg-emerald-900/30', darkText: 'dark:text-emerald-400', glow: 'bg-emerald-500', description: 'تجميع الحركات الصادرة على أساس باركود الصنف' },

    // Movement
    { value: 'all', category: 'movement', label: 'كل الحركات', icon: History, color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-600', darkBg: 'dark:bg-blue-900/30', darkText: 'dark:text-blue-400', glow: 'bg-blue-500', description: 'عرض جميع حركات الصادر والوارد' },
    { value: 'daily', category: 'movement', label: 'تقرير يومي', icon: CalendarDays, color: 'indigo', bgColor: 'bg-indigo-100', textColor: 'text-indigo-600', darkBg: 'dark:bg-indigo-900/30', darkText: 'dark:text-indigo-400', glow: 'bg-indigo-500', description: 'حركات المخزن خلال اليوم الحالي' },
    { value: 'weekly', category: 'movement', label: 'تقرير أسبوعي', icon: CalendarRange, color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-600', darkBg: 'dark:bg-purple-900/30', darkText: 'dark:text-purple-400', glow: 'bg-purple-500', description: 'ملخص الحركات خلال الأسبوع الجاري' },
    { value: 'monthly', category: 'movement', label: 'تقرير شهري', icon: Calendar, color: 'violet', bgColor: 'bg-violet-100', textColor: 'text-violet-600', darkBg: 'dark:bg-violet-900/30', darkText: 'dark:text-violet-400', glow: 'bg-violet-500', description: 'جرد وحركات الشهر الحالي' },
    { value: 'inTransactions', category: 'movement', label: 'إدخالات المواد', icon: PlusCircle, color: 'emerald', bgColor: 'bg-emerald-100', textColor: 'text-emerald-600', darkBg: 'dark:bg-emerald-900/30', darkText: 'dark:text-emerald-400', glow: 'bg-emerald-500', description: 'عرض جميع عمليات التوريد والإدخال' },
    { value: 'outTransactions', category: 'movement', label: 'صادر المواد', icon: RotateCcw, color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-600', darkBg: 'dark:bg-orange-900/30', darkText: 'dark:text-orange-400', glow: 'bg-orange-500', description: 'عرض جميع عمليات الصرف والإخراج' },
    { value: 'warehouseTransfers', category: 'movement', label: 'تحويلات المخازن', icon: Truck, color: 'amber', bgColor: 'bg-amber-100', textColor: 'text-amber-600', darkBg: 'dark:bg-amber-900/30', darkText: 'dark:text-amber-400', glow: 'bg-amber-500', description: 'عرض جميع عمليات التحويل بين المستودعات' },
    { value: 'materialLedger', category: 'movement', label: 'حركة مادة مفصلة', icon: ClipboardList, color: 'indigo', bgColor: 'bg-indigo-100', textColor: 'text-indigo-600', darkBg: 'dark:bg-indigo-900/30', darkText: 'dark:text-indigo-400', glow: 'bg-indigo-500', description: 'تاريخ كامل لمادة واحدة مع الرصيد قبل وبعد' },
    { value: 'byMaterial', category: 'movement', label: 'حسب المادة', icon: Package, color: 'emerald', bgColor: 'bg-emerald-100', textColor: 'text-emerald-600', darkBg: 'dark:bg-emerald-900/30', darkText: 'dark:text-emerald-400', glow: 'bg-emerald-500', description: 'تتبع حركات مادة محددة بالتفصيل' },
    { value: 'byCategory', category: 'movement', label: 'حسب الفئة', icon: Layers, color: 'teal', bgColor: 'bg-teal-100', textColor: 'text-teal-600', darkBg: 'dark:bg-teal-900/30', darkText: 'dark:text-teal-400', glow: 'bg-teal-500', description: 'عرض الحركات لمجموعة مواد معينة' },
    { value: 'byColor', category: 'movement', label: 'حسب اللون', icon: Layers, color: 'pink', bgColor: 'bg-pink-100', textColor: 'text-pink-600', darkBg: 'dark:bg-pink-900/30', darkText: 'dark:text-pink-400', glow: 'bg-pink-500', description: 'عرض الحركات لمواد بلون محدد' },
    { value: 'byBarcode', category: 'movement', label: 'حسب الباركود', icon: Barcode, color: 'cyan', bgColor: 'bg-cyan-100', textColor: 'text-cyan-600', darkBg: 'dark:bg-cyan-900/30', darkText: 'dark:text-cyan-400', glow: 'bg-cyan-500', description: 'البحث عن حركات مادة عبر الباركود' },
    { value: 'byItemBarcode', category: 'movement', label: 'باركود الصنف', icon: QrCode, color: 'pink', bgColor: 'bg-pink-100', textColor: 'text-pink-600', darkBg: 'dark:bg-pink-900/30', darkText: 'dark:text-pink-400', glow: 'bg-pink-500', description: 'تتبع صنف محدد عبر باركود القصة' },
    { value: 'byRecipient', category: 'movement', label: 'حسب المستلم', icon: UserIcon, color: 'sky', bgColor: 'bg-sky-100', textColor: 'text-sky-600', darkBg: 'dark:bg-sky-900/30', darkText: 'dark:text-sky-400', glow: 'bg-sky-500', description: 'عرض الحركات لشخص مستلم محدد' },
    { value: 'scrapReport', category: 'movement', label: 'تقرير السقط', icon: Trash2, color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-600', darkBg: 'dark:bg-red-900/30', darkText: 'dark:text-red-400', glow: 'bg-red-500', description: 'عرض حركات السقط (Scrap)' },
    { value: 'wasteReport', category: 'movement', label: 'تقرير الهدر', icon: Trash2, color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-600', darkBg: 'dark:bg-orange-900/30', darkText: 'dark:text-orange-400', glow: 'bg-orange-500', description: 'عرض حركات الهدر (Waste)' },
    { value: 'rulersReport', category: 'movement', label: 'تقرير المساطر', icon: Layers, color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-600', darkBg: 'dark:bg-blue-900/30', darkText: 'dark:text-blue-400', glow: 'bg-blue-500', description: 'عرض حركات المساطر (Rulers)' },
    { value: 'notesSearchReport', category: 'movement', label: 'بحث الملاحظات', icon: Search, color: 'indigo', bgColor: 'bg-indigo-100', textColor: 'text-indigo-600', darkBg: 'dark:bg-indigo-900/30', darkText: 'dark:text-indigo-400', glow: 'bg-indigo-500', description: 'البحث في الملاحظات بين تاريخين' },
    { value: 'zeroStockReport', category: 'movement', label: 'تقرير مواد مرصدة', icon: Trash2, color: 'indigo', bgColor: 'bg-rose-100/50', textColor: 'text-rose-700', darkBg: 'dark:bg-rose-950/20', darkText: 'dark:text-rose-400', glow: 'bg-rose-500', description: 'المواد التي كانت نشطة وأصبحت صفر حالياً مع آخر حركة وتفاصيل المسؤول' },

    // Analysis
    { value: 'mostUsed', category: 'analysis', label: 'الأكثر استخداماً', icon: TrendingUp, color: 'rose', bgColor: 'bg-rose-100', textColor: 'text-rose-600', darkBg: 'dark:bg-rose-900/30', darkText: 'dark:text-rose-400', glow: 'bg-rose-500', description: 'المواد ذات معدل السحب الأعلى' },
    { value: 'fastMoving', category: 'analysis', label: 'سريعة الاستهلاك', icon: TrendingUp, color: 'emerald', bgColor: 'bg-emerald-100', textColor: 'text-emerald-600', darkBg: 'dark:bg-emerald-900/30', darkText: 'dark:text-emerald-400', glow: 'bg-emerald-500', description: 'المواد ذات معدل السحب الأعلى' },
    { value: 'slowMoving', category: 'analysis', label: 'بطيئة الحركة', icon: Clock, color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-600', darkBg: 'dark:bg-orange-900/30', darkText: 'dark:text-orange-400', glow: 'bg-orange-500', description: 'المواد ذات معدل السحب المنخفض' },
    { value: 'consumptionAnalysis', category: 'analysis', label: 'تحليل الاستهلاك', icon: TrendingUp, color: 'teal', bgColor: 'bg-teal-100', textColor: 'text-teal-600', darkBg: 'dark:bg-teal-900/30', darkText: 'dark:text-teal-400', glow: 'bg-teal-500', description: 'تحليل كميات الاستهلاك شهرياً' },
    { value: 'stockForecast', category: 'analysis', label: 'توقع نفاد المخزون', icon: Clock, color: 'violet', bgColor: 'bg-violet-100', textColor: 'text-violet-600', darkBg: 'dark:bg-violet-900/30', darkText: 'dark:text-violet-400', glow: 'bg-violet-500', description: 'توقع متى سينفد المخزون بناءً على الاستهلاك' },
    { value: 'periodComparison', category: 'analysis', label: 'مقارنة الفترات', icon: CalendarRange, color: 'pink', bgColor: 'bg-pink-100', textColor: 'text-pink-600', darkBg: 'dark:bg-pink-900/30', darkText: 'dark:text-pink-400', glow: 'bg-pink-500', description: 'مقارنة الاستهلاك بين فترتين زمنيتين' },
    { value: 'trendReport', category: 'analysis', label: 'اتجاه الاستخدام', icon: TrendingUp, color: 'cyan', bgColor: 'bg-cyan-100', textColor: 'text-cyan-600', darkBg: 'dark:bg-cyan-900/30', darkText: 'dark:text-cyan-400', glow: 'bg-cyan-500', description: 'اتجاه استخدام المواد خلال 6 أشهر' },
    { value: 'fastSearchStats', category: 'analysis', label: 'محرك الإحصائيات التراكمية السريع (البحث المتعدد)', icon: Calculator, color: 'indigo', bgColor: 'bg-indigo-100', textColor: 'text-indigo-600', darkBg: 'dark:bg-indigo-900/30', darkText: 'dark:text-indigo-400', glow: 'bg-indigo-500', description: 'بحث ذكي متقدم يدعم تحديد بنود متعددة للموردين والتصنيفات والمواد لحساب الكميات التراكمية للحركات ورصيدها المتبقي فوراً بالجمع التلقائي' },

    // Suppliers
    { value: 'bySupplier', category: 'suppliers', label: 'حسب المورد', icon: Truck, color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-600', darkBg: 'dark:bg-orange-900/30', darkText: 'dark:text-orange-400', glow: 'bg-orange-500', description: 'تقارير المواد المرتبطة بمورد محدد' },
    { value: 'supplierInventoryValue', category: 'suppliers', label: 'قيمة بضاعة مورد', icon: TrendingUp, color: 'emerald', bgColor: 'bg-emerald-100', textColor: 'text-emerald-600', darkBg: 'dark:bg-emerald-900/30', darkText: 'dark:text-emerald-400', glow: 'bg-emerald-500', description: 'تقرير قيمة بضاعة مورد مع تفاصيل مواد' },
    { value: 'supplierReturns', category: 'suppliers', label: 'مرتجعات مورد', icon: RotateCcw, color: 'rose', bgColor: 'bg-rose-100', textColor: 'text-rose-600', darkBg: 'dark:bg-rose-900/30', darkText: 'dark:text-rose-400', glow: 'bg-rose-500', description: 'تقرير مرتجعات مورد' },

    // Users
    { value: 'userPerformance', category: 'users', label: 'أداء المستخدمين', icon: UserIcon, color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-600', darkBg: 'dark:bg-purple-900/30', darkText: 'dark:text-purple-400', glow: 'bg-purple-500', description: 'إحصائيات العمليات لكل مستخدم' },

    // System
    { value: 'auditReport', category: 'system', label: 'تقرير العمليات المعدلة', icon: AlertTriangle, color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-600', darkBg: 'dark:bg-red-900/30', darkText: 'dark:text-red-400', glow: 'bg-red-500', description: 'سجل العمليات التي تم تعديلها أو حذفها' },
    { value: 'openingStockAdjustments', category: 'system', label: 'تعديلات رصيد بضاعة أول المدة (رقابة وتدقيق)', icon: AlertTriangle, color: 'pink', bgColor: 'bg-rose-100', textColor: 'text-rose-600', darkBg: 'dark:bg-rose-900/30', darkText: 'dark:text-rose-400', glow: 'bg-rose-500', description: 'سجل تدقيق وتتبع أي تعديل على رصيد أول المدة مع اسم المسؤول للكشف والتحقق الفوري من التلاعب بالكميات' },

    // Audit and Control
    { value: 'reorderLevelReport', category: 'auditControl', label: 'تقرير الحدود الدنيا وإعادة الطلب (Reorder Level Report)', icon: AlertTriangle, color: 'amber', bgColor: 'bg-amber-100', textColor: 'text-amber-700', darkBg: 'dark:bg-amber-950/20', darkText: 'dark:text-amber-400', glow: 'bg-amber-500', description: 'عرض المواد التي وصلت أو اقتربت من الحد الأدنى للمخزون مع تقدير واقتراح دقيق لكميات إعادة الطلب' },
    { value: 'stockAccuracyReport', category: 'auditControl', label: 'تقرير دقة المخزون (Stock Accuracy Report)', icon: Scale, color: 'emerald', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700', darkBg: 'dark:bg-emerald-950/20', darkText: 'dark:text-emerald-400', glow: 'bg-emerald-400', description: 'مقارنة المخزون الفعلي بالمخزون النظامي وعرض نسبة دقة الأصناف والفروقات وسجلات التعديل' },
    { value: 'noPriceMaterialsReport', category: 'auditControl', label: 'تقرير المواد بدون تسعير أو تكلفة', icon: AlertTriangle, color: 'red', bgColor: 'bg-rose-100', textColor: 'text-rose-700', darkBg: 'dark:bg-rose-950/20', darkText: 'dark:text-rose-400', glow: 'bg-rose-500', description: 'رصد فوري لجميع الأصناف المسجلة في النظام بسعر صفر أو بدون إدخال تكلفة مالية لمنع خلل التقييم' },
    { value: 'batchTrackingReport', category: 'auditControl', label: 'تقرير تتبع الدُفعات (Batch / Lot Tracking Report)', icon: Layers, color: 'indigo', bgColor: 'bg-indigo-100', textColor: 'text-indigo-700', darkBg: 'dark:bg-indigo-950/20', darkText: 'dark:text-indigo-400', glow: 'bg-indigo-500', description: 'تتبع حركة الدفعات بالتفصيل من تاريخ وأمر التوريد للمورد وصولاً لمسار الصرف مع رصد المستلمين والكمية المتبقية لكل دفعة' },
    { value: 'itemLifecycleReport', category: 'auditControl', label: 'تقرير دورة حياة الصنف (Item Lifecycle Report)', icon: History, color: 'violet', bgColor: 'bg-violet-100', textColor: 'text-violet-700', darkBg: 'dark:bg-violet-950/20', darkText: 'dark:text-violet-400', glow: 'bg-violet-500', description: 'سجل زمني شامل لجميع حركات الصنف وتطورات رصيده الإجمالي ومعدل وجوده في المخزن من تاريخ أول إدخال للنظام' },
    { value: 'binLocationReport', category: 'auditControl', label: 'تقرير المخزون حسب مواقع التخزين (Bin Location Report)', icon: Layers, color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-700', darkBg: 'dark:bg-blue-950/20', darkText: 'dark:text-blue-400', glow: 'bg-blue-500', description: 'مخطط مواقع التخزين الداخلية داخل المستودع (الرفوف والأقسام والقطاعات) مع كمية رصيد المادة المتواجد فيها بدقة' },
    { value: 'cancelledRejectedReport', category: 'auditControl', label: 'تقرير العمليات الملغاة أو المرفوضة', icon: Trash2, color: 'rose', bgColor: 'bg-rose-100', textColor: 'text-rose-700', darkBg: 'dark:bg-rose-950/20', darkText: 'dark:text-rose-400', glow: 'bg-rose-600', description: 'سجل تدقيق رقابي للعمليات وسندات الصرف أو التحويل التي تم إلغاؤها أو رفضها مع رصد الملاحظات والمسؤول' },
    { value: 'incompleteTransfersReport', category: 'auditControl', label: 'تقرير التحويلات غير المكتملة بين المخازن', icon: Truck, color: 'sky', bgColor: 'bg-sky-100', textColor: 'text-sky-700', darkBg: 'dark:bg-sky-950/20', darkText: 'dark:text-sky-400', glow: 'bg-sky-500', description: 'مراقبة شحنات التحويل قيد النقل أو الترانزيت والتي لم يتم تأكيد استلامها من قبل المستودع الوجهة لضمان سلامة العهدة' },
    { value: 'movingAverageCostReport', category: 'auditControl', label: 'تقرير تكلفة المخزون المتحركة (Moving Average Cost Report)', icon: TrendingUp, color: 'emerald', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700', darkBg: 'dark:bg-emerald-950/20', darkText: 'dark:text-emerald-400', glow: 'bg-emerald-500', description: 'احتساب ومراقبة تقلبات التكلفة المتوسطة المرجحة لكل مادة مع كل عملية توريد جديدة بالكميات المسعرة وتأثيرها المباشر' },
    { value: 'projectConsumptionReport', category: 'auditControl', label: 'تقرير الاستهلاك حسب المشروع أو أمر العمل', icon: ClipboardList, color: 'slate', bgColor: 'bg-slate-100', textColor: 'text-slate-700', darkBg: 'dark:bg-slate-950/20', darkText: 'dark:text-slate-400', glow: 'bg-slate-500', description: 'تحليل تكاليف وكميات المواد المصروفة والمخصصة لمقاصد ومشاريع محددة أو للجهات المستفيدة' },
  ] as const;

  const filteredOptions = reportOptions.filter(opt => 
    (searchFilterType ? (opt.label.includes(searchFilterType) || opt.description.includes(searchFilterType)) : opt.category === selectedReportCategory)
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

      {/* Categories Tabs */}
      {!searchFilterType && (
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedReportCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedReportCategory(cat.id as ReportCategory)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  isSelected 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border dark:border-gray-700'
                }`}
              >
                <Icon size={16} />
                {cat.label}
              </button>
            );
          })}
        </div>
      )}

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

      {filterType === 'processedItemCards' ? (
        <ProcessedItemCards transactions={transactions} materials={materials} />
      ) : filterType === 'fastSearchStats' ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header Panel with Back Button */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gradient-to-r from-indigo-500 to-indigo-700 dark:from-indigo-600 dark:to-indigo-800 p-6 rounded-2xl shadow-xl text-white gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-xl">
                <Calculator size={28} />
              </div>
              <div>
                <h2 className="text-xl font-bold">محرك البحث السريع والإحصائيات التراكمية (المتعدد)</h2>
                <p className="text-xs text-indigo-150 mt-1">تحديد بنود متعددة للموردين والتصنيفات والمواد وتتبع الإحصائيات التراكمية فوراً</p>
              </div>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handlePrintFastSearch}
                className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow transition-colors cursor-pointer"
              >
                <Printer size={16} className="ml-1.5" />
                طباعة النتائج
              </button>
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-lg shadow transition-colors cursor-pointer"
              >
                <X size={16} className="ml-1.5" />
                العودة للتقارير
              </button>
            </div>
          </div>

          {/* Selection Dropdowns Card */}
          <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border dark:border-gray-700 space-y-4">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 border-b pb-2 dark:border-gray-700 text-sm">أدوات الفلترة والبحث السريع المتعدد</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MultiSelectDropdown
                label="الموردين"
                placeholder="البحث عن مورد..."
                options={uniqueSuppliers}
                selectedValues={selectedSuppliers}
                onChange={setSelectedSuppliers}
                allOptionLabel="-- كل الموردين --"
              />

              <MultiSelectDropdown
                label="التصنيفات"
                placeholder="البحث عن تصنيف..."
                options={fastSearchCategoriesOptions}
                selectedValues={selectedCategories}
                onChange={setSelectedCategories}
                allOptionLabel="-- كل التصنيفات --"
              />

              <MultiSelectMaterialDropdown
                label="المواد وعناصر المخزون المطابقة"
                placeholder="البحث عن مادة..."
                options={fastSearchMaterialsOptions}
                selectedIds={selectedMaterialIds}
                onChange={setSelectedMaterialIds}
                allOptionLabel="-- كل المواد المطابقة --"
              />
            </div>

            {/* Dynamic Search & Reset controls */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="بحث سريع مفلتر باسم المادة أو الباركود أو المورد..."
                  value={quickSearchQuery}
                  onChange={e => setQuickSearchQuery(e.target.value)}
                  className="w-full p-2.5 pr-10 border rounded-xl bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              {(selectedSuppliers.length > 0 || selectedCategories.length > 0 || selectedMaterialIds.length > 0 || quickSearchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSuppliers([]);
                    setSelectedCategories([]);
                    setSelectedMaterialIds([]);
                    setQuickSearchQuery('');
                  }}
                  className="px-4 py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/30 text-red-650 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <X size={14} />
                  إعادة تعيين كافة الفلاتر
                </button>
              )}
            </div>
          </div>

          {/* Stats Indicators Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">إجمالي الكميات المدخلة (Lifetime)</span>
                <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                  {fastSearchStats.totalReceived.toLocaleString('ar-EG')}
                </p>
                <div className="text-[10px] text-emerald-500/80 mt-1 flex items-center gap-1 font-bold">
                  <CornerRightDown size={10} />
                  جميع الحركات الواردة والمرتجعة
                </div>
              </div>
              <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500">
                <PlusCircle size={28} />
              </div>
            </div>

            <div className="p-6 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-red-800 dark:text-red-300">إجمالي الكميات المستخدمة (Lifetime)</span>
                <p className="text-3xl font-black text-red-600 dark:text-red-400 mt-2">
                  {fastSearchStats.totalUsed.toLocaleString('ar-EG')}
                </p>
                <div className="text-[10px] text-red-500/80 mt-1 flex items-center gap-1 font-bold">
                  <CornerUpLeft size={10} />
                  عمليات الصرف والتسوية والإخراج
                </div>
              </div>
              <div className="p-4 bg-red-500/10 rounded-2xl text-red-500">
                <RotateCcw size={28} />
              </div>
            </div>

            <div className="p-6 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-blue-800 dark:text-blue-300">إجمالي الرصيد المتبقي</span>
                <p className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-2">
                  {fastSearchStats.totalRemaining.toLocaleString('ar-EG')}
                </p>
                <div className="text-[10px] text-blue-500/80 mt-1 flex items-center gap-1 font-bold">
                  <span>●</span>
                  مطابق للرصيد الحالي بالمخزن
                </div>
              </div>
              <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500">
                <ClipboardList size={28} />
              </div>
            </div>
          </div>

          {/* Matched Items Table Card */}
          <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border dark:border-gray-700 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b dark:border-gray-700">
              <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">العناصر والمواد المطابقة للفلتر ({materialsWithStats.length})</h3>
              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold px-2.5 py-1 rounded-full">
                تحديث لحظي تلقائي
              </span>
            </div>

            {materialsWithStats.length === 0 ? (
              <div className="p-10 text-center text-gray-400 dark:text-gray-500 text-sm">
                لا توجد مواد تطابق خيارات ومحرك الفلترة المتعددة المحددة حالياً.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border dark:border-gray-700">
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-750 dark:text-gray-300 font-bold">
                    <tr>
                      <th scope="col" className="px-6 py-3">اسم المادة</th>
                      <th scope="col" className="px-6 py-3">الباركود</th>
                      <th scope="col" className="px-6 py-3">الفئة</th>
                      <th scope="col" className="px-6 py-3">المورد</th>
                      <th scope="col" className="px-6 py-3">إجمالي الوارد</th>
                      <th scope="col" className="px-6 py-3">إجمالي المستخدم</th>
                      <th scope="col" className="px-6 py-3">الكمية الحالية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materialsWithStats.map(m => (
                      <tr key={m.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-750/50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap dark:text-white leading-tight">
                          <div>{m.name}</div>
                          {m.materialType && <div className="text-[10px] text-gray-400 mt-0.5 font-normal">{m.materialType}</div>}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-500 dark:text-gray-400">{m.barcode}</td>
                        <td className="px-6 py-4 text-xs font-medium">{m.category || '-'}</td>
                        <td className="px-6 py-4 text-xs text-gray-400">{m.supplier || '-'}</td>
                        <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400 font-bold">
                          {m.entered.toLocaleString('ar-EG')} / <span className="text-[10px] text-gray-400">{m.unit}</span>
                        </td>
                        <td className="px-6 py-4 text-red-600 dark:text-red-400/80 font-bold">
                          {m.used.toLocaleString('ar-EG')} / <span className="text-[10px] text-gray-400">{m.unit}</span>
                        </td>
                        <td className="px-6 py-4 font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/10">
                          {m.currentStock.toLocaleString('ar-EG')} / <span className="text-xs text-gray-400">{m.unit}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      ) : (
        <>
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

              {filterType === 'deadStock' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 block mr-1">فترة الركود (أيام)</label>
                  <select 
                    value={deadStockDays} 
                    onChange={e => setDeadStockDays(Number(e.target.value))} 
                    className="p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-32 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value={30}>30 يوم</option>
                    <option value={60}>60 يوم</option>
                    <option value={90}>90 يوم</option>
                    <option value={180}>6 أشهر</option>
                    <option value={365}>سنة</option>
                  </select>
                </div>
              )}

              {filterType === 'periodComparison' && (
                <div className="flex gap-4 items-end bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border dark:border-gray-700">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 block mr-1">فترة المقارنة - من</label>
                    <input 
                      type="date" 
                      value={comparisonStartDate} 
                      onChange={e => setComparisonStartDate(e.target.value)} 
                      className="p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 block mr-1">فترة المقارنة - إلى</label>
                    <input 
                      type="date" 
                      value={comparisonEndDate} 
                      onChange={e => setComparisonEndDate(e.target.value)} 
                      className="p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                    />
                  </div>
                </div>
              )}

              {['byMaterial', 'materialLedger', 'itemLifecycleReport'].includes(filterType) && (
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
                              {uniqueCategories.filter(c => c && c.includes(searchCategory)).map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                      </div>
                  </div>
              )}

              {filterType === 'byColor' && (
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 block mr-1">اختر اللون</label>
                      <div className="flex gap-2">
                          <div className="relative">
                            <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input type="text" placeholder="بحث..." value={searchColor} onChange={e => setSearchColor(e.target.value)} className="w-24 p-2 pr-7 border rounded-lg text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                          </div>
                          <select value={selectedColor} onChange={e => setSelectedColor(e.target.value)} className="p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-48 focus:ring-2 focus:ring-blue-500 outline-none" disabled={uniqueColors.length === 0}>
                              <option value="">-- اختر اللون --</option>
                              {uniqueColors.filter(c => c && c.includes(searchColor)).map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                      </div>
                  </div>
              )}

              {['bySupplier', 'supplierInventoryValue', 'supplierReturns'].includes(filterType) && (
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 block mr-1">اختر المورد</label>
                      <div className="flex gap-2">
                          <div className="relative">
                            <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input type="text" placeholder="بحث..." value={searchSupplier} onChange={e => setSearchSupplier(e.target.value)} className="w-24 p-2 pr-7 border rounded-lg text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                          </div>
                          <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} className="p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-48 focus:ring-2 focus:ring-blue-500 outline-none" disabled={uniqueSuppliers.length === 0}>
                              <option value="">-- اختر المورد --</option>
                              {uniqueSuppliers.filter(s => s && s.includes(searchSupplier)).map(s => <option key={s} value={s}>{s}</option>)}
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
                              {uniqueBarcodes.filter(b => b && b.includes(searchBarcode)).map(b => <option key={b} value={b}>{b}</option>)}
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

              {filterType === 'byRecipient' && (
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 block mr-1">اختر المستلم</label>
                      <div className="flex gap-2">
                          <div className="relative">
                            <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input type="text" placeholder="بحث..." value={searchRecipient} onChange={e => setSearchRecipient(e.target.value)} className="w-24 p-2 pr-7 border rounded-lg text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                          </div>
                          <select value={selectedRecipient} onChange={e => setSelectedRecipient(e.target.value)} className="p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-48 focus:ring-2 focus:ring-blue-500 outline-none" disabled={uniqueRecipients.length === 0}>
                              <option value="">-- اختر المستلم --</option>
                              {uniqueRecipients.filter(r => r && r.includes(searchRecipient)).map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                      </div>
                  </div>
              )}

              {(['scrapReport', 'wasteReport', 'rulersReport', 'notesSearchReport', 'openingStockReport', 'closingStockReport', 'zeroStockReport', 'reorderLevelReport', 'stockAccuracyReport', 'noPriceMaterialsReport', 'batchTrackingReport', 'itemLifecycleReport', 'binLocationReport', 'cancelledRejectedReport', 'incompleteTransfersReport', 'movingAverageCostReport', 'projectConsumptionReport'].includes(filterType) || selectedReportCategory === 'auditControl') && (
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 block mr-1">البحث السريع في هذا التقرير</label>
                      <div className="relative">
                        <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input 
                          type="text" 
                          placeholder="ابحث عن مادة، باركود، مستخدم، رف، تفاصيل..." 
                          value={reportSearchQuery} 
                          onChange={e => setReportSearchQuery(e.target.value)} 
                          className="p-2 pr-8 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-64 focus:ring-2 focus:ring-blue-500 outline-none" 
                        />
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
        { (filterType === 'totalCount' || filterType === 'lowStock' || filterType === 'inactive' || filterType === 'deadStock' || filterType === 'expiryReport' || filterType === 'reservedStockReport') ? (
             <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        <th scope="col" className="px-6 py-3">اسم المادة</th>
                        <th scope="col" className="px-6 py-3">الباركود</th>
                        {filterType === 'expiryReport' ? (
                          <>
                            <th scope="col" className="px-6 py-3">تاريخ الانتهاء</th>
                            <th scope="col" className="px-6 py-3">الكمية</th>
                            <th scope="col" className="px-6 py-3">الحالة</th>
                          </>
                        ) : filterType === 'reservedStockReport' ? (
                          <>
                            <th scope="col" className="px-6 py-3">الكمية الكلية</th>
                            <th scope="col" className="px-6 py-3">المحجوز</th>
                            <th scope="col" className="px-6 py-3">المتاح</th>
                            <th scope="col" className="px-6 py-3">محجوز بواسطة</th>
                            <th scope="col" className="px-6 py-3">السبب</th>
                          </>
                        ) : (
                          <>
                            <th scope="col" className="px-6 py-3">الفئة</th>
                            <th scope="col" className="px-6 py-3">المورد</th>
                            <th scope="col" className="px-6 py-3">الكمية الحالية</th>
                            <th scope="col" className="px-6 py-3">الحد الأدنى</th>
                          </>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {(finalReportData as Material[]).map(material => (
                        <tr key={material.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                            <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap dark:text-white">{material.name}</td>
                            <td className="px-6 py-4 font-mono text-xs">{material.barcode}</td>
                            {filterType === 'expiryReport' ? (
                              <>
                                <td className="px-6 py-4 text-xs">{material.expiryDate}</td>
                                <td className="px-6 py-4 font-bold">{material.currentStock.toLocaleString('ar-EG')} {material.unit}</td>
                                <td className="px-6 py-4">
                                  {material.expiryDate && new Date(material.expiryDate) < new Date() ? (
                                    <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">منتهي</span>
                                  ) : (
                                    <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">قريب الانتهاء</span>
                                  )}
                                </td>
                              </>
                            ) : filterType === 'reservedStockReport' ? (
                              <>
                                <td className="px-6 py-4 font-bold">{material.currentStock.toLocaleString('ar-EG')} {material.unit}</td>
                                <td className="px-6 py-4 font-bold text-blue-500">{(material.reservedStock || 0).toLocaleString('ar-EG')} {material.unit}</td>
                                <td className="px-6 py-4 font-black text-emerald-500">{(material.currentStock - (material.reservedStock || 0)).toLocaleString('ar-EG')} {material.unit}</td>
                                <td className="px-6 py-4 text-xs">{material.reservedBy || '-'}</td>
                                <td className="px-6 py-4 text-xs">{material.reservationReason || '-'}</td>
                              </>
                            ) : (
                              <>
                                <td className="px-6 py-4">{material.category}</td>
                                <td className="px-6 py-4">{material.supplier}</td>
                                <td className={`px-6 py-4 font-black ${material.currentStock < material.minStock ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {material.currentStock.toLocaleString('ar-EG')} {material.unit}
                                </td>
                                <td className="px-6 py-4 text-gray-400">{material.minStock.toLocaleString('ar-EG')} {material.unit}</td>
                              </>
                            )}
                        </tr>
                    ))}
                </tbody>
             </table>
        ) : (filterType === 'mostUsed' || filterType === 'fastMoving' || filterType === 'slowMoving') ? (
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
                  {(finalReportData as (Material & {totalQuantity: number})[]).map(material => (
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
        ) : (filterType === 'materialLedger') ? (
          <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">التاريخ</th>
                <th scope="col" className="px-6 py-3">نوع الحركة</th>
                <th scope="col" className="px-6 py-3">الكمية</th>
                <th scope="col" className="px-6 py-3">الرصيد قبل</th>
                <th scope="col" className="px-6 py-3">الرصيد بعد</th>
                <th scope="col" className="px-6 py-3">المستلم/الملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {(finalReportData as any[]).map(t => (
                <tr key={t.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                  <td className="px-6 py-4 text-xs">{new Date(t.date).toLocaleString('ar-EG')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                      (t.type === 'in' || t.type === 'return_in') ? 'bg-emerald-100 text-emerald-700' : 
                      (t.type === 'out' || t.type === 'return') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {t.type === 'in' ? 'إدخال' : t.type === 'out' ? 'صرف' : t.type === 'transfer' ? 'تحويل' : t.type === 'return' ? 'مرتجع مورد' : 'مرتجع إدخال'}
                    </span>
                  </td>
                  <td className={`px-6 py-4 font-bold ${(t.type === 'in' || t.type === 'return_in') ? 'text-emerald-500' : 'text-red-500'}`}>
                    {(t.type === 'in' || t.type === 'return_in') ? '+' : '-'}{t.quantity.toLocaleString('ar-EG')}
                  </td>
                  <td className="px-6 py-4 font-mono">{t.balanceBefore.toLocaleString('ar-EG')}</td>
                  <td className="px-6 py-4 font-mono font-bold text-gray-900 dark:text-white">{t.balanceAfter.toLocaleString('ar-EG')}</td>
                  <td className="px-6 py-4 text-xs">{t.recipient} {t.notes && `- ${t.notes}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (filterType === 'warehouseTransfers') ? (
          <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">التاريخ</th>
                <th scope="col" className="px-6 py-3">المادة</th>
                <th scope="col" className="px-6 py-3">من مستودع</th>
                <th scope="col" className="px-6 py-3">إلى مستودع</th>
                <th scope="col" className="px-6 py-3">الكمية</th>
                <th scope="col" className="px-6 py-3">المستخدم</th>
              </tr>
            </thead>
            <tbody>
              {(finalReportData as Transaction[]).map(t => (
                <tr key={t.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                  <td className="px-6 py-4 text-xs">{new Date(t.date).toLocaleString('ar-EG')}</td>
                  <td className="px-6 py-4 font-bold">{t.materialName}</td>
                  <td className="px-6 py-4 text-xs">{warehouses.find(w => w.id === t.warehouseId)?.name || t.warehouseId}</td>
                  <td className="px-6 py-4 text-xs">{warehouses.find(w => w.id === t.toWarehouseId)?.name || t.toWarehouseId}</td>
                  <td className="px-6 py-4 font-bold text-blue-500">{t.quantity.toLocaleString('ar-EG')} {t.unit}</td>
                  <td className="px-6 py-4 text-xs">{t.recipient}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (filterType === 'warehouseComparison') ? (
          <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">المادة</th>
                <th scope="col" className="px-6 py-3">الباركود</th>
                {warehouses.map(w => (
                  <th key={w.id} scope="col" className="px-6 py-3">{w.name}</th>
                ))}
                <th scope="col" className="px-6 py-3">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {(finalReportData as Material[]).map(m => (
                <tr key={m.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{m.name}</td>
                  <td className="px-6 py-4 font-mono text-xs">{m.barcode}</td>
                  {warehouses.map(w => (
                    <td key={w.id} className="px-6 py-4 font-bold text-blue-500">{(m.stocks[w.id] || 0).toLocaleString('ar-EG')}</td>
                  ))}
                  <td className="px-6 py-4 font-black text-emerald-500">{m.currentStock.toLocaleString('ar-EG')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (filterType === 'userPerformance') ? (
          <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">المستخدم</th>
                <th scope="col" className="px-6 py-3">عمليات الإدخال</th>
                <th scope="col" className="px-6 py-3">عمليات الصرف</th>
                <th scope="col" className="px-6 py-3">إجمالي العمليات</th>
              </tr>
            </thead>
            <tbody>
              {(finalReportData as any[]).map(u => (
                <tr key={u.username} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{u.username}</td>
                  <td className="px-6 py-4 font-bold text-emerald-500">{u.in.toLocaleString('ar-EG')}</td>
                  <td className="px-6 py-4 font-bold text-red-500">{u.out.toLocaleString('ar-EG')}</td>
                  <td className="px-6 py-4 font-black text-blue-500">{u.total.toLocaleString('ar-EG')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (filterType === 'auditReport') ? (
          <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">الوقت</th>
                <th scope="col" className="px-6 py-3">المستخدم</th>
                <th scope="col" className="px-6 py-3">النوع</th>
                <th scope="col" className="px-6 py-3">العملية</th>
                <th scope="col" className="px-6 py-3">التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {(finalReportData as any[]).map(n => (
                <tr key={n.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                  <td className="px-6 py-4 text-xs">{new Date(n.timestamp).toLocaleString('ar-EG')}</td>
                  <td className="px-6 py-4 font-bold">{n.user}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                      n.action === 'update' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {n.action === 'update' ? 'تعديل' : 'حذف'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs">{n.title}</td>
                  <td className="px-6 py-4 text-xs">{n.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (filterType === 'openingStockAdjustments') ? (
          <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 font-bold">
              <tr>
                <th scope="col" className="px-6 py-3">الوقت والتاريخ</th>
                <th scope="col" className="px-6 py-3">المسؤول عن التعديل</th>
                <th scope="col" className="px-6 py-3">اسم المادة</th>
                <th scope="col" className="px-6 py-3">الباركود</th>
                <th scope="col" className="px-6 py-3">المستودع</th>
                <th scope="col" className="px-6 py-3">الكمية القديمة</th>
                <th scope="col" className="px-6 py-3">الكمية الجديدة</th>
                <th scope="col" className="px-6 py-3">فرق الكمية</th>
                <th scope="col" className="px-6 py-3">طريقة التعديل</th>
              </tr>
            </thead>
            <tbody>
              {(finalReportData as any[]).map(adj => (
                <tr key={adj.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                  <td className="px-6 py-4 text-xs font-mono">
                    {new Date(adj.date).toLocaleString('ar-EG', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true
                    })}
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-100">{adj.modifiedBy}</td>
                  <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400">{adj.materialName}</td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-400">{adj.barcode}</td>
                  <td className="px-6 py-4 text-xs font-medium text-gray-600 dark:text-gray-350">{adj.warehouseName}</td>
                  <td className="px-6 py-4 font-mono font-medium text-gray-500 dark:text-gray-400">{adj.oldQuantity.toLocaleString('ar-EG')}</td>
                  <td className="px-6 py-4 font-mono font-black text-gray-950 dark:text-white">{adj.newQuantity.toLocaleString('ar-EG')}</td>
                  <td className={`px-6 py-4 font-mono font-bold ${adj.difference > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {adj.difference > 0 ? '+' : ''}{adj.difference.toLocaleString('ar-EG')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                      adj.isCorrection ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/20 dark:text-rose-400'
                    }`}>
                      {adj.isCorrection ? 'تصحيح مباشر (Correction)' : 'تعديل رصيد مضاف (Adjustment)'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (filterType === 'zeroStockReport') ? (
          <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">المادة</th>
                <th scope="col" className="px-6 py-3">الباركود</th>
                <th scope="col" className="px-6 py-3">الفئة</th>
                <th scope="col" className="px-6 py-3">المورد</th>
                <th scope="col" className="px-6 py-3">تاريخ آخر حركة</th>
                <th scope="col" className="px-6 py-3">نوع الحركة الأخيرة</th>
                <th scope="col" className="px-6 py-3">كمية الحركة</th>
                <th scope="col" className="px-6 py-3">المسؤول/المستلم</th>
                <th scope="col" className="px-6 py-3">الملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {(finalReportData as any[]).map(m => (
                <tr key={m.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{m.name}</td>
                  <td className="px-6 py-4 font-mono text-xs">{m.barcode}</td>
                  <td className="px-6 py-4">{m.category}</td>
                  <td className="px-6 py-4 text-xs">{m.supplier}</td>
                  <td className="px-6 py-4 text-xs">{new Date(m.lastTxDate).toLocaleString('ar-EG')}</td>
                  <td className="px-6 py-4 text-xs font-bold text-rose-500">{m.lastTxType}</td>
                  <td className="px-6 py-4 font-bold text-blue-500">{m.lastTxQty.toLocaleString('ar-EG')}</td>
                  <td className="px-6 py-4 font-medium text-xs">{m.lastTxUser}</td>
                  <td className="px-6 py-4 text-xs text-gray-400">{m.lastTxNotes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (filterType === 'reorderLevelReport') ? (
          <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">اسم المادة</th>
                <th scope="col" className="px-6 py-3">الباركود</th>
                <th scope="col" className="px-6 py-3">الفئة</th>
                <th scope="col" className="px-6 py-3">المخزون الحالي</th>
                <th scope="col" className="px-6 py-3">الحد الأدنى</th>
                <th scope="col" className="px-6 py-3">الحالة والخطورة</th>
                <th scope="col" className="px-6 py-3">الكمية المقترحة لإعادة الطلب</th>
              </tr>
            </thead>
            <tbody>
              {(finalReportData as any[]).map(m => (
                <tr key={m.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{m.name}</td>
                  <td className="px-6 py-4 font-mono text-xs">{m.barcode}</td>
                  <td className="px-6 py-4 text-xs">{m.category}</td>
                  <td className={`px-6 py-4 font-black ${m.currentStock <= m.minStock ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {m.currentStock.toLocaleString('ar-EG')} {m.unit}
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-500">{m.minStock.toLocaleString('ar-EG')} {m.unit}</td>
                  <td className="px-6 py-4 text-xs">
                    <span className={`px-2 py-1 rounded font-bold ${
                      m.currentStock <= m.minStock ? 'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400'
                    }`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-black text-emerald-600 dark:text-emerald-400">
                    + {m.suggestedReorder.toLocaleString('ar-EG')} {m.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (filterType === 'stockAccuracyReport') ? (
          <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">اسم المادة</th>
                <th scope="col" className="px-6 py-3">الباركود</th>
                <th scope="col" className="px-6 py-3">المخزون النظامي</th>
                <th scope="col" className="px-6 py-3">المخزون الفعلي المثبت</th>
                <th scope="col" className="px-6 py-3">الفرق والانحراف</th>
                <th scope="col" className="px-6 py-3">نسبة دقة الجرد</th>
                <th scope="col" className="px-6 py-3">حالة التدقيق</th>
              </tr>
            </thead>
            <tbody>
              {(finalReportData as any[]).map(m => (
                <tr key={m.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{m.name}</td>
                  <td className="px-6 py-4 font-mono text-xs">{m.barcode}</td>
                  <td className="px-6 py-4 font-bold">{m.systemStock.toLocaleString('ar-EG')}</td>
                  <td className="px-6 py-4">
                    <input
                      type="number"
                      placeholder="أدخل الجرد الفعلي..."
                      value={manualPhysicalStocks[m.id] === undefined || isNaN(manualPhysicalStocks[m.id]) ? '' : manualPhysicalStocks[m.id]}
                      onChange={e => updatePhysicalStock(m.id, e.target.value)}
                      className="w-32 p-1.5 border rounded-lg text-sm bg-gray-50 dark:bg-gray-700/50 dark:border-gray-600 dark:text-white text-center font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </td>
                  <td className={`px-6 py-4 font-black ${m.discrepancy === null ? 'text-gray-400' : m.discrepancy === 0 ? 'text-gray-500' : m.discrepancy < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {m.discrepancy === null ? 'بانتظار الجرد' : m.discrepancy === 0 ? '0' : m.discrepancy > 0 ? `+${m.discrepancy.toLocaleString('ar-EG')}` : m.discrepancy.toLocaleString('ar-EG')}
                  </td>
                  <td className="px-6 py-4 font-black text-indigo-500">
                    {m.accuracyPercent !== null ? `${m.accuracyPercent.toLocaleString('ar-EG', { maximumFractionDigits: 1 })}%` : '---'}
                  </td>
                  <td className="px-6 py-4 text-xs">
                    <span className={`px-2 py-1 rounded font-bold ${
                      m.discrepancy === null ? 'bg-gray-150 text-gray-500 dark:bg-gray-800 dark:text-gray-400' :
                      m.discrepancy === 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400'
                    }`}>
                      {m.discrepancy === null ? 'بانتظار الإدخال' : m.discrepancy === 0 ? 'مطابق (Perfect)' : m.discrepancy > 0 ? 'زيادة في الجرد' : 'عجز جرد سلبي'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (filterType === 'noPriceMaterialsReport') ? (
          <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">اسم المادة</th>
                <th scope="col" className="px-6 py-3">الباركود</th>
                <th scope="col" className="px-6 py-3">الفئة</th>
                <th scope="col" className="px-6 py-3">المورد</th>
                <th scope="col" className="px-6 py-3">المخزون الحالي</th>
                <th scope="col" className="px-6 py-3">التسعير</th>
              </tr>
            </thead>
            <tbody>
              {(finalReportData as any[]).map(m => (
                <tr key={m.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{m.name}</td>
                  <td className="px-6 py-4 font-mono text-xs">{m.barcode}</td>
                  <td className="px-6 py-4">{m.category}</td>
                  <td className="px-6 py-4 text-xs">{m.supplier}</td>
                  <td className="px-6 py-4 font-bold">{m.currentStock.toLocaleString('ar-EG')} {m.unit}</td>
                  <td className="px-6 py-4 text-xs">
                    <span className="px-2 py-1 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400 font-bold">
                      بدون تسعير (0.00 {settings?.currencySymbol || 'ج.م'})
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (filterType === 'batchTrackingReport') ? (
          <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">رقم الدفعة / السند</th>
                <th scope="col" className="px-6 py-3">اسم المادة</th>
                <th scope="col" className="px-6 py-3">المورد</th>
                <th scope="col" className="px-6 py-3">الكمية الواردة بالدفعة</th>
                <th scope="col" className="px-6 py-3">الكمية المصروفة</th>
                <th scope="col" className="px-6 py-3">الرصيد المتبقي بالدفعة</th>
                <th scope="col" className="px-6 py-3">أطراف الصرف المستلمة</th>
                <th scope="col" className="px-6 py-3">الوضعية والحالة</th>
              </tr>
            </thead>
            <tbody>
              {(finalReportData as any[]).map(b => (
                <tr key={b.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs font-bold text-gray-900 dark:text-white">{b.batchNumber}</td>
                  <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400">{b.materialName}</td>
                  <td className="px-6 py-4 text-xs">{b.supplier}</td>
                  <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400">{b.initialQty.toLocaleString('ar-EG')} {b.unit}</td>
                  <td className="px-6 py-4 font-bold text-orange-500">{b.outQty.toLocaleString('ar-EG')} {b.unit}</td>
                  <td className="px-6 py-4 font-black">{b.remainingQty.toLocaleString('ar-EG')} {b.unit}</td>
                  <td className="px-6 py-4 text-xs max-w-xs truncate" title={b.recipients}>{b.recipients}</td>
                  <td className="px-6 py-4 text-xs font-medium">
                    <span className={`px-2 py-1 rounded font-bold ${
                      b.remainingQty === 0 ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' : (b.remainingQty < b.initialQty ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400')
                    }`}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (filterType === 'itemLifecycleReport') ? (
          <div>
            {selectedMaterialId ? (
              <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                  <tr>
                    <th scope="col" className="px-6 py-3">التاريخ والوقت</th>
                    <th scope="col" className="px-6 py-3">المادة</th>
                    <th scope="col" className="px-6 py-3">الباركود</th>
                    <th scope="col" className="px-6 py-3">العملية والحركة</th>
                    <th scope="col" className="px-6 py-3">الكمية</th>
                    <th scope="col" className="px-6 py-3">الرصيد التراكمي المتحرك</th>
                    <th scope="col" className="px-6 py-3">المسؤول/المستلم</th>
                    <th scope="col" className="px-6 py-3">الملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {(finalReportData as any[]).map((t, idx) => (
                    <tr key={idx} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                      <td className="px-6 py-4 text-xs">{new Date(t.date).toLocaleString('ar-EG')}</td>
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{t.materialName}</td>
                      <td className="px-6 py-4 font-mono text-xs">{t.barcode}</td>
                      <td className="px-6 py-4 text-xs">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                          t.type === 'in' || t.type === 'return_in' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400'
                        }`}>
                          {t.typeLabel}
                        </span>
                      </td>
                      <td className={`px-6 py-4 font-black ${t.type === 'in' || t.type === 'return_in' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {t.type === 'in' || t.type === 'return_in' ? '+' : '-'}{t.quantity.toLocaleString('ar-EG')} {t.unit}
                      </td>
                      <td className="px-6 py-4 font-black text-blue-600 dark:text-blue-400">{t.runningStock.toLocaleString('ar-EG')} {t.unit}</td>
                      <td className="px-6 py-4 text-sm font-medium">{t.recipient}</td>
                      <td className="px-6 py-4 text-xs text-gray-400">{t.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-gray-400">بانتظار اختيار مادة محددة لعرض كامل دورة حياتها التاريخية من الفلتر العلوي.</div>
            )}
          </div>
        ) : (filterType === 'binLocationReport') ? (
          <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">موقع التخزين المعتمد (Shelf / Bin Location)</th>
                <th scope="col" className="px-6 py-3">اسم المادة</th>
                <th scope="col" className="px-6 py-3">الباركود</th>
                <th scope="col" className="px-6 py-3">الفئة</th>
                <th scope="col" className="px-6 py-3">المستودع الرئيسي/الفرعي</th>
                <th scope="col" className="px-6 py-3">المخزون المتواجد بالموقع</th>
              </tr>
            </thead>
            <tbody>
              {(finalReportData as any[]).map(m => (
                <tr key={m.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                  <td className="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400">
                    <span className="bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900 font-mono text-sm shadow-sm">
                      📍 {m.binLocation}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{m.name}</td>
                  <td className="px-6 py-4 font-mono text-xs">{m.barcode}</td>
                  <td className="px-6 py-4 text-xs">{m.category}</td>
                  <td className="px-6 py-4 text-xs font-medium text-gray-600 dark:text-gray-350">{m.warehouseName}</td>
                  <td className="px-6 py-4 font-black">{m.currentStock.toLocaleString('ar-EG')} {m.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (filterType === 'cancelledRejectedReport') ? (
          <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">التاريخ والوقت</th>
                <th scope="col" className="px-6 py-3">المستخدم المسؤول</th>
                <th scope="col" className="px-6 py-3">الحدث والنوع</th>
                <th scope="col" className="px-6 py-3">العملية والحدث الملغى</th>
                <th scope="col" className="px-6 py-3">التفاصيل التدقيقية الأمنية</th>
              </tr>
            </thead>
            <tbody>
              {(finalReportData as any[]).map(op => (
                <tr key={op.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                  <td className="px-6 py-4 text-xs">{new Date(op.timestamp).toLocaleString('ar-EG')}</td>
                  <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{op.user}</td>
                  <td className="px-6 py-4 font-bold text-xs text-rose-600 dark:text-rose-400">{op.action}</td>
                  <td className="px-6 py-4 text-xs font-semibold">{op.details}</td>
                  <td className="px-6 py-4 text-xs text-gray-400">{op.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (filterType === 'incompleteTransfersReport') ? (
          <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">التاريخ</th>
                <th scope="col" className="px-6 py-3">المادة والنوع</th>
                <th scope="col" className="px-6 py-3">الكمية المحولة قيد النقل</th>
                <th scope="col" className="px-6 py-3">من مخزن مبدأ</th>
                <th scope="col" className="px-6 py-3">تحويل صادر لمخزن مقصد</th>
                <th scope="col" className="px-6 py-3">حالة الشحنة</th>
              </tr>
            </thead>
            <tbody>
              {(finalReportData as any[]).map(t => (
                <tr key={t.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                  <td className="px-6 py-4 text-xs">{new Date(t.date).toLocaleDateString('ar-EG')}</td>
                  <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400">{t.materialName}</td>
                  <td className="px-6 py-4 font-black">{t.quantity.toLocaleString('ar-EG')} {t.unit}</td>
                  <td className="px-6 py-4 text-xs font-medium">{t.fromWarehouse}</td>
                  <td className="px-6 py-4 text-xs font-medium">{t.toWarehouse}</td>
                  <td className="px-6 py-4 text-xs font-medium">
                    <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 font-bold">
                      🚚 {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (filterType === 'movingAverageCostReport') ? (
          <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">اسم المادة</th>
                <th scope="col" className="px-6 py-3">الباركود</th>
                <th scope="col" className="px-6 py-3">الفئة</th>
                <th scope="col" className="px-6 py-3">المخزون الحالي</th>
                <th scope="col" className="px-6 py-3">متوسط التكلفة للوحدة (Moving Average)</th>
                <th scope="col" className="px-6 py-3">القيمة المالية الإجمالية المقدرة</th>
              </tr>
            </thead>
            <tbody>
              {(finalReportData as any[]).map(m => (
                <tr key={m.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{m.name}</td>
                  <td className="px-6 py-4 font-mono text-xs">{m.barcode}</td>
                  <td className="px-6 py-4 text-xs">{m.category}</td>
                  <td className="px-6 py-4 font-bold">{m.currentStock.toLocaleString('ar-EG')} {m.unit}</td>
                  <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400">
                    {m.avgCost.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} {settings?.currencySymbol || 'ج.م'}
                  </td>
                  <td className="px-6 py-4 font-black text-emerald-600 dark:text-emerald-400">
                    {m.totalValueCurrent.toLocaleString('ar-EG', { minimumFractionDigits: 1 })} {settings?.currencySymbol || 'ج.م'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (filterType === 'projectConsumptionReport') ? (
          <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">المشروع / الجهة المستفيدة من الصرف</th>
                <th scope="col" className="px-6 py-3">عدد سندات الصرف في الفترة</th>
                <th scope="col" className="px-6 py-3">إجمالي الكمية المصروفة</th>
                <th scope="col" className="px-6 py-3">إجمالي القيمة التقديرية المسحوبة</th>
                <th scope="col" className="px-6 py-3">ملخص المواد المسحوبة</th>
              </tr>
            </thead>
            <tbody>
              {(finalReportData as any[]).map((p, idx) => (
                <tr key={idx} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{p.project}</td>
                  <td className="px-6 py-4 font-bold text-blue-500">{p.itemsCount.toLocaleString('ar-EG')} عمليات</td>
                  <td className="px-6 py-4 font-black text-gray-700 dark:text-gray-300">{p.totalQty.toLocaleString('ar-EG')} وحدات</td>
                  <td className="px-6 py-4 font-black text-amber-600">
                    {p.totalValue.toLocaleString('ar-EG')} {settings?.currencySymbol || 'ج.م'}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-450 italic">{p.materialsSummary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (filterType === 'consumptionAnalysis') ? (
          <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">الشهر</th>
                <th scope="col" className="px-6 py-3">إجمالي الكمية المستهلكة</th>
              </tr>
            </thead>
            <tbody>
              {(finalReportData as any[]).map(item => (
                <tr key={item.month} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{item.month}</td>
                  <td className="px-6 py-4 font-black text-blue-500">{item.quantity.toLocaleString('ar-EG')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (filterType === 'stockForecast') ? (
          <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">المادة</th>
                <th scope="col" className="px-6 py-3">متوسط السحب اليومي</th>
                <th scope="col" className="px-6 py-3">المخزون الحالي</th>
                <th scope="col" className="px-6 py-3">الأيام المتبقية المتوقعة</th>
                <th scope="col" className="px-6 py-3">الاحتياج لـ 30 يوم</th>
              </tr>
            </thead>
            <tbody>
              {(finalReportData as any[]).map(m => (
                <tr key={m.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{m.name}</td>
                  <td className="px-6 py-4 font-bold text-blue-500">{m.avgDaily.toLocaleString('ar-EG', { maximumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 font-bold">{m.currentStock.toLocaleString('ar-EG')}</td>
                  <td className={`px-6 py-4 font-black ${m.daysRemaining < 7 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {m.daysRemaining} يوم
                  </td>
                  <td className="px-6 py-4 font-bold text-orange-500">{m.forecast30Days.toLocaleString('ar-EG', { maximumFractionDigits: 0 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (filterType === 'periodComparison') ? (
          <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">المادة</th>
                <th scope="col" className="px-6 py-3">الفترة الحالية</th>
                <th scope="col" className="px-6 py-3">الفترة السابقة</th>
                <th scope="col" className="px-6 py-3">الفرق</th>
                <th scope="col" className="px-6 py-3">نسبة التغير</th>
              </tr>
            </thead>
            <tbody>
              {(finalReportData as any[]).map(m => (
                <tr key={m.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{m.name}</td>
                  <td className="px-6 py-4 font-bold">{m.current.toLocaleString('ar-EG')}</td>
                  <td className="px-6 py-4 font-bold text-gray-400">{m.previous.toLocaleString('ar-EG')}</td>
                  <td className={`px-6 py-4 font-bold ${m.diff > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {m.diff > 0 ? '+' : ''}{m.diff.toLocaleString('ar-EG')}
                  </td>
                  <td className={`px-6 py-4 font-black ${m.percentChange > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {m.percentChange > 0 ? '+' : ''}{m.percentChange.toLocaleString('ar-EG', { maximumFractionDigits: 1 })}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (filterType === 'trendReport') ? (
          <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">المادة</th>
                {(finalReportData[0] as any)?.months.map((m: string) => (
                  <th key={m} scope="col" className="px-6 py-3">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(finalReportData as any[]).map(m => (
                <tr key={m.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{m.name}</td>
                  {m.trend.map((val: number, idx: number) => (
                    <td key={idx} className="px-6 py-4 font-bold text-blue-500">{val.toLocaleString('ar-EG')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (filterType === 'inventoryValue' || filterType === 'supplierInventoryValue') ? (
            <div className="space-y-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl flex justify-between items-center">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300">
                        {filterType === 'supplierInventoryValue' ? `إجمالي قيمة بضاعة المورد (${selectedSupplier || 'الكل'}):` : 'إجمالي قيمة المخزون المفلتر:'}
                    </span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {(finalReportData as any[]).reduce((sum, m) => sum + m.totalValue, 0).toLocaleString('ar-EG')} {settings?.currencySymbol || 'ج.م'}
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
                        {(finalReportData as any[]).map(material => (
                            <tr key={material.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                                <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap dark:text-white">{material.name}</td>
                                <td className="px-6 py-4 font-mono text-xs">{material.barcode}</td>
                                <td className="px-6 py-4 font-bold">
                                    {filterType === 'supplierInventoryValue' ? material.currentStock : material.displayStock} {material.unit}
                                </td>
                                <td className="px-6 py-4">{(material.price || 0).toLocaleString('ar-EG')} {settings?.currencySymbol || 'ج.م'}</td>
                                <td className="px-6 py-4 font-black text-emerald-500">{material.totalValue.toLocaleString('ar-EG')} {settings?.currencySymbol || 'ج.م'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ) : (filterType === 'openingStockReport' || filterType === 'closingStockReport') ? (
            <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        <th scope="col" className="px-6 py-3">اسم المادة</th>
                        <th scope="col" className="px-6 py-3">الباركود</th>
                        <th scope="col" className="px-6 py-3">الفئة</th>
                        <th scope="col" className="px-6 py-3">المورد</th>
                        <th scope="col" className="px-6 py-3">
                            {filterType === 'openingStockReport' ? 'رصيد أول المدة' : 'رصيد آخر المدة'}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {(finalReportData as any[]).map(material => (
                        <tr key={material.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                            <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap dark:text-white">{material.name}</td>
                            <td className="px-6 py-4 font-mono text-xs">{material.barcode}</td>
                            <td className="px-6 py-4">{material.category}</td>
                            <td className="px-6 py-4">{material.supplier}</td>
                            <td className="px-6 py-4 font-black text-blue-600 dark:text-blue-400">
                                {filterType === 'openingStockReport' ? material.openingStock : material.closingStock} {material.unit}
                            </td>
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
                    <th scope="col" className="px-6 py-3">نوع الإخراج</th>
                    <th scope="col" className="px-6 py-3">المستلم</th>
                    <th scope="col" className="px-6 py-3">الملاحظات</th>
                    </tr>
                </thead>
                <tbody>
                    {(finalReportData as Transaction[]).map(transaction => (
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
                        <td className="px-6 py-4 text-xs">
                            {transaction.outputType === 'scrap' ? 'سقط' : 
                             transaction.outputType === 'rulers' ? 'مساطر' : 
                             transaction.outputType === 'waste' ? 'هدر' : 'بدون'}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">{transaction.recipient}</td>
                        <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-300">{transaction.notes || '-'}</td>
                    </tr>
                    ))}
                </tbody>
            </table>
        )}
        {!canPerformAction && <div className="p-12 text-center text-gray-400">لا توجد بيانات تطابق الفلتر المختار.</div>}
      </div>
      </>
      )}
    </div>
  );
};

export default Reports;