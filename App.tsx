
import React, { useState, useEffect } from 'react';
import Login from '@/pages/Login';
import MainLayout from '@/components/layout/MainLayout';
import { getCurrentUser, initializeDataSource } from '@/services/mockApi';
import { User } from '@/types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initApp = async () => {
      setError(null);
      setLoading(true);
      const dataSourceResult = await initializeDataSource();
      if (!dataSourceResult.success) {
          setError(`فشل تحميل البيانات من Gist: ${dataSourceResult.message}. يتم استخدام البيانات المحلية.`);
      }

      const currentUser = getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    };
    initApp();
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('currentUser');
    setUser(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-gray-100"><p>جار التحميل...</p></div>;
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans">
      {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 text-center" role="alert"><p>{error}</p></div>}
      {user ? <MainLayout user={user} onLogout={handleLogout} /> : <Login onLogin={handleLogin} />}
    </div>
  );
}

export default App;