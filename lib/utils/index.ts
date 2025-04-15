export * from '../../utils/url';
import { flat } from 'radash';

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface AssetsName {
  Protocol: string;
  Ticker: string;
  Type: string;
}
export const getLabelForAssets = (assets_name: AssetsName) => {
  const { Protocol, Ticker, Type } = assets_name;
  return `${Protocol}:${Type}:${Ticker}`;
};
export const getTickLabel = (tick?: string, type?: string) => {
  if (tick === undefined) return undefined;
  const tickMap = {
    // n: 'Name',
    // o: 'Ordinals NFT',// 要求暂不显示
    // e: 'Rare',
    btc: 'PN-btc',
  };
  if (type === 'n' && tick === '') {
    return 'Pure Name';
  }
  return tickMap[tick] || tick;
};

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

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

export function thousandSeparator(num: number) {
  return num?.toString()?.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}






