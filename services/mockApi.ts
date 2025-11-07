
import { User, Material, Transaction, SettingsData, AllData } from '@/types';

// --- INITIAL DATA & HELPERS ---

const USERS_KEY = 'warehouse_users';
const MATERIALS_KEY = 'warehouse_materials';
const TRANSACTIONS_KEY = 'warehouse_transactions';
const SETTINGS_KEY = 'warehouse_settings';
const CURRENT_USER_KEY = 'currentUser';

// Default warehouse SVG logo
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
    // Users
    if (!localStorage.getItem(USERS_KEY)) {
        const initialUsers: User[] = [
            { id: '1', username: 'admin', password: 'admin123', role: 'admin' },
            { id: '2', username: 'user', password: 'user123', role: 'visitor' },
        ];
        saveToStorage(USERS_KEY, initialUsers);
    }

    // Materials
    if (!localStorage.getItem(MATERIALS_KEY)) {
        const initialMaterials: Material[] = [
            { id: 'm1', name: 'لابتوب ديل', materialType: 'DELL-LT-001', unit: 'حبة', category: 'أجهزة إلكترونية', specifications: 'Core i7, 16GB RAM, 512GB SSD', supplier: 'شركة التكنولوجيا الحديثة', barcode: '1234567890123', minStock: 5, currentStock: 15, isNew: false },
            { id: 'm2', name: 'شاشة سامسونج 24 بوصة', materialType: 'SAM-SC-024', unit: 'حبة', category: 'أجهزة إلكترونية', specifications: '24" Full HD, 75Hz', supplier: 'سامسونج العالمية', barcode: '1234567890124', minStock: 10, currentStock: 8, isNew: false },
            { id: 'm3', name: 'كرتونة ورق A4', materialType: 'PAP-A4-500', unit: 'كرتونة', category: 'مواد مكتبية', specifications: '80gsm, 500 sheets', supplier: 'الشركة المتحدة للورق', barcode: '1234567890125', minStock: 20, currentStock: 50, isNew: false },
            { id: 'm4', name: 'فأرة لاسلكية', materialType: 'LOG-MS-W01', unit: 'حبة', category: 'ملحقات كمبيوتر', specifications: 'Optical, 3 buttons', supplier: 'لوجيتك للتوزيع', barcode: '1234567890126', minStock: 15, currentStock: 30, isNew: false },
            { id: 'm5', name: 'لوحة مفاتيح', materialType: 'LOG-KB-01', unit: 'حبة', category: 'ملحقات كمبيوتر', specifications: 'Arabic/English, Wired', supplier: 'لوجيتك للتوزيع', barcode: '1234567890127', minStock: 15, currentStock: 25, isNew: false },
        ];
        saveToStorage(MATERIALS_KEY, initialMaterials);
    }
    
    // Transactions
    if (!localStorage.getItem(TRANSACTIONS_KEY)) {
        const initialTransactions: Transaction[] = [];
        saveToStorage(TRANSACTIONS_KEY, initialTransactions);
    }

    // Settings
    if (!localStorage.getItem(SETTINGS_KEY)) {
        const initialSettings: SettingsData = {
            companyName: 'اسم الشركة',
            companyAddress: 'العنوان هنا',
            companyLogo: defaultLogoSvg,
            signatureNames: {
                keeper: 'أمين المستودع',
                accountant: 'المحاسب',
                manager: 'المدير العام',
            },
            gistUrl: '',
            githubToken: '',
        };
        saveToStorage(SETTINGS_KEY, initialSettings);
    }
};

// Initialize on load
initializeData();

// --- GIST SYNCHRONIZATION ---

const syncDataToGist = async () => {
    const settings = getSettings();
    if (!settings.gistUrl || !settings.githubToken) {
        return; // Sync not configured
    }
    
    const match = settings.gistUrl.match(/gist\.github(?:usercontent)?\.com\/[^\/]+\/([a-f0-9]+)/);
    if (!match) {
        console.error("Invalid Gist URL format. Could not extract Gist ID.");
        return;
    }
    const gistId = match[1];

    const allData = exportAllData();
    const filename = settings.gistUrl.split('/').pop() || 'warehouse-data.json';

    try {
        const response = await fetch(`https://api.github.com/gists/${gistId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${settings.githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                files: {
                    [filename]: {
                        content: JSON.stringify(allData, null, 2),
                    },
                },
            }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to update Gist: ${errorData.message}`);
        }
        console.log("Data successfully synced to Gist.");
    } catch (error) {
        console.error("Gist sync error:", error);
    }
};

export const initializeDataSource = async (): Promise<{ success: boolean; message?: string }> => {
    const settings = getSettings();
    if (!settings.gistUrl) {
        return { success: true, message: 'Using local data.' };
    }

    try {
        const response = await fetch(settings.gistUrl, { cache: 'no-store' }); // bypass cache to get latest
        if (!response.ok) {
            throw new Error(`Failed to fetch data from Gist. Status: ${response.status}`);
        }
        const data = await response.json();
        importAllData(data);
        return { success: true, message: 'Data loaded from Gist.' };
    } catch (error) {
        console.error("Error initializing data from Gist:", error);
        return { success: false, message: (error as Error).message };
    }
};


// --- AUTHENTICATION ---

export const authenticateUser = (username: string, password: string): User | null => {
    const users = getFromStorage<User[]>(USERS_KEY, []);
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        return user;
    }
    
    return null;
};

