
import React, { useState, useEffect } from 'react';
import { getSettings, saveSettings, exportAllData, importAllData, updateUser, getCurrentUser, resetAllData, syncDataToGist } from '@/services/mockApi';
import { SettingsData, AllData, User } from '@/types';
import { Save, Upload, Download, Image, User as UserIcon, RefreshCcw, RefreshCw, Lock, Unlock } from 'lucide-react';

interface SettingsProps {
    onDataChange: () => void;
    user: User;
}

const Settings: React.FC<SettingsProps> = ({ onDataChange, user }) => {
    const [settings, setSettings] = useState<SettingsData | null>(null);
    const [profile, setProfile] = useState<User>(user);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [message, setMessage] = useState('');
    const [profileMessage, setProfileMessage] = useState('');
    const [profileError, setProfileError] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [isTokenUnlocked, setIsTokenUnlocked] = useState(false);
    const [showPasswordInput, setShowPasswordInput] = useState(false);
    const [unlockPassword, setUnlockPassword] = useState('');
    const [unlockError, setUnlockError] = useState(false);

    useEffect(() => {
        setSettings(getSettings());
        setProfile(getCurrentUser() || user);
    }, [user]);

    if (!settings) {
        return <div>جار تحميل الإعدادات...</div>;
    }

    const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setSettings(prev => prev ? { ...prev, [name]: value } : null);
    };

    const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSettings(prev => prev ? { ...prev, signatureNames: { ...prev.signatureNames, [name]: value } } : null);
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSettings(prev => prev ? { ...prev, companyLogo: reader.result as string } : null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveSettings = () => {
        if (settings) {
            const settingsToSave = {
                ...settings,
                githubToken: settings.githubToken ? settings.githubToken.trim() : ''
            };
            saveSettings(settingsToSave);
            setSettings(settingsToSave);
            onDataChange();
            setIsTokenUnlocked(false);
            setMessage('تم حفظ الإعدادات بنجاح!');
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handleSyncNow = async () => {
        if (settings) {
            const settingsToSave = {
                ...settings,
                githubToken: settings.githubToken ? settings.githubToken.trim() : ''
            };
            saveSettings(settingsToSave);
            setSettings(settingsToSave);
            onDataChange();
        }
        setIsSyncing(true);
        const success = await syncDataToGist();
        setIsSyncing(false);
        setIsTokenUnlocked(false);
        if (success) {
            setMessage('تمت المزامنة مع Gist بنجاح!');
        } else {
            setMessage('فشل المزامنة. يرجى التحقق من الإعدادات.');
        }
        setTimeout(() => setMessage(''), 3000);
    };

    const handleUnlockToken = () => {
        if (unlockPassword === 'sam1993') {
            setIsTokenUnlocked(true);
            setShowPasswordInput(false);
            setUnlockPassword('');
            setUnlockError(false);
        } else {
            setUnlockError(true);
            setTimeout(() => setUnlockError(false), 2000);
        }
    };
    
    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveProfile = () => {
        setProfileError('');
        setProfileMessage('');

        if (newPassword || confirmPassword) {
            if (newPassword !== confirmPassword) {
                setProfileError('كلمتا المرور غير متطابقتين.');
                return;
            }
            if (newPassword.length < 6) {
                setProfileError('يجب أن تكون كلمة المرور 6 أحرف على الأقل.');
                return;
            }
        }
        
        const updatedProfileData = { ...profile };
        if (newPassword) {
            updatedProfileData.password = newPassword;
        }

        try {
            updateUser(updatedProfileData);
            setProfileMessage('تم تحديث الملف الشخصي بنجاح!');
            setNewPassword('');
            setConfirmPassword('');
            onDataChange(); // To refresh user data if needed elsewhere
            setTimeout(() => setProfileMessage(''), 3000);
        } catch (error: any) {
            setProfileError(error.message);
        }
    };

    const handleExport = () => {
        const data = exportAllData();
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = "warehouse_backup.json";
        link.click();
    };
    
    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!window.confirm("هل أنت متأكد؟ سيتم استبدال جميع البيانات الحالية بالبيانات الموجودة في الملف.")) {
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target?.result as string) as AllData;
                    importAllData(data);
                    onDataChange(); // Refresh data across the app
                    setSettings(data.settings);
                    setMessage('تم استيراد البيانات بنجاح!');
                    setTimeout(() => setMessage(''), 3000);
                } catch (error) {
                    alert('خطأ في الملف أو تنسيق البيانات غير صالح.');
                }
            };
            reader.readAsText(file);
        }
    };

    const handleReset = () => {
        if (window.confirm("تحذير: هل أنت متأكد من تصفير جميع البيانات؟ سيتم حذف جميع المواد والحركات والحسابات نهائياً.")) {
            resetAllData();
            onDataChange();
            setMessage('تم تصفير البيانات بنجاح!');
            setTimeout(() => setMessage(''), 3000);
        }
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">الإعدادات</h1>
            
            {/* Profile Management */}
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4 flex items-center"><UserIcon className="ml-2" />إدارة الملف الشخصي</h2>
                <div className="space-y-4 max-w-md">
                    <InputField label="اسم المستخدم" name="username" value={profile.username} onChange={handleProfileChange} />
                    <InputField type="password" label="كلمة المرور الجديدة" name="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="اتركه فارغاً لعدم التغيير" />
                    <InputField type="password" label="تأكيد كلمة المرور الجديدة" name="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                    <button onClick={handleSaveProfile} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700">
                        <Save className="ml-2" size={18} />
                        حفظ الملف الشخصي
                    </button>
                    {profileMessage && <div className="p-2 text-sm text-center bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-200 rounded-lg">{profileMessage}</div>}
                    {profileError && <div className="p-2 text-sm text-center bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded-lg">{profileError}</div>}
                </div>
            </div>

            {user.role === 'admin' && (
                <>
                    {/* Company Info */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-4">معلومات الشركة والمظهر</h2>
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <InputField label="اسم الشركة" name="companyName" value={settings.companyName} onChange={handleSettingsChange} />
                                <InputField label="رمز العملة (مثلاً: ج.م أو $)" name="currencySymbol" value={settings.currencySymbol || ''} onChange={handleSettingsChange} />
                                <div>
                                    <label className="block mb-1 font-medium">ثيم الموقع (الألوان)</label>
                                    <select 
                                        name="theme" 
                                        value={settings.theme || 'default'} 
                                        onChange={(e) => setSettings(prev => prev ? { ...prev, theme: e.target.value as any } : null)}
                                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    >
                                        <option value="default">الافتراضي (سماوي)</option>
                                        <option value="emerald">الزمردي (أخضر)</option>
                                        <option value="rose">الياقوتي (أحمر)</option>
                                        <option value="amber">الكهرماني (برتقالي)</option>
                                        <option value="violet">البنفسجي</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block mb-1 font-medium">عنوان الشركة</label>
                                <textarea name="companyAddress" value={settings.companyAddress} onChange={handleSettingsChange} rows={3} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                            </div>
                            <div>
                                <label className="block mb-1 font-medium">شعار الشركة</label>
                                <div className="flex items-center gap-4">
                                    {settings.companyLogo ? 
                                        <img src={settings.companyLogo} alt="Logo" className="w-20 h-20 object-contain p-1 border rounded dark:border-gray-600 bg-gray-50 dark:bg-gray-700"/> :
                                        <div className="w-20 h-20 border rounded dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                                            <Image className="w-8 h-8 text-gray-400" />
                                        </div>
                                    }
                                    <input type="file" accept="image/*" onChange={handleLogoChange} className="text-sm" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Signatures */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-4">أسماء التواقيع في التقارير</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InputField label="أمين المستودع" name="keeper" value={settings.signatureNames.keeper} onChange={handleSignatureChange} />
                        <InputField label="المحاسب" name="accountant" value={settings.signatureNames.accountant} onChange={handleSignatureChange} />
                        <InputField label="المدير العام" name="manager" value={settings.signatureNames.manager} onChange={handleSignatureChange} />
                        </div>
                    </div>

                    {/* Gist Sync Settings */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-4">المزامنة عبر الإنترنت (GitHub Gist)</h2>
                        <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2 mb-4">
                            <p className="font-semibold">لتمكين المزامنة عبر الإنترنت:</p>
                            <ol className="list-decimal list-inside space-y-1">
                                <li>الصق Gist Raw URL في الحقل أدناه ليكون مصدر بيانات الموقع.</li>
                                <li>أنشئ Personal Access Token (Classic) من إعدادات GitHub مع صلاحية `gist` فقط.</li>
                                <li>الصق الـ Token في الحقل الثاني لتمكين الحفظ والمزامنة.</li>
                            </ol>
                        </div>
                        <div className="space-y-4">
                            <InputField 
                                label="رابط Gist Raw للمزامنة" 
                                name="gistUrl" 
                                value={settings.gistUrl || ''} 
                                onChange={handleSettingsChange}
                                placeholder="https://gist.githubusercontent.com/..."
                            />
                            
                            <div className="space-y-2">
                                <label className="block font-medium">GitHub Personal Access Token</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input 
                                            type="password"
                                            name="githubToken" 
                                            value={settings.githubToken || ''} 
                                            onChange={handleSettingsChange} 
                                            disabled={!isTokenUnlocked}
                                            placeholder="••••••••••••••••••••••••••••••••••••••••"
                                            className={`w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 ${!isTokenUnlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        />
                                        {!isTokenUnlocked && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50 dark:bg-gray-800/50 rounded pointer-events-none">
                                                <Lock size={16} className="text-gray-400" />
                                            </div>
                                        )}
                                    </div>
                                    {!isTokenUnlocked ? (
                                        <div className="flex flex-col gap-2">
                                            {!showPasswordInput ? (
                                                <button 
                                                    type="button"
                                                    onClick={() => setShowPasswordInput(true)}
                                                    className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
                                                    title="فتح القفل لتعديل التوكن"
                                                >
                                                    <Lock size={18} />
                                                    تعديل
                                                </button>
                                            ) : (
                                                <div className="flex gap-1 items-center animate-in fade-in slide-in-from-right-2 duration-200">
                                                    <input 
                                                        type="password"
                                                        value={unlockPassword}
                                                        onChange={(e) => setUnlockPassword(e.target.value)}
                                                        placeholder="كلمة المرور"
                                                        autoFocus
                                                        className={`w-24 p-1.5 text-xs border rounded dark:bg-gray-800 ${unlockError ? 'border-red-500 animate-shake' : 'dark:border-gray-600'}`}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleUnlockToken()}
                                                    />
                                                    <button 
                                                        type="button"
                                                        onClick={handleUnlockToken}
                                                        className="p-1.5 bg-sky-500 text-white rounded hover:bg-sky-600"
                                                    >
                                                        <Save size={14} />
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={() => { setShowPasswordInput(false); setUnlockPassword(''); }}
                                                        className="p-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                                                    >
                                                        إلغاء
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded flex items-center gap-1">
                                            <Unlock size={18} />
                                            مفتوح
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button 
                                    onClick={handleSyncNow} 
                                    disabled={isSyncing}
                                    className={`flex items-center px-4 py-2 rounded-lg shadow transition-colors ${isSyncing ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600 text-white'}`}
                                >
                                    <RefreshCw className={`ml-2 ${isSyncing ? 'animate-spin' : ''}`} size={18} />
                                    {isSyncing ? 'جاري المزامنة...' : 'مزامنة الآن'}
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            <span className="font-bold">ملاحظة:</span> بعد حفظ إعدادات المزامنة، يرجى إعادة تحميل الصفحة لتطبيق التغييرات وسحب البيانات من الرابط.
                        </p>
                    </div>
                    
                    <div className="flex justify-start">
                        <button onClick={handleSaveSettings} className="flex items-center px-6 py-2 bg-sky-500 text-white rounded-lg shadow hover:bg-sky-600">
                            <Save className="ml-2" size={20} />
                            حفظ إعدادات النظام
                        </button>
                    </div>
                    {message && <div className="p-3 text-center bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-200 rounded-lg">{message}</div>}

                    {/* Data Management */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-4">إدارة البيانات</h2>
                        <div className="flex flex-wrap items-center gap-4">
                            <button onClick={handleExport} className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600">
                                <Download className="ml-2" size={20}/>
                                تصدير البيانات (JSON)
                            </button>
                            <label className="flex items-center px-4 py-2 bg-amber-500 text-white rounded-lg shadow hover:bg-amber-600 cursor-pointer">
                                <Upload className="ml-2" size={20}/>
                                استيراد البيانات (JSON)
                                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                            </label>
                            <button onClick={handleReset} className="flex items-center px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600">
                                <RefreshCcw className="ml-2" size={20}/>
                                تصفير البيانات
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            <span className="font-bold text-red-500">تحذير:</span> استيراد البيانات سيحذف جميع المواد والحركات الحالية ويستبدلها بالبيانات من الملف المرفوع.
                        </p>
                    </div>
                </>
            )}
        </div>
    );
};

const InputField: React.FC<{label: string, name: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, type?: string, placeholder?: string}> = ({label, name, value, onChange, type = 'text', placeholder}) => (
    <div>
        <label htmlFor={name} className="block mb-1 font-medium">{label}</label>
        <input type={type} id={name} name={name} value={value} onChange={onChange} placeholder={placeholder} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
    </div>
);

export default Settings;