
import React from 'react';
import { Material, Transaction } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Package, AlertTriangle, Users, ArrowDown } from 'lucide-react';

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
  const totalMaterials = materials.length;
  const lowStockMaterials = materials.filter(m => m.currentStock < m.minStock).length;
  const totalStock = materials.reduce((sum, m) => sum + m.currentStock, 0);
  const totalRecipients = new Set(transactions.map(t => t.recipient)).size;

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
    <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">لوحة المعلومات</h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="إجمالي المواد" value={totalMaterials} icon={<Package className="text-white"/>} color="bg-sky-500" />
            <StatCard title="مواد منخفضة المخزون" value={lowStockMaterials} icon={<AlertTriangle className="text-white"/>} color="bg-amber-500" />
            <StatCard title="إجمالي الكميات" value={totalStock} icon={<ArrowDown className="text-white"/>} color="bg-emerald-500" />
            <StatCard title="عدد المستلمين" value={totalRecipients} icon={<Users className="text-white"/>} color="bg-violet-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">المواد الأعلى كمية</h3>
                 <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topMaterialsData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" stroke="#9ca3af" />
                        <YAxis dataKey="name" type="category" width={80} stroke="#9ca3af" tick={{fontSize: 12}} />
                        <Tooltip wrapperClassName="dark:bg-gray-700 rounded-md"/>
                        <Legend />
                        <Bar dataKey="الكمية الحالية" fill="#38bdf8" barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">حركة السحب (آخر 7 أيام)</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={transactionChartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" stroke="#9ca3af" tick={{fontSize: 10}}/>
                        <YAxis stroke="#9ca3af" />
                        <Tooltip wrapperClassName="dark:bg-gray-700 rounded-md" />
                        <Legend />
                        <Line type="monotone" dataKey="عدد الحركات" stroke="#34d399" activeDot={{ r: 8 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    </div>
  );
};

export default Dashboard;
