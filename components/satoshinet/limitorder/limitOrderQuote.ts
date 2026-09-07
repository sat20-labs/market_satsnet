import Decimal from 'decimal.js';

export interface LimitOrderValue {
  exactSats: Decimal;
  roundedSats: string;
  isAtLeastOneSat: boolean;
}

export function calculateLimitOrderValue(
  price: string,
  quantity: string | number,
): LimitOrderValue | null {
  try {
    const exactSats = new Decimal(price).mul(new Decimal(quantity));
    if (!exactSats.isFinite() || exactSats.lte(0)) return null;
    return {
      exactSats,
      roundedSats: exactSats.toDecimalPlaces(0, Decimal.ROUND_CEIL).toFixed(0),
      isAtLeastOneSat: exactSats.gte(1),
    };
  } catch {
    return null;
  }
}

export function decimalToSafeInteger(value: Decimal.Value): number | null {
  try {
    const decimal = new Decimal(value);
    if (
      !decimal.isInteger() ||
      decimal.lt(Number.MIN_SAFE_INTEGER) ||
      decimal.gt(Number.MAX_SAFE_INTEGER)
    )
      return null;
    return decimal.toNumber();
  } catch {
    return null;
  }
}
