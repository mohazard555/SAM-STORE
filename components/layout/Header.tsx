
import React, { useState, useEffect } from 'react';
import { User, SyncStatus } from '@/types';
import { Search, LogOut, User as UserIcon, Menu, Moon, Sun, RefreshCw, CheckCircle2, AlertCircle, Bell, X } from 'lucide-react';
import { subscribeToSyncStatus, getNotifications, clearNotifications } from '@/services/mockApi';
import { AppNotification } from '@/types';

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
  const [isNotificationsOpen, setNotificationsOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ state: 'idle' });
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    setNotifications(getNotifications());
    
    // Refresh notifications periodically or on some event if needed
    const interval = setInterval(() => {
      setNotifications(getNotifications());
    }, 5000);
    
    return () => {
      clearInterval(interval);
      subscribeToSyncStatus((status) => {
        setSyncStatus(status);
      });
    };
  }, []);

  useEffect(() => {
    return subscribeToSyncStatus((status) => {
      setSyncStatus(status);
    });
  }, []);

  const handleClearNotifications = () => {
    clearNotifications();
    setNotifications([]);
  };

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
      const dateStr = date.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
      const timeStr = date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return `آخر مزامنة: ${dateStr} ${timeStr}`;
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

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => {
              setNotificationsOpen(!isNotificationsOpen);
              setDropdownOpen(false);
            }} 
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors relative"
            title="الإشعارات"
          >
            <Bell size={20} />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-gray-800"></span>
            )}
          </button>
          
          {isNotificationsOpen && (
            <div className="absolute left-0 mt-2 w-80 bg-white rounded-lg shadow-xl py-2 dark:bg-gray-800 z-30 border dark:border-gray-700 max-h-[400px] flex flex-col">
              <div className="px-4 py-2 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 sticky top-0">
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">آخر التعديلات</h3>
                <button 
                  onClick={handleClearNotifications}
                  className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400"
                >
                  مسح الكل
                </button>
              </div>
              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                    لا توجد إشعارات حالياً
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div key={notif.id} className="px-4 py-3 border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          notif.action === 'add' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          notif.action === 'update' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {notif.action === 'add' ? 'إضافة' : notif.action === 'update' ? 'تعديل' : 'حذف'}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                          {new Date(notif.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="font-medium text-xs text-gray-900 dark:text-white mb-0.5">{notif.title}</div>
                      <div className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2">{notif.message}</div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
                        <UserIcon size={10} />
                        <span>بواسطة: {notif.user}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-2 border-t dark:border-gray-700 text-center sticky bottom-0 bg-white dark:bg-gray-800">
                <button 
                  onClick={() => setNotificationsOpen(false)}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  إغلاق
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setDropdownOpen(!isDropdownOpen);
              setNotificationsOpen(false);
            }}
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