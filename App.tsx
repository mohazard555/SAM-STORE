
import React, { useState, useEffect } from 'react';
import Login from '@/pages/Login';
import MainLayout from '@/components/layout/MainLayout';
import { getCurrentUser } from '@/services/mockApi';
import { User } from '@/types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = () => {
      const currentUser = getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    };
    checkUser();
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
      {user ? <MainLayout user={user} onLogout={handleLogout} /> : <Login onLogin={handleLogin} />}
    </div>
  );
}

export default App;
