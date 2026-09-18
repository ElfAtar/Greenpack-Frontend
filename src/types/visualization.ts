export interface BoxDto {
  width: number;
  height: number;
  thickness: number;
}

export interface BundleDto {
  enabled: boolean;
  count?: number;
  bundleWidth?: number;
  bundleHeight?: number;
  bundleThickness?: number;
  numBoxX?: number;
  numBoxY?: number;
  numBoxZ?: number;
}

export interface CartonDto {
  cartonKey: string;
  width: number;
  height: number;
  thickness: number;
  cartonWidth: number;
  cartonHeight: number;
  cartonThickness: number;
  boxesOrBundlesPerCarton: number;
  numBundleOrBoxX: number;
  numBundleOrBoxY: number;
  numBundleOrBoxZ: number;
  bundleCartonMapping?: Record<string, number>;
  utilization: number;
}

export interface PalletDto {
  length: number;
  width: number;
  stackHeight: number;
  totalCartons: number;
  utilization: number;
  numCartonX: number;
  numCartonY: number;
  numCartonZ: number;
  cartonPalletMapping: Record<string, Record<string, number>>;
  cartonDimensions: Record<string, CartonDto>;
}

export interface CostDto {
  totalCost: number;
  cartonCost: number;
  palletCost: number;
  handlingCost: number;
  unitCartonCost: number;
  unitPalletCost: number;
  totalBoxCount: number;
  totalPalletCount: number;
}

export interface OrderItemDataDto {
  percentage: number;
  count: number;
}

export interface OrderDataDto {
  totalBoxCount: number;
  orderItems: OrderItemDataDto[];
}

export interface VisualizationDto {
  scenarioName: string; // Added scenario name
  combinationKey: string;
  productKey: string;
  cartonKey: string;
  box: BoxDto;
  bundle: BundleDto;
  carton: CartonDto;
  pallet: PalletDto;
  cost: CostDto;
  orderData?: OrderDataDto;
}
