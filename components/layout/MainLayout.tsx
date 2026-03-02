
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
import { Archive } from 'lucide-react';

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

    const isAllowed = (page: Page) => {
      if (user.role === 'admin') return true;
      return user.permissions?.allowedPages.includes(page);
    };

    if (!isAllowed(currentPage)) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <div className="bg-red-100 dark:bg-red-900/20 p-6 rounded-full mb-4">
            <Archive className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">غير مصرح لك بالوصول</h2>
          <p className="text-gray-600 dark:text-gray-400">ليس لديك الصلاحيات الكافية لعرض هذه الصفحة.</p>
          <button 
            onClick={() => setCurrentPage('dashboard')}
            className="mt-6 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
          >
            العودة للرئيسية
          </button>
        </div>
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard materials={materials} transactions={transactions} />;
      case 'materials':
        return <Materials materials={filteredMaterials} onDataChange={refreshData} user={user} settings={settings} />;
      case 'transactions':
        return <Transactions transactions={filteredTransactions} materials={materials} onDataChange={refreshData} user={user} />;
      case 'reports':
        return <Reports transactions={transactions} materials={materials} settings={settings} user={user} />;
      case 'settings':
        return <Settings onDataChange={refreshData} user={user} />;
      case 'new-entries':
        return <NewEntries materials={materials.filter(m => m.isNew)} />;
      case 'users':
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
