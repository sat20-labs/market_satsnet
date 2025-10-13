import Decimal from 'decimal.js';

export * from './url';
export function satsToBitcoin(sats: string | number): number {
  if (typeof sats === 'string') {
    sats = sats.trim();
  }

  if (isNaN(Number(sats))) {
    console.warn('Input is not a valid number, defaulting to 0');
    sats = 0;
  }

  let satoshis = Number(sats);

  // Ensure the number is non-negative
  if (satoshis < 0) {
    console.warn('Input must be a non-negative number, defaulting to 0');
    satoshis = 0;
  }

  // Round to the nearest integer to handle decimal Satoshis
  satoshis = Math.round(satoshis);

  // Convert Satoshis to BTC
  const btc = satoshis / 1e8;

  // 直接返回 number 类型
  return btc;
}
export const hideStr = (
  str?: string,
  num: number = 10,
  placeholder = '*****',
) => {
  if (typeof str === 'string' && str) {
    return `${str?.substring(0, num)}${placeholder}${str?.substring(
      str?.length - num,
    )}`;
  }
  return '';
};
export function btcToSats(btc: string | number): number {
  if (typeof btc === 'string') {
    btc = btc.trim();
  }

  if (isNaN(Number(btc))) {
    console.warn('Input is not a valid number, defaulting to 0');
    btc = 0;
  }

  let btcAmount = Number(btc);

  // Ensure the number is non-negative
  if (btcAmount < 0) {
    console.warn('Input must be a non-negative number, defaulting to 0');
    btcAmount = 0;
  }

  // Convert BTC to Satoshis and handle precision issues by rounding
  const sats = Math.round(btcAmount * 1e8);

  return sats;
}
export function formatBtcAmount(btcValue: number | undefined | null): string {
  // Handle undefined, null, non-number inputs or NaN results
  if (typeof btcValue !== 'number' || isNaN(btcValue)) {
    return '0';
  }

  // Handle the zero case directly
  if (btcValue === 0) {
    return '0';
  }

  // Format to 8 decimal places initially to preserve precision for small amounts
  let formattedString = btcValue.toFixed(8);

  // Remove trailing zeros and potentially the decimal point if redundant
  if (formattedString.includes('.')) {
    formattedString = formattedString.replace(/0+$/, ''); // Remove trailing zeros
    formattedString = formattedString.replace(/\.$/, ''); // Remove trailing decimal point if it's now at the end
  }

  return formattedString;
}

export const removeObjectEmptyValue = (obj: any) => {
  const _obj = { ...obj };
  Object.keys(_obj).forEach((key) => {
    if (
      _obj[key] === '' ||
      _obj[key] === undefined ||
      _obj[key] === null ||
      _obj[key] === 'null' ||
      _obj[key] === 'undefined' ||
      _obj[key] === 'NaN' ||
      (isNaN(_obj[key]) && typeof _obj[key] === 'number')
    ) {
      delete _obj[key];
    }
  });
  return _obj;
};
export const getLabelForAssets = (asset: any) => {
  console.log('asset', asset);

  // 如果 asset 是一个对象，并且有 assets_name 属性
  if (asset && typeof asset === 'object') {
    const name = asset.assets_name || asset;
    return `${name.Protocol || ''}:${name.Type || ''}:${name.Ticker || ''}`;
  }

  return '';
};


// export const formatLargeNumber = (num: number): string => {
//   if (num >= 1_000_000_000) {
//     return `${(num / 1_000_000_000).toFixed(2)}B`; // 转换为十亿单位
//   } else if (num >= 1_000_000) {
//     return `${(num / 1_000_000).toFixed(2)}M`; // 转换为百万单位
//   } else if (num >= 1_000) {
//     return `${(num / 1_000).toFixed(2)}K`; // 转换为千单位
//   }
//   return num.toString(); // 小于 1000 的数字直接返回
// };

export const formatLargeNumber = (num: number): string => {
  const format = (value: number): string => {
    // 对整数部分进行千位分隔，对小数部分保留最多两位小数
    return value % 1 === 0
      ? value.toLocaleString() // 整数部分千位分隔
      : Number(value.toFixed(2)).toLocaleString(); // 小数部分最多两位小数
  };

  if (num >= 1_000_000_000_000) {
    return `${format(num / 1_000_000_000_000)} T`; // 转换为万亿单位
  } else if (num >= 1_000_000_000) {
    return `${format(num / 1_000_000_000)} B`; // 转换为十亿单位
  } else if (num >= 1_000_000) {
    return `${format(num / 1_000_000)} M`; // 转换为百万单位
  } else if (num >= 10_000) {
    return `${format(num / 1_000)} K`; // 转换为千单位
  }
  if (typeof num !== 'number' || isNaN(num)) return '0';
  return num.toLocaleString(); // 小于 1000 的数字直接返回
};


interface PrecisionValue {
  Value: string | number; // 支持字符串避免精度丢失
  Precision: number;
}

export const getValueFromPrecision = (input: PrecisionValue | null | undefined): { value: string; formatted: string } => {
  if (!input || input.Value === undefined || input.Value === null) {
    return { value: '0', formatted: '0' };
  }

  // 优化：如果 Value 已经是字符串，直接使用；否则转换为字符串
  // 使用 Decimal.js 处理大数值精度问题
  const valueStr = typeof input.Value === 'string' ? input.Value : input.Value.toString();
  const valueDecimal = new Decimal(valueStr);
  const precisionPow = new Decimal(10).pow(input.Precision || 0);
  const calculatedValue = valueDecimal.div(precisionPow);

  // Convert to string and remove trailing zeros
  let formattedString = calculatedValue.toString();

  // If it contains decimal point, remove trailing zeros and potentially the decimal point
  if (formattedString.includes('.')) {
    formattedString = formattedString.replace(/0+$/, ''); // Remove trailing zeros
    formattedString = formattedString.replace(/\.$/, '');
  }

  return {
    value: calculatedValue.toString(),
    formatted: formattedString
  };
};



export const getAssetEditWhitelist = (): string[] => {
  const raw = (process.env.NEXT_PUBLIC_ASSET_EDIT_WHITELIST || '').trim();
  if (!raw) return [];
  return raw.split(/[\s,;]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
};
export const isAddressInAssetEditWhitelist = (addr?: string | null): boolean => {
  if (!addr) return false;
  const list = getAssetEditWhitelist();
  return list.includes(addr.trim().toLowerCase());
};