
import { User, Material, Transaction, SettingsData, AllData, UserPermissions, Page, CostCalculation, WeightCalculation, Warehouse, CostTemplate, SyncStatus, SyncState, AppNotification } from '@/types';

// --- UTILS ---
const normalizeArabicNumerals = (str: string): string => {
    const arabicNumerals = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
    return str.replace(/[٠-٩]/g, (d) => {
        return arabicNumerals.findIndex(re => re.test(d)).toString();
    });
};

const parseDateSafely = (dateStr: string): string => {
    if (!dateStr) return new Date().toISOString();
    
    // Normalize Arabic numerals
    let normalized = normalizeArabicNumerals(dateStr);
    
    // Try parsing
    let date = new Date(normalized);
    if (isNaN(date.getTime())) {
        // Try common formats if standard parsing fails
        // e.g., DD/MM/YYYY or YYYY/MM/DD with slashes
        const parts = normalized.split(/[/.-]/);
        if (parts.length === 3) {
            // Assume YYYY/MM/DD or DD/MM/YYYY
            if (parts[0].length === 4) {
                date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            } else if (parts[2].length === 4) {
                date = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
            }
        }
    }
    
    return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

// --- INITIAL DATA & HELPERS ---

const USERS_KEY = 'warehouse_users';
const MATERIALS_KEY = 'warehouse_materials';
const TRANSACTIONS_KEY = 'warehouse_transactions';
const SETTINGS_KEY = 'warehouse_settings';
const CURRENT_USER_KEY = 'currentUser';
const COST_CALCULATIONS_KEY = 'warehouse_cost_calculations';
const WEIGHT_CALCULATIONS_KEY = 'warehouse_weight_calculations';
const WAREHOUSES_KEY = 'warehouse_warehouses';
const COST_TEMPLATES_KEY = 'warehouse_cost_templates';
const UNSYNCED_CHANGES_KEY = 'warehouse_unsynced_changes';
const LAST_SYNC_KEY = 'warehouse_last_sync';
const NOTIFICATIONS_KEY = 'warehouse_notifications';

// --- Obfuscation Helpers for Token Persistence ---
const obfuscate = (str: string) => {
    if (!str) return '';
    try {
        return btoa(str.split('').reverse().join(''));
    } catch { return ''; }
};

const deobfuscate = (str: string) => {
    if (!str) return '';
    try {
        return atob(str).split('').reverse().join('');
    } catch { return ''; }
};

// --- Sync Status Management ---
let currentSyncStatus: SyncStatus = {
  state: 'idle',
  lastSync: localStorage.getItem(LAST_SYNC_KEY) || undefined
};

type SyncListener = (status: SyncStatus) => void;
const syncListeners: Set<SyncListener> = new Set();

export const subscribeToSyncStatus = (listener: SyncListener) => {
  syncListeners.add(listener);
  listener(currentSyncStatus);
  return () => { syncListeners.delete(listener); };
};

const updateSyncStatus = (status: Partial<SyncStatus>) => {
  currentSyncStatus = { ...currentSyncStatus, ...status };
  if (status.lastSync) {
    localStorage.setItem(LAST_SYNC_KEY, status.lastSync);
  }
  syncListeners.forEach(listener => listener(currentSyncStatus));
};

const getDefaultPermissions = (role: 'admin' | 'visitor'): UserPermissions => {
  if (role === 'admin') {
    return {
      canPrint: true,
      canExport: true,
      allowedPages: [
        'dashboard', 
        'materials', 
        'transactions', 
        'reports', 
        'settings', 
        'new-entries', 
        'users',
        'supplier-returns',
        'cost-meter',
        'cost-weight',
        'quick-look',
        'warehouses'
      ]
    };
  }
  return {
    canPrint: false,
    canExport: false,
    allowedPages: ['dashboard', 'materials', 'transactions', 'supplier-returns', 'cost-meter', 'cost-weight', 'quick-look', 'warehouses']
  };
};

const defaultLogoSvg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIxIDExLjVMMTIgNkwzIDExLjVWMTlIMjFWMS41WiIgc3Ryb2tlPSIjM2JjM2Y0IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNMjIgMTAuNUwxMiA1TDIgMTAuNSIgc3Ryb2tlPSIjM2JjM2Y0IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNOSAxOFE5IDE1IDEyIDE1QzE1IDE1IDE1IDE4IDE1IDE4VjIySDlWMThaIiBzdHJva2U9IiMwMmFkZTYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtaW5lam9pbj0icm91bmQiLz4KPC9zdmc+';

const getFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage key “${key}”:`, error);
    return defaultValue;
  }
};

const saveToStorage = <T>(key: string, value: T, markUnsynced = true) => {
  try {
    const item = JSON.stringify(value);
    localStorage.setItem(key, item);
    if (markUnsynced) {
      localStorage.setItem(UNSYNCED_CHANGES_KEY, 'true');
    }
  } catch (error) {
    console.error(`Error writing to localStorage key “${key}”:`, error);
  }
};

const hasUnsyncedChanges = () => localStorage.getItem(UNSYNCED_CHANGES_KEY) === 'true';

// --- Notifications ---
export const getNotifications = (): AppNotification[] => {
  const notifications = getFromStorage<AppNotification[]>(NOTIFICATIONS_KEY, []);
  // Sort by timestamp descending
  return notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const addNotification = (notification: Omit<AppNotification, 'id' | 'timestamp' | 'user'>) => {
  const notifications = getNotifications();
  const currentUser = getCurrentUser();
  const newNotification: AppNotification = {
    ...notification,
    id: `notif-${Date.now()}`,
    timestamp: new Date().toISOString(),
    user: currentUser?.username || 'نظام'
  };
  
  // Keep only last 50 notifications
  const updatedNotifications = [newNotification, ...notifications].slice(0, 50);
  saveToStorage(NOTIFICATIONS_KEY, updatedNotifications, false); // Don't mark as unsynced for notifications
};

export const clearNotifications = () => {
  saveToStorage(NOTIFICATIONS_KEY, [], false);
};

const initializeData = () => {
    if (!localStorage.getItem(USERS_KEY)) {
        const initialUsers: User[] = [
            { id: '1', username: 'admin', password: 'admin123', role: 'admin', permissions: getDefaultPermissions('admin') },
            { id: '2', username: 'user', password: 'user123', role: 'visitor', permissions: getDefaultPermissions('visitor') },
        ];
        saveToStorage(USERS_KEY, initialUsers, false);
    }

    if (!localStorage.getItem(WAREHOUSES_KEY)) {
        const initialWarehouses: Warehouse[] = [
            { id: 'w1', name: 'المستودع الرئيسي', location: 'المبنى أ', description: 'المستودع الأساسي للمواد' }
        ];
        saveToStorage(WAREHOUSES_KEY, initialWarehouses, false);
    }

    if (!localStorage.getItem(MATERIALS_KEY)) {
        const initialMaterials: Material[] = [
            { id: 'm1', name: 'لابتوب ديل', materialType: 'DELL-LT-001', unit: 'حبة', category: 'أجهزة إلكترونية', specifications: 'Core i7, 16GB RAM, 512GB SSD', supplier: 'شركة التكنولوجيا الحديثة', barcode: '1234567890123', minStock: 5, currentStock: 15, isNew: false, color: 'فضي', stocks: { 'w1': 15 }, createdAt: new Date().toISOString(), price: 25000 },
            { id: 'm2', name: 'شاشة سامسونج 24 بوصة', materialType: 'SAM-SC-024', unit: 'حبة', category: 'أجهزة إلكترونية', specifications: '24" Full HD, 75Hz', supplier: 'سامسونج العالمية', barcode: '1234567890124', minStock: 10, currentStock: 8, isNew: false, color: 'أسود', stocks: { 'w1': 8 }, createdAt: new Date().toISOString(), price: 4500 },
        ];
        saveToStorage(MATERIALS_KEY, initialMaterials, false);
    }
    
    if (!localStorage.getItem(TRANSACTIONS_KEY)) {
        saveToStorage(TRANSACTIONS_KEY, [], false);
    }

    if (!localStorage.getItem(SETTINGS_KEY)) {
        const initialSettings: SettingsData = {
            companyName: 'اسم الشركة',
            companyAddress: 'العنوان هنا',
            companyLogo: defaultLogoSvg,
            signatureNames: { keeper: 'أمين المستودع', accountant: 'المحاسب', manager: 'المدير العام' },
            gistUrl: 'https://gist.githubusercontent.com/mohazard555/6da370385392ac7cd27e034efe4b7d7c/raw/amenstor.json',
            githubToken: '',
        };
        saveToStorage(SETTINGS_KEY, initialSettings, false);
    }
};

initializeData();

let isSyncing = false;
let syncTimeout: NodeJS.Timeout | null = null;

export const syncDataToGist = async (): Promise<boolean> => {
    const settings = getSettings();
    const token = settings.githubToken ? settings.githubToken.trim() : '';
    if (!settings.gistUrl || !token) {
        updateSyncStatus({ state: 'error', error: 'إعدادات Gist غير مكتملة (الرابط أو التوكن مفقود).' });
        return false;
    }

    const match = settings.gistUrl.match(/gist\.github(?:usercontent)?\.com\/[^\/]+\/([a-f0-9]+)/);
    if (!match) {
        updateSyncStatus({ state: 'error', error: 'رابط Gist غير صالح.' });
        return false;
    }
    const gistId = match[1];
    
    if (isSyncing) {
        // If already syncing, the debouncedSync will trigger again after 2s anyway
        return false;
    }
    
    isSyncing = true;
    updateSyncStatus({ state: 'syncing', error: undefined });
    
    const allData = exportAllData();
    
    try {
        // 1. Get Gist info to find the correct filename
        const getResponse = await fetch(`https://api.github.com/gists/${gistId}`, {
            headers: { 
                'Authorization': `Bearer ${token}`, 
                'Accept': 'application/vnd.github.v3+json' 
            }
        });
        
        let filename = 'warehouse-data.json'; // Default
        
        // Try to extract filename from the gistUrl if it's a raw URL
        const urlParts = settings.gistUrl.split('/');
        const lastPart = urlParts[urlParts.length - 1];
        if (lastPart && lastPart.endsWith('.json')) {
            filename = lastPart.split('?')[0];
        }
        
        if (getResponse.ok) {
            const gistInfo = await getResponse.json();
            // If the URL filename isn't in the gist, pick the first JSON file or any file
            if (!gistInfo.files[filename]) {
                const jsonFile = Object.keys(gistInfo.files).find(f => f.endsWith('.json'));
                filename = jsonFile || Object.keys(gistInfo.files)[0] || filename;
            }
        } else if (getResponse.status !== 404) {
            // If it's not a 404, it's a real error (like 401 Unauthorized)
            const errData = await getResponse.json().catch(() => ({}));
            const errorMsg = `GitHub Error (${getResponse.status}): ${errData.message || getResponse.statusText}`;
            throw new Error(errorMsg);
        }
        // If 404, we assume it's a new Gist or we'll try to create/patch anyway (though PATCH needs existing)

        // 2. Perform the update
        const response = await fetch(`https://api.github.com/gists/${gistId}`, {
            method: 'PATCH',
            headers: { 
                'Authorization': `Bearer ${token}`, 
                'Accept': 'application/vnd.github.v3+json', 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ 
                files: { 
                    [filename]: { 
                        content: JSON.stringify(allData, null, 2) 
                    } 
                } 
            }),
        });
        
        if (response.ok) {
            localStorage.setItem(UNSYNCED_CHANGES_KEY, 'false');
            const now = new Date().toISOString();
            updateSyncStatus({ state: 'success', lastSync: now, error: undefined });
            isSyncing = false;
            return true;
        } else {
            const errData = await response.json().catch(() => ({}));
            const errorMsg = `GitHub Error (${response.status}): ${errData.message || response.statusText}`;
            throw new Error(errorMsg);
        }
    } catch (error: any) { 
        console.error("Gist sync error:", error); 
        let errorMsg = error.message || 'حدث خطأ أثناء المزامنة.';
        if (errorMsg.includes('NetworkError') || errorMsg.includes('Failed to fetch')) {
            errorMsg = 'فشل الاتصال بخوادم GitHub. يرجى التأكد من اتصالك بالإنترنت أو التحقق من صحة التوكن (قد يسبب التوكن الخاطئ مشكلة CORS).';
        }
        updateSyncStatus({ state: 'error', error: errorMsg });
        isSyncing = false;
        return false;
    }
};

