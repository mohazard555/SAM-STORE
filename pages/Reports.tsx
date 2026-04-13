
import React, { useState, useMemo } from 'react';
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
  User as UserIcon
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { exportToExcel } from '@/utils/excelExport';

import { getNotifications } from '@/services/mockApi';

interface ReportsProps {
  transactions: Transaction[];
  materials: Material[];
  warehouses: Warehouse[];
  settings: SettingsData | null;
  user: User;
}

type ReportType = 'daily' | 'weekly' | 'monthly' | 'byMaterial' | 'byCategory' | 'byColor' | 'byBarcode' | 'byItemBarcode' | 'totalCount' | 'all' | 'bySupplier' | 'mostUsed' | 'inactive' | 'lowStock' | 'inventoryValue' | 'inTransactions' | 'outTransactions' | 'byRecipient' | 'materialLedger' | 'warehouseTransfers' | 'deadStock' | 'fastMoving' | 'slowMoving' | 'warehouseComparison' | 'userPerformance' | 'auditReport' | 'consumptionAnalysis' | 'stockForecast' | 'periodComparison' | 'trendReport' | 'expiryReport' | 'reservedStockReport' | 'modifiedOperationsReport' | 'supplierInventoryValue' | 'supplierReturns' | 'processedItemCards' | 'scrapReport' | 'wasteReport' | 'rulersReport' | 'notesSearchReport' | 'openingStockReport' | 'closingStockReport';

