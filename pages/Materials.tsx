
import React, { useState, useMemo } from 'react';
import { Material, SettingsData, Transaction, User, Warehouse } from '@/types';
import { addMaterial, updateMaterial, deleteMaterial, acknowledgeNewMaterial, addTransaction } from '@/services/mockApi';
import { Plus, Edit, Trash2, AlertTriangle, Printer, Download, CheckCircle, PlusCircle, RotateCcw, Upload, Users, Warehouse as WarehouseIcon } from 'lucide-react';
import * as XLSX from 'xlsx';
import { exportToExcel } from '@/utils/excelExport';
import { usePrint } from '@/services/PrintContext';

interface MaterialsProps {
  materials: Material[];
  warehouses: Warehouse[];
  onDataChange: () => void;
  user: User;
  settings: SettingsData | null;
}

// Modal for Adding/Returning Stock (Incremental)
const StockInModal: React.FC<{ 
    material: Material; 
    warehouses: Warehouse[];
    actionType: 'supply' | 'return' | 'supplier-return';
    settings: SettingsData | null;
    onClose: () => void; 
    onSave: (amount: number, reason: string, note: string, warehouseId: string, date: string, price: number) => void; 
}> = ({ material, warehouses, actionType, settings, onClose, onSave }) => {
    const [amount, setAmount] = useState(1);
    const [price, setPrice] = useState(material.price || 0);
    const [warehouseId, setWarehouseId] = useState(warehouses.length > 0 ? warehouses[0].id : '');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [reason, setReason] = useState(
        actionType === 'supply' ? 'توريد جديد' : 
        actionType === 'return' ? 'مرتجع من مستلم' : 'مرتجع للمورد'
    );
    const [note, setNote] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(amount, reason, note, warehouseId, date, price);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <div className="flex items-center gap-2 mb-2">
                    {actionType === 'supply' ? <PlusCircle className="text-emerald-500" /> : 
                     actionType === 'return' ? <RotateCcw className="text-amber-500" /> :
                     <RotateCcw className="text-red-500" />}
                    <h2 className="text-xl font-bold dark:text-white">
                        {actionType === 'supply' ? 'توريد كمية جديدة' : 
                         actionType === 'return' ? 'إرجاع مادة للمستودع' : 'إرجاع مادة للمورد'}
                    </h2>
                </div>
                <p className="text-sm text-gray-500 mb-4">المادة: <span className="font-bold text-gray-800 dark:text-white">{material.name}</span></p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1 text-sm font-medium dark:text-gray-300">الكمية</label>
                            <input type="number" step="0.1" min="0" value={amount} onChange={(e) => setAmount(Number(e.target.value))} required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium dark:text-gray-300">السعر الحالي ({settings?.currencySymbol || 'ج.م'})</label>
                            <input type="number" step="0.01" value={price} onChange={(e) => setPrice(Number(e.target.value))} required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        </div>
                    </div>
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-800 flex justify-between items-center text-xs">
                        <span className="text-blue-700 dark:text-blue-300 font-bold">إجمالي القيمة:</span>
                        <span className="text-blue-800 dark:text-blue-200 font-black">{(amount * price).toLocaleString('ar-EG')} {settings?.currencySymbol || 'ج.م'}</span>
                    </div>
                    <div>
                        <label className="block mb-1 text-sm font-medium dark:text-gray-300">المستودع</label>
                        <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            {warehouses.map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block mb-1 text-sm font-medium dark:text-gray-300">التاريخ</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                        <label className="block mb-1 text-sm font-medium dark:text-gray-300">السبب / المصدر</label>
                        <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            {actionType === 'supply' ? (
                                <>
                                    <option value="توريد جديد">توريد جديد</option>
                                    <option value="تصحيح مخزون">تصحيح مخزون (+)</option>
                                </>
                            ) : actionType === 'return' ? (
                                <>
                                    <option value="مرتجع من مستلم">مرتجع من مستلم</option>
                                    <option value="مرتجع تالف">مرتجع تالف</option>
                                    <option value="إلغاء عملية صرف">إلغاء عملية صرف</option>
                                </>
                            ) : (
                                <>
                                    <option value="مرتجع للمورد">مرتجع للمورد</option>
                                    <option value="بضاعة تالفة للمورد">بضاعة تالفة للمورد</option>
                                    <option value="انتهاء صلاحية">انتهاء صلاحية</option>
                                </>
                            )}
                            <option value="أخرى">أخرى</option>
                        </select>
                    </div>
                    <div>
                        <label className="block mb-1 text-sm font-medium dark:text-gray-300">ملاحظات إضافية</label>
                        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={actionType === 'return' ? "مثلاً: اسم الشخص الذي أعاد المادة" : "ملاحظات حول المورد أو الفاتورة"} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" rows={2} />
                    </div>
                    <div className="flex justify-end space-x-2 space-x-reverse pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 dark:text-white rounded transition-colors">إلغاء</button>
                        <button type="submit" className={`px-4 py-2 text-white rounded transition-colors ${
                            actionType === 'supply' ? 'bg-emerald-500 hover:bg-emerald-600' : 
                            actionType === 'return' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-red-500 hover:bg-red-600'}`}>
                            تأكيد {actionType === 'supply' ? 'التوريد' : actionType === 'return' ? 'المرتجع' : 'الإرجاع للمورد'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const MaterialModal: React.FC<{ 
    material: Partial<Material> | null; 
    warehouses: Warehouse[];
    settings: SettingsData | null;
    onClose: () => void; 
    onSave: (material: Omit<Material, 'id' | 'isNew'> | Material) => void; 
}> = ({ material, warehouses, settings, onClose, onSave }) => {
    const [formData, setFormData] = useState<{
        name: string;
        materialType: string;
        category: string;
        specifications: string;
        supplier: string;
        barcode: string;
        color: string;
        unit: string;
        price: number;
        minStock: number;
        createdAt: string;
        expiryDate?: string;
        reservedStock?: number;
        reservationReason?: string;
        reservedBy?: string;
        weightFormula: { pieces: number; weight: number };
        stocks: Record<string, number>;
    }>({
        name: material?.name || '',
        materialType: material?.materialType || '',
        category: material?.category || '',
        specifications: material?.specifications || '',
        supplier: material?.supplier || '',
        barcode: material?.barcode || '',
        color: material?.color || '',
        unit: material?.unit || '',
        price: material?.price || 0,
        minStock: material?.minStock || 0,
        createdAt: material?.createdAt ? new Date(material.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        expiryDate: material?.expiryDate || '',
        reservedStock: material?.reservedStock || 0,
        reservationReason: material?.reservationReason || '',
        reservedBy: material?.reservedBy || '',
        weightFormula: material?.weightFormula || { pieces: 100, weight: 5 },
        stocks: material?.stocks || (warehouses.length > 0 ? { [warehouses[0].id]: 0 } : {}),
    });
    
    const isEditing = !!material?.id;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: (name === 'minStock' || name === 'price' || name === 'reservedStock') ? Number(value) : value }));
    };

    const handleStockChange = (warehouseId: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            stocks: {
                ...prev.stocks,
                [warehouseId]: Number(value)
            }
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const totalStock = Object.values(formData.stocks).reduce((sum, val) => sum + val, 0);
        const dataToSave = { ...formData, currentStock: totalStock, createdAt: new Date(formData.createdAt).toISOString() };
        onSave(isEditing ? { ...dataToSave, id: material.id!, isNew: material.isNew! } : dataToSave);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 dark:text-white">{isEditing ? 'تعديل المادة' : 'إضافة مادة جديدة'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="اسم المادة" required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                <div className="grid grid-cols-2 gap-4">
                    <input type="text" name="materialType" value={formData.materialType} onChange={handleChange} placeholder="نوع المادة" required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <input type="text" name="category" value={formData.category} onChange={handleChange} placeholder="الفئة" required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <input type="text" name="supplier" value={formData.supplier} onChange={handleChange} placeholder="المورد" required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <input type="text" name="barcode" value={formData.barcode} onChange={handleChange} placeholder="الباركود" required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
                <input type="text" name="color" value={formData.color} onChange={handleChange} placeholder="اللون (اختياري)" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block mb-1 text-xs font-bold text-gray-500 dark:text-gray-400">تاريخ الإضافة</label>
                        <input type="date" name="createdAt" value={formData.createdAt} onChange={handleChange} required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                        <label className="block mb-1 text-xs font-bold text-gray-500 dark:text-gray-400">تاريخ انتهاء الصلاحية</label>
                        <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                </div>
                <textarea name="specifications" value={formData.specifications} onChange={handleChange} placeholder="المواصفات" required rows={3} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800/50 space-y-3">
                    <label className="block text-sm font-bold text-yellow-800 dark:text-yellow-500">بيانات الحجز (اختياري)</label>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1 text-xs font-bold text-gray-500 dark:text-gray-400">الكمية المحجوزة</label>
                            <input type="number" name="reservedStock" step="0.1" min="0" value={formData.reservedStock} onChange={handleChange} placeholder="الكمية" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        </div>
                        <div>
                            <label className="block mb-1 text-xs font-bold text-gray-500 dark:text-gray-400">محجوزة بواسطة</label>
                            <input type="text" name="reservedBy" value={formData.reservedBy} onChange={handleChange} placeholder="اسم الشخص/الجهة" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        </div>
                    </div>
                    <div>
                        <label className="block mb-1 text-xs font-bold text-gray-500 dark:text-gray-400">سبب الحجز</label>
                        <input type="text" name="reservationReason" value={formData.reservationReason} onChange={handleChange} placeholder="سبب الحجز" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block mb-1 text-xs font-bold text-gray-500 dark:text-gray-400">الوحدة (اختر أو اكتب)</label>
                        <div className="relative">
                            <input 
                                list="units-list"
                                name="unit" 
                                value={formData.unit} 
                                onChange={handleChange} 
                                placeholder="الوحدة" 
                                required 
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                            />
                            <datalist id="units-list">
                                <option value="حبة" />
                                <option value="متر" />
                                <option value="كغم" />
                                <option value="كرتونة" />
                                <option value="طقم" />
                                <option value="درزن" />
                            </datalist>
                        </div>
                    </div>
                    <div>
                        <label className="block mb-1 text-xs font-bold text-gray-500 dark:text-gray-400">السعر ({settings?.currencySymbol || 'ج.م'})</label>
                        <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder={`السعر (${settings?.currencySymbol || 'ج.م'})`} required step="0.01" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                </div>
                <div>
                    <label className="block mb-1 text-xs font-bold text-gray-500 dark:text-gray-400">الحد الأدنى للمخزون</label>
                    <input type="number" name="minStock" step="0.1" value={formData.minStock} onChange={handleChange} placeholder="الحد الأدنى" required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
                
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">الأرصدة الافتتاحية في المستودعات</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {warehouses.map(w => (
                            <div key={w.id} className="flex items-center gap-2">
                                <span className="text-sm w-1/2 truncate dark:text-gray-300" title={w.name}>{w.name}</span>
                                <input 
                                    type="number" 
                                    step="0.1"
                                    min="0"
                                    value={formData.stocks[w.id] || 0} 
                                    onChange={(e) => handleStockChange(w.id, e.target.value)}
                                    className="w-1/2 p-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                                    title="يمكنك تعديل الرصيد الافتتاحي هنا أو عبر الحركات اليومية."
                                />
                            </div>
                        ))}
                    </div>
                    {isEditing && <p className="text-[10px] text-amber-500 mt-1">تنبيه: تعديل الرصيد الافتتاحي سيؤثر على الرصيد الإجمالي للمادة.</p>}
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                    <label className="block text-xs font-bold mb-2 text-gray-500 dark:text-gray-400">معادلة الوزن (لحاسبة الوزن)</label>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] mb-1 dark:text-gray-400">عدد القطع</label>
                            <input 
                                type="number" 
                                step="0.1"
                                value={formData.weightFormula.pieces} 
                                onChange={(e) => setFormData(prev => ({ ...prev, weightFormula: { pieces: Number(e.target.value), weight: prev.weightFormula.weight } }))}
                                className="w-full p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] mb-1 dark:text-gray-400">الوزن المقابل (كغم)</label>
                            <input 
                                type="number" 
                                step="0.01"
                                value={formData.weightFormula.weight} 
                                onChange={(e) => setFormData(prev => ({ ...prev, weightFormula: { weight: Number(e.target.value), pieces: prev.weightFormula.pieces } }))}
                                className="w-full p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                            />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end space-x-2 space-x-reverse pt-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 dark:text-white rounded">إلغاء</button>
                    <button type="submit" className="px-4 py-2 bg-sky-500 text-white rounded hover:bg-sky-600">{isEditing ? 'حفظ التعديلات' : 'إضافة'}</button>
                </div>
            </form>
        </div>
      </div>
    );
};