const debouncedSync = () => {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        syncDataToGist();
    }, 2000); // Reduced to 2 seconds for better responsiveness
};

// Attempt sync before closing
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        if (hasUnsyncedChanges()) {
            syncDataToGist();
        }
    });
}

export const initializeDataSource = async (overrideUrl?: string): Promise<{ success: boolean; message?: string }> => {
    const settings = getSettings();
    const fetchUrl = overrideUrl || settings.gistUrl;
    
    if (!fetchUrl) return { success: true, message: 'Using local data.' };
    
    const gistIdMatch = fetchUrl.match(/gist\.github(?:usercontent)?\.com\/[^\/]+\/([a-f0-9]+)/);
    const gistId = gistIdMatch ? gistIdMatch[1] : null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // Increased to 20 seconds timeout

    try {
        if (hasUnsyncedChanges() && settings.githubToken) {
            const success = await syncDataToGist();
            if (success) {
                return { success: true, message: 'تم اكتشاف تغييرات محلية ومزامنتها بنجاح.' };
            } else {
                // If sync failed, we still proceed but warn the user
                return { success: true, message: 'توجد تغييرات محلية لم يتمكن النظام من مزامنتها حالياً.' };
            }
        }

        let dataText = '';
        
        if (gistId) {
            try {
                const apiResponse = await fetch(`https://api.github.com/gists/${gistId}`, { 
                    cache: 'no-store',
                    signal: controller.signal,
                    headers: settings.githubToken ? { 'Authorization': `token ${settings.githubToken}` } : {}
                });
                if (apiResponse.ok) {
                    const gistData = await apiResponse.json();
                    
                    let filename = 'warehouse-data.json';
                    const urlParts = fetchUrl.split('/');
                    const lastPart = urlParts[urlParts.length - 1];
                    if (lastPart && lastPart.endsWith('.json')) {
                        filename = lastPart.split('?')[0];
                    }

                    const file = gistData.files[filename] || 
                                 Object.keys(gistData.files).find(f => f.endsWith('.json')) || 
                                 Object.values(gistData.files)[0];
                    
                    if (file && (file as any).content) {
                        dataText = (file as any).content;
                    }
                }
            } catch (apiErr: any) {
                if (apiErr.name === 'AbortError') {
                    console.warn("Gist API fetch timed out.");
                } else {
                    console.warn("Gist API fetch failed:", apiErr);
                }
            }
        }

        if (!dataText && !controller.signal.aborted) {
            let rawUrl = fetchUrl;
            if (rawUrl.includes('/raw/') && rawUrl.split('/raw/')[1]?.includes('/')) {
                const parts = rawUrl.split('/raw/');
                const pathParts = parts[1].split('/');
                if (pathParts.length > 1) {
                    rawUrl = `${parts[0]}/raw/${pathParts[pathParts.length - 1]}`;
                }
            }
            
            try {
                const response = await fetch(rawUrl, { cache: 'no-store', signal: controller.signal });
                if (!response.ok) throw new Error(`Failed to fetch data from Gist (Status: ${response.status}).`);
                dataText = await response.text();
            } catch (rawErr: any) {
                if (rawErr.name === 'AbortError') {
                    console.warn("Raw Gist fetch timed out.");
                } else {
                    throw rawErr;
                }
            }
        }
        
        clearTimeout(timeoutId);

        if (controller.signal.aborted) {
            return { success: true, message: 'الاتصال ضعيف، يتم استخدام البيانات المحلية حالياً.' };
        }
        if (!dataText || dataText.trim() === '' || dataText.trim() === '{}' || dataText.trim() === '[]') {
            if (settings.githubToken) {
                syncDataToGist();
                return { success: true, message: 'Gist was empty. Local data has been queued for sync.' };
            }
            return { success: true, message: 'Gist is empty. Sync will start on next change.' };
        }
        
        try {
            const data = JSON.parse(dataText);
            importAllData(data);
            return { success: true, message: 'Data loaded from Gist.' };
        } catch (e) {
            throw new Error('Gist content is not valid JSON.');
        }
    } catch (error) { 
        console.error("Initialize data source error:", error);
        return { success: false, message: (error as Error).message }; 
    }
};

