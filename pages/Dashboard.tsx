
import React, { useState, useMemo, useEffect } from 'react';
import { Material, Transaction, CostCalculation, CostPart, Warehouse } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { 
  Package, AlertTriangle, Users, ArrowDown
} from 'lucide-react';
import { getCostCalculations, addCostCalculation, deleteCostCalculation } from '@/services/mockApi';

interface DashboardProps {
  materials: Material[];
  transactions: Transaction[];
  warehouses: Warehouse[];
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string; }> = ({ title, value, icon, color }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border dark:border-gray-700 flex items-center space-x-3 space-x-reverse">
        <div className={`p-2.5 rounded-full ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ materials, transactions, warehouses }) => {
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
    <div className="space-y-4 pb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">لوحة المعلومات</h1>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        
        {/* --- Basic Stats --- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="إجمالي المواد" value={totalMaterials} icon={<Package className="text-white" size={20}/>} color="bg-sky-500" />
            <StatCard title="مواد منخفضة المخزون" value={lowStockMaterials} icon={<AlertTriangle className="text-white" size={20}/>} color="bg-amber-500" />
            <StatCard title="إجمالي الكميات" value={totalStock} icon={<ArrowDown className="text-white" size={20}/>} color="bg-emerald-500" />
            <StatCard title="عدد المستلمين" value={totalRecipients} icon={<Users className="text-white" size={20}/>} color="bg-violet-500" />
        </div>

        {/* --- Unit Stats --- */}
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {unitStats.map(([unit, total]) => (
            <div key={unit} className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">{unit}</p>
              <p className="text-lg font-bold text-sky-600 dark:text-sky-400">{total}</p>
            </div>
          ))}
        </div>

        {/* --- Charts --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-sm mb-2 text-gray-900 dark:text-white flex items-center gap-2">
                  <Package size={16} className="text-sky-500" />
                  المواد الأعلى كمية
                </h3>
                 <ResponsiveContainer width="100%" height={220}>
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
            <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-sm mb-2 text-gray-900 dark:text-white flex items-center gap-2">
                  <ArrowDown size={16} className="text-emerald-500" />
                  حركة السحب (آخر 7 أيام)
                </h3>
                <ResponsiveContainer width="100%" height={220}>
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
    </div>
  );
};

export default Dashboard;
