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
  
  return `${asset.Protocol}:${asset.Type}:${asset.Ticker}`
};


export const formatLargeNumber = (num: number): string => {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)}B`; // 转换为十亿单位
  } else if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`; // 转换为百万单位
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`; // 转换为千单位
  }
  return num.toString(); // 小于 1000 的数字直接返回
};
