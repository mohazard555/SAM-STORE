
import React, { useState } from 'react';
import { User } from '@/types';
import { Search, LogOut, User as UserIcon, Menu } from 'lucide-react';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  toggleSidebar: () => void;
  onSearch: (term: string) => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, toggleSidebar, onSearch }) => {
  const [isDropdownOpen, setDropdownOpen] = useState(false);

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

      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!isDropdownOpen)}
          className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <UserIcon className="w-6 h-6" />
          <span className="hidden sm:inline">{user.username}</span>
        </button>
        {isDropdownOpen && (
          <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 dark:bg-gray-700 z-20">
            <div className="px-4 py-3 text-sm text-gray-900 dark:text-white">
              <div>{user.username}</div>
              <div className="font-medium truncate">{user.role === 'admin' ? 'أمين مستودع' : 'مستخدم'}</div>
            </div>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onLogout();
              }}
              className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600 dark:hover:text-white"
            >
              <LogOut className="w-4 h-4 ml-2" />
              تسجيل الخروج
            </a>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
