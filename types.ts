
export interface Warehouse {
  id: string;
  name: string;
  location?: string;
  description?: string;
}

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
  price: number;
  minStock: number;
  currentStock: number; // Total stock across all warehouses
  stocks: Record<string, number>; // warehouseId -> quantity
  isNew: boolean;
  createdAt: string;
  expiryDate?: string;
  reservedStock?: number;
  // Weight formula: X pieces = Y kg
  weightFormula?: {
    pieces: number;
    weight: number;
  };
}

export interface Transaction {
  id: string;
  type: 'in' | 'out' | 'return' | 'transfer' | 'return_in';
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
  warehouseId: string; // Source warehouse (or destination for 'in')
  toWarehouseId?: string; // Destination warehouse for 'transfer'
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
  | 'cost-weight'
  | 'warehouses'
  | 'quick-look';

export type ThemeType = 'default' | 'emerald' | 'rose' | 'amber' | 'violet';

export interface SettingsData {
  companyName: string;
  companyAddress: string;
  companyLogo: string;
  currencySymbol?: string;
  theme?: ThemeType;
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

export interface CostTemplatePart {
  id: string;
  name: string;
  cost: number;
}

export interface CostTemplate {
  id: string;
  title: string;
  model: string;
  size: string;
  parts: CostTemplatePart[];
  totalCost: number;
  date: string;
}

export interface AllData {
  settings: SettingsData;
  warehouses: Warehouse[];
  materials: Material[];
  transactions: Transaction[];
  users: User[];
  costCalculations?: CostCalculation[];
  weightCalculations?: WeightCalculation[];
  costTemplates?: CostTemplate[];
}

export type SyncState = 'idle' | 'syncing' | 'success' | 'error';

export interface SyncStatus {
  state: SyncState;
  lastSync?: string;
  error?: string;
}

export interface AppNotification {
  id: string;
  type: 'material' | 'transaction' | 'warehouse' | 'user' | 'settings';
  action: 'add' | 'update' | 'delete';
  title: string;
  message: string;
  timestamp: string;
  user: string;
}
