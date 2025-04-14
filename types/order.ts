export interface DisplayAsset {
  // Assuming DisplayAsset has properties that are not specified in the given context
  // Placeholder properties for demonstration
  id: string;
  name: string;
}

export interface AssetsInUtxo {
  UtxoId: number;
  OutPoint: string; // tx:vout
  Value: number;
  PkScript: Uint8Array;
  Assets: DisplayAsset[];
}

export interface SellUtxoInfo {
  AssetsInUtxo: AssetsInUtxo;
  Price: number; // 价格
  AssetInfo?: {
    id: string;
    name: string;
  };
}