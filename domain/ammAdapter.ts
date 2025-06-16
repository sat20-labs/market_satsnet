import { AmmPool } from './ammPool';

export function toAmmPool(dto: any): AmmPool {
  return {
    contractK: dto?.Contract?.k || 0,
    assetAmt: dto?.AssetAmtInPool?.Value
      ? dto.AssetAmtInPool.Value / Math.pow(10, dto.AssetAmtInPool.Precision)
      : 0,
    assetPrecision: dto?.AssetAmtInPool?.Precision || 0,
    satValue: dto?.SatsValueInPool || 0,
    enableBlock: dto?.enableBlock || 0,
    // 可扩展更多领域属性
  };
} 