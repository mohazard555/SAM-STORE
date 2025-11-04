export interface Material {
  id: string;
  name: string;
  materialType: string; // Renamed from code
  category: string;
  specifications: string;
  barcode: string;
  unit: string;
  minStock: number;
  currentStock: number;
  isNew: boolean;
}

export interface Transaction {
  id: string;
  materialId: string;
  materialName: string;
  quantity: number;
  recipient: string;
  notes?: string;
  date: string;
}

export interface User {
  id:string;
  username: string;
  password?: string;
  role: 'admin' | 'visitor';
}

export type Page = 'dashboard' | 'materials' | 'transactions' | 'reports' | 'settings' | 'new-entries' | 'users';

export interface SettingsData {
  companyName: string;
  companyAddress: string;
  companyLogo: string; // Base64 encoded image
  signatureNames: {
    keeper: string;
    accountant: string;
    manager: string;
  };
}

export interface AllData {
  settings: SettingsData;
  materials: Material[];
  transactions: Transaction[];
  users: Omit<User, 'password'>[];
}