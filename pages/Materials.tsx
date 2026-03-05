
import React, { useState } from 'react';
import { Material, SettingsData, Transaction, User, Warehouse } from '@/types';
import { addMaterial, updateMaterial, deleteMaterial, acknowledgeNewMaterial, addTransaction } from '@/services/mockApi';
import { Plus, Edit, Trash2, AlertTriangle, Printer, Download, CheckCircle, PlusCircle, RotateCcw, Upload } from 'lucide-react';
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
    onClose: () => void; 
    onSave: (amount: number, reason: string, note: string, warehouseId: string) => void; 
}> = ({ material, warehouses, actionType, onClose, onSave }) => {
    const [amount, setAmount] = useState(1);
    const [warehouseId, setWarehouseId] = useState(warehouses.length > 0 ? warehouses[0].id : '');
    const [reason, setReason] = useState(
        actionType === 'supply' ? 'توريد جديد' : 
        actionType === 'return' ? 'مرتجع من مستلم' : 'مرتجع للمورد'
    );
    const [note, setNote] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(amount, reason, note, warehouseId);
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
                    <div>
                        <label className="block mb-1 text-sm font-medium dark:text-gray-300">الكمية</label>
                        <input type="number" min="1" value={amount} onChange={(e) => setAmount(Number(e.target.value))} required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
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
    onClose: () => void; 
    onSave: (material: Omit<Material, 'id' | 'isNew'> | Material) => void; 
}> = ({ material, warehouses, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: material?.name || '',
        materialType: material?.materialType || '',
        category: material?.category || '',
        specifications: material?.specifications || '',
        supplier: material?.supplier || '',
        barcode: material?.barcode || '',
        color: material?.color || '',
        unit: material?.unit || '',
        minStock: material?.minStock || 0,
        weightFormula: material?.weightFormula || { pieces: 100, weight: 5 },
        stocks: material?.stocks || (warehouses.length > 0 ? { [warehouses[0].id]: 0 } : {}),
    });
    
    const isEditing = !!material?.id;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: (name === 'minStock') ? Number(value) : value }));
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
        const dataToSave = { ...formData, currentStock: totalStock };
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
                <textarea name="specifications" value={formData.specifications} onChange={handleChange} placeholder="المواصفات" required rows={3} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                <div className="grid grid-cols-2 gap-4">
                    <input type="text" name="unit" value={formData.unit} onChange={handleChange} placeholder="الوحدة" required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <input type="number" name="minStock" value={formData.minStock} onChange={handleChange} placeholder="الحد الأدنى" required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
                
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">الأرصدة الافتتاحية في المستودعات</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {warehouses.map(w => (
                            <div key={w.id} className="flex items-center gap-2">
                                <span className="text-sm w-1/2 truncate dark:text-gray-300" title={w.name}>{w.name}</span>
                                <input 
                                    type="number" 
                                    min="0"
                                    value={formData.stocks[w.id] || 0} 
                                    onChange={(e) => handleStockChange(w.id, e.target.value)}
                                    className="w-1/2 p-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                                    disabled={isEditing} // Prevent editing stock directly if editing material
                                    title={isEditing ? "لا يمكن تعديل الرصيد من هنا. استخدم الحركات اليومية." : ""}
                                />
                            </div>
                        ))}
                    </div>
                    {isEditing && <p className="text-[10px] text-amber-500 mt-1">تعديل الأرصدة يتم عبر الحركات اليومية فقط.</p>}
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                    <label className="block text-xs font-bold mb-2 text-gray-500 dark:text-gray-400">معادلة الوزن (لحاسبة الوزن)</label>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] mb-1 dark:text-gray-400">عدد القطع</label>
                            <input 
                                type="number" 
                                value={formData.weightFormula.pieces} 
                                onChange={(e) => setFormData(prev => ({ ...prev, weightFormula: { ...prev.weightFormula, pieces: Number(e.target.value) } }))}
                                className="w-full p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] mb-1 dark:text-gray-400">الوزن المقابل (كغم)</label>
                            <input 
                                type="number" 
                                step="0.01"
                                value={formData.weightFormula.weight} 
                                onChange={(e) => setFormData(prev => ({ ...prev, weightFormula: { ...prev.weightFormula, weight: Number(e.target.value) } }))}
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

  const canPrint = user.role === 'admin' || user.permissions?.canPrint;
  const canExport = user.role === 'admin' || user.permissions?.canExport;
  const isAdmin = user.role === 'admin';

  const handleSave = (material: Omit<Material, 'id' | 'isNew'> | Material) => {
    if ('id' in material) { updateMaterial(material); } else { addMaterial(material); }
    onDataChange(); setIsModalOpen(false); setSelectedMaterial(null);
  };
  
  // Added date property to transaction to fix TypeScript error
  const handleStockIn = (amount: number, reason: string, note: string, warehouseId: string) => {
    if (!selectedMaterial) return;
    addTransaction({
        type: stockActionType === 'supplier-return' ? 'return' : 'in',
        materialId: selectedMaterial.id,
        quantity: amount,
        warehouseId: warehouseId,
        recipient: reason,
        notes: note,
        color: selectedMaterial.color,
        date: new Date().toISOString(),
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

  const handleExport = () => {
    const dataToExport = materials.map(m => ({ 
      "اسم المادة": m.name, 
      "اللون": m.color || '-', 
      "نوع المادة": m.materialType, 
      "الفئة": m.category, 
      "المورد": m.supplier, 
      "الباركود": m.barcode, 
      "الوحدة": m.unit, 
      "الكمية الحالية": m.currentStock, 
      "الحد الأدنى": m.minStock, 
      "المواصفات": m.specifications, 
    }));
    exportToExcel(dataToExport, "materials_report", "المواد");
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
              <th>اللون</th>
              <th>الباركود</th>
              <th>الكمية الحالية</th>
              <th>الحد الأدنى</th>
            </tr>
          </thead>
          <tbody>
            ${materials.map(m => `
              <tr>
                <td>${m.name}</td>
                <td>${m.color || '-'}</td>
                <td>${m.barcode}</td>
                <td>${m.currentStock} ${m.unit}</td>
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
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">إدارة المواد</h1>
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

      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-x-auto border dark:border-gray-700 transition-colors">
        <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">المادة / اللون</th>
              <th scope="col" className="px-6 py-3">الباركود</th>
              <th scope="col" className="px-6 py-3">الكمية الحالية</th>
              <th scope="col" className="px-6 py-3">الحد الأدنى</th>
              <th scope="col" className="px-6 py-3">المورد</th>
              {isAdmin && <th scope="col" className="px-6 py-3 text-center">عمليات سريعة</th>}
              {isAdmin && <th scope="col" className="px-6 py-3 text-center">إدارة</th>}
            </tr>
          </thead>
          <tbody>
            {materials.map(material => (
              <tr key={material.id} className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors ${material.isNew ? 'bg-red-50 dark:bg-red-900/10' : 'bg-white dark:bg-gray-800'}`}>
                <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 whitespace-nowrap dark:text-white">{material.name}</div>
                    {material.color && <div className="text-[10px] text-gray-400">اللون: {material.color}</div>}
                </td>
                <td className="px-6 py-4 font-mono text-xs">{material.barcode}</td>
                <td className={`px-6 py-4 font-bold ${material.currentStock < material.minStock ? 'text-red-500' : 'text-emerald-500'}`}>
                    {material.currentStock} {material.unit}
                    {material.currentStock < material.minStock && <AlertTriangle className="inline-block mr-1 text-red-500" size={16}/>}
                </td>
                <td className="px-6 py-4">{material.minStock} {material.unit}</td>
                <td className="px-6 py-4 text-xs">{material.supplier}</td>
                {isAdmin && (
                  <td className="px-6 py-4 flex items-center justify-center gap-4">
                    <button onClick={() => openStockModal(material, 'supply')} className="text-emerald-500 hover:text-emerald-700 flex flex-col items-center transition-colors" title="توريد جديد">
                        <PlusCircle size={22}/>
                        <span className="text-[10px] mt-0.5 font-bold">توريد</span>
                    </button>
                    <button onClick={() => openStockModal(material, 'return')} className="text-amber-500 hover:text-amber-700 flex flex-col items-center transition-colors" title="مرتجع من مستلم">
                        <RotateCcw size={22}/>
                        <span className="text-[10px] mt-0.5 font-bold">مرتجع</span>
                    </button>
                    <button onClick={() => openStockModal(material, 'supplier-return')} className="text-red-500 hover:text-red-700 flex flex-col items-center transition-colors" title="مرتجع للمورد">
                        <RotateCcw size={22} className="rotate-180"/>
                        <span className="text-[10px] mt-0.5 font-bold">للمورد</span>
                    </button>
                  </td>
                )}
                {isAdmin && (
                  <td className="px-6 py-4 flex items-center justify-center gap-3 border-r dark:border-gray-700">
                    {material.isNew && (
                        <button onClick={() => handleAcknowledge(material.id)} className="text-sky-500 hover:text-sky-700" title="تأكيد الاستلام"><CheckCircle size={22}/></button>
                    )}
                    <button onClick={() => { setSelectedMaterial(material); setIsModalOpen(true); }} className="text-blue-500 hover:text-blue-700" title="تعديل"><Edit size={22}/></button>
                    <button onClick={() => setMaterialToDelete(material)} className="text-red-500 hover:text-red-700" title="حذف"><Trash2 size={22}/></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && <MaterialModal material={selectedMaterial} warehouses={warehouses} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
      {isStockInModalOpen && selectedMaterial && (
          <StockInModal 
            material={selectedMaterial} 
            warehouses={warehouses}
            actionType={stockActionType}
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