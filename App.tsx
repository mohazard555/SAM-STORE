
import React, { useState, useEffect } from 'react';
import Login from '@/pages/Login';
import MainLayout from '@/components/layout/MainLayout';
import { getCurrentUser, initializeDataSource, getSettings, repairInitialTransactions, hasUnsyncedChanges, syncDataToGist } from '@/services/mockApi';
import { usePrint } from '@/services/PrintContext';
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

  // Background sync and pull mechanism (triggers every 30 seconds for near-real-time bidirectional sync)
  useEffect(() => {
    const intervalTime = 30 * 1000; // 30 seconds (30,000 ms)
    
    const runSyncCycle = async () => {
      const settings = getSettings();
      if (!settings?.gistUrl) return;

      try {
        const token = settings.githubToken ? settings.githubToken.trim() : '';
        if (hasUnsyncedChanges() && token) {
          console.log("[مزامنة دورية] جاري مزامنة التعديلات المحلية إلى Gist...");
          await syncDataToGist();
        } else {
          console.log("[مزامنة دورية] جاري فحص وجود تحديثات جديدة من Gist...");
          const res = await initializeDataSource();
          if (res.success && res.message && res.message.includes('تم تحميل وتحديث البيانات')) {
            console.log("[مزامنة دورية] تم جلب بيانات جديدة ومحدثة من Gist! إعادة التحميل لتطبيق التغيير.");
            setSuccessMessage("تمت مزامنة وجلب أحدث البيانات من السحابة بنجاح ⚡");
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          }
        }
      } catch (err) {
        console.error("خطأ أثناء المزامنة الدورية الخلفية:", err);
      }
    };

    const intervalId = setInterval(runSyncCycle, intervalTime);
    return () => clearInterval(intervalId);
  }, []);

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
      if (currentUser) {
          repairInitialTransactions();
      }
      setUser(currentUser);
      setLoading(false);
    };
    initApp();
  }, []);

  useEffect(() => {
    const settings = getSettings();
    if (settings?.theme) {
      document.documentElement.setAttribute('data-theme', settings.theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [user, successMessage]); // Re-apply when user changes or data is synced

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
    repairInitialTransactions();
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('currentUser');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">جار تحضير المستودع...</p>
      </div>
    );
  }

  const { printContent } = usePrint();

  return (
    <div className="bg-gray-50 dark:bg-gray-900 h-full w-full font-sans transition-colors duration-300">
      {/* Print Section - only visible during print */}
      <div id="print-section" dangerouslySetInnerHTML={{ __html: printContent || '' }} />
      
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
  );
}

export default App;
