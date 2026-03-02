
export interface Material {
  id: string;
  name: string;
  materialType: string;
  category: string;
  specifications: string;
  supplier: string;
  barcode: string;
  color?: string;
  unit: string;
  minStock: number;
  currentStock: number;
  isNew: boolean;
  // Weight formula: X pieces = Y kg
  weightFormula?: {
    pieces: number;
    weight: number;
  };
}

export interface Transaction {
  id: string;
  type: 'in' | 'out' | 'return'; // Added 'return' for supplier returns
  materialId: string;
  materialName: string;
  materialType: string;
  category: string;
  supplier: string;
  barcode: string;
  itemBarcode?: string;
  color?: string;
  quantity: number;
  unit: string;
  recipient: string;
  notes?: string;
  date: string;
}

export interface UserPermissions {
  canPrint: boolean;
  canExport: boolean;
  allowedPages: Page[];
}

export interface User {
  id:string;
  username: string;
  password?: string;
  role: 'admin' | 'visitor';
  permissions?: UserPermissions;
}

export type Page = 
  | 'dashboard' 
  | 'materials' 
  | 'transactions' 
  | 'reports' 
  | 'settings' 
  | 'new-entries' 
  | 'users'
  | 'supplier-returns'
  | 'cost-meter'
  | 'cost-weight';

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

export interface CostPart {
  id: string;
  name: string;
  valuePerPiece: number;
  materialId?: string;
  materialName?: string;
}

export interface CostCalculation {
  id: string;
  title: string;
  description?: string;
  measurement?: string;
  materialId: string;
  materialName: string;
  pieceCount: number;
  baseCostPerPiece: number;
  parts: CostPart[];
  totalCost: number;
  date: string;
}

export interface WeightCalculation {
  id: string;
  title: string;
  materialId: string;
  materialName: string;
  pieceCount: number;
  standardPieces: number;
  standardWeight: number;
  totalWeight: number;
  date: string;
  notes?: string;
}

export interface AllData {
  settings: SettingsData;
  materials: Material[];
  transactions: Transaction[];
  users: Omit<User, 'password'>[];
  costCalculations?: CostCalculation[];
  weightCalculations?: WeightCalculation[];
}
