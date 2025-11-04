import React, { useState } from 'react';
import { Material, SettingsData } from '@/types';
import { addMaterial, updateMaterial, deleteMaterial, acknowledgeNewMaterial } from '@/services/mockApi';
import { Plus, Edit, Trash2, AlertTriangle, Printer, Download, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface MaterialsProps {
  materials: Material[];
  onDataChange: () => void;
  userRole: 'admin' | 'visitor';
  settings: SettingsData | null;
}

const MaterialModal: React.FC<{ material: Partial<Material> | null; onClose: () => void; onSave: (material: Omit<Material, 'id' | 'isNew'> | Material) => void; }> = ({ material, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: material?.name || '',
        materialType: material?.materialType || '',
        category: material?.category || '',
        specifications: material?.specifications || '',
        barcode: material?.barcode || '',
        unit: material?.unit || '',
        minStock: material?.minStock || 0,
        currentStock: material?.currentStock || 0,
    });
    
    const isEditing = !!material?.id;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'minStock' || name === 'currentStock' ? Number(value) : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(isEditing ? { ...formData, id: material.id!, isNew: material.isNew! } : formData);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{isEditing ? 'تعديل المادة' : 'إضافة مادة جديدة'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="اسم المادة" required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                <input type="text" name="materialType" value={formData.materialType} onChange={handleChange} placeholder="نوع المادة" required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                <input type="text" name="category" value={formData.category} onChange={handleChange} placeholder="الفئة" required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                <input type="text" name="barcode" value={formData.barcode} onChange={handleChange} placeholder="الباركود" required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                <textarea name="specifications" value={formData.specifications} onChange={handleChange} placeholder="المواصفات" required rows={3} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                <input type="text" name="unit" value={formData.unit} onChange={handleChange} placeholder="الوحدة (كرتونة، حبة)" required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                <input type="number" name="minStock" value={formData.minStock} onChange={handleChange} placeholder="الحد الأدنى للمخزون" required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                <input type="number" name="currentStock" value={formData.currentStock} onChange={handleChange} placeholder="الكمية الحالية" required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                <div className="flex justify-end space-x-2 space-x-reverse pt-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded">إلغاء</button>
                    <button type="submit" className="px-4 py-2 bg-sky-500 text-white rounded">{isEditing ? 'حفظ التعديلات' : 'إضافة'}</button>
                </div>
            </form>
        </div>
      </div>
    );
};

