import Decimal from 'decimal.js';
import { AmmPool } from './ammPool';

export function toAmmPool(dto: any): AmmPool {
  // 使用 Decimal.js 处理大数值精度问题

  let assetAmt = 0;
  if (dto?.AssetAmtInPool?.Value !== undefined && dto?.AssetAmtInPool?.Value !== null) {
    // 优化：如果 Value 已经是字符串，直接使用；否则转换为字符串
    const valueStr = typeof dto.AssetAmtInPool.Value === 'string'
      ? dto.AssetAmtInPool.Value
      : dto.AssetAmtInPool.Value.toString();
    const valueDecimal = new Decimal(valueStr);
    const precisionPow = new Decimal(10).pow(dto.AssetAmtInPool.Precision || 0);
    // 由于 getValueFromPrecision 现在返回字符串，需要转换为 number
    assetAmt = parseFloat(valueDecimal.div(precisionPow).toString());
  }

  return {
    contractK: dto?.Contract?.k || 0,
    assetAmt: assetAmt,
    assetPrecision: dto?.AssetAmtInPool?.Precision || 0,
    satValue: dto?.SatsValueInPool || 0,
    enableBlock: dto?.enableBlock || 0,
    // 可扩展更多领域属性
  };
} 