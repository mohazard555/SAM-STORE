import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/types';
import { getUsers, addUser, updateUser, deleteUser } from '@/services/mockApi';
import { Plus, Edit, Trash2 } from 'lucide-react';

const UserModal: React.FC<{ user: Partial<User> | null; onClose: () => void; onSave: (user: Omit<User, 'id'> | User) => void; }> = ({ user, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        username: user?.username || '',
        password: '',
        role: user?.role || 'visitor',
    });
    
    const isEditing = !!user?.id;
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!isEditing && !formData.password) {
            setError('كلمة المرور مطلوبة للمستخدم الجديد.');
            return;
        }

        if (formData.password && formData.password.length < 6) {
             setError('يجب أن تكون كلمة المرور 6 أحرف على الأقل.');
             return;
        }

        const dataToSave = { ...formData };
        if (!dataToSave.password) {
            // @ts-ignore
            delete dataToSave.password; // Don't send empty password to update
        }

        try {
            onSave(isEditing ? { ...dataToSave, id: user.id! } : dataToSave);
            onClose();
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{isEditing ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" name="username" value={formData.username} onChange={handleChange} placeholder="اسم المستخدم" required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder={isEditing ? 'كلمة المرور (اتركه فارغاً لعدم التغيير)' : 'كلمة المرور'} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                <div>
                    <label className="block mb-1">الصلاحية</label>
                    <select name="role" value={formData.role} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
                        <option value="visitor">زائر (للاطلاع فقط)</option>
                        <option value="admin">أمين مستودع (صلاحيات كاملة)</option>
                    </select>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="flex justify-end space-x-2 space-x-reverse pt-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded">إلغاء</button>
                    <button type="submit" className="px-4 py-2 bg-sky-500 text-white rounded">{isEditing ? 'حفظ التعديلات' : 'إضافة'}</button>
                </div>
            </form>
        </div>
      </div>
    );
};

const Users: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    const refreshUsers = useCallback(() => {
        setUsers(getUsers());
    }, []);

    useEffect(() => {
        refreshUsers();
    }, [refreshUsers]);

    const handleSave = (userData: Omit<User, 'id'> | User) => {
        if ('id' in userData) {
            const originalUser = users.find(u => u.id === userData.id);
            updateUser({ ...originalUser, ...userData });
        } else {
            addUser(userData as Omit<User, 'id'>);
        }
        refreshUsers();
        setIsModalOpen(false);
        setSelectedUser(null);
    };

    const handleDelete = (id: string) => {
        deleteUser(id);
        refreshUsers();
        setUserToDelete(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">إدارة المستخدمين</h1>
                <button onClick={() => { setSelectedUser(null); setIsModalOpen(true); }} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700">
                    <Plus className="ml-2" size={20} />إضافة مستخدم
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="px-6 py-3">اسم المستخدم</th>
                            <th scope="col" className="px-6 py-3">الصلاحية</th>
                            <th scope="col" className="px-6 py-3">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{user.username}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'}`}>
                                        {user.role === 'admin' ? 'أمين مستودع' : 'زائر'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 space-x-2 space-x-reverse">
                                    <button onClick={() => { setSelectedUser(user); setIsModalOpen(true); }} className="text-blue-500 hover:text-blue-700"><Edit size={20}/></button>
                                    {users.length > 1 && <button onClick={() => setUserToDelete(user)} className="text-red-500 hover:text-red-700"><Trash2 size={20}/></button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && <UserModal user={selectedUser} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
            
            {userToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm text-center">
                        <h3 className="text-lg font-bold mb-4">تأكيد الحذف</h3>
                        <p>هل أنت متأكد أنك تريد حذف المستخدم "{userToDelete.username}"؟</p>
                        <div className="flex justify-center space-x-4 space-x-reverse mt-6">
                            <button onClick={() => setUserToDelete(null)} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded">إلغاء</button>
                            <button onClick={() => handleDelete(userToDelete.id)} className="px-4 py-2 bg-red-500 text-white rounded">حذف</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
