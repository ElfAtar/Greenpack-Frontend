export interface DefaultValues {
  maxNumBoxesInABundle: number;
  maxNumBoxesInAnyBundleDimension: number;
  maxNumBoxesStackedInCarton: number;
  paletMaxOverhang: number;
  paletMaxUnderhang: number;
  handGapWidth: number;
  handGapThickness: number;
  handGapHeight: number;
  machineGapWidth: number;
  machineGapThickness: number;
  machineGapHeight: number;
  unitPalletCost: number;
  handlingCost: number;
  af60Constraints: AF60ConstraintValues;
}

export interface AF60ConstraintValues {
  // Feeding constraints (A, B, C)
  feedingA_Min: number;
  feedingA_Max: number;
  feedingB_Min: number;
  feedingB_Max: number;
  feedingC_Min: number;
  feedingC_Max: number;
  
  // Machine constraints (D, E, F, H, L)
  machineD_Min: number;
  machineD_Max: number;
  machineE_Min: number;
  machineE_Max: number;
  machineF_Min: number;
  machineF_Max: number;
  machineH_Min: number;
  machineH_Max: number;
  machineL_Min: number;
  machineL_Max: number;
}

export interface OrderItemRequestDto {
  percentage: number;
  count: number;
}

export interface AllProductsCombinationRequest {
  scenarioName: string;
  optionCount: number;
  cartoningMethods: string[];
  minBoxUtil?: number;
  includeOrderData: boolean;
  totalBoxCount?: number;
  orderItems?: OrderItemRequestDto[];
  defaultValues?: DefaultValues;
}

export interface ProductsCombinationRequest {
  productKeys: string[];
  scenarioName: string;
  optionCount: number;
  minBoxUtil?: number;
  cartoningMethods: string[];
  includeOrderData: boolean;
  totalBoxCount?: number;
  orderItems?: OrderItemRequestDto[];
  defaultValues?: DefaultValues;
}

export interface GroupCombinationRequest {
  productKeys: string[];
  scenarioName: string;
  optionCount: number;
  minBoxUtil?: number;
  cartoningMethods: string[];
  includeOrderData: boolean;
  totalBoxCount?: number;
  orderItems?: OrderItemRequestDto[];
  defaultValues?: DefaultValues;
}

export interface CombinationResult {
  combinationNumber: string;
  productKey: string;
  cartonKey: string;
  palletUtilization: number;
  cartonUtilization: number;
  nBoxInPallet: number;
  nCartonInPallet: number;
  nBundleInPallet: number;
  totalCost: number;
}

export interface UnitCosts {
  unitPalletCost: number;
  handlingCost: number;
}

export interface OrderData {
  totalBoxCount: number;
  orderItems: OrderItemData[];
}

export interface OrderItemData {
  percentage: number;
  count: number;
}

export interface DefaultCombinationInfo {
  productKey: string;
  combinationKey: string;
  palletEfficiency: number;
  cartonEfficiency: number;
}

export interface AllProductsCombinationResponse {
  message: string;
  filePath: string;
  runDateTime: string;
  bestCombinations: CombinationResult[];
  defaultCombinations: { [key: string]: DefaultCombinationInfo };
  unitCosts: UnitCosts;
  orderData?: OrderData;
  defaultValues: DefaultValues;
}

export interface ProductsCombinationResponse {
  message: string;
  filePath: string;
  runDateTime: string;
  bestCombinations: CombinationResult[];
  defaultCombinations: { [key: string]: DefaultCombinationInfo };
  unitCosts: UnitCosts;
  orderData?: OrderData;
  defaultValues: DefaultValues;
}

export interface GroupCombinationResponse {
  message: string;
  filePath: string;
  runDateTime: string;
  bestCombinations: CombinationResult[];
  defaultCombinations: { [key: string]: DefaultCombinationInfo };
  unitCosts: UnitCosts;
  orderData?: OrderData;
  defaultValues: DefaultValues;
}

// Legacy type for backward compatibility
export interface CombinationResponse {
  message: string;
  filePath: string;
  runDateTime: string;
  bestCombinations: CombinationResult[];
  defaultCombinations: { [key: string]: DefaultCombinationInfo };
  unitCosts: UnitCosts;
  orderData?: OrderData;
  defaultValues: DefaultValues;
  // Legacy properties for backward compatibility
  File?: string;
  DefaultCombos?: { [key: string]: any };
  file?: { filePath: string; defaultCombos?: { [key: string]: any } };
  // Additional properties for compatibility
  FilePath?: string;
  DefaultCombinations?: { [key: string]: DefaultCombinationInfo };
}
