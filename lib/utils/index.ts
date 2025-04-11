export * from './btc';
export * from './order';
export * from './url';
export * from './asset';
import { ordx } from '@/api';
import { add, format } from 'date-fns';
import { flat } from 'radash';
import crypto from 'crypto';

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getLabelForAssets = (assets_name: string, assets_type: string) => {
  const assetsMap = {
    ns: {
      un: 'Pure Name',
    },
  };
  return assetsMap[assets_type]?.[assets_name] || assets_name;
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

export const getTimeByHeight = async (height: number, network: string) => {
  const key = `height-time-${height}`;
  const lcoalCache = sessionStorage.getItem(key);
  if (lcoalCache) {
    return +lcoalCache;
  }
  const { info } = await ordx.getHeightInfo({ height, network });
  const timestamp = info?.timestamp || 0;
  const time = timestamp * 1000;
  if (time) {
    sessionStorage.setItem(key, time.toString());
  }
  return time;
};

export const calcTimeBetweenBlocks = async ({
  height,
  start,
  end,
  network,
}: any) => {
  try {
    const now = +new Date();
    let startTime: any = now;
    let endTime: any = now;
    if (start && start < height) {
      startTime = await getTimeByHeight(start, network);
      // console.log('startTime', startTime);
    } else {
      const startDis = start - height;
      startTime = add(now, { minutes: startDis * 10 });
    }

    if (end && end < height) {
      endTime = await getTimeByHeight(end, network);
    } else {
      const endDis = Math.ceil(end - height);
      endTime = add(now, { minutes: endDis * 10 });
    }
    // console.log('startTime', startTime, 'endTime', endTime);
    return {
      start: format(new Date(startTime), 'yyyy-MM-dd HH:mm'),
      end: format(new Date(endTime), 'yyyy-MM-dd HH:mm'),
    };
  } catch (error) {
    console.log(error);
    return {
      start: undefined,
      end: undefined,
    };
  }
};

export const generateSeed = (ranges) => {
  const jsonString = JSON.stringify(ranges);
  try {
    const bytes = new TextEncoder().encode(jsonString);
    const hash = crypto.createHash('sha256');
    hash.update(bytes);
    const hashResult = hash.digest('hex').slice(0, 16);
    return hashResult;
  } catch (error) {
    console.error('json.Marshal failed. ' + error);
    return '0';
  }
};
export const selectAmountRangesByUtxos = (utxos: any[], amount) => {
  const sats: any[] = flat(utxos.map((v) => v.sats));
  const ranges: any[] = [];
  let totalSize = 0;
  for (let i = 0; i < sats.length; i++) {
    const item = sats[i];
    const { size, start } = item;
    totalSize += size;

    if (totalSize > amount) {
      const dis = totalSize - amount;
      ranges.push({
        start,
        size: size - dis,
      });
    } else {
      ranges.push({
        start,
        size,
      });
    }
  }
  return ranges;
};
export const generateSeedByUtxos = (utxos: any[], amount) => {
  console.log(utxos, amount);
  amount = Math.max(amount, 546);
  return generateSeed(selectAmountRangesByUtxos(utxos, amount));
};
