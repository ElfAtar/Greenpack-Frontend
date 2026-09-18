// API Response Types

export interface SaveResult {
  FilePath: string;
  DefaultCombos: Record<string, string>;
}

export interface CombinationResponse {
  Message: string;
  File?: string;
  RegularFile?: string;
  CostFile?: string;
  DefaultCombos?: Record<string, string>;
  file?: {
    filePath: string;
    defaultCombos?: Record<string, string>;
  };
}

export interface DefaultComboInfo {
  [productKey: string]: string; // productKey -> combinationKey
}

// New types for updated CombinationController responses
export interface CombinationResult {
  OptionNumber: number;
  CombinationNumber: string;
  ProductKey: string;
  BoxKey: string;
  BundleRequired: string;
  CartonRequired: string;
  CartonKey: string;
  CartoningMethod: string;
  PaletType: string;
  NumBoxX: number;
  NumBoxY: number;
  NumBoxZ: number;
  BundleWidth: number;
  BundleThickness: number;
  BundleHeight: number;
  NBoxInBundle: number;
  NumBundleX: number;
  NumBundleY: number;
  NumBundleZ: number;
  NBoxInCarton: number;
  CartonUtilization: number;
  CurrentCartonUtilization: number;
  CartonUtilizationImprovement: number;
  PaletW1Count: number;
  PaletW2Count: number;
  PaletT1Count: number;
  PaletT2Count: number;
  PaletHCount: number;
  NBoxInPallet: number;
  NBundleInPallet: number;
  NCartonInPallet: number;
  PalletUtilization: number;
  CurrentPalletUtilization: number;
  PalletUtilizationImprovement: number;
  CurrentStatus: string;
  TotalCartonCount: number;
  PalletCount: number;
  CartonCost: number;
  PalletCost: number;
  HandlingCost: number;
  TotalCost: number;
  // New fields for database results
  TotalCartonCost?: number;
  TotalPalletCount?: number;
  TotalPalletCost?: number;
  TotalHandlingCost?: number;
  CO2e: number,
  IsDefault: boolean;
}

export interface UnitCosts {
  UnitPalletCost: number;
  HandlingCost: number;
}

export interface OrderItemData {
  Percentage: number;
  Count: number;
}

export interface OrderData {
  TotalBoxCount: number;
  OrderItems: OrderItemData[];
}

export interface DefaultCombinationInfo {
  ProductKey: string;
  CombinationKey: string;
  PalletEfficiency: number;
  CartonEfficiency: number;
}

export interface DefaultValues {
  MaxNumBoxesInABundle: number;
  MaxNumBoxesInAnyBundleDimension: number;
  MaxNumBoxesStackedInCarton: number;
  PaletMaxOverhang: number;
  PaletMaxUnderhang: number;
  HandGapWidth: number;
  HandGapThickness: number;
  HandGapHeight: number;
  MachineGapWidth: number;
  MachineGapThickness: number;
  MachineGapHeight: number;
  UnitPalletCost: number;
  HandlingCost: number;
}

export interface AllProductsCombinationResponse {
  Message: string;
  FilePath: string;
  RunDateTime: string;
  BestCombinations: CombinationResult[];
  UnitCosts: UnitCosts;
  OrderData?: OrderData;
  DefaultCombinations: Record<string, DefaultCombinationInfo>;
  DefaultValues: DefaultValues;
  IncludeOrderData?: boolean | string; // Can be boolean or string "TRUE"/"FALSE" from Excel
  products?: Product[]; // Added for new API structure
  TotalBoxCount?: number; // Added for direct order data access
  OrderItems?: string[] | string; // Can be array of strings or single string
}

export interface GroupCombinationResponse {
  Message: string;
  FilePath: string;
  RunDateTime: string;
  BestCombinations: CombinationResult[];
  DefaultCombinations: Record<string, DefaultCombinationInfo>;
  UnitCosts: UnitCosts;
  OrderData?: OrderData;
  DefaultValues: DefaultValues;
  IncludeOrderData?: boolean | string; // Can be boolean or string "TRUE"/"FALSE" from Excel
  products?: Product[]; // Added for new API structure
  TotalBoxCount?: number; // Added for direct order data access
  OrderItems?: string[] | string; // Can be array of strings or single string
}

export interface ProductsCombinationResponse {
  Message: string;
  FilePath: string;
  RunDateTime: string;
  BestCombinations: CombinationResult[];
  UnitCosts: UnitCosts;
  OrderData?: OrderData;
  DefaultValues: DefaultValues;
  IncludeOrderData?: boolean | string; // Can be boolean or string "TRUE"/"FALSE" from Excel
  TotalBoxCount: number;
  OrderItems: string[] | string; // Can be array of strings or single string
  products?: Product[]; // Added for new API structure

}

// New types for the updated API response structure
export interface RunDetails {
  ScenarioName: string;
  RunDate: string;
  OptionCount: number;
  RunMode: string;
  CartonningMethods: string;
  MinBoxUtil?: number;
  IncludeOrderData: boolean;
  TotalBoxCount: number;
  OrderItems: string;
  Notes: string;
  MaxNumBoxesInABundle: number;
  MaxNumBoxesInAnyBundleDimension: number;
  MaxNumBoxesStackedInCarton: number;
  PaletMaxOverhang: number;
  PaletMaxUnderhang: number;
  HandGapWidth: number;
  HandGapThickness: number;
  HandGapHeight: number;
  MachineGapWidth: number;
  MachineGapThickness: number;
  MachineGapHeight: number;
  UnitPalletCost: number;
  HandlingCost: number;
}

export interface Product {
  ProductKey: string;
  NBox: number;
  NKoli: number;
  NBundle: number;
  ProductName: string;
  DefaultCartonKey: string;
  CurrentCartonUtilization?: number;
  CurrentPalletUtilization?: number;
  BoxKey?: string;
  IsBundleRequired?: boolean;
  IsCartonRequired?: string;
  CartoningMethod?: string;
  PaletType?: string;
}

export interface UpdatedCombinationResponse {
  RunDetails: RunDetails;
  Combinations: CombinationResult[];
  Products: Product[];
}
