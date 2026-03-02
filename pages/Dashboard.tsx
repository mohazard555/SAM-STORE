
import React, { useState, useMemo, useEffect } from 'react';
import { Material, Transaction, CostCalculation, CostPart } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { 
  Package, AlertTriangle, Users, ArrowDown, Calculator, 
  Table, Filter, Search, ChevronUp, ChevronDown, Plus, 
  Trash2, Save, History, CheckCircle2
} from 'lucide-react';
import { getCostCalculations, addCostCalculation, deleteCostCalculation } from '@/services/mockApi';

interface DashboardProps {
  materials: Material[];
  transactions: Transaction[];
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string; }> = ({ title, value, icon, color }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md flex items-center space-x-4 space-x-reverse">
        <div className={`p-3 rounded-full ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ materials, transactions }) => {
  // --- Basic Stats ---
  const totalMaterials = materials.length;
  const lowStockMaterials = materials.filter(m => m.currentStock < m.minStock).length;
  const totalStock = materials.reduce((sum, m) => sum + m.currentStock, 0);
  const totalRecipients = new Set(transactions.map(t => t.recipient)).size;

  // --- Unit Stats ---
  const unitStats = useMemo(() => {
    const stats: Record<string, number> = {};
    materials.forEach(m => {
      stats[m.unit] = (stats[m.unit] || 0) + m.currentStock;
    });
    return Object.entries(stats);
  }, [materials]);

  // --- Quick Look Table State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const suppliers = useMemo(() => Array.from(new Set(materials.map(m => m.supplier))), [materials]);
  const categories = useMemo(() => Array.from(new Set(materials.map(m => m.category))), [materials]);

  const tableData = useMemo(() => {
    return materials.map(m => {
      const used = transactions
        .filter(t => t.materialId === m.id && t.type === 'out')
        .reduce((sum, t) => sum + t.quantity, 0);
      const totalIn = transactions
        .filter(t => t.materialId === m.id && t.type === 'in')
        .reduce((sum, t) => sum + t.quantity, 0);
      
      return {
        ...m,
        fullBalance: totalIn,
        usedQuantity: used,
        remainingQuantity: m.currentStock
      };
    });
  }, [materials, transactions]);

  const filteredData = useMemo(() => {
    let result = tableData.filter(m => 
      (m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.barcode.includes(searchTerm)) &&
      (filterSupplier === '' || m.supplier === filterSupplier) &&
      (filterCategory === '' || m.category === filterCategory)
    );

    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = (a as any)[sortConfig.key];
        const bValue = (b as any)[sortConfig.key];
        if (aValue === undefined || bValue === undefined) return 0;
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [tableData, searchTerm, filterSupplier, filterCategory, sortConfig]);

  const totalFilteredRemaining = filteredData.reduce((sum, m) => sum + m.remainingQuantity, 0);

  const handleSort = (key: any) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // --- Charts Data ---
  const topMaterialsData = [...materials]
    .sort((a, b) => b.currentStock - a.currentStock)
    .slice(0, 7)
    .map(m => ({ name: m.name, 'الكمية الحالية': m.currentStock }));

  const transactionsByDay = transactions.reduce((acc, t) => {
    const date = new Date(t.date).toLocaleDateString('ar-EG');
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toLocaleDateString('ar-EG');
  }).reverse();

  const transactionChartData = last7Days.map(date => ({
      name: date,
      'عدد الحركات': transactionsByDay[date] || 0,
  }));

  return (
    <div className="space-y-8 pb-10">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">لوحة المعلومات</h1>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        
        {/* --- Basic Stats --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="إجمالي المواد" value={totalMaterials} icon={<Package className="text-white"/>} color="bg-sky-500" />
            <StatCard title="مواد منخفضة المخزون" value={lowStockMaterials} icon={<AlertTriangle className="text-white"/>} color="bg-amber-500" />
            <StatCard title="إجمالي الكميات" value={totalStock} icon={<ArrowDown className="text-white"/>} color="bg-emerald-500" />
            <StatCard title="عدد المستلمين" value={totalRecipients} icon={<Users className="text-white"/>} color="bg-violet-500" />
        </div>

        {/* --- Unit Stats --- */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {unitStats.map(([unit, total]) => (
            <div key={unit} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{unit}</p>
              <p className="text-xl font-bold text-sky-600 dark:text-sky-400">{total}</p>
            </div>
          ))}
        </div>

        {/* --- Charts --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                  <Package size={20} className="text-sky-500" />
                  المواد الأعلى كمية
                </h3>
                 <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topMaterialsData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" stroke="#9ca3af" />
                        <YAxis dataKey="name" type="category" width={80} stroke="#9ca3af" tick={{fontSize: 12}} />
                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
                        <Legend />
                        <Bar dataKey="الكمية الحالية" fill="#38bdf8" barSize={20} radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                  <ArrowDown size={20} className="text-emerald-500" />
                  حركة السحب (آخر 7 أيام)
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={transactionChartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" stroke="#9ca3af" tick={{fontSize: 10}}/>
                        <YAxis stroke="#9ca3af" />
                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
                        <Legend />
                        <Line type="monotone" dataKey="عدد الحركات" stroke="#34d399" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* --- Quick Look Table --- */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h3 className="font-bold text-xl text-gray-900 dark:text-white flex items-center gap-2">
              <Table size={24} className="text-sky-500" />
              نظرة سريعة للمواد
            </h3>
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="بحث عن مادة أو باركود..." 
                  className="w-full pr-10 pl-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select 
                className="p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none"
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
              >
                <option value="">كل الموردين</option>
                {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select 
                className="p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">كل الفئات</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200">
                  <th className="p-4 border-b dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1">اسم المادة {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}</div>
                  </th>
                  <th className="p-4 border-b dark:border-gray-600">الفئة</th>
                  <th className="p-4 border-b dark:border-gray-600">الوحدة</th>
                  <th className="p-4 border-b dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('fullBalance')}>
                    <div className="flex items-center gap-1">الرصيد الكامل {sortConfig?.key === 'fullBalance' && (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}</div>
                  </th>
                  <th className="p-4 border-b dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('usedQuantity')}>
                    <div className="flex items-center gap-1">الكمية المستخدمة {sortConfig?.key === 'usedQuantity' && (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}</div>
                  </th>
                  <th className="p-4 border-b dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('remainingQuantity')}>
                    <div className="flex items-center gap-1">الكمية المتبقية {sortConfig?.key === 'remainingQuantity' && (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}</div>
                  </th>
                  <th className="p-4 border-b dark:border-gray-600">المورد</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {filteredData.length > 0 ? filteredData.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="p-4 text-gray-900 dark:text-white font-medium">{m.name}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">{m.category}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">{m.unit}</td>
                    <td className="p-4 text-emerald-600 dark:text-emerald-400 font-bold">{m.fullBalance}</td>
                    <td className="p-4 text-amber-600 dark:text-amber-400 font-bold">{m.usedQuantity}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${m.remainingQuantity < m.minStock ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                        {m.remainingQuantity}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">{m.supplier}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500 dark:text-gray-400 italic">لا توجد مواد تطابق البحث</td>
                  </tr>
                )}
              </tbody>
              {filteredData.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-100 dark:bg-gray-700 font-bold">
                    <td colSpan={5} className="p-4 text-left">إجمالي الكمية المتبقية للمواد المفلترة:</td>
                    <td className="p-4 text-sky-600 dark:text-sky-400 text-xl">{totalFilteredRemaining}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
    </div>
  );
};

export default Dashboard;
