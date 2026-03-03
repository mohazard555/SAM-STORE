import React, { useState, useMemo } from 'react';
import { Warehouse, Material, User } from '@/types';
import { Building2, Search, Filter, Printer, Download, Package, Plus, Edit, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { exportToExcel } from '@/utils/excelExport';
import { addWarehouse, updateWarehouse, deleteWarehouse } from '@/services/mockApi';

interface WarehousesProps {
  warehouses: Warehouse[];
  materials: Material[];
  user: User;
  onDataChange: () => void;
}

const Warehouses: React.FC<WarehousesProps> = ({ warehouses, materials, user, onDataChange }) => {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState({ name: '', location: '', description: '' });

  const categories = useMemo(() => Array.from(new Set(materials.map(m => m.category))), [materials]);
  const suppliers = useMemo(() => Array.from(new Set(materials.map(m => m.supplier))), [materials]);

  const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId);

  const warehouseMaterials = useMemo(() => {
    if (!selectedWarehouseId) return [];
    return materials.filter(m => (m.stocks?.[selectedWarehouseId] || 0) > 0);
  }, [materials, selectedWarehouseId]);

  const filteredMaterials = useMemo(() => {
    return warehouseMaterials.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            m.barcode.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === '' || m.category === filterCategory;
      const matchesSupplier = filterSupplier === '' || m.supplier === filterSupplier;
      return matchesSearch && matchesCategory && matchesSupplier;
    });
  }, [warehouseMaterials, searchTerm, filterCategory, filterSupplier]);

  const totalQuantity = filteredMaterials.reduce((sum, m) => sum + (m.stocks?.[selectedWarehouseId!] || 0), 0);

  const handleExportExcel = () => {
    if (!selectedWarehouse) return;
    const data = filteredMaterials.map(m => ({
      'الباركود': m.barcode,
      'اسم المادة': m.name,
      'الفئة': m.category,
      'المورد': m.supplier,
      'الرصيد في المستودع': m.stocks?.[selectedWarehouse.id] || 0,
      'الوحدة': m.unit,
    }));

    exportToExcel(data, `warehouse_${selectedWarehouse.name}_materials`, `مواد ${selectedWarehouse.name}`);
  };

  const handlePrint = () => {
    window.print();
  };

  const openModal = (warehouse?: Warehouse) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setFormData({ name: warehouse.name, location: warehouse.location || '', description: warehouse.description || '' });
    } else {
      setEditingWarehouse(null);
      setFormData({ name: '', location: '', description: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingWarehouse) {
      updateWarehouse({ ...editingWarehouse, ...formData });
    } else {
      addWarehouse(formData);
    }
    onDataChange();
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المستودع؟')) {
      deleteWarehouse(id);
      if (selectedWarehouseId === id) setSelectedWarehouseId(null);
      onDataChange();
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Building2 className="text-blue-500" size={32} />
          إدارة المستودعات
        </h1>
        {user.role === 'admin' && (
          <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={20} />
            إضافة مستودع
          </button>
        )}
      </div>

      {/* Warehouse Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        {warehouses.map(w => (
          <div 
            key={w.id} 
            onClick={() => setSelectedWarehouseId(w.id)}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              selectedWarehouseId === w.id 
                ? 'bg-blue-50 border-blue-500 shadow-md dark:bg-blue-900/20 dark:border-blue-500' 
                : 'bg-white border-gray-200 hover:border-blue-300 dark:bg-gray-800 dark:border-gray-700'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{w.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{w.location || 'بدون موقع'}</p>
              </div>
              <Building2 className={selectedWarehouseId === w.id ? 'text-blue-500' : 'text-gray-400'} size={24} />
            </div>
            {user.role === 'admin' && (
              <div className="mt-4 flex gap-2 justify-end">
                <button onClick={(e) => { e.stopPropagation(); openModal(w); }} className="p-1 text-gray-500 hover:text-blue-500"><Edit size={16}/></button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(w.id); }} className="p-1 text-gray-500 hover:text-red-500"><Trash2 size={16}/></button>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedWarehouse && (
        <div className="mt-8 space-y-6 animate-fade-in">
          <div className="flex justify-between items-center border-b pb-4 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
              مواد: {selectedWarehouse.name}
            </h2>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="بحث عن مادة أو باركود..." 
                  className="w-full pr-10 pl-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="relative">
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <select 
                  className="w-full pr-10 pl-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="">كل الفئات</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="relative">
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <select 
                  className="w-full pr-10 pl-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                  value={filterSupplier}
                  onChange={(e) => setFilterSupplier(e.target.value)}
                >
                  <option value="">كل الموردين</option>
                  {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Summary Stat */}
          <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg text-white">
                <Package size={20} />
              </div>
              <span className="font-bold text-gray-700 dark:text-gray-200">إجمالي الكميات في هذا المستودع:</span>
            </div>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{totalQuantity}</span>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200">
                    <th className="p-4 border-b dark:border-gray-600">الباركود</th>
                    <th className="p-4 border-b dark:border-gray-600">اسم المادة</th>
                    <th className="p-4 border-b dark:border-gray-600">الفئة</th>
                    <th className="p-4 border-b dark:border-gray-600">المورد</th>
                    <th className="p-4 border-b dark:border-gray-600 text-center">الرصيد في المستودع</th>
                    <th className="p-4 border-b dark:border-gray-600">الوحدة</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {filteredMaterials.length > 0 ? filteredMaterials.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="p-4 font-mono text-xs text-gray-500 dark:text-gray-400">{m.barcode}</td>
                      <td className="p-4 font-bold text-gray-900 dark:text-white">{m.name}</td>
                      <td className="p-4 text-gray-600 dark:text-gray-300">{m.category}</td>
                      <td className="p-4 text-gray-600 dark:text-gray-300">{m.supplier || '---'}</td>
                      <td className="p-4 text-center font-black text-blue-600 dark:text-blue-400">{m.stocks?.[selectedWarehouse.id] || 0}</td>
                      <td className="p-4 text-gray-500 dark:text-gray-400">{m.unit}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-gray-500 dark:text-gray-400 italic">
                        لا توجد مواد في هذا المستودع تطابق البحث
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Add/Edit Warehouse */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 dark:text-white">
              {editingWarehouse ? 'تعديل مستودع' : 'إضافة مستودع جديد'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium dark:text-gray-300">اسم المستودع *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium dark:text-gray-300">الموقع</label>
                <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium dark:text-gray-300">الوصف</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" rows={3} />
              </div>
              <div className="flex justify-end space-x-2 space-x-reverse pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded">إلغاء</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Warehouses;
