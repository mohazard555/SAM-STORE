import React, { useState, useEffect, useCallback } from 'react';
import { User, Page, UserPermissions } from '@/types';
import { getUsers, addUser, updateUser, deleteUser } from '@/services/mockApi';
import { Plus, Edit, Trash2, CheckSquare, Square } from 'lucide-react';

const PAGES: { id: Page; label: string }[] = [
    { id: 'dashboard', label: 'لوحة التحكم' },
    { id: 'materials', label: 'المواد' },
    { id: 'transactions', label: 'الحركات' },
    { id: 'reports', label: 'التقارير' },
    { id: 'settings', label: 'الإعدادات' },
    { id: 'new-entries', label: 'المدخلات الجديدة' },
    { id: 'users', label: 'المستخدمين' },
    { id: 'warehouses', label: 'المستودعات' },
    { id: 'supplier-returns', label: 'مرتجعات الموردين' },
    { id: 'cost-meter', label: 'حاسبة الكلف بالمتر' },
    { id: 'cost-weight', label: 'حاسبة الكلف بالوزن' },
    { id: 'quick-look', label: 'نظرة سريعة' },
];

const UserModal: React.FC<{ user: Partial<User> | null; onClose: () => void; onSave: (user: Omit<User, 'id'> | User) => void; }> = ({ user, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        username: user?.username || '',
        password: '',
        role: user?.role || 'visitor' as 'admin' | 'visitor',
        permissions: user?.permissions || {
            canPrint: false,
            canExport: false,
            allowedPages: ['dashboard', 'materials', 'transactions'] as Page[]
        }
    });
    
    const isEditing = !!user?.id;
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'role') {
            const newRole = value as 'admin' | 'visitor';
            setFormData(prev => ({ 
                ...prev, 
                role: newRole,
                // Reset permissions to defaults if role changes
                permissions: newRole === 'admin' ? {
                    canPrint: true,
                    canExport: true,
                    allowedPages: PAGES.map(p => p.id)
                } : {
                    canPrint: false,
                    canExport: false,
                    allowedPages: ['dashboard', 'materials', 'transactions']
                }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handlePermissionChange = (field: keyof UserPermissions) => {
        setFormData(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [field]: !prev.permissions[field as keyof Pick<UserPermissions, 'canPrint' | 'canExport'>]
            }
        }));
    };

    const handlePageToggle = (pageId: Page) => {
        setFormData(prev => {
            const allowedPages = [...prev.permissions.allowedPages];
            const index = allowedPages.indexOf(pageId);
            if (index > -1) {
                allowedPages.splice(index, 1);
            } else {
                allowedPages.push(pageId);
            }
            return {
                ...prev,
                permissions: {
                    ...prev.permissions,
                    allowedPages
                }
            };
        });
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
            onSave(isEditing ? { ...dataToSave, id: user.id! } as User : dataToSave as Omit<User, 'id'>);
            onClose();
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{isEditing ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">اسم المستخدم</label>
                            <input type="text" name="username" value={formData.username} onChange={handleChange} placeholder="اسم المستخدم" required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">كلمة المرور</label>
                            <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder={isEditing ? 'كلمة المرور (اتركه فارغاً لعدم التغيير)' : 'كلمة المرور'} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الصلاحية العامة</label>
                            <select name="role" value={formData.role} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
                                <option value="visitor">زائر (صلاحيات مخصصة)</option>
                                <option value="admin">أمين مستودع (صلاحيات كاملة)</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-sm font-medium mb-1">صلاحيات إضافية</label>
                        <div className="space-y-2">
                            <button type="button" onClick={() => handlePermissionChange('canPrint')} className="flex items-center space-x-2 space-x-reverse w-full p-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                {formData.permissions.canPrint ? <CheckSquare className="text-sky-500" size={20} /> : <Square size={20} />}
                                <span>إمكانية طباعة التقارير والمستندات</span>
                            </button>
                            <button type="button" onClick={() => handlePermissionChange('canExport')} className="flex items-center space-x-2 space-x-reverse w-full p-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                {formData.permissions.canExport ? <CheckSquare className="text-sky-500" size={20} /> : <Square size={20} />}
                                <span>إمكانية تصدير البيانات إلى Excel</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">الواجهات المسموح بالاطلاع عليها</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {PAGES.map(page => (
                            <button 
                                key={page.id} 
                                type="button" 
                                onClick={() => handlePageToggle(page.id)}
                                className={`flex items-center space-x-2 space-x-reverse p-2 border rounded text-sm transition-colors ${formData.permissions.allowedPages.includes(page.id) ? 'bg-sky-50 border-sky-200 dark:bg-sky-900/20 dark:border-sky-800' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                            >
                                {formData.permissions.allowedPages.includes(page.id) ? <CheckSquare className="text-sky-500" size={16} /> : <Square size={16} />}
                                <span>{page.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}
                
                <div className="flex justify-end space-x-2 space-x-reverse pt-4 border-t dark:border-gray-700">
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