const Materials: React.FC<MaterialsProps> = ({ materials, onDataChange, userRole, settings }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);

  const handleSave = (material: Omit<Material, 'id' | 'isNew'> | Material) => {
    if ('id' in material) {
        updateMaterial(material);
    } else {
        addMaterial(material);
    }
    onDataChange();
    setIsModalOpen(false);
    setSelectedMaterial(null);
  };
  
  const handleDelete = (id: string) => {
    deleteMaterial(id);
    onDataChange();
    setMaterialToDelete(null);
  };
  
  const handleAcknowledge = (id: string) => {
    acknowledgeNewMaterial(id);
    onDataChange();
  };

  const handleExport = () => {
    const dataToExport = materials.map(m => ({
        "اسم المادة": m.name,
        "نوع المادة": m.materialType,
        "الفئة": m.category,
        "الباركود": m.barcode,
        "الوحدة": m.unit,
        "الكمية الحالية": m.currentStock,
        "الحد الأدنى": m.minStock,
        "المواصفات": m.specifications,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "المواد");
    XLSX.writeFile(workbook, "materials_report.xlsx");
  };

  const handlePrint = () => {
    const reportTitle = `تقرير جرد المواد`;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

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
          <h2 class="report-title">${reportTitle} - ${new Date().toLocaleDateString('ar-EG')}</h2>
          <table>
            <thead>
              <tr>
                <th>اسم المادة</th><th>نوع المادة</th><th>الفئة</th><th>الباركود</th><th>الكمية الحالية</th><th>الحد الأدنى</th>
              </tr>
            </thead>
            <tbody>
              ${materials.map(m => `
                <tr>
                  <td>${m.name}</td><td>${m.materialType}</td><td>${m.category}</td><td>${m.barcode}</td><td>${m.currentStock} ${m.unit}</td><td>${m.minStock} ${m.unit}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">إدارة المواد</h1>
        {userRole === 'admin' && (
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="flex items-center px-4 py-2 bg-emerald-500 text-white rounded-lg shadow hover:bg-emerald-600" disabled={materials.length === 0}><Download className="ml-2" size={18} />تصدير XLSX</button>
            <button onClick={handlePrint} className="flex items-center px-4 py-2 bg-sky-500 text-white rounded-lg shadow hover:bg-sky-600" disabled={materials.length === 0}><Printer className="ml-2" size={18} />طباعة</button>
            <button onClick={() => { setSelectedMaterial(null); setIsModalOpen(true); }} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"><Plus className="ml-2" size={20} />إضافة مادة</button>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-x-auto">
        <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">اسم المادة</th>
              <th scope="col" className="px-6 py-3">نوع المادة</th>
              <th scope="col" className="px-6 py-3">الفئة</th>
              <th scope="col" className="px-6 py-3">الباركود</th>
              <th scope="col" className="px-6 py-3">الكمية الحالية</th>
              <th scope="col" className="px-6 py-3">الحد الأدنى</th>
              <th scope="col" className="px-6 py-3">المواصفات</th>
              {userRole === 'admin' && <th scope="col" className="px-6 py-3">إجراءات</th>}
            </tr>
          </thead>
          <tbody>
            {materials.map(material => (
              <tr key={material.id} className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 ${material.isNew ? 'bg-red-100 dark:bg-red-900/30' : 'bg-white dark:bg-gray-800'}`}>
                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{material.name}</td>
                <td className="px-6 py-4">{material.materialType}</td>
                <td className="px-6 py-4">{material.category}</td>
                <td className="px-6 py-4 font-mono">{material.barcode}</td>
                <td className={`px-6 py-4 font-bold ${material.currentStock < material.minStock ? 'text-red-500' : 'text-emerald-500'}`}>
                    {material.currentStock} {material.unit}
                    {material.currentStock < material.minStock && <AlertTriangle className="inline-block mr-1 text-red-500" size={16}/>}
                </td>
                <td className="px-6 py-4">{material.minStock} {material.unit}</td>
                <td className="px-6 py-4 whitespace-pre-wrap max-w-xs">{material.specifications}</td>
                {userRole === 'admin' && (
                  <td className="px-6 py-4 flex items-center gap-2">
                    {material.isNew && (
                        <button onClick={() => handleAcknowledge(material.id)} className="text-green-500 hover:text-green-700" title="تأكيد الاستلام"><CheckCircle size={20}/></button>
                    )}
                    <button onClick={() => { setSelectedMaterial(material); setIsModalOpen(true); }} className="text-blue-500 hover:text-blue-700"><Edit size={20}/></button>
                    <button onClick={() => setMaterialToDelete(material)} className="text-red-500 hover:text-red-700"><Trash2 size={20}/></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {materials.length === 0 && <p className="text-center p-4">لا توجد مواد لعرضها.</p>}
      </div>

      {isModalOpen && <MaterialModal material={selectedMaterial} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
      
      {materialToDelete && (
         <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm text-center">
                <h3 className="text-lg font-bold mb-4">تأكيد الحذف</h3>
                <p>هل أنت متأكد أنك تريد حذف المادة "{materialToDelete.name}"؟</p>
                <div className="flex justify-center space-x-4 space-x-reverse mt-6">
                    <button onClick={() => setMaterialToDelete(null)} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded">إلغاء</button>
                    <button onClick={() => handleDelete(materialToDelete.id)} className="px-4 py-2 bg-red-500 text-white rounded">حذف</button>
                </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default Materials;