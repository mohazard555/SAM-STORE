
import React, { useState, useEffect } from 'react';
import Login from '@/pages/Login';
import MainLayout from '@/components/layout/MainLayout';
import { getCurrentUser, initializeDataSource } from '@/services/mockApi';
import { PrintProvider } from '@/services/PrintContext';
import { User } from '@/types';

const GIST_URL = 'https://gist.githubusercontent.com/mohazard555/6da370385392ac7cd27e034efe4b7d7c/raw/amenstor.json';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    const initApp = async () => {
      setError(null);
      setSuccessMessage(null);
      setLoading(true);
      
      // Initialize data source (uses URL from settings by default)
      const dataSourceResult = await initializeDataSource();
      
      if (!dataSourceResult.success) {
          setError(`فشل تحميل البيانات من Gist: ${dataSourceResult.message}. يتم استخدام البيانات المحلية.`);
      } else if (dataSourceResult.message) {
          setSuccessMessage(dataSourceResult.message);
          // Clear success message after 5 seconds
          setTimeout(() => setSuccessMessage(null), 5000);
      }

      const currentUser = getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    };
    initApp();
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('currentUser');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">جار تحضير المستودع...</p>
      </div>
    );
  }

  return (
    <PrintProvider>
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans transition-colors duration-300">
        {error && <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 text-center" role="alert"><p>{error}</p></div>}
        {successMessage && <div className="bg-green-100 dark:bg-green-900/30 border-l-4 border-green-500 text-green-700 dark:text-green-300 p-2 text-center text-sm" role="alert"><p>{successMessage}</p></div>}
        {user ? (
          <MainLayout 
            user={user} 
            onLogout={handleLogout} 
            darkMode={darkMode} 
            setDarkMode={setDarkMode} 
          />
        ) : (
          <Login onLogin={handleLogin} />
        )}
      </div>
    </PrintProvider>
  );
}

export default App;
