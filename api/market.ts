import { removeObjectEmptyValue } from '@/utils';
import { useCommonStore } from '@/store';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';

// Define an interface for the context needed by the request function
interface RequestContext {
  publicKey?: string | null;
  signature?: string | null;
  chain: 'Bitcoin' | 'SatoshiNet'; // Use specific types if possible
  network: 'mainnet' | 'testnet';
  connected: boolean;
}

// Define a type for the request options, extending standard RequestInit
type RequestOptions = Omit<RequestInit, 'body' | 'signal'> & {
  data?: Record<string, any>; // For JSON body or URLSearchParams
  formData?: FormData;       // For FormData body
  timeout?: number;
};

// Function to determine the base URL based on chain and network
const getBaseUrl = (chain: RequestContext['chain'], network: RequestContext['network']): string => {
  let baseUrl = '';
  console.log('request chain/network:', chain, network);
  if (chain === 'Bitcoin') {
    baseUrl = process.env.NEXT_PUBLIC_HOST as string;
    baseUrl += network === 'testnet' ? '/testnet' : '';
  } else if (chain === 'SatoshiNet') {
    baseUrl = process.env.NEXT_PUBLIC_SATESTNET_HOST as string;
    baseUrl += network === 'testnet' ? '/testnet' : '';
  }

  // Environment-specific adjustments (consider moving this logic elsewhere if complex)
  if (typeof window !== 'undefined') { // Ensure this runs only client-side if needed
    if (location.hostname.includes('test')) {
      // Example: baseUrl = baseUrl.replace('api.', 'api.test.');
    } else if (location.hostname.includes('dev')) {
      baseUrl = baseUrl.replace('apiprd', 'apidev'); // Adjust based on your actual env logic
    }
  }
  return baseUrl;
};

