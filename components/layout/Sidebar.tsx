import React from 'react';
import { Page, User } from '@/types';
import { BarChart2, Package, Truck, FileText, X, Settings, Archive, Users } from 'lucide-react';

interface SidebarProps {
  user: User;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  logo?: string;
}

const NavItem: React.FC<{ icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void; }> = ({ icon, label, isActive, onClick }) => (
  <li>
    <a
      href="#"
      onClick={(e) => { e.preventDefault(); onClick(); }}
      className={`flex items-center p-3 rounded-lg text-base font-semibold transition duration-75 group ${
        isActive
          ? 'bg-sky-600 text-white'
          : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      {icon}
      <span className="mr-3">{label}</span>
    </a>
  </li>
);

const Sidebar: React.FC<SidebarProps> = ({ user, currentPage, onNavigate, isOpen, setIsOpen, logo }) => {
  const handleNavigation = (page: Page) => {
    onNavigate(page);
    if (window.innerWidth < 768) {
        setIsOpen(false);
    }
  };
    
  return (
    <>
      <aside
        className={`fixed top-0 right-0 z-40 w-64 h-screen transition-transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } md:translate-x-0 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700`}
        aria-label="Sidebar"
      >
        <div className="h-full px-3 py-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
              <a href="#" className="flex items-center pr-2.5">
                {logo ? (
                    <img src={logo} alt="Company Logo" className="h-8 w-8 object-contain" />
                ) : (
                    <Package className="h-8 w-8 text-sky-500" />
                )}
                <span className="self-center text-xl font-semibold whitespace-nowrap dark:text-white mr-2">أمين المستودع</span>
              </a>
              <button onClick={() => setIsOpen(false)} className="md:hidden p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                  <X className="w-6 h-6"/>
              </button>
          </div>
          <ul className="space-y-2">
            <NavItem icon={<BarChart2 />} label="الرئيسية" isActive={currentPage === 'dashboard'} onClick={() => handleNavigation('dashboard')} />
            <NavItem icon={<Package />} label="إدارة المواد" isActive={currentPage === 'materials'} onClick={() => handleNavigation('materials')} />
            <NavItem icon={<Archive />} label="ادخالات جديدة" isActive={currentPage === 'new-entries'} onClick={() => handleNavigation('new-entries')} />
            <NavItem icon={<Truck />} label="الحركات اليومية" isActive={currentPage === 'transactions'} onClick={() => handleNavigation('transactions')} />
            <NavItem icon={<FileText />} label="التقارير" isActive={currentPage === 'reports'} onClick={() => handleNavigation('reports')} />
            <hr className="my-2 border-gray-200 dark:border-gray-600" />
            {user.role === 'admin' && (
              <NavItem icon={<Users />} label="إدارة المستخدمين" isActive={currentPage === 'users'} onClick={() => handleNavigation('users')} />
            )}
            <NavItem icon={<Settings />} label="الإعدادات" isActive={currentPage === 'settings'} onClick={() => handleNavigation('settings')} />
          </ul>
        </div>
      </aside>
       {isOpen && <div onClick={() => setIsOpen(false)} className="bg-gray-900/50 dark:bg-gray-900/80 fixed inset-0 z-30 md:hidden"></div>}
    </>
  );
};

export default Sidebar;