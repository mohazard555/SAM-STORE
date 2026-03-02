
import { User, Material, Transaction, SettingsData, AllData } from '@/types';

// --- INITIAL DATA & HELPERS ---

const USERS_KEY = 'warehouse_users';
const MATERIALS_KEY = 'warehouse_materials';
const TRANSACTIONS_KEY = 'warehouse_transactions';
const SETTINGS_KEY = 'warehouse_settings';
const CURRENT_USER_KEY = 'currentUser';

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
            { id: '1', username: 'admin', password: 'admin123', role: 'admin' },
            { id: '2', username: 'user', password: 'user123', role: 'visitor' },
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
            gistUrl: '',
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

export const initializeDataSource = async (): Promise<{ success: boolean; message?: string }> => {
    const settings = getSettings();
    if (!settings.gistUrl) return { success: true, message: 'Using local data.' };
    try {
        const response = await fetch(settings.gistUrl, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Failed to fetch data from Gist.`);
        const data = await response.json();
        importAllData(data);
        return { success: true, message: 'Data loaded from Gist.' };
    } catch (error) { return { success: false, message: (error as Error).message }; }
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
    const newUser: User = { ...userData, id: `u${Date.now()}` };
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

export const getSettings = (): SettingsData => getFromStorage<SettingsData>(SETTINGS_KEY, { companyName: '', companyAddress: '', companyLogo: '', signatureNames: { keeper: '', accountant: '', manager: '' }, gistUrl: '', githubToken: '' });
export const saveSettings = (settings: SettingsData): void => { saveToStorage(SETTINGS_KEY, settings); };

export const exportAllData = (): AllData => {
    return { settings: getSettings(), materials: getMaterials(), transactions: getTransactions(), users: getUsers().map(({ password, ...user }) => user) };
};

export const importAllData = (data: AllData): void => {
    if (!data || !data.settings) throw new Error('Invalid data format');
    saveToStorage(SETTINGS_KEY, data.settings);
    saveToStorage(MATERIALS_KEY, data.materials);
    saveToStorage(TRANSACTIONS_KEY, data.transactions);
};