export const request = async (
  path: string,
  options: RequestOptions = {},
  customContext?: Partial<RequestContext>,
) => {
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  let context: RequestContext = { publicKey, signature, chain, network, connected };
  if (customContext) {
    context = { ...context, ...customContext };
  }
  const { publicKey: ctxPublicKey, signature: ctxSignature, chain: ctxChain, network: ctxNetwork, connected: ctxConnected } = context;
  const {
    headers: customHeaders = {},
    method = 'GET',
    data,
    formData,
    timeout = 10000,
    ...restOptions
  } = options;
  const baseUrl = getBaseUrl(ctxChain, ctxNetwork);
  let url = `${baseUrl}${path}`;
  const fetchOptions: RequestInit = {
    method,
    ...restOptions,
  };
  const initialHeaders = customHeaders;
  const headers = new Headers(initialHeaders as HeadersInit);
  fetchOptions.headers = headers;
  if (method === 'GET' && data) {
    const query = new URLSearchParams(removeObjectEmptyValue(data)).toString();
    if (query) {
      url += `?${query}`;
    }
  } else if (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
    if (formData) {
      fetchOptions.body = formData;
      headers.delete('Content-Type');
    } else if (data) {
      fetchOptions.body = JSON.stringify(data);
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
    }
  }
  if (ctxConnected && ctxSignature && ctxPublicKey) {
    headers.set('Publickey', ctxPublicKey);
    headers.set('Signature', ctxSignature);
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  fetchOptions.signal = controller.signal;
  try {
    console.log('fetch request:', method, url, fetchOptions);
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);
    if (!response.ok) {
      let errorBody: any = null;
      let errorMessage = `HTTP error! Status: ${response.status} ${response.statusText} for ${method} ${url}`;
      try {
        errorBody = await response.json();
        errorMessage = errorBody?.msg || errorBody?.message || errorMessage;
        if (errorBody?.code) {
          errorMessage += ` (API Code: ${errorBody.code})`;
        }
      } catch (parseError) {
        console.warn("Could not parse error response body as JSON:", parseError);
        try {
          const textError = await response.text();
          errorMessage += `\nResponse body: ${textError}`;
        } catch (textErrorErr) { }
      }
      throw new Error(errorMessage);
    }
    if (response.status === 204) {
      return null;
    }
    const responseData = await response.json();
    console.log('fetch response data:', responseData);
    if (responseData?.code === -1 || responseData?.code === 500) {
      const errorMsg = responseData?.msg || responseData?.message || 'Unknown API error';
      console.error('API Error:', errorMsg, responseData);
      if (errorMsg.includes('signature verification failed') || errorMsg.includes('public and signature parameters are required')) {
        console.warn('API Signature Error, potentially clearing signature:', errorMsg);
      }
      throw new Error(`API Error: ${errorMsg} (Code: ${responseData.code})`);
    }
    return responseData;
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error(`Request failed: ${method} ${url}`, error);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout / 1000} seconds for ${method} ${url}`);
    }
    throw error;
  }
};

export const getOrdxAssets = async ({
  address,
  assets_type,
  assets_name,
  utxo,
  offset,
  size,
  category,
}: any) => {
  const res = await request('/ordx/GetAddressOrdxAssets', {
    method: 'GET',
    data: {
      address,
      offset,
      size,
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
}
export const getAssetsSummary = async ({
  assets_name,
}: GetAssetsSummary) => {
  const res = await request('/ordx/GetAssetsSummary', {
    data: { assets_name },
  });
  return res;
};
interface GetOrders {
  assets_name?: string;
  assets_protocol?: string;
  address?: string;
  category?: string;
  offset: number;
  hide_locked?: boolean;
  size: number;
  sort?: number; // 0: 不排序 1: 价格升序 2: 价格降序 3: 时间升序 4: 时间降序
  type?: 1 | 2; // 1: 卖出订单 2: 买入订单， 当前只支持1（默认为1）
  orderType?: 1 | 2; // 1: 卖出订单 2: 买入订单， 当前只支持1（默认为1）
}
export const getOrders = async ({
  assets_name,
  assets_protocol,
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
      assets_protocol,
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
  sort = 0,
  address,
  filter,
}: any) => {
  const res = await request('/ordx/GetHistory', {
    data: { assets_name, assets_type, offset, size, sort, address, filter },
  });
  return res;
};

interface GetTopAssets {
  assets_protocol?: string;
  assets_type?: string;
  interval?: number;
  top_count?: number;
  top_name?: ''; //'recommend' | 'tx_count' | 'tx_amount' | 'tx_volume';
  sort_field: string;
  sort_order: 0 | 1; //'asc' | 'desc';
}
export const getTopAssets = async ({
  assets_protocol = '',
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
      assets_protocol,
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

export const getRecommendedFees = async () => {
  const res = await request('/ordx/GetRecommendedFees', {});
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
  assets_protocol: string,
) => {
  const res = await request('/ordx/GetAddressAssetsList', {
    data: { address, assets_protocol },
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

// 获取支持的合约列表
export const getSupportedContracts = async () => {
  return request('/ordx/info/contracts/support', {});
};

// 获取已部署合约信息
export const getDeployedContractInfo = async () => {
  return request('/ordx/info/contracts/deployed', {});
};

// 获取单个合约状态
export const getContractStatus = async (uri: string) => {
  return request(`/ordx/info/contract/${uri}`, {});
};

// 获取合约调用历史
export const getContractInvokeHistory = async (url: string, pageStart: number = 0, pageLimit: number = 20) => {
  return request(`/ordx/info/contract/history/${url}?start=${pageStart}&limit=${pageLimit}`, {});
};

// 获取合约所有用户地址
export const getContractAllAddresses = async (uri: string, pageStart: number = 0, pageLimit: number = 20) => {
  return request(`/ordx/info/contract/alluser/${uri}?start=${pageStart}&limit=${pageLimit}`, {});
};

// 获取合约分析数据
export const getContractAnalytics = async (url: string) => {
  return request(`/ordx/info/contract/analytics/${url}`, {});
};

// 获取某用户在某合约的状态
export const getContractStatusByAddress = async (url: string, address: string) => {
  return request(`/ordx/info/contract/user/${url}/${address}`, {});
};

// 获取某用户在某合约的历史
export const getUserHistoryInContract = async (url: string, address: string, pageStart: number = 0, pageLimit: number = 20) => {
  return request(`/ordx/info/contract/userhistory/${url}/${address}?start=${pageStart}&limit=${pageLimit}`, {});
};