export const getCurrentUser = (): User | null => {
  try {
    const userJson = sessionStorage.getItem(CURRENT_USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error('Failed to parse current user from sessionStorage', error);
    return null;
  }
};


// --- USERS ---
export const getUsers = (): User[] => {
    return getFromStorage<User[]>(USERS_KEY, []);
};

export const addUser = (userData: Omit<User, 'id'>): User => {
    const users = getUsers();
    if (users.some(u => u.username === userData.username)) {
        throw new Error('Username already exists');
    }
    const newUser: User = {
        ...userData,
        id: `u${Date.now()}`,
    };
    saveToStorage(USERS_KEY, [...users, newUser]);
    syncDataToGist();
    return newUser;
};

export const updateUser = (updatedUser: User): User => {
    let users = getUsers();
    const currentUser = getCurrentUser();
    
    // Check for username uniqueness if it's being changed
    if (users.some(u => u.username === updatedUser.username && u.id !== updatedUser.id)) {
        throw new Error('Username already exists');
    }

    users = users.map(u => (u.id === updatedUser.id ? updatedUser : u));
    saveToStorage(USERS_KEY, users);
    syncDataToGist();

    // If the updated user is the current user, update session storage
    if (currentUser && currentUser.id === updatedUser.id) {
        sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
    }
    return updatedUser;
};

export const deleteUser = (userId: string): void => {
    let users = getUsers();
    users = users.filter(u => u.id !== userId);
    saveToStorage(USERS_KEY, users);
    syncDataToGist();
};


// --- MATERIALS ---

export const getMaterials = (): Material[] => {
    return getFromStorage<Material[]>(MATERIALS_KEY, []);
};

export const addMaterial = (materialData: Omit<Material, 'id' | 'isNew'>): Material => {
    const materials = getMaterials();
    const newMaterial: Material = {
        ...materialData,
        id: `m${Date.now()}`,
        isNew: true,
    };
    saveToStorage(MATERIALS_KEY, [...materials, newMaterial]);
    syncDataToGist();
    return newMaterial;
};

export const updateMaterial = (updatedMaterial: Material): Material => {
    let materials = getMaterials();
    materials = materials.map(m => m.id === updatedMaterial.id ? updatedMaterial : m);
    saveToStorage(MATERIALS_KEY, materials);
    syncDataToGist();
    return updatedMaterial;
};

export const acknowledgeNewMaterial = (materialId: string): void => {
    const material = getMaterials().find(m => m.id === materialId);
    if(material) {
        updateMaterial({ ...material, isNew: false });
    }
};

export const deleteMaterial = (materialId: string): void => {
    let materials = getMaterials();
    materials = materials.filter(m => m.id !== materialId);
    saveToStorage(MATERIALS_KEY, materials);
    syncDataToGist();
};


// --- TRANSACTIONS ---

export const getTransactions = (): Transaction[] => {
    return getFromStorage<Transaction[]>(TRANSACTIONS_KEY, []);
};

export const addTransaction = (transactionData: Omit<Transaction, 'id' | 'date' | 'materialName' | 'supplier' | 'category' | 'barcode' | 'unit' | 'materialType'>): Transaction => {
    const transactions = getTransactions();
    let materials = getMaterials();
    const material = materials.find(m => m.id === transactionData.materialId);

    if (!material) {
        throw new Error('Material not found');
    }

    if (material.currentStock < transactionData.quantity) {
        throw new Error('Not enough stock available');
    }

    const newTransaction: Transaction = {
        ...transactionData,
        id: `t${Date.now()}`,
        date: new Date().toISOString(),
        materialName: material.name,
        materialType: material.materialType,
        supplier: material.supplier,
        category: material.category,
        barcode: material.barcode,
        unit: material.unit,
    };
    
    // Update stock and save both materials and transactions
    const updatedMaterial = { ...material, currentStock: material.currentStock - transactionData.quantity };
    materials = materials.map(m => m.id === updatedMaterial.id ? updatedMaterial : m);
    saveToStorage(MATERIALS_KEY, materials);

    saveToStorage(TRANSACTIONS_KEY, [...transactions, newTransaction]);
    
    // Sync all data to Gist
    syncDataToGist();

    return newTransaction;
};


// --- SETTINGS & DATA MANAGEMENT ---

export const getSettings = (): SettingsData => {
    return getFromStorage<SettingsData>(SETTINGS_KEY, {
        companyName: '', companyAddress: '', companyLogo: '', 
        signatureNames: { keeper: '', accountant: '', manager: '' },
        gistUrl: '',
        githubToken: '',
    });
};

export const saveSettings = (settings: SettingsData): void => {
    saveToStorage(SETTINGS_KEY, settings);
    // No sync here, user should reload to fetch from new Gist URL
};

export const exportAllData = (): AllData => {
    const users = getUsers().map(({ password, ...user }) => user); // Exclude passwords from export
    return {
        settings: getSettings(),
        materials: getMaterials(),
        transactions: getTransactions(),
        users: users
    };
};

export const importAllData = (data: AllData): void => {
    // Basic validation
    if (!data || !data.settings || !Array.isArray(data.materials) || !Array.isArray(data.transactions)) {
        throw new Error('Invalid data format');
    }
    saveToStorage(SETTINGS_KEY, data.settings);
    saveToStorage(MATERIALS_KEY, data.materials);
    saveToStorage(TRANSACTIONS_KEY, data.transactions);
    // Note: User import is not handled to avoid password conflicts/security issues.
    // If user data is present in the file, we can add it, excluding passwords
    if (Array.isArray(data.users)) {
        const currentUsers = getUsers();
        // A simple merge: add new users, don't update existing ones
        const newUsers = data.users.filter(importedUser => !currentUsers.some(u => u.username === importedUser.username));
        const combinedUsers = [...currentUsers, ...newUsers.map(u => ({...u, password: 'user123'}))]; // Assign default password
        saveToStorage(USERS_KEY, combinedUsers);
    }
};