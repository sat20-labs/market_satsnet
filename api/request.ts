import { removeObjectEmptyValue } from '@/lib/utils';
import { useCommonStore } from '@/store';
import axios from 'axios';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';

export const request = async (
  path: string,
  options: any = {
    timeout: 10000,
  },
) => {
  const { publicKey, connected, disconnect } =
    useReactWalletStore.getState();
  const { signature, reset, setSignature } = useCommonStore.getState();
  const { headers = {}, method = 'GET', data, formData } = options;
  const { chain, network } = useCommonStore.getState();
  let baseUrl = ''; 
  console.log('request chain/network:', chain, network);
  if (chain === 'Bitcoin') {
    baseUrl = process.env.NEXT_PUBLIC_HOST as string;
    baseUrl += network === 'testnet' ? '/testnet' : '';
  } else if (chain === 'SatoshiNet') {
    baseUrl = process.env.NEXT_PUBLIC_SATESTNET_HOST as string;
    baseUrl += network === 'testnet' ? '/satstestnet' : '/satsnet';
  }
  let url = `${baseUrl}${path}`;
  if (location.hostname.indexOf('test') > -1) {
    url = url.replace('appdev', 'appdev');
  } else if (location.hostname.indexOf('dev') > -1) {
    url = url.replace('apiprd', 'apidev');
  }
  if (method === 'GET') {
    const query = new URLSearchParams(removeObjectEmptyValue(data));
    url += `?${query}`;
  } else if (method === 'POST') {
    // if (data) {
    //   options.body = JSON.stringify(data);
    //   headers['Content-Type'] = 'application/json';
    if (formData) {
      options.data = formData;
    }
  }
  if (connected && signature) {
    headers['Publickey'] = publicKey;
    headers['Signature'] = signature;
  }
  // delete options.data;
  options.headers = headers;
  let res = await axios(url, options);
  console.log('res', res);

  if ((res as any)?.data.code === -1) {
    if (
      (res as any)?.data.msg === 'api signature verification failed' ||
      (res as any)?.data.msg ===
        'public and signature parameters are required in the request headers'
    ) {
      // disconnect();
      // setSignature('');
    }
    throw (res as any)?.data?.msg;
  }
  return res?.data as any;
};
export const getOrdxAssets = async ({
  address,
  assets_type,
  assets_name,
  type,
  utxo,
  offset,
  size,
  category,
}: any) => {
  const res = await request('/ordx/GetAddressOrdxAssets', {
    data: {
      address,
      offset,
      size,
      type,
      assets_type,
      assets_name,
      category,
      utxo,
    },
  });
  console.log('getOrdxAssets res', res);
  
  return res;
};

export const getAddressOrdxList = async ({ address }: any) => {
  const res = await request('/ordx/GetAddressOrdxList', { data: { address } });
  return res;
};

interface GetAssetsSummary {
  assets_name?: string;
  assets_type?: string;
}
export const getAssetsSummary = async ({
  assets_name,
  assets_type,
}: GetAssetsSummary) => {
  const res = await request('/ordx/GetAssetsSummary', {
    data: { assets_name, assets_type },
  });
  return res;
};
interface GetOrders {
  assets_name?: string;
  assets_type?: string;
  address?: string;
  category?: string;
  offset: number;
  hide_locked?: boolean;
  size: number;
  sort?: number; // 0: 不排序 1: 价格升序 2: 价格降序 3: 时间升序 4: 时间降序
  type?: 1 | 2; // 1: 卖出订单 2: 买入订单， 当前只支持1（默认为1）
}
export const getOrders = async ({
  assets_name,
  assets_type,
  offset,
  size,
  sort = 0,
  type = 1,
  category,
  address,
  hide_locked,
}: GetOrders) => {
  const res = await request('/ordx/GetOrders', {
    data: {
      assets_name,
      assets_type,
      offset,
      size,
      sort,
      type,
      address,
      category,
      hide_locked,
    },
  });
  return res;
};
export const getHistory = async ({
  assets_name,
  assets_type,
  offset,
  size,
  sort = 0, // 0: 不排序 1: 价格升序 2: 价格降序 3: 时间升序 4: 时间降序
  address,
  filter,
}: any) => {
  const res = await request('/ordx/GetHistory', {
    data: { assets_name, assets_type, offset, size, sort, address, filter },
  });
  return res;
};

interface GetTopAssets {
  assets_type: string;
  interval?: number;
  top_count?: number;
  top_name?: ''; //'recommend' | 'tx_count' | 'tx_amount' | 'tx_volume';
  sort_field: string;
  sort_order: 0 | 1; //'asc' | 'desc';
}
export const getTopAssets = async ({
  assets_type = '',
  interval = 1,
  top_count = 20,
  top_name = '',
  sort_field = '',
  sort_order = 0,
}: GetTopAssets) => {
  const _interval = interval === 0 ? undefined : interval;
  const res = await request('/ordx/GetTopAssets', {
    data: {
      assets_type,
      interval: _interval,
      top_count,
      top_name,
      sort_field,
      sort_order,
    },
  });
  return res;
};
export const submitOrder = async ({ address, raw }: any) => {
  const res = await request('/ordx/SubmitOrder', {
    method: 'POST',
    data: { address, raw },
  });
  return res;
};
export const submitBatchOrders = async ({ address, orders }: any) => {
  const res = await request('/ordx/SubmitBatchOrders', {
    method: 'POST',
    data: { address, order_query: orders },
  });
  return res;
};
export const cancelOrder = async ({ address, order_id }: any) => {
  const res = await request('/ordx/CancelOrder', {
    method: 'POST',
    data: { address, order_id },
  });
  return res;
};
export const lockOrder = async ({ address, order_id }: any) => {
  const res = await request('/ordx/LockOrder', {
    method: 'POST',
    data: { address, order_id },
  });
  return res;
};
export const unlockOrder = async ({ address, order_id }: any) => {
  const res = await request('/ordx/UnlockOrder', {
    method: 'POST',
    data: { address, order_id },
  });
  return res;
};

export const buyOrder = async ({ address, order_id, raw }: any) => {
  const res = await request('/ordx/BuyOrder', {
    method: 'POST',
    data: { address, order_id, raw },
  });
  return res;
};
export const bulkBuyOrder = async ({ address, order_ids, raw }: any) => {
  const res = await request('/ordx/BulkBuyOrder', {
    method: 'POST',
    data: { address, order_ids, raw },
  });
  return res; 
};

export const getBTCPrice = async () => {
  const res = await request('/ordx/GetBTCPrice', {});
  return res;
};

export const getAssetsAnalytics = async ({ assets_name, assets_type }: any) => {
  const res = await request('/ordx/GetAssetsAnalytics', {
    data: {
      assets_name,
      assets_type,
    },
  });
  return res;
};

export const addChargedTask = async ({ address, fee, txid, type }: any) => {
  const res = await request('/ordx/AddChargedTask', {
    method: 'POST',
    data: { address, fees: fee, txid, type },
  });
  return res;
};

export const getChargedTask = async (tx_id: string) => {
  const res = await request('/ordx/GetChargedTask', {
    data: { tx_id },
  });
  return res;
};
export const getRecommendedFees = async () => {
  const res = await request('/ordx/GetRecommendedFees');
  return res;
};

export const getChargedTaskList = async ({
  address,
  offset,
  size,
  sort_field,
  sort_order,
}: any) => {
  const res = await request('/ordx/GetChargedTaskList', {
    data: { address, offset, size, sort_field, sort_order },
  });
  return res;
};

export const addOrderTask = async ({
  address,
  fees,
  parameters,
  txid,
  type,
}: any) => {
  const res = await request('/ordx/AddOrderTask', {
    method: 'POST',
    data: { address, fees, parameters, txid, type },
  });
  return res;
};

export const addMintRecord = async ({ address, txid, record_data }: any) => {
  const formData = new FormData();
  formData.append('address', address);
  formData.append('txid', txid);
  formData.append('record_data', record_data);
  const res = await request('/ordx/AddMintRecord', {
    method: 'POST',
    formData,
  });
  return res;
};

export const deleteMintRecord = async ({ address, txid }: any) => {
  const res = await request('/ordx/DeleteMintRecord', {
    method: 'POST',
    data: {
      address,
      txid,
    },
  });
  return res;
};
export const lockBulkOrder = async ({ address, orderIds }: any) => {
  const res = await request('/ordx/LockBulkOrder', {
    method: 'POST',
    data: {
      address,
      order_id: orderIds,
    },
  });
  return res;
};

export const unlockBulkOrder = async ({ address, orderIds }: any) => {
  const res = await request('/ordx/UnlockBulkOrder', {
    method: 'POST',
    data: {
      address,
      order_id: orderIds,
    },
  });
  return res;
};
export const bulkBuyingThirdOrder = async ({
  address,
  publickey,
  order_ids,
  fee_rate_tier,
  receiver_address,
}: any) => {
  const res = await request('/ordx/BulkBuyingThirdOrder', {
    method: 'POST',
    data: {
      address,
      publickey,
      order_ids,
      fee_rate_tier,
      receiver_address,
    },
  });
  return res;
};

export const getOrderTask = async (tx_id: string) => {
  const res = await request('/ordx/GetOrderTask', {
    data: { tx_id },
  });
  return res;
};
export const getAddressAssetsValue = async (address: string) => {
  const res = await request('/ordx/GetAddressAssetsValue', {
    data: { address },
  });
  return res;
};

export const getAddressAssetsSummary = async (address: string) => {
  const res = await request('/ordx/GetAddressAssetsSummary', {
    data: { address },
  });
  return res;
};

export const getAddressAssetsList = async (
  address: string,
  assets_type: string,
) => {
  const res = await request('/ordx/GetAddressAssetsList', {
    data: { address, assets_type },
  });
  return res;
};

export const getLastOrderTaskByParameters = async ({
  address,
  parameters,
  type,
}: any) => {
  const res = await request('/ordx/GetLastOrderTaskByParameters', {
    method: 'POST',
    data: { address, parameters, type },
  });
  return res;
};

export const getOrderTaskList = async ({
  address,
  offset,
  size,
  sort_field,
  sort_order,
}: any) => {
  const res = await request('/ordx/GetOrderTaskList', {
    data: { address, offset, size, sort_field, sort_order },
  });
  return res;
};

export const getFeeDiscount = async ({ address, project_id }: any) => {
  const res = await request(`/ordx/GetFeeDiscount`, {
    data: {
      address,
      project_id,
    },
  });
  return res;
};
export const getNameCategoryList = async ({ name }: any) => {
  const res = await request(`/ordx/GetNameCategoryList`, {
    data: {
      name_set: name,
    },
  });
  return res;
};

export const getUtxoByValue = async ({
  address,
  value = 600,
  network,
}: any) => {
  const url = `${process.env.NEXT_PUBLIC_ORDX_HOST}/btc${network === 'testnet' ? '/testnet' : '/mainnet'}/utxo/address/${address}/${value}`;
  const res = await fetch(url);
  return res.json();
};

// export const fetchChainFeeRate = async (network: 'main' | 'testnet') => {
//   const url = generateMempoolUrl({ network, path: 'api/v1/fees/recommended' });
//   const resp = await fetch(url);
//   const data = await resp.json();
//   return data;
// };

export const getAppVersion = async () => {
  const res = await fetch(`/version.txt?t=${+new Date()}`);
  return res.text();
};

export const getSats = async ({ address, network }: any) => {
  const url = `${process.env.NEXT_PUBLIC_ORDX_HOST}${network === 'testnet' ? '/testnet4' : '/mainnet'}/exotic/address/${address}`;
  const res = await fetch(url);
  return res.json();
};

export const getOrdxAddressHolders = async ({
  address,
  tickerOrAssetsType,
  network,
  start,
  limit,
}: any) => {
  const url = `${process.env.NEXT_PUBLIC_ORDX_HOST}${network === 'testnet' ? '/btc/testnet' : '/btc/mainnet'}/address/utxolist/${address}/${tickerOrAssetsType}?start=${start}&limit=${limit}`;
  // const url = `${process.env.NEXT_PUBLIC_ORDX_HOST}${network === 'testnet' ? '/testnet4' : '/mainnet'}/address/utxolist/${address}/${ticker}?start=${start}&limit=${limit}`;
  const res = await fetch(url);
  return res.json();
};

export const getSatsByAddress = async ({ address, sats, network }: any) => {
  const url = `${process.env.NEXT_PUBLIC_ORDX_HOST}${network === 'testnet' ? '/testnet4' : '/mainnet'}/sat/FindSatsInAddress`;
  const data = {
    address: address,
    sats: sats,
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const bindTwitterAccount = async ({ address }) => {
  const res = await request('/sat20twitter/bindaccount', {
    method: 'POST',
    data: { address },
  });
  return res;
};

export const getTwitterAccount = async ({ address }) => {
  const res = await request('/sat20twitter/getaccountinfo', {
    data: { address },
  });
  return res;
};

export const updateTwitterActivity = async ({
  address,
  activity_name,
  result,
  activity_id,
}) => {
  const res = await request('/sat20twitter/updateactivity', {
    method: 'POST',
    data: { address, activity_name, result, activity_id },
  });
  return res;
};

export const getTwitterActivity = async ({ address, activity_id }) => {
  const res = await request('/sat20twitter/verifyactivity', {
    data: { address, activity_id },
  });
  return res;
};
