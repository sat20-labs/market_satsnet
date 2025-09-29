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
  const url = `${process.env.NEXT_PUBLIC_ORDX_HOST}${network === 'testnet' ? '/testnet' : '/mainnet'}/exotic/address/${address}`;
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
  const url = `${process.env.NEXT_PUBLIC_ORDX_HOST}${network === 'testnet' ? '/testnet' : '/mainnet'}/sat/FindSatsInAddress`;
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

// Function to determine the base URL based on chain and network
const getContractBaseUrl = (chain: RequestContext['chain'], network: RequestContext['network']): string => {
  let baseUrl = '';
  baseUrl = process.env.NEXT_PUBLIC_SATESTNET_HOST as string;
  baseUrl += network === 'testnet' ? '/stp/testnet' : '/stp/mainnet';

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
export const requestContract = async (
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
  const baseUrl = getContractBaseUrl(ctxChain, ctxNetwork);
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

// 获取支持的合约列表
export const getSupportedContracts = async () => {
  return requestContract('/info/contracts/support', {});
};

// 获取已部署合约信息
export const getDeployedContractInfo = async () => {
  return requestContract('/info/contracts/deployed', {});
};

// 获取单个合约状态
export const getContractStatus = async (uri: string) => {
  return requestContract(`/info/contract/${uri}`, {});
};

// 获取合约调用历史
export const getContractInvokeHistory = async (url: string, pageStart: number = 0, pageLimit: number = 20) => {
  return requestContract(`/info/contract/history/${url}?start=${pageStart}&limit=${pageLimit}`, {});
};

// 获取合约所有用户地址
export const getContractAllAddresses = async (uri: string, pageStart: number = 0, pageLimit: number = 20) => {
  return requestContract(`/info/contract/alluser/${uri}?start=${pageStart}&limit=${pageLimit}`, {});
};

// 获取合约分析数据
export const getContractAnalytics = async (url: string) => {
  return requestContract(`/info/contract/analytics/${url}`, {});
};

// 获取某用户在某合约的状态
export const getContractStatusByAddress = async (url: string, address: string) => {
  return requestContract(`/info/contract/user/${url}/${address}`, {});
};

// 获取某用户在某合约的历史
export const getUserHistoryInContract = async (url: string, address: string, pageStart: number = 0, pageLimit: number = 20) => {
  return requestContract(`/info/contract/userhistory/${url}/${address}?start=${pageStart}&limit=${pageLimit}`, {});
};

// === Contract Metadata (Placeholder Endpoints – confirm with backend) ===
// 获取合约自定义元数据（logo/links/description）
export const getContractMetadata = async (url: string) => {
  return requestContract(`/info/contract/metadata/${url}`, {});
};
// 更新合约自定义元数据
export const updateContractMetadata = async (url: string, metadata: {
  logo?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  description?: string;
}) => {
  return requestContract('/info/contract/metadata/update', {
    method: 'POST',
    data: { url, ...metadata },
  });
};
// === End Contract Metadata ===

// 获取合约部署费用
export const getContractDeployFee = async (templateName: string, content: string, feeRate: number) => {
  return requestContract('/info/contract/deployfee', {
    method: 'POST',
    data: {
      templateName,
      content,
      feeRate,
    },
  });
};

// 获取合约调用费用
export const getContractInvokeFee = async (url: string, parameter: string) => {
  return requestContract('/info/contract/invokefee', {
    method: 'POST',
    data: {
      url,
      parameter,
    },
  });
};

// === Points (Asset Metadata) Base & Helper ===
const POINTS_TOKEN_KEY = 'points_api_token';
const LEGACY_POINTS_TOKEN_KEYS = ['POINTS_API_TOKEN'];

const migrateLegacyPointsToken = (): string | '' => {
  if (typeof window === 'undefined') return '';
  let latest = '';
  for (const k of LEGACY_POINTS_TOKEN_KEYS) {
    const val = localStorage.getItem(k) || sessionStorage.getItem(k) || '';
    if (val) {
      latest = val;
      // remove legacy
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    }
  }
  if (latest) {
    // store under new key (persist in localStorage by default)
    localStorage.setItem(POINTS_TOKEN_KEY, latest);
  }
  return latest;
};

const getPointsBaseUrl = (): string => {
  const base = (process.env.NEXT_PUBLIC_POINTS_API_BASE || '').replace(/\/$/, '');
  return base;
};

// Getter now prefers unified key, falls back to legacy migration, then env.
const getPointsAuthToken = (): string => {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_POINTS_API_TOKEN || '';
  }
  let token = localStorage.getItem(POINTS_TOKEN_KEY) || sessionStorage.getItem(POINTS_TOKEN_KEY) || '';
  if (!token) {
    token = migrateLegacyPointsToken();
  }
  if (!token) {
    token = process.env.NEXT_PUBLIC_POINTS_API_TOKEN || '';
  }
  return token;
};

export const setPointsAuthToken = (token: string, persist: boolean = true) => {
  if (typeof window === 'undefined') return;
  // cleanup any legacy keys
  for (const k of LEGACY_POINTS_TOKEN_KEYS) {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  }
  localStorage.removeItem(POINTS_TOKEN_KEY);
  sessionStorage.removeItem(POINTS_TOKEN_KEY);
  if (token) {
    (persist ? localStorage : sessionStorage).setItem(POINTS_TOKEN_KEY, token);
  }
  window.dispatchEvent(new CustomEvent('points:token-updated', { detail: { token } }));
};
export const clearPointsAuthToken = () => setPointsAuthToken('', true);

interface PointsRequestOptions {
  method?: string;
  data?: Record<string, any>;
  formData?: FormData;
  timeout?: number;
  headers?: Record<string, string>;
  _retried?: boolean; // internal flag to avoid infinite loops
}

const pointsRequest = async (path: string, options: PointsRequestOptions = {}) => {
  const {
    method = 'GET',
    data,
    formData,
    timeout = 10000,
    headers: customHeaders = {},
    _retried = false,
  } = options;
  const baseUrl = getPointsBaseUrl();
  let url = `${baseUrl}${path}`;
  const fetchOptions: RequestInit = { method, headers: { ...customHeaders } };
  const apiToken = getPointsAuthToken();

  // 调整: 仅通过 Header 发送 token，不再放入 query/body (?api_token=)  —— 2025-09-18
  if (method === 'GET' && data) {
    const qsParams = removeObjectEmptyValue(data);
    const qs = new URLSearchParams(qsParams as Record<string, string>).toString();
    if (qs) url += `?${qs}`;
  } else if (formData) {
    fetchOptions.body = formData; // multipart form automatically handled
  } else if (data) {
    fetchOptions.body = JSON.stringify(data);
    (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  if (apiToken) {
    (fetchOptions.headers as Record<string, string>)['Authorization'] = `Bearer ${apiToken}`;
    (fetchOptions.headers as Record<string, string>)['X-API-Token'] = apiToken;
  }

  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), timeout);
  fetchOptions.signal = controller.signal;
  try {
    const resp = await fetch(url, fetchOptions);
    clearTimeout(to);

    if (resp.status === 401) {
      console.warn('Points API unauthorized 401:', url);
      const hadToken = !!apiToken;
      clearPointsAuthToken();
      window.dispatchEvent(new CustomEvent('points:unauthorized', { detail: { path, url } }));
      // If we had a token and not retried yet, do a single silent retry (maybe env default token)
      if (hadToken && !_retried) {
        return pointsRequest(path, { ...options, _retried: true });
      }
      throw new Error('Unauthorized (401)');
    }

    if (!resp.ok) {
      let bodyText = '';
      try { bodyText = await resp.text(); } catch {}
      throw new Error(`Points API error ${resp.status} ${resp.statusText}: ${bodyText}`);
    }
    const ct = resp.headers.get('content-type') || '';
    if (ct.includes('application/json')) return resp.json();
    return resp.text();
  } catch (e: any) {
    clearTimeout(to);
    console.error('pointsRequest failed', method, url, e);
    throw e;
  }
};

// === Asset Metadata APIs (UPDATED to use Points Service) ===
export const upsertAsset = async ({ ticker, name, logo, description, website, twitter, telegram, discord }: { ticker: string; name: string; logo?: string; description?: string; website?: string; twitter?: string; telegram?: string; discord?: string }) => {
  return pointsRequest('/api/v1/assets/upsert', {
    method: 'POST',
    data: { ticker, name, logo, description, website, twitter, telegram, discord },
  });
};
export const getAsset = async (ticker: string) => {
  return pointsRequest('/api/v1/assets/get', { data: { ticker } });
};
export const listAssets = async ({ limit, cursor }: { limit?: number; cursor?: string }) => {
  return pointsRequest('/api/v1/assets/list', { data: { limit, cursor } });
};
export const patchAssetMeta = async (payload: { ticker: string; logo?: string; description?: string; name?: string; website?: string; twitter?: string; telegram?: string; discord?: string }) => {
  return pointsRequest('/api/v1/assets/meta', { method: 'PATCH', data: payload });
};
export const uploadAssetLogo = async (ticker: string, file: File) => {
  const formData = new FormData();
  formData.append('ticker', ticker);
  formData.append('file', file);
  return pointsRequest('/api/v1/assets/logo/upload', { method: 'POST', formData });
};
// === End Asset Metadata APIs ===

// === Market Price Changes ===
export const getContractPriceChange = async (contract: string) => {
  if (!contract) return null;
  try {
    const res = await pointsRequest('/api/v1/market/price_changes', { data: { contract } });
    return res?.data || null;
  } catch (e) {
    console.warn('getContractPriceChange failed', contract, e);
    return null;
  }
};
// === End Market Price Changes ===

// === Unified Market (points-based) Endpoints ===
// NOTE: These reuse NEXT_PUBLIC_POINTS_API_BASE via pointsRequest so market + points share base + auth.
export const getMarketPriceChanges = async (contract: string) => {
  if (!contract) return null;
  try {
    const res: any = await pointsRequest('/api/v1/market/price_changes', { data: { contract } });
    return res?.data || res?.result || null;
  } catch (e) {
    console.warn('getMarketPriceChanges failed', contract, e);
    return null;
  }
};

interface GetMarketKlineParams {
  contract: string;
  interval: string; // 1m|5m|15m|1h|4h|1d
  start?: number;   // unix seconds
  end?: number;     // unix seconds
  limit?: number;   // max bars
}
export const getMarketKline = async ({ contract, interval, start, end, limit }: GetMarketKlineParams) => {
  if (!contract) return { bars: [] };
  try {
    const res: any = await pointsRequest('/api/v1/market/kline', { data: { contract, interval, start, end, limit } });
    return res?.data || res || { bars: [] };
  } catch (e) {
    console.warn('getMarketKline failed', contract, interval, e);
    return { bars: [] };
  }
};
// Backwards compatibility alias
export const getContractKline = getMarketKline;
// === End Unified Market Endpoints ===