const Reports: React.FC<ReportsProps> = ({ transactions, materials, warehouses, settings, user }) => {
  const { triggerPrint } = usePrint();
  const [filterType, setFilterType] = useState<ReportType>('all');
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMaterialId, setSelectedMaterialId] = useState(materials[0]?.id || '');
  const [selectedBarcode, setSelectedBarcode] = useState('');
  const [selectedItemBarcode, setSelectedItemBarcode] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  type ReportCategory = 'inventory' | 'movement' | 'analysis' | 'suppliers' | 'users' | 'system';
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
    const timeSensitiveReports: ReportType[] = ['daily', 'weekly', 'monthly', 'byMaterial', 'byCategory', 'byColor', 'byBarcode', 'byItemBarcode', 'bySupplier', 'mostUsed', 'all', 'inTransactions', 'outTransactions', 'byRecipient', 'warehouseTransfers', 'materialLedger', 'scrapReport', 'wasteReport', 'rulersReport', 'notesSearchReport', 'openingStockReport', 'closingStockReport'];
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
        const start = new Date(startDate).getTime();
        return materials.map(m => {
          const qtyBefore = transactions
            .filter(t => t.materialId === m.id && new Date(t.date).getTime() < start)
            .reduce((sum, t) => {
                if (t.type === 'in' || t.type === 'return_in') return sum + t.quantity;
                if (t.type === 'out' || t.type === 'return') return sum - t.quantity;
                return sum;
            }, 0);
          return { ...m, openingStock: qtyBefore };
        }).filter(m => m.openingStock !== 0);
      }

      case 'closingStockReport': {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        const endTime = end.getTime();
        return materials.map(m => {
          const qtyAtEnd = transactions
            .filter(t => t.materialId === m.id && new Date(t.date).getTime() <= endTime)
            .reduce((sum, t) => {
                if (t.type === 'in' || t.type === 'return_in') return sum + t.quantity;
                if (t.type === 'out' || t.type === 'return') return sum - t.quantity;
                return sum;
            }, 0);
          return { ...m, closingStock: qtyAtEnd };
        }).filter(m => m.closingStock !== 0);
      }


      case 'totalCount':
        return materials;
      
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
    
    const transactionReports: ReportType[] = ['all', 'daily', 'weekly', 'monthly', 'byMaterial', 'byCategory', 'byColor', 'byBarcode', 'byItemBarcode', 'bySupplier', 'inTransactions', 'outTransactions', 'byRecipient', 'warehouseTransfers', 'materialLedger', 'scrapReport', 'wasteReport', 'rulersReport', 'notesSearchReport'];
    
    if (transactionReports.includes(filterType)) {
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
    
    const materialReports: ReportType[] = ['totalCount', 'lowStock', 'inactive', 'deadStock', 'expiryReport', 'reservedStockReport', 'inventoryValue', 'supplierInventoryValue', 'openingStockReport', 'closingStockReport'];
    if (materialReports.includes(filterType)) {
        return (data as Material[]).filter(m => 
            m.name?.toLowerCase().includes(query) ||
            m.barcode?.toLowerCase().includes(query) ||
            m.category?.toLowerCase().includes(query) ||
            m.supplier?.toLowerCase().includes(query)
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
  
  const canPerformAction = reportData && reportData.length > 0;
  const showDatePickers = ['all', 'daily', 'weekly', 'monthly', 'byMaterial', 'byCategory', 'byColor', 'byBarcode', 'byItemBarcode', 'bySupplier', 'mostUsed', 'inTransactions', 'outTransactions', 'byRecipient', 'warehouseTransfers', 'materialLedger', 'scrapReport', 'wasteReport', 'rulersReport', 'notesSearchReport', 'openingStockReport', 'closingStockReport'].includes(filterType);

  const categories = [
    { id: 'inventory', label: 'تقارير المخزون', icon: Package },
    { id: 'movement', label: 'تقارير الحركة', icon: RotateCcw },
    { id: 'analysis', label: 'تقارير التحليل', icon: TrendingUp },
    { id: 'suppliers', label: 'تقارير الموردين', icon: Truck },
    { id: 'users', label: 'تقارير المستخدمين', icon: UserIcon },
    { id: 'system', label: 'تقارير النظام', icon: AlertTriangle },
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

    // Analysis
    { value: 'mostUsed', category: 'analysis', label: 'الأكثر استخداماً', icon: TrendingUp, color: 'rose', bgColor: 'bg-rose-100', textColor: 'text-rose-600', darkBg: 'dark:bg-rose-900/30', darkText: 'dark:text-rose-400', glow: 'bg-rose-500', description: 'المواد ذات معدل السحب الأعلى' },
    { value: 'fastMoving', category: 'analysis', label: 'سريعة الاستهلاك', icon: TrendingUp, color: 'emerald', bgColor: 'bg-emerald-100', textColor: 'text-emerald-600', darkBg: 'dark:bg-emerald-900/30', darkText: 'dark:text-emerald-400', glow: 'bg-emerald-500', description: 'المواد ذات معدل السحب الأعلى' },
    { value: 'slowMoving', category: 'analysis', label: 'بطيئة الحركة', icon: Clock, color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-600', darkBg: 'dark:bg-orange-900/30', darkText: 'dark:text-orange-400', glow: 'bg-orange-500', description: 'المواد ذات معدل السحب المنخفض' },
    { value: 'consumptionAnalysis', category: 'analysis', label: 'تحليل الاستهلاك', icon: TrendingUp, color: 'teal', bgColor: 'bg-teal-100', textColor: 'text-teal-600', darkBg: 'dark:bg-teal-900/30', darkText: 'dark:text-teal-400', glow: 'bg-teal-500', description: 'تحليل كميات الاستهلاك شهرياً' },
    { value: 'stockForecast', category: 'analysis', label: 'توقع نفاد المخزون', icon: Clock, color: 'violet', bgColor: 'bg-violet-100', textColor: 'text-violet-600', darkBg: 'dark:bg-violet-900/30', darkText: 'dark:text-violet-400', glow: 'bg-violet-500', description: 'توقع متى سينفد المخزون بناءً على الاستهلاك' },
    { value: 'periodComparison', category: 'analysis', label: 'مقارنة الفترات', icon: CalendarRange, color: 'pink', bgColor: 'bg-pink-100', textColor: 'text-pink-600', darkBg: 'dark:bg-pink-900/30', darkText: 'dark:text-pink-400', glow: 'bg-pink-500', description: 'مقارنة الاستهلاك بين فترتين زمنيتين' },
    { value: 'trendReport', category: 'analysis', label: 'اتجاه الاستخدام', icon: TrendingUp, color: 'cyan', bgColor: 'bg-cyan-100', textColor: 'text-cyan-600', darkBg: 'dark:bg-cyan-900/30', darkText: 'dark:text-cyan-400', glow: 'bg-cyan-500', description: 'اتجاه استخدام المواد خلال 6 أشهر' },

    // Suppliers
    { value: 'bySupplier', category: 'suppliers', label: 'حسب المورد', icon: Truck, color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-600', darkBg: 'dark:bg-orange-900/30', darkText: 'dark:text-orange-400', glow: 'bg-orange-500', description: 'تقارير المواد المرتبطة بمورد محدد' },
    { value: 'supplierInventoryValue', category: 'suppliers', label: 'قيمة بضاعة مورد', icon: TrendingUp, color: 'emerald', bgColor: 'bg-emerald-100', textColor: 'text-emerald-600', darkBg: 'dark:bg-emerald-900/30', darkText: 'dark:text-emerald-400', glow: 'bg-emerald-500', description: 'تقرير قيمة بضاعة مورد مع تفاصيل مواد' },
    { value: 'supplierReturns', category: 'suppliers', label: 'مرتجعات مورد', icon: RotateCcw, color: 'rose', bgColor: 'bg-rose-100', textColor: 'text-rose-600', darkBg: 'dark:bg-rose-900/30', darkText: 'dark:text-rose-400', glow: 'bg-rose-500', description: 'تقرير مرتجعات مورد' },

    // Users
    { value: 'userPerformance', category: 'users', label: 'أداء المستخدمين', icon: UserIcon, color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-600', darkBg: 'dark:bg-purple-900/30', darkText: 'dark:text-purple-400', glow: 'bg-purple-500', description: 'إحصائيات العمليات لكل مستخدم' },

    // System
    { value: 'auditReport', category: 'system', label: 'تقرير العمليات المعدلة', icon: AlertTriangle, color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-600', darkBg: 'dark:bg-red-900/30', darkText: 'dark:text-red-400', glow: 'bg-red-500', description: 'سجل العمليات التي تم تعديلها أو حذفها' },
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

              {['byMaterial', 'materialLedger'].includes(filterType) && (
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

              {['scrapReport', 'wasteReport', 'rulersReport', 'notesSearchReport', 'openingStockReport', 'closingStockReport'].includes(filterType) && (
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 block mr-1">بحث في النتائج</label>
                      <div className="relative">
                        <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input 
                          type="text" 
                          placeholder="ابحث عن مادة، باركود، مستلم، ملاحظات..." 
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