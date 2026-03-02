
import { User, Material, Transaction, SettingsData, AllData, UserPermissions, Page, CostCalculation, WeightCalculation } from '@/types';

// --- INITIAL DATA & HELPERS ---

const USERS_KEY = 'warehouse_users';
const MATERIALS_KEY = 'warehouse_materials';
const TRANSACTIONS_KEY = 'warehouse_transactions';
const SETTINGS_KEY = 'warehouse_settings';
const CURRENT_USER_KEY = 'currentUser';
const COST_CALCULATIONS_KEY = 'warehouse_cost_calculations';
const WEIGHT_CALCULATIONS_KEY = 'warehouse_weight_calculations';

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
        'cost-weight'
      ]
    };
  }
  return {
    canPrint: false,
    canExport: false,
    allowedPages: ['dashboard', 'materials', 'transactions', 'supplier-returns', 'cost-meter', 'cost-weight']
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

const saveToStorage = <T>(key: string, value: T) => {
  try {
    const item = JSON.stringify(value);
    localStorage.setItem(key, item);
  } catch (error) {
    console.error(`Error writing to localStorage key “${key}”:`, error);
  }
};

const initializeData = () => {
    if (!localStorage.getItem(USERS_KEY)) {
        const initialUsers: User[] = [
            { id: '1', username: 'admin', password: 'admin123', role: 'admin', permissions: getDefaultPermissions('admin') },
            { id: '2', username: 'user', password: 'user123', role: 'visitor', permissions: getDefaultPermissions('visitor') },
        ];
        saveToStorage(USERS_KEY, initialUsers);
    }

    if (!localStorage.getItem(MATERIALS_KEY)) {
        const initialMaterials: Material[] = [
            { id: 'm1', name: 'لابتوب ديل', materialType: 'DELL-LT-001', unit: 'حبة', category: 'أجهزة إلكترونية', specifications: 'Core i7, 16GB RAM, 512GB SSD', supplier: 'شركة التكنولوجيا الحديثة', barcode: '1234567890123', minStock: 5, currentStock: 15, isNew: false, color: 'فضي' },
            { id: 'm2', name: 'شاشة سامسونج 24 بوصة', materialType: 'SAM-SC-024', unit: 'حبة', category: 'أجهزة إلكترونية', specifications: '24" Full HD, 75Hz', supplier: 'سامسونج العالمية', barcode: '1234567890124', minStock: 10, currentStock: 8, isNew: false, color: 'أسود' },
        ];
        saveToStorage(MATERIALS_KEY, initialMaterials);
    }
    
    if (!localStorage.getItem(TRANSACTIONS_KEY)) {
        saveToStorage(TRANSACTIONS_KEY, []);
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
        saveToStorage(SETTINGS_KEY, initialSettings);
    }
};

initializeData();

const syncDataToGist = async () => {
    const settings = getSettings();
    if (!settings.gistUrl || !settings.githubToken) return;
    const match = settings.gistUrl.match(/gist\.github(?:usercontent)?\.com\/[^\/]+\/([a-f0-9]+)/);
    if (!match) return;
    const gistId = match[1];
    const allData = exportAllData();
    const filename = settings.gistUrl.split('/').pop() || 'warehouse-data.json';
    try {
        await fetch(`https://api.github.com/gists/${gistId}`, {
            method: 'PATCH',
            headers: { 'Authorization': `token ${settings.githubToken}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ files: { [filename]: { content: JSON.stringify(allData, null, 2) } } }),
        });
    } catch (error) { console.error("Gist sync error:", error); }
};

export const initializeDataSource = async (overrideUrl?: string): Promise<{ success: boolean; message?: string }> => {
    const settings = getSettings();
    const fetchUrl = overrideUrl || settings.gistUrl;
    
    if (!fetchUrl) return { success: true, message: 'Using local data.' };
    
    const gistIdMatch = fetchUrl.match(/gist\.github(?:usercontent)?\.com\/[^\/]+\/([a-f0-9]+)/);
    const gistId = gistIdMatch ? gistIdMatch[1] : null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // Increased to 20 seconds timeout

    try {
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
                    const filename = fetchUrl.split('/').pop() || Object.keys(gistData.files)[0];
                    const file = gistData.files[filename] || Object.values(gistData.files)[0];
                    if (file && file.content) {
                        dataText = file.content;
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
    syncDataToGist();
    return newUser;
};

export const updateUser = (updatedUser: User): User => {
    let users = getUsers();
    const currentUser = getCurrentUser();
    if (users.some(u => u.username === updatedUser.username && u.id !== updatedUser.id)) throw new Error('Username already exists');
    users = users.map(u => (u.id === updatedUser.id ? updatedUser : u));
    saveToStorage(USERS_KEY, users);
    syncDataToGist();
    if (currentUser && currentUser.id === updatedUser.id) sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
    return updatedUser;
};

export const deleteUser = (userId: string): void => {
    saveToStorage(USERS_KEY, getUsers().filter(u => u.id !== userId));
    syncDataToGist();
};

export const getMaterials = (): Material[] => getFromStorage<Material[]>(MATERIALS_KEY, []);
export const addMaterial = (materialData: Omit<Material, 'id' | 'isNew'>): Material => {
    const materials = getMaterials();
    const newMaterial: Material = { ...materialData, id: `m${Date.now()}`, isNew: true };
    saveToStorage(MATERIALS_KEY, [...materials, newMaterial]);
    syncDataToGist();
    return newMaterial;
};

export const updateMaterial = (updatedMaterial: Material): Material => {
    const materials = getMaterials().map(m => m.id === updatedMaterial.id ? updatedMaterial : m);
    saveToStorage(MATERIALS_KEY, materials);
    syncDataToGist();
    return updatedMaterial;
};

export const acknowledgeNewMaterial = (materialId: string): void => {
    const material = getMaterials().find(m => m.id === materialId);
    if(material) updateMaterial({ ...material, isNew: false });
};

export const deleteMaterial = (materialId: string): void => {
    saveToStorage(MATERIALS_KEY, getMaterials().filter(m => m.id !== materialId));
    syncDataToGist();
};

export const getTransactions = (): Transaction[] => getFromStorage<Transaction[]>(TRANSACTIONS_KEY, []);

export const addTransaction = (transactionData: Omit<Transaction, 'id' | 'materialName' | 'supplier' | 'category' | 'barcode' | 'unit' | 'materialType'>): Transaction => {
    const transactions = getTransactions();
    let materials = getMaterials();
    const material = materials.find(m => m.id === transactionData.materialId);

    if (!material) throw new Error('Material not found');

    if (transactionData.type === 'out' && material.currentStock < transactionData.quantity) {
        throw new Error('Not enough stock available');
    }

    if (transactionData.type === 'return' && material.currentStock < transactionData.quantity) {
        throw new Error('لا يوجد رصيد كافي لإتمام عملية المرتجع للمورد.');
    }

    const newTransaction: Transaction = {
        ...transactionData,
        id: `t${Date.now()}`,
        date: transactionData.date || new Date().toISOString(),
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
    // in -> +
    // out -> -
    // return -> -
    const stockChange = transactionData.type === 'in' ? transactionData.quantity : -transactionData.quantity;
    const updatedMaterial = { ...material, currentStock: material.currentStock + stockChange };
    materials = materials.map(m => m.id === updatedMaterial.id ? updatedMaterial : m);
    
    saveToStorage(MATERIALS_KEY, materials);
    saveToStorage(TRANSACTIONS_KEY, [...transactions, newTransaction]);
    syncDataToGist();

    return newTransaction;
};

export const deleteTransaction = (transactionId: string): void => {
    const transactions = getTransactions();
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    let materials = getMaterials();
    const material = materials.find(m => m.id === transaction.materialId);

    if (material) {
        // Reverse the stock change: if it was "in", subtract. If it was "out", add back.
        const reverseStockChange = transaction.type === 'in' ? -transaction.quantity : transaction.quantity;
        const updatedMaterial = { ...material, currentStock: material.currentStock + reverseStockChange };
        materials = materials.map(m => m.id === updatedMaterial.id ? updatedMaterial : m);
        saveToStorage(MATERIALS_KEY, materials);
    }

    saveToStorage(TRANSACTIONS_KEY, transactions.filter(t => t.id !== transactionId));
    syncDataToGist();
};

export const updateTransaction = (updatedTransaction: Transaction): Transaction => {
    const transactions = getTransactions();
    const oldTransaction = transactions.find(t => t.id === updatedTransaction.id);
    if (!oldTransaction) return updatedTransaction;

    let materials = getMaterials();
    const material = materials.find(m => m.id === updatedTransaction.materialId);

    if (material) {
        // 1. Reverse old stock change
        const reverseOldChange = oldTransaction.type === 'in' ? -oldTransaction.quantity : oldTransaction.quantity;
        let tempStock = material.currentStock + reverseOldChange;

        // 2. Apply new stock change
        const newStockChange = updatedTransaction.type === 'in' ? updatedTransaction.quantity : -updatedTransaction.quantity;
        const finalStock = tempStock + newStockChange;

        if (finalStock < 0) throw new Error('تعديل الحركة سيؤدي لنتائج سالبة في المخزون.');

        const updatedMaterial = { ...material, currentStock: finalStock };
        materials = materials.map(m => m.id === updatedMaterial.id ? updatedMaterial : m);
        saveToStorage(MATERIALS_KEY, materials);
    }

    const updatedTransactions = transactions.map(t => t.id === updatedTransaction.id ? updatedTransaction : t);
    saveToStorage(TRANSACTIONS_KEY, updatedTransactions);
    syncDataToGist();

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
    syncDataToGist(); // Sync immediately when settings are saved
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
    syncDataToGist();
    return newCalc;
};

export const deleteCostCalculation = (id: string): void => {
    saveToStorage(COST_CALCULATIONS_KEY, getCostCalculations().filter(c => c.id !== id));
    syncDataToGist();
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
    syncDataToGist();
    return newCalc;
};

export const deleteWeightCalculation = (id: string): void => {
    saveToStorage(WEIGHT_CALCULATIONS_KEY, getWeightCalculations().filter(c => c.id !== id));
    syncDataToGist();
};

export const exportAllData = (): AllData => {
    return { 
        settings: getSettings(), 
        materials: getMaterials(), 
        transactions: getTransactions(), 
        users: getUsers(), // Include passwords for full sync across devices
        costCalculations: getCostCalculations(),
        weightCalculations: getWeightCalculations()
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
    
    syncDataToGist();
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
    
    if (actualData.settings) saveToStorage(SETTINGS_KEY, actualData.settings);
    if (actualData.materials) saveToStorage(MATERIALS_KEY, actualData.materials);
    if (actualData.transactions) saveToStorage(TRANSACTIONS_KEY, actualData.transactions);
    if (actualData.costCalculations) saveToStorage(COST_CALCULATIONS_KEY, actualData.costCalculations);
    if (actualData.weightCalculations) saveToStorage(WEIGHT_CALCULATIONS_KEY, actualData.weightCalculations);
    
    // Handle users - overwrite with Gist data but preserve passwords if missing
    if (actualData.users && Array.isArray(actualData.users)) {
        const existingUsers = getUsers();
        const mergedUsers = actualData.users.map((importedUser: any) => {
            const existing = existingUsers.find(u => u.id === importedUser.id || u.username === importedUser.username);
            
            return {
                ...importedUser,
                password: importedUser.password || existing?.password,
                permissions: importedUser.permissions || (existing?.permissions) || getDefaultPermissions(importedUser.role)
            };
        });
        
        saveToStorage(USERS_KEY, mergedUsers);
    }
};
