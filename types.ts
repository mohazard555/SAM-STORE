
export interface Material {
  id: string;
  name: string;
  materialType: string;
  category: string;
  specifications: string;
  supplier: string;
  barcode: string;
  color?: string; // Added color field
  unit: string;
  minStock: number;
  currentStock: number;
  isNew: boolean;
}

export interface Transaction {
  id: string;
  type: 'in' | 'out';
  materialId: string;
  materialName: string;
  materialType: string;
  category: string; // Added category field
  supplier: string;
  barcode: string;
  color?: string; // Added color field
  quantity: number;
  unit: string;
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
  companyLogo: string;
  signatureNames: {
    keeper: string;
    accountant: string;
    manager: string;
  };
  gistUrl?: string;
  githubToken?: string;
}

export interface AllData {
  settings: SettingsData;
  materials: Material[];
  transactions: Transaction[];
  users: Omit<User, 'password'>[];
}