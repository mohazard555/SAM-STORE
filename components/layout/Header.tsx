
import React, { useState, useEffect } from 'react';
import { User, SyncStatus } from '@/types';
import { Search, LogOut, User as UserIcon, Menu, Moon, Sun, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { subscribeToSyncStatus } from '@/services/mockApi';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  toggleSidebar: () => void;
  onSearch: (term: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, toggleSidebar, onSearch, darkMode, setDarkMode }) => {
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ state: 'idle' });

  useEffect(() => {
    return subscribeToSyncStatus((status) => {
      setSyncStatus(status);
    });
  }, []);

  const getSyncIcon = () => {
    switch (syncStatus.state) {
      case 'syncing':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <RefreshCw className="w-5 h-5 text-gray-400" />;
    }
  };

  const getSyncText = () => {
    if (syncStatus.state === 'syncing') return 'جاري المزامنة...';
    if (syncStatus.state === 'error') return syncStatus.error || 'فشل المزامنة';
    if (syncStatus.lastSync) {
      const date = new Date(syncStatus.lastSync);
      return `آخر مزامنة: ${date.toLocaleTimeString('ar-EG')}`;
    }
    return 'المزامنة جاهزة';
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md p-4 flex items-center justify-between border-b dark:border-gray-700">
      <div className="flex items-center">
        <button onClick={toggleSidebar} className="text-gray-600 dark:text-gray-300 focus:outline-none md:hidden ml-4">
          <Menu className="w-6 h-6" />
        </button>
        <div className="relative hidden md:block">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Search className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full p-2 pr-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="بحث عن مادة أو مستلم..."
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Sync Status Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-700/50 border dark:border-gray-600" title={syncStatus.error}>
          {getSyncIcon()}
          <span className={`text-xs font-medium ${syncStatus.state === 'error' ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`}>
            {getSyncText()}
          </span>
        </div>
        <button 
          onClick={() => setDarkMode(!darkMode)} 
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
          title={darkMode ? "تبديل للوضع المضيء" : "تبديل للوضع المظلم"}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <UserIcon className="w-6 h-6" />
            <span className="hidden sm:inline mr-2">{user.username}</span>
          </button>
          {isDropdownOpen && (
            <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 dark:bg-gray-700 z-20 border dark:border-gray-600">
              <div className="px-4 py-3 text-sm text-gray-900 dark:text-white border-b dark:border-gray-600">
                <div className="font-bold">{user.username}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{user.role === 'admin' ? 'أمين مستودع' : 'مستخدم'}</div>
              </div>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onLogout();
                }}
                className="flex items-center w-full text-right px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <LogOut className="w-4 h-4 ml-2" />
                تسجيل الخروج
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