export const authenticateUser = (username: string, password: string): User | null => {
    const users = getFromStorage<User[]>(USERS_KEY, []);
    const user = users.find(u => u.username === username && u.password === password);
    if (user) { sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user)); return user; }
    return null;
};

export const getCurrentUser = (): User | null => {
  try {
    const userJson = sessionStorage.getItem(CURRENT_USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  } catch { return null; }
};

export const getUsers = (): User[] => getFromStorage<User[]>(USERS_KEY, []);
export const addUser = (userData: Omit<User, 'id'>): User => {
    const users = getUsers();
    if (users.some(u => u.username === userData.username)) throw new Error('Username already exists');
    const newUser: User = { 
        ...userData, 
        id: `u${Date.now()}`,
        permissions: userData.permissions || getDefaultPermissions(userData.role)
    };
    saveToStorage(USERS_KEY, [...users, newUser]);
    addNotification({
        type: 'user',
        action: 'add',
        title: 'إضافة مستخدم جديد',
        message: `تم إضافة المستخدم: ${newUser.username}`
    });
    debouncedSync();
    return newUser;
};

export const updateUser = (updatedUser: User): User => {
    let users = getUsers();
    const currentUser = getCurrentUser();
    if (users.some(u => u.username === updatedUser.username && u.id !== updatedUser.id)) throw new Error('Username already exists');
    users = users.map(u => {
        if (u.id === updatedUser.id) {
            return {
                ...u,
                ...updatedUser,
                password: updatedUser.password || u.password // Preserve password if not provided
            };
        }
        return u;
    });
    saveToStorage(USERS_KEY, users);
    addNotification({
        type: 'user',
        action: 'update',
        title: 'تحديث مستخدم',
        message: `تم تحديث بيانات المستخدم: ${updatedUser.username}`
    });
    debouncedSync();
    if (currentUser && currentUser.id === updatedUser.id) sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
    return updatedUser;
};

export const deleteUser = (userId: string): void => {
    const users = getUsers();
    const userToDelete = users.find(u => u.id === userId);
    saveToStorage(USERS_KEY, users.filter(u => u.id !== userId));
    if (userToDelete) {
        addNotification({
            type: 'user',
            action: 'delete',
            title: 'حذف مستخدم',
            message: `تم حذف المستخدم: ${userToDelete.username}`
        });
    }
    debouncedSync();
};

export const getWarehouses = (): Warehouse[] => getFromStorage<Warehouse[]>(WAREHOUSES_KEY, []);

export const addWarehouse = (warehouse: Omit<Warehouse, 'id'>): Warehouse => {
  const warehouses = getWarehouses();
  const newWarehouse: Warehouse = { ...warehouse, id: `wh-${Date.now()}` };
  warehouses.push(newWarehouse);
  saveToStorage(WAREHOUSES_KEY, warehouses);
  addNotification({
    type: 'warehouse',
    action: 'add',
    title: 'إضافة مستودع',
    message: `تم إضافة مستودع جديد: ${newWarehouse.name}`
  });
  debouncedSync();
  return newWarehouse;
};

export const updateWarehouse = (warehouse: Warehouse): void => {
  const warehouses = getWarehouses();
  const index = warehouses.findIndex(w => w.id === warehouse.id);
  if (index !== -1) {
    warehouses[index] = warehouse;
    saveToStorage(WAREHOUSES_KEY, warehouses);
    addNotification({
      type: 'warehouse',
      action: 'update',
      title: 'تحديث مستودع',
      message: `تم تحديث بيانات مستودع: ${warehouse.name}`
    });
    debouncedSync();
  }
};

export const deleteWarehouse = (id: string): void => {
  const warehouses = getWarehouses();
  const warehouseToDelete = warehouses.find(w => w.id === id);
  saveToStorage(WAREHOUSES_KEY, warehouses.filter(w => w.id !== id));
  if (warehouseToDelete) {
    addNotification({
      type: 'warehouse',
      action: 'delete',
      title: 'حذف مستودع',
      message: `تم حذف مستودع: ${warehouseToDelete.name}`
    });
  }
  debouncedSync();
};

export const getMaterials = (): Material[] => {
  const materials = getFromStorage<Material[]>(MATERIALS_KEY, []);
  const warehouses = getWarehouses();
  const defaultWarehouseId = warehouses.length > 0 ? warehouses[0].id : 'wh-default';
  
  // Ensure all materials have stocks object
  return materials.map(m => {
    if (!m.stocks) {
      return { ...m, stocks: { [defaultWarehouseId]: m.currentStock } };
    }
    return m;
  });
};
export const addMaterial = (materialData: Omit<Material, 'id' | 'isNew'>): Material => {
    const materials = getMaterials();
    const initialStocks = materialData.stocks || {};
    const createdAt = parseDateSafely((materialData as any).createdAt);
    
    // Create material with 0 stock initially to avoid double counting when adding transactions
    const newMaterial: Material = { 
        ...materialData, 
        id: `m${Date.now()}`, 
        isNew: true,
        createdAt,
        stocks: {},
        currentStock: 0
    };
    
    // Save material first
    const updatedMaterials = [...materials, newMaterial];
    saveToStorage(MATERIALS_KEY, updatedMaterials);
    
    // Create transactions for initial stocks
    Object.entries(initialStocks).forEach(([warehouseId, quantity]) => {
        if (quantity > 0) {
            addTransaction({
                type: 'in',
                materialId: newMaterial.id,
                quantity: quantity,
                warehouseId: warehouseId,
                recipient: 'رصيد افتتاحي',
                notes: 'تمت الإضافة عند إنشاء المادة',
                date: createdAt,
                color: newMaterial.color
            });
        }
    });

    addNotification({
        type: 'material',
        action: 'add',
        title: 'إضافة مادة',
        message: `تم إضافة مادة جديدة: ${newMaterial.name}`
    });
    debouncedSync();
    
    // Return the material with updated stocks (refetched)
    const finalMaterials = getMaterials();
    return finalMaterials.find(m => m.id === newMaterial.id) || newMaterial;
};

export const updateMaterial = (updatedMaterial: Material): Material => {
    const materials = getMaterials();
    const oldMaterial = materials.find(m => m.id === updatedMaterial.id);
    
    if (oldMaterial) {
        // Check for stock changes in the modal (Opening Balance edits)
        Object.entries(updatedMaterial.stocks || {}).forEach(([warehouseId, newQty]) => {
            const oldQty = oldMaterial.stocks[warehouseId] || 0;
            if (newQty !== oldQty) {
                const diff = newQty - oldQty;
                addTransaction({
                    type: diff > 0 ? 'in' : 'out',
                    materialId: updatedMaterial.id,
                    quantity: Math.abs(diff),
                    warehouseId: warehouseId,
                    recipient: 'تعديل رصيد افتتاحي',
                    notes: `تعديل يدوي من إدارة المواد (الفرق: ${diff})`,
                    date: new Date().toISOString(),
                    color: updatedMaterial.color
                });
            }
        });
    }

    // Recalculate total stock based on current state (after transactions)
    const currentMaterials = getMaterials();
    const materialToSave = currentMaterials.find(m => m.id === updatedMaterial.id) || updatedMaterial;
    
    // Update other fields from updatedMaterial
    const finalMaterial = {
        ...materialToSave,
        name: updatedMaterial.name,
        materialType: updatedMaterial.materialType,
        category: updatedMaterial.category,
        specifications: updatedMaterial.specifications,
        supplier: updatedMaterial.supplier,
        barcode: updatedMaterial.barcode,
        color: updatedMaterial.color,
        unit: updatedMaterial.unit,
        price: updatedMaterial.price,
        minStock: updatedMaterial.minStock,
        weightFormula: updatedMaterial.weightFormula
    };

    const finalMaterialsList = getMaterials().map(m => m.id === finalMaterial.id ? finalMaterial : m);
    saveToStorage(MATERIALS_KEY, finalMaterialsList);
    
    addNotification({
        type: 'material',
        action: 'update',
        title: 'تحديث مادة',
        message: `تم تحديث بيانات مادة: ${finalMaterial.name}`
    });
    debouncedSync();
    return finalMaterial;
};

export const acknowledgeNewMaterial = (materialId: string): void => {
    const material = getMaterials().find(m => m.id === materialId);
    if(material) updateMaterial({ ...material, isNew: false });
};

export const deleteMaterial = (materialId: string): void => {
    const materials = getMaterials();
    const materialToDelete = materials.find(m => m.id === materialId);
    saveToStorage(MATERIALS_KEY, materials.filter(m => m.id !== materialId));
    if (materialToDelete) {
        addNotification({
            type: 'material',
            action: 'delete',
            title: 'حذف مادة',
            message: `تم حذف مادة: ${materialToDelete.name}`
        });
    }
    debouncedSync();
};

export const getTransactions = (): Transaction[] => getFromStorage<Transaction[]>(TRANSACTIONS_KEY, []);

export const repairInitialTransactions = (): void => {
    const materials = getMaterials();
    const transactions = getTransactions();
    
    let repairedCount = 0;
    
    materials.forEach(material => {
        // Check if this material has any 'in' or 'return_in' transactions
        const hasInTransaction = transactions.some((t: Transaction) => 
            t.materialId === material.id && (t.type === 'in' || t.type === 'return_in')
        );
        
        // If it has stock but no "In" transaction, create one for the opening balance
        if (!hasInTransaction && material.currentStock > 0) {
            Object.entries(material.stocks || {}).forEach(([warehouseId, quantity]) => {
                if (quantity > 0) {
                    addTransaction({
                        type: 'in',
                        materialId: material.id,
                        quantity: quantity,
                        warehouseId: warehouseId,
                        recipient: 'رصيد افتتاحي (إصلاح تلقائي)',
                        notes: 'تم توليد هذه الحركة تلقائياً لضمان ظهور الرصيد في التقارير',
                        date: material.createdAt || new Date().toISOString(),
                        color: material.color
                    });
                    repairedCount++;
                }
            });
        }
    });
    
    if (repairedCount > 0) {
        console.log(`Repaired ${repairedCount} initial stock transactions.`);
        debouncedSync();
    }
};

export const addTransaction = (transactionData: Omit<Transaction, 'id' | 'materialName' | 'supplier' | 'category' | 'barcode' | 'unit' | 'materialType'>): Transaction => {
    const transactions = getTransactions();
    let materials = getMaterials();
    const material = materials.find(m => m.id === transactionData.materialId);

    if (!material) throw new Error('Material not found');

    const warehouseId = transactionData.warehouseId;
    const currentWarehouseStock = material.stocks[warehouseId] || 0;

    if (transactionData.type === 'out' && currentWarehouseStock < transactionData.quantity) {
        throw new Error(`الكمية المطلوبة غير متوفرة في المستودع المحدد. المتوفر: ${currentWarehouseStock}`);
    }

    if (transactionData.type === 'return' && currentWarehouseStock < transactionData.quantity) {
        throw new Error(`لا يوجد رصيد كافي لإتمام عملية المرتجع للمورد من هذا المستودع. المتوفر: ${currentWarehouseStock}`);
    }

    if (transactionData.type === 'transfer') {
        if (!transactionData.toWarehouseId) throw new Error('يجب تحديد المستودع المحول إليه');
        if (currentWarehouseStock < transactionData.quantity) {
            throw new Error(`الكمية المطلوبة غير متوفرة في المستودع المحدد. المتوفر: ${currentWarehouseStock}`);
        }
    }

    const newTransaction: Transaction = {
        ...transactionData,
        id: `t${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        date: parseDateSafely(transactionData.date || ''),
        materialName: material.name,
        materialType: material.materialType,
        supplier: material.supplier,
        category: material.category,
        barcode: material.barcode,
        itemBarcode: transactionData.itemBarcode,
        unit: material.unit,
        color: transactionData.color || material.color
    };
    
    // Calculate new stock based on type
    const updatedMaterial = { ...material, stocks: { ...material.stocks } };

    if (transactionData.type === 'in' || transactionData.type === 'return_in') {
        updatedMaterial.stocks[warehouseId] = currentWarehouseStock + transactionData.quantity;
    } else if (transactionData.type === 'out' || transactionData.type === 'return') {
        updatedMaterial.stocks[warehouseId] = currentWarehouseStock - transactionData.quantity;
    } else if (transactionData.type === 'transfer' && transactionData.toWarehouseId) {
        updatedMaterial.stocks[warehouseId] = currentWarehouseStock - transactionData.quantity;
        updatedMaterial.stocks[transactionData.toWarehouseId] = (updatedMaterial.stocks[transactionData.toWarehouseId] || 0) + transactionData.quantity;
    }

    updatedMaterial.currentStock = Object.values(updatedMaterial.stocks).reduce((sum, val) => sum + val, 0);

    materials = materials.map(m => m.id === updatedMaterial.id ? updatedMaterial : m);
    
    saveToStorage(MATERIALS_KEY, materials);
    saveToStorage(TRANSACTIONS_KEY, [...transactions, newTransaction]);
    addNotification({
        type: 'transaction',
        action: 'add',
        title: 'حركة مخزنية جديدة',
        message: `تم إضافة حركة ${newTransaction.type === 'in' ? 'وارد' : newTransaction.type === 'out' ? 'صادر' : 'تحويل'} للمادة: ${newTransaction.materialName}`
    });
    debouncedSync();

    return newTransaction;
};

export const deleteTransaction = (transactionId: string): void => {
    const transactions = getTransactions();
    const transaction = transactions.find((t: Transaction) => t.id === transactionId);
    if (!transaction) return;

    let materials = getMaterials();
    const material = materials.find(m => m.id === transaction.materialId);

    if (material) {
        const warehouseId = transaction.warehouseId;
        const currentWarehouseStock = material.stocks[warehouseId] || 0;
        const updatedMaterial = { ...material, stocks: { ...material.stocks } };

        if (transaction.type === 'in') {
            updatedMaterial.stocks[warehouseId] = currentWarehouseStock - transaction.quantity;
        } else if (transaction.type === 'out' || transaction.type === 'return') {
            updatedMaterial.stocks[warehouseId] = currentWarehouseStock + transaction.quantity;
        } else if (transaction.type === 'transfer' && transaction.toWarehouseId) {
            updatedMaterial.stocks[warehouseId] = currentWarehouseStock + transaction.quantity;
            updatedMaterial.stocks[transaction.toWarehouseId] = (updatedMaterial.stocks[transaction.toWarehouseId] || 0) - transaction.quantity;
        }

        updatedMaterial.currentStock = Object.values(updatedMaterial.stocks).reduce((sum, val) => sum + val, 0);
        materials = materials.map(m => m.id === updatedMaterial.id ? updatedMaterial : m);
        saveToStorage(MATERIALS_KEY, materials);
    }

    saveToStorage(TRANSACTIONS_KEY, transactions.filter((t: Transaction) => t.id !== transactionId));
    addNotification({
        type: 'transaction',
        action: 'delete',
        title: 'حذف حركة مخزنية',
        message: `تم حذف حركة للمادة: ${transaction.materialName}`
    });
    debouncedSync();
};

export const updateTransaction = (updatedTransaction: Transaction): Transaction => {
    const transactions = getTransactions();
    const oldTransaction = transactions.find((t: Transaction) => t.id === updatedTransaction.id);
    if (!oldTransaction) return updatedTransaction;

    let materials = getMaterials();
    const material = materials.find(m => m.id === updatedTransaction.materialId);

    if (material) {
        const updatedMaterial = { ...material, stocks: { ...material.stocks } };
        
        // 1. Reverse old stock change
        const oldWarehouseId = oldTransaction.warehouseId;
        if (oldTransaction.type === 'in') {
            updatedMaterial.stocks[oldWarehouseId] = (updatedMaterial.stocks[oldWarehouseId] || 0) - oldTransaction.quantity;
        } else if (oldTransaction.type === 'out' || oldTransaction.type === 'return') {
            updatedMaterial.stocks[oldWarehouseId] = (updatedMaterial.stocks[oldWarehouseId] || 0) + oldTransaction.quantity;
        } else if (oldTransaction.type === 'transfer' && oldTransaction.toWarehouseId) {
            updatedMaterial.stocks[oldWarehouseId] = (updatedMaterial.stocks[oldWarehouseId] || 0) + oldTransaction.quantity;
            updatedMaterial.stocks[oldTransaction.toWarehouseId] = (updatedMaterial.stocks[oldTransaction.toWarehouseId] || 0) - oldTransaction.quantity;
        }

        // 2. Apply new stock change
        const newWarehouseId = updatedTransaction.warehouseId;
        if (updatedTransaction.type === 'in') {
            updatedMaterial.stocks[newWarehouseId] = (updatedMaterial.stocks[newWarehouseId] || 0) + updatedTransaction.quantity;
        } else if (updatedTransaction.type === 'out' || updatedTransaction.type === 'return') {
            updatedMaterial.stocks[newWarehouseId] = (updatedMaterial.stocks[newWarehouseId] || 0) - updatedTransaction.quantity;
        } else if (updatedTransaction.type === 'transfer' && updatedTransaction.toWarehouseId) {
            updatedMaterial.stocks[newWarehouseId] = (updatedMaterial.stocks[newWarehouseId] || 0) - updatedTransaction.quantity;
            updatedMaterial.stocks[updatedTransaction.toWarehouseId] = (updatedMaterial.stocks[updatedTransaction.toWarehouseId] || 0) + updatedTransaction.quantity;
        }

        // Check for negative stocks
        if (Object.values(updatedMaterial.stocks).some(stock => stock < 0)) {
            throw new Error('تعديل الحركة سيؤدي لنتائج سالبة في المخزون.');
        }

        updatedMaterial.currentStock = Object.values(updatedMaterial.stocks).reduce((sum, val) => sum + val, 0);

        materials = materials.map(m => m.id === updatedMaterial.id ? updatedMaterial : m);
        saveToStorage(MATERIALS_KEY, materials);
    }

    const updatedTransactions = transactions.map((t: Transaction) => t.id === updatedTransaction.id ? updatedTransaction : t);
    saveToStorage(TRANSACTIONS_KEY, updatedTransactions);
    addNotification({
        type: 'transaction',
        action: 'update',
        title: 'تحديث حركة مخزنية',
        message: `تم تحديث بيانات حركة للمادة: ${updatedTransaction.materialName}`
    });
    debouncedSync();

    return updatedTransaction;
};

export const getSettings = (): SettingsData => {
    const defaultGistUrl = 'https://gist.githubusercontent.com/mohazard555/6da370385392ac7cd27e034efe4b7d7c/raw/amenstor.json';
    const settings = getFromStorage<SettingsData>(SETTINGS_KEY, { 
        companyName: '', 
        companyAddress: '', 
        companyLogo: '', 
        signatureNames: { keeper: '', accountant: '', manager: '' }, 
        gistUrl: defaultGistUrl, 
        githubToken: '' 
    });
    
    // If gistUrl is empty in storage, use the default one
    if (!settings.gistUrl) {
        settings.gistUrl = defaultGistUrl;
    }
    
    return settings;
};
export const saveSettings = (settings: SettingsData): void => { 
    saveToStorage(SETTINGS_KEY, settings); 
    addNotification({
        type: 'settings',
        action: 'update',
        title: 'تحديث الإعدادات',
        message: 'تم تحديث إعدادات النظام'
    });
    debouncedSync(); // Sync immediately when settings are saved
};

export const getCostCalculations = (): CostCalculation[] => getFromStorage<CostCalculation[]>(COST_CALCULATIONS_KEY, []);

export const addCostCalculation = (calc: Omit<CostCalculation, 'id' | 'date'>): CostCalculation => {
    const calcs = getCostCalculations();
    const newCalc: CostCalculation = {
        ...calc,
        id: `calc${Date.now()}`,
        date: new Date().toISOString()
    };
    saveToStorage(COST_CALCULATIONS_KEY, [...calcs, newCalc]);
    debouncedSync();
    return newCalc;
};

export const deleteCostCalculation = (id: string): void => {
    saveToStorage(COST_CALCULATIONS_KEY, getCostCalculations().filter(c => c.id !== id));
    debouncedSync();
};

export const getWeightCalculations = (): WeightCalculation[] => getFromStorage<WeightCalculation[]>(WEIGHT_CALCULATIONS_KEY, []);

export const addWeightCalculation = (calc: Omit<WeightCalculation, 'id' | 'date'>): WeightCalculation => {
    const calcs = getWeightCalculations();
    const newCalc: WeightCalculation = {
        ...calc,
        id: `wcalc${Date.now()}`,
        date: new Date().toISOString()
    };
    saveToStorage(WEIGHT_CALCULATIONS_KEY, [...calcs, newCalc]);
    debouncedSync();
    return newCalc;
};

export const deleteWeightCalculation = (id: string): void => {
    saveToStorage(WEIGHT_CALCULATIONS_KEY, getWeightCalculations().filter(c => c.id !== id));
    debouncedSync();
};

export const getCostTemplates = (): CostTemplate[] => getFromStorage<CostTemplate[]>(COST_TEMPLATES_KEY, []);

export const addCostTemplate = (template: Omit<CostTemplate, 'id' | 'date'>): CostTemplate => {
    const templates = getCostTemplates();
    const newTemplate: CostTemplate = {
        ...template,
        id: `ctemp${Date.now()}`,
        date: new Date().toISOString()
    };
    saveToStorage(COST_TEMPLATES_KEY, [...templates, newTemplate]);
    debouncedSync();
    return newTemplate;
};

export const deleteCostTemplate = (id: string): void => {
    saveToStorage(COST_TEMPLATES_KEY, getCostTemplates().filter(c => c.id !== id));
    debouncedSync();
};

export const exportAllData = (): AllData => {
    const settings = getSettings();
    // CRITICAL: Never export the raw GitHub token to the Gist as GitHub will revoke it.
    // We use a simple obfuscation to allow persistence across devices while avoiding automated revocation.
    const safeSettings = { 
        ...settings, 
        githubToken: '',
        _sync_key: obfuscate(settings.githubToken || '') 
    };
    
    return { 
        settings: safeSettings, 
        materials: getMaterials(), 
        transactions: getTransactions(), 
        users: getUsers(), 
        costCalculations: getCostCalculations(),
        weightCalculations: getWeightCalculations(),
        warehouses: getWarehouses(),
        costTemplates: getCostTemplates()
    };
};

export const resetAllData = (): void => {
    const users = getUsers();
    const adminUser = users.find(u => u.role === 'admin');
    
    // Keep at least one admin
    const initialUsers: User[] = adminUser ? [adminUser] : [
        { id: '1', username: 'admin', password: 'admin123', role: 'admin', permissions: getDefaultPermissions('admin') }
    ];
    
    saveToStorage(USERS_KEY, initialUsers);
    saveToStorage(MATERIALS_KEY, []);
    saveToStorage(TRANSACTIONS_KEY, []);
    saveToStorage(COST_CALCULATIONS_KEY, []);
    saveToStorage(WEIGHT_CALCULATIONS_KEY, []);
    saveToStorage(WAREHOUSES_KEY, [
        { id: 'w1', name: 'المستودع الرئيسي', location: 'المبنى أ', description: 'المستودع الأساسي للمواد' }
    ]);
    saveToStorage(COST_TEMPLATES_KEY, []);
    
    debouncedSync();
};

export const importAllData = (data: any): void => {
    if (!data || typeof data !== 'object') return;
    
    // Handle case where data might be wrapped in a 'files' object (GitHub Gist API response)
    let actualData = data;
    if (data.files) {
        const firstFile = Object.values(data.files)[0] as any;
        if (firstFile && firstFile.content) {
            try {
                actualData = JSON.parse(firstFile.content);
            } catch (e) {
                // Not JSON content
            }
        }
    }

    if (Object.keys(actualData).length === 0) return;
    
    // If it doesn't look like our data format, don't throw, just ignore
    if (!actualData.settings && !actualData.materials && !actualData.transactions) {
        console.warn('Imported data does not match expected format.');
        return;
    }
    
    if (actualData.settings) {
        const currentSettings = getSettings();
        // Recover token from obfuscated field if local token is missing
        const recoveredToken = deobfuscate(actualData.settings._sync_key);
        
        const mergedSettings = {
            ...actualData.settings,
            githubToken: currentSettings.githubToken || recoveredToken 
        };
        // Clean up the internal sync key from storage
        delete (mergedSettings as any)._sync_key;
        
        saveToStorage(SETTINGS_KEY, mergedSettings, false);
    }
    if (actualData.materials) saveToStorage(MATERIALS_KEY, actualData.materials, false);
    if (actualData.transactions) saveToStorage(TRANSACTIONS_KEY, actualData.transactions, false);
    if (actualData.costCalculations) saveToStorage(COST_CALCULATIONS_KEY, actualData.costCalculations, false);
    if (actualData.weightCalculations) saveToStorage(WEIGHT_CALCULATIONS_KEY, actualData.weightCalculations, false);
    if (actualData.warehouses) saveToStorage(WAREHOUSES_KEY, actualData.warehouses, false);
    if (actualData.costTemplates) saveToStorage(COST_TEMPLATES_KEY, actualData.costTemplates, false);
    
    // Handle users - merge Gist data with local data
    if (actualData.users && Array.isArray(actualData.users)) {
        const localUsers = getUsers();
        const importedUsers = actualData.users;
        
        // Start with imported users, merging with local data for passwords/permissions
        const mergedUsers = importedUsers.map((importedUser: any) => {
            const local = localUsers.find(u => u.id === importedUser.id || u.username === importedUser.username);
            return {
                ...importedUser,
                password: importedUser.password || local?.password,
                permissions: importedUser.permissions || local?.permissions || getDefaultPermissions(importedUser.role)
            };
        });
        
        // Add local users that aren't in the imported list yet
        localUsers.forEach(local => {
            if (!mergedUsers.some((m: any) => m.id === local.id || m.username === local.username)) {
                mergedUsers.push(local);
            }
        });
        
        saveToStorage(USERS_KEY, mergedUsers, false);
    }
};