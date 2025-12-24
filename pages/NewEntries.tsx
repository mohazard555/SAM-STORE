
import React, { useState } from 'react';
import { Material } from '@/types';
import { AlertTriangle, Search } from 'lucide-react';

interface NewEntriesProps {
  materials: Material[];
}

const NewEntries: React.FC<NewEntriesProps> = ({ materials }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMaterials = materials.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.materialType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.barcode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">إدخالات المواد الجديدة</h1>
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Search className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full p-2.5 pr-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:ring-sky-500 focus:border-sky-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-sky-500 dark:focus:border-sky-500 shadow-sm"
            placeholder="بحث سريع (اسم، نوع، مورد، باركود)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
       <div className="bg-blue-100 dark:bg-blue-900/30 border-r-4 border-blue-500 text-blue-700 dark:text-blue-300 p-4 rounded-l-lg" role="alert">
          <p className="font-bold">ملاحظة</p>
          <p>هذه قائمة بالمواد التي تم إضافتها حديثاً. يمكنك تأكيد استلامها من صفحة "إدارة المواد" لإزالتها من هذه القائمة.</p>
        </div>

      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-x-auto">
        <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">اسم المادة</th>
              <th scope="col" className="px-6 py-3">نوع المادة</th>
              <th scope="col" className="px-6 py-3">الفئة</th>
              <th scope="col" className="px-6 py-3">الباركود</th>
              <th scope="col" className="px-6 py-3">الكمية المدخلة</th>
              <th scope="col" className="px-6 py-3">المورد</th>
              <th scope="col" className="px-6 py-3">المواصفات</th>
            </tr>
          </thead>
          <tbody>
            {filteredMaterials.map(material => (
              <tr key={material.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{material.name}</td>
                <td className="px-6 py-4">{material.materialType}</td>
                <td className="px-6 py-4">{material.category}</td>
                <td className="px-6 py-4 font-mono">{material.barcode}</td>
                <td className={`px-6 py-4 font-bold ${material.currentStock < material.minStock ? 'text-red-500' : 'text-emerald-500'}`}>
                    {material.currentStock} {material.unit}
                    {material.currentStock < material.minStock && <AlertTriangle className="inline-block mr-1 text-red-500" size={16}/>}
                </td>
                <td className="px-6 py-4 text-xs">{material.supplier}</td>
                <td className="px-6 py-4 whitespace-pre-wrap max-w-xs text-xs">{material.specifications}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredMaterials.length === 0 && (
          <div className="text-center p-8">
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm ? 'لا توجد نتائج تطابق بحثك.' : 'لا توجد إدخالات جديدة حالياً.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewEntries;
