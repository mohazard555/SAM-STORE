
import React, { useState, useCallback, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import Dashboard from '@/pages/Dashboard';
import Materials from '@/pages/Materials';
import Transactions from '@/pages/Transactions';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import NewEntries from '@/pages/NewEntries';
import Users from '@/pages/Users';
import { User, Page, Material, Transaction, SettingsData } from '@/types';
import { getMaterials, getTransactions, getSettings } from '@/services/mockApi';

interface MainLayoutProps {
  user: User;
  onLogout: () => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ user, onLogout, darkMode, setDarkMode }) => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [materials, setMaterials] = useState<Material[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<SettingsData | null>(null);


  const refreshData = useCallback(() => {
    setMaterials(getMaterials());
    setTransactions(getTransactions());
    setSettings(getSettings());
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const renderPage = () => {
    const filteredMaterials = materials.filter(m => 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.materialType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.supplier.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredTransactions = transactions.filter(t => 
      t.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.recipient.toLowerCase().includes(searchTerm.toLowerCase())
    );

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard materials={materials} transactions={transactions} />;
      case 'materials':
        return <Materials materials={filteredMaterials} onDataChange={refreshData} userRole={user.role} settings={settings} />;
      case 'transactions':
        return <Transactions transactions={filteredTransactions} materials={materials} onDataChange={refreshData} userRole={user.role} />;
      case 'reports':
        return <Reports transactions={transactions} materials={materials} settings={settings} />;
      case 'settings':
        return <Settings onDataChange={refreshData} user={user} />;
      case 'new-entries':
        return <NewEntries materials={materials.filter(m => m.isNew)} />;
      case 'users':
        if (user.role !== 'admin') {
          return <div className="text-center p-8"><h2 className="text-2xl font-bold text-red-500">غير مصرح لك بالوصول</h2></div>;
        }
        return <Users />;
      default:
        return <Dashboard materials={materials} transactions={transactions} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 overflow-hidden">
      <Sidebar 
        user={user}
        currentPage={currentPage} 
        onNavigate={setCurrentPage} 
        isOpen={isSidebarOpen} 
        setIsOpen={setSidebarOpen}
        logo={settings?.companyLogo}
      />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'md:mr-64' : 'md:mr-0'}`}>
        <Header 
          user={user} 
          onLogout={onLogout} 
          toggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
          onSearch={setSearchTerm}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          {renderPage()}
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default MainLayout;