const Materials: React.FC<MaterialsProps> = ({ materials, warehouses, onDataChange, user, settings }) => {
  const { triggerPrint } = usePrint();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [stockActionType, setStockActionType] = useState<'supply' | 'return' | 'supplier-return'>('supply');
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);

  const [pendingMaterialUpdate, setPendingMaterialUpdate] = useState<Material | null>(null);
  const [isUpdateConfirmOpen, setIsUpdateConfirmOpen] = useState(false);

  const canPrint = user.role === 'admin' || user.permissions?.canPrint;
  const canExport = user.role === 'admin' || user.permissions?.canExport;
  const isAdmin = user.role === 'admin';

  const supplierSummary = useMemo(() => {
    const summary: Record<string, { total: number; count: number; unit: string }> = {};
    materials.forEach(m => {
      const key = `${m.supplier}-${m.unit}`;
      if (!summary[key]) {
        summary[key] = { total: 0, count: 0, unit: m.unit };
      }
      summary[key].total += m.currentStock;
      summary[key].count += 1;
    });
    return summary;
  }, [materials]);

  const warehouseSummary = useMemo(() => {
    const summary: Record<string, Record<string, number>> = {};
    materials.forEach(m => {
      Object.entries(m.stocks).forEach(([whId, qty]) => {
        if (!summary[whId]) summary[whId] = {};
        if (!summary[whId][m.unit]) summary[whId][m.unit] = 0;
        summary[whId][m.unit] += qty;
      });
    });
    return summary;
  }, [materials, warehouses]);

  const handleSave = (material: Omit<Material, 'id' | 'isNew'> | Material) => {
    if ('id' in material) {
        const oldMaterial = materials.find(m => m.id === material.id);
        const stockChanged = oldMaterial && Object.entries(material.stocks).some(([whId, qty]) => (oldMaterial.stocks[whId] || 0) !== qty);
        
        if (stockChanged) {
            setPendingMaterialUpdate(material as Material);
            setIsUpdateConfirmOpen(true);
            return;
        }
        updateMaterial(material as Material);
    } else {
        addMaterial(material);
    }
    onDataChange(); setIsModalOpen(false); setSelectedMaterial(null);
  };

  const confirmUpdate = (isCorrection: boolean) => {
    if (pendingMaterialUpdate) {
        updateMaterial(pendingMaterialUpdate, isCorrection);
        setPendingMaterialUpdate(null);
        setIsUpdateConfirmOpen(false);
        onDataChange();
        setIsModalOpen(false);
        setSelectedMaterial(null);
    }
  };
  
  // Added date property to transaction to fix TypeScript error
  const handleStockIn = (amount: number, reason: string, note: string, warehouseId: string, date: string, price: number) => {
    if (!selectedMaterial) return;
    
    // Update material price if it changed
    if (price !== selectedMaterial.price) {
        updateMaterial({ ...selectedMaterial, price });
    }

    addTransaction({
        type: stockActionType === 'supplier-return' ? 'return' : 'in',
        materialId: selectedMaterial.id,
        quantity: amount,
        warehouseId: warehouseId,
        recipient: reason,
        notes: note,
        color: selectedMaterial.color,
        date: new Date(date).toISOString(),
    });
    onDataChange();
    setIsStockInModalOpen(false);
    setSelectedMaterial(null);
  };

  const openStockModal = (material: Material, type: 'supply' | 'return' | 'supplier-return') => {
      setSelectedMaterial(material);
      setStockActionType(type);
      setIsStockInModalOpen(true);
  };

  const handleDelete = (id: string) => { deleteMaterial(id); onDataChange(); setMaterialToDelete(null); };
  const handleAcknowledge = (id: string) => { acknowledgeNewMaterial(id); onDataChange(); };

  const handleExport = async () => {
    const dataToExport = materials.map(m => ({ 
      "اسم المادة": m.name, 
      "اللون": m.color || '-', 
      "السعر": m.price || 0,
      "نوع المادة": m.materialType, 
      "الفئة": m.category, 
      "المورد": m.supplier, 
      "الباركود": m.barcode, 
      "الوحدة": m.unit, 
      "الكمية الحالية": m.currentStock, 
      "الكمية المحجوزة": m.reservedStock || 0,
      "محجوزة بواسطة": m.reservedBy || '-',
      "سبب الحجز": m.reservationReason || '-',
      "تاريخ الصلاحية": m.expiryDate ? new Date(m.expiryDate).toLocaleDateString('ar-EG') : '-',
      "الحد الأدنى": m.minStock, 
      "المواصفات": m.specifications, 
    }));
    await exportToExcel(dataToExport, "materials_report", "المواد");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          alert("الملف فارغ أو غير صالح");
          return;
        }

        jsonData.forEach((row: any) => {
          const name = row["اسم المادة"] || row["name"];
          if (!name) return;

          const materialData: Omit<Material, 'id' | 'isNew'> = {
            name: String(name),
            materialType: String(row["نوع المادة"] || row["النوع"] || row["materialType"] || "غير محدد"),
            category: String(row["الفئة"] || row["category"] || "عام"),
            specifications: String(row["المواصفات"] || row["specifications"] || "-"),
            supplier: String(row["المورد"] || row["supplier"] || "-"),
            barcode: String(row["الباركود"] || row["barcode"] || `BC-${Date.now()}-${Math.floor(Math.random() * 1000)}`),
            unit: String(row["الوحدة"] || row["unit"] || "حبة"),
            minStock: Number(row["الحد الأدنى"] || row["minStock"] || 0),
            currentStock: Number(row["الكمية الحالية"] || row["الكمية"] || row["currentStock"] || 0),
            color: String(row["اللون"] || row["color"] || ""),
            price: Number(row["السعر"] || row["price"] || 0),
            createdAt: row["تاريخ الإضافة"] || row["التاريخ"] || row["createdAt"] || new Date().toISOString(),
            stocks: warehouses.length > 0 ? { [warehouses[0].id]: Number(row["الكمية الحالية"] || row["الكمية"] || row["currentStock"] || 0) } : {}
          };
          addMaterial(materialData);
        });

        onDataChange();
        alert(`تم استيراد ${jsonData.length} مادة بنجاح`);
      } catch (error) {
        console.error("Error importing Excel:", error);
        alert("حدث خطأ أثناء استيراد الملف. تأكد من تنسيق الملف.");
      }
      // Reset input
      e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  const handlePrint = () => {
    const reportTitle = `تقرير جرد المواد`;
    const html = `
      <div class="print-container">
        <style>
          .print-container { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; background: white; color: black; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }
          .header-info { text-align: right; }
          table { width: 100%; border-collapse: collapse; font-size: 0.9em; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
          th { background-color: #f2f2f2; }
          h2 { text-align: center; margin-top: 0; }
        </style>
        <div class="header">
          ${settings?.companyLogo ? `<img src="${settings.companyLogo}" style="max-width:80px">` : '<div></div>'}
          <div class="header-info">
            <h2>${settings?.companyName || ''}</h2>
            <p>${settings?.companyAddress || ''}</p>
          </div>
        </div>
        <h2>${reportTitle}</h2>
        <table>
          <thead>
            <tr>
              <th>اسم المادة</th>
              <th>السعر</th>
              <th>اللون</th>
              <th>الباركود</th>
              <th>الكمية الحالية</th>
              <th>الكمية المحجوزة</th>
              <th>تاريخ الصلاحية</th>
              <th>الحد الأدنى</th>
            </tr>
          </thead>
          <tbody>
            ${materials.map(m => `
              <tr>
                <td>${m.name}</td>
                <td>${m.price?.toLocaleString('ar-EG')}</td>
                <td>${m.color || '-'}</td>
                <td>${m.barcode}</td>
                <td>${m.currentStock} ${m.unit}</td>
                <td>${m.reservedStock ? `${m.reservedStock} ${m.unit}` : '-'}</td>
                <td>${m.expiryDate ? new Date(m.expiryDate).toLocaleDateString('ar-EG') : '-'}</td>
                <td>${m.minStock} ${m.unit}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    triggerPrint(html);
  };

  return (
    <div className="space-y-4 pb-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">إدارة المواد</h1>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <label className="flex items-center px-4 py-2 bg-amber-500 text-white rounded-lg shadow hover:bg-amber-600 transition-colors cursor-pointer">
              <Upload className="ml-2" size={18} />
              استيراد XLSX
              <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImport} />
            </label>
          )}
          {canExport && (
            <button onClick={handleExport} className="flex items-center px-4 py-2 bg-emerald-500 text-white rounded-lg shadow hover:bg-emerald-600 transition-colors">
              <Download className="ml-2" size={18} />تصدير XLSX
            </button>
          )}
          {canPrint && (
            <button onClick={handlePrint} className="flex items-center px-4 py-2 bg-sky-500 text-white rounded-lg shadow hover:bg-sky-600 transition-colors">
              <Printer className="ml-2" size={18} />طباعة
            </button>
          )}
          {isAdmin && (
            <button onClick={() => { setSelectedMaterial(null); setIsModalOpen(true); }} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors">
              <Plus className="ml-2" size={20} />إضافة مادة
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border dark:border-gray-700">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-gray-800 dark:text-white border-b pb-2 dark:border-gray-700">
                  <Users size={16} className="text-sky-500" /> ملخص حسب المورد والوحدة
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(supplierSummary).map(([key, data]) => {
                      const [supplier] = key.split('-');
                      return (
                          <div key={key} className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border dark:border-gray-700">
                              <div className="text-[10px] text-gray-500 dark:text-gray-400 font-bold truncate" title={supplier}>{supplier}</div>
                              <div className="text-lg font-black text-sky-600 dark:text-sky-400">{data.total.toLocaleString()} <span className="text-[10px] font-normal text-gray-400">{data.unit}</span></div>
                              <div className="text-[10px] text-gray-400">{data.count} أصناف</div>
                          </div>
                      );
                  })}
                  {Object.keys(supplierSummary).length === 0 && <div className="col-span-full text-center py-4 text-gray-400 italic text-sm">لا توجد بيانات</div>}
              </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border dark:border-gray-700">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-gray-800 dark:text-white border-b pb-2 dark:border-gray-700">
                  <WarehouseIcon size={16} className="text-emerald-500" /> إجمالي الكميات حسب المستودع والوحدة
              </h3>
              <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                  {Object.entries(warehouseSummary).map(([whId, units]) => (
                      <div key={whId} className="flex flex-col gap-1 p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg border dark:border-gray-700">
                          <div className="text-xs font-bold text-gray-700 dark:text-gray-300">{warehouses.find(w => w.id === whId)?.name || 'مستودع غير معروف'}</div>
                          <div className="flex flex-wrap gap-2">
                              {Object.entries(units).map(([unit, total]) => (
                                  <span key={unit} className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded text-[10px] font-bold">
                                      {total.toLocaleString()} {unit}
                                  </span>
                              ))}
                          </div>
                      </div>
                  ))}
                  {Object.keys(warehouseSummary).length === 0 && <div className="text-center py-4 text-gray-400 italic text-sm">لا توجد بيانات</div>}
              </div>
          </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-x-auto border dark:border-gray-700 transition-colors">
        <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-4 py-3">المادة / اللون</th>
              <th scope="col" className="px-4 py-3">تاريخ الإضافة</th>
              <th scope="col" className="px-4 py-3">السعر</th>
              <th scope="col" className="px-4 py-3">الباركود</th>
              <th scope="col" className="px-4 py-3">الكمية الحالية</th>
              <th scope="col" className="px-4 py-3">الكمية المحجوزة</th>
              <th scope="col" className="px-4 py-3">تاريخ الصلاحية</th>
              <th scope="col" className="px-4 py-3">الحد الأدنى</th>
              <th scope="col" className="px-4 py-3">المورد</th>
              {isAdmin && <th scope="col" className="px-4 py-3 text-center">عمليات سريعة</th>}
              {isAdmin && <th scope="col" className="px-4 py-3 text-center">إدارة</th>}
            </tr>
          </thead>
          <tbody>
            {materials.map(material => (
              <tr key={material.id} className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors ${material.isNew ? 'bg-red-50 dark:bg-red-900/10' : 'bg-white dark:bg-gray-800'}`}>
                <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 whitespace-nowrap dark:text-white">{material.name}</div>
                    {material.color && <div className="text-[10px] text-gray-400">اللون: {material.color}</div>}
                </td>
                <td className="px-4 py-3 text-xs">{material.createdAt ? new Date(material.createdAt).toLocaleDateString('ar-EG') : '-'}</td>
                <td className="px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-300">{material.price?.toLocaleString('ar-EG')} {settings?.currencySymbol || 'ج.م'}</td>
                <td className="px-4 py-3 font-mono text-xs">{material.barcode}</td>
                <td className={`px-4 py-3 font-bold ${material.currentStock < material.minStock ? 'text-red-500' : 'text-emerald-500'}`}>
                    {material.currentStock} {material.unit}
                    {material.currentStock < material.minStock && <AlertTriangle className="inline-block mr-1 text-red-500" size={16}/>}
                </td>
                <td className="px-4 py-3">
                    {material.reservedStock && material.reservedStock > 0 ? (
                        <div className="flex flex-col">
                            <span className="font-bold text-amber-600 dark:text-amber-400">{material.reservedStock} {material.unit}</span>
                            {material.reservedBy && <span className="text-[10px] text-gray-500">لـ: {material.reservedBy}</span>}
                            {material.reservationReason && <span className="text-[10px] text-gray-400 truncate max-w-[100px]" title={material.reservationReason}>{material.reservationReason}</span>}
                        </div>
                    ) : (
                        <span className="text-gray-400">-</span>
                    )}
                </td>
                <td className="px-4 py-3 text-xs">
                    {material.expiryDate ? (
                        <span className={`${new Date(material.expiryDate) < new Date() ? 'text-red-500 font-bold' : 'text-gray-600 dark:text-gray-400'}`}>
                            {new Date(material.expiryDate).toLocaleDateString('ar-EG')}
                        </span>
                    ) : '-'}
                </td>
                <td className="px-4 py-3">{material.minStock} {material.unit}</td>
                <td className="px-4 py-3 text-xs">{material.supplier}</td>
                {isAdmin && (
                  <td className="px-4 py-3 flex items-center justify-center gap-3">
                    <button onClick={() => openStockModal(material, 'supply')} className="text-emerald-500 hover:text-emerald-700 flex flex-col items-center transition-colors" title="توريد جديد">
                        <PlusCircle size={18}/>
                        <span className="text-[10px] mt-0.5 font-bold">توريد</span>
                    </button>
                    <button onClick={() => openStockModal(material, 'return')} className="text-amber-500 hover:text-amber-700 flex flex-col items-center transition-colors" title="مرتجع من مستلم">
                        <RotateCcw size={18}/>
                        <span className="text-[10px] mt-0.5 font-bold">مرتجع</span>
                    </button>
                    <button onClick={() => openStockModal(material, 'supplier-return')} className="text-red-500 hover:text-red-700 flex flex-col items-center transition-colors" title="مرتجع للمورد">
                        <RotateCcw size={18} className="rotate-180"/>
                        <span className="text-[10px] mt-0.5 font-bold">للمورد</span>
                    </button>
                  </td>
                )}
                {isAdmin && (
                  <td className="px-4 py-3 flex items-center justify-center gap-2 border-r dark:border-gray-700">
                    {material.isNew && (
                        <button onClick={() => handleAcknowledge(material.id)} className="text-sky-500 hover:text-sky-700" title="تأكيد الاستلام"><CheckCircle size={18}/></button>
                    )}
                    <button onClick={() => { setSelectedMaterial(material); setIsModalOpen(true); }} className="text-blue-500 hover:text-blue-700" title="تعديل"><Edit size={18}/></button>
                    <button onClick={() => setMaterialToDelete(material)} className="text-red-500 hover:text-red-700" title="حذف"><Trash2 size={18}/></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isUpdateConfirmOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex justify-center items-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md text-center">
                  <div className="flex justify-center mb-4">
                      <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                          <AlertTriangle className="text-amber-600 dark:text-amber-400" size={32} />
                      </div>
                  </div>
                  <h3 className="text-lg font-bold mb-2 dark:text-white">تأكيد تعديل الكمية</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                      لقد قمت بتعديل كمية المخزون. كيف تريد تسجيل هذا التغيير؟
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                      <button 
                          onClick={() => confirmUpdate(false)} 
                          className="w-full py-3 px-4 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold transition-colors flex flex-col items-center"
                      >
                          <span>تسجيل كحركة (وارد/صادر)</span>
                          <span className="text-[10px] font-normal opacity-80">سيظهر التغيير في الحركات اليومية والتقارير</span>
                      </button>
                      <button 
                          onClick={() => confirmUpdate(true)} 
                          className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-xl font-bold transition-colors flex flex-col items-center"
                      >
                          <span>تصحيح خطأ إدخال فقط</span>
                          <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400">سيتم تعديل الرصيد مباشرة دون تسجيل حركة</span>
                      </button>
                      <button 
                          onClick={() => { setIsUpdateConfirmOpen(false); setPendingMaterialUpdate(null); }} 
                          className="w-full py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
                      >
                          إلغاء
                      </button>
                  </div>
              </div>
          </div>
      )}

      {isModalOpen && <MaterialModal material={selectedMaterial} warehouses={warehouses} settings={settings} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
      {isStockInModalOpen && selectedMaterial && (
          <StockInModal 
            material={selectedMaterial} 
            warehouses={warehouses}
            actionType={stockActionType}
            settings={settings}
            onClose={() => setIsStockInModalOpen(false)} 
            onSave={handleStockIn} 
          />
      )}
      
      {materialToDelete && (
         <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm text-center">
                <h3 className="text-lg font-bold mb-4 dark:text-white">تأكيد الحذف</h3>
                <p className="dark:text-gray-300">هل أنت متأكد من حذف المادة "{materialToDelete.name}"؟</p>
                <div className="flex justify-center space-x-4 space-x-reverse mt-6">
                    <button onClick={() => setMaterialToDelete(null)} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 dark:text-white rounded">إلغاء</button>
                    <button onClick={() => handleDelete(materialToDelete.id)} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">حذف</button>
                </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default Materials;