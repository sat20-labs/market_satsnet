import { removeObjectEmptyValue } from '@/lib/utils';
import { useCommonStore } from '@/store';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';

// Define an interface for the context needed by the request function
interface RequestContext {
  publicKey?: string | null;
  signature?: string | null;
  chain: 'Bitcoin' | 'SatoshiNet'; // Use specific types if possible
  network: 'Mainnet' | 'Testnet';
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
    baseUrl += network === 'Testnet' ? '/testnet' : '';
  } else if (chain === 'SatoshiNet') {
    baseUrl = process.env.NEXT_PUBLIC_SATESTNET_HOST as string;
    baseUrl += network === 'Testnet' ? '/satsnet/testnet' : '/satsnet';
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
  context: RequestContext, // Pass context as an argument
  options: RequestOptions = {},
) => {
  const { publicKey, signature, chain, network, connected } = context;
  const {
    headers: customHeaders = {}, // Rename to avoid conflict with Headers interface
    method = 'GET',
    data,
    formData,
    timeout = 10000, // Default timeout
    ...restOptions // Capture other RequestInit properties (excluding headers, method, data, formData, timeout)
  } = options;

  const baseUrl = getBaseUrl(chain, network);
  let url = `${baseUrl}${path}`;

  // Initialize fetchOptions first, excluding headers for now
  const fetchOptions: RequestInit = {
    method,
    ...restOptions, // Spread remaining standard options first
  };

  // Ensure headers is always a Headers object
  // Initialize from customHeaders (which is the destructured 'headers' from input options)
  const initialHeaders = customHeaders; // Correctly use the destructured headers
  const headers = new Headers(initialHeaders as HeadersInit);
  fetchOptions.headers = headers; // Assign the guaranteed Headers object

  if (method === 'GET' && data) {
    const query = new URLSearchParams(removeObjectEmptyValue(data)).toString();
    if (query) {
      url += `?${query}`;
    }
  } else if (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
    if (formData) {
        fetchOptions.body = formData;
        // Let the browser set the Content-Type for FormData, so remove it if previously set
        headers.delete('Content-Type');
    } else if (data) {
        fetchOptions.body = JSON.stringify(data);
        // Ensure Content-Type is set for JSON, unless already set
        if (!headers.has('Content-Type')) { // Now safe to call .has()
          headers.set('Content-Type', 'application/json'); // Now safe to call .set()
        }
    }
  }

  // Add authentication headers if connected and signature exists
  if (connected && signature && publicKey) {
    headers.set('Publickey', publicKey); // Now safe to call .set()
    headers.set('Signature', signature); // Now safe to call .set()
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
        // Attempt to parse error body for more details
        errorBody = await response.json();
        errorMessage = errorBody?.msg || errorBody?.message || errorMessage;
        // Include API error code if available
        if (errorBody?.code) {
          errorMessage += ` (API Code: ${errorBody.code})`;
        }
      } catch (parseError) {
        console.warn("Could not parse error response body as JSON:", parseError);
        // Try reading as text if JSON fails
        try {
          const textError = await response.text();
          errorMessage += `\nResponse body: ${textError}`;
        } catch (textErrorErr) {
          // Ignore if reading as text also fails
        }
      }
      // Consider creating a custom error class for API errors
      throw new Error(errorMessage);
    }

    // Assume JSON response, handle cases where no body is expected (e.g., 204 No Content)
    if (response.status === 204) {
       return null; // Or undefined, or an empty object, depending on expected behavior
    }

    const responseData = await response.json();
    console.log('fetch response data:', responseData);

    // Centralized check for business logic errors based on 'code' field
    if (responseData?.code === -1 || responseData?.code === 500) { // Or check for other non-success codes
      const errorMsg = responseData?.msg || responseData?.message || 'Unknown API error';
      console.error('API Error:', errorMsg, responseData);
       // Potentially clear signature if verification failed
      if (errorMsg.includes('signature verification failed') || errorMsg.includes('public and signature parameters are required')) {
        console.warn('API Signature Error, potentially clearing signature:', errorMsg);
        // Consider notifying the state management layer to clear the signature
        // useCommonStore.getState().reset(); // Be cautious about direct calls here
      }
      throw new Error(`API Error: ${errorMsg} (Code: ${responseData.code})`);
    }

    return responseData; // Return successful data

  } catch (error: any) {
    clearTimeout(timeoutId); // Ensure timeout is cleared on any error

    // Log the error with more context
    console.error(`Request failed: ${method} ${url}`, error);

    // Enhance specific error types
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout / 1000} seconds for ${method} ${url}`);
    }

    // Re-throw the original or enhanced error
    throw error;
  }
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
  // Fetch context from stores before calling request
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState(); // Assuming reset/setSignature are not needed here
  const { chain, network } = useCommonStore.getState();

  const context: RequestContext = {
      publicKey,
      signature,
      chain,
      network,
      connected
  };

  const res = await request('/ordx/GetAddressOrdxAssets', context, { // Pass context here
    method: 'GET', // Explicitly specify method for clarity if not GET
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
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request('/ordx/GetAddressOrdxList', context, { data: { address } }); // Pass context
  return res;
};

interface GetAssetsSummary {
  assets_name?: string;
}
export const getAssetsSummary = async ({
  assets_name,
}: GetAssetsSummary) => {
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request('/ordx/GetAssetsSummary', context, { // Pass context
    data: { assets_name },
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
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request('/ordx/GetOrders', context, { // Pass context
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
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request('/ordx/GetHistory', context, { // Pass context
    data: { assets_name, assets_type, offset, size, sort, address, filter },
  });
  return res;
};

interface GetTopAssets {
  assets_protocol?: string;
  interval?: number;
  top_count?: number;
  top_name?: ''; //'recommend' | 'tx_count' | 'tx_amount' | 'tx_volume';
  sort_field: string;
  sort_order: 0 | 1; //'asc' | 'desc';
}
export const getTopAssets = async ({
  assets_protocol = '',
  interval = 1,
  top_count = 20,
  top_name = '',
  sort_field = '',
  sort_order = 0,
}: GetTopAssets) => {
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const _interval = interval === 0 ? undefined : interval;
  const res = await request('/ordx/GetTopAssets', context, { // Pass context
    data: {
      assets_protocol,
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
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request('/ordx/SubmitOrder', context, { // Pass context
    method: 'POST',
    data: { address, raw },
  });
  return res;
};
export const submitBatchOrders = async ({ address, orders }: any) => {
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request('/ordx/SubmitBatchOrders', context, { // Pass context
    method: 'POST',
    data: { address, order_query: orders },
  });
  return res;
};
export const cancelOrder = async ({ address, order_id }: any) => {
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request('/ordx/CancelOrder', context, { // Pass context
    method: 'POST',
    data: { address, order_id },
  });
  return res;
};
export const lockOrder = async ({ address, order_id }: any) => {
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request('/ordx/LockOrder', context, { // Pass context
    method: 'POST',
    data: { address, order_id },
  });
  return res;
};
export const unlockOrder = async ({ address, order_id }: any) => {
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request('/ordx/UnlockOrder', context, { // Pass context
    method: 'POST',
    data: { address, order_id },
  });
  return res;
};

export const buyOrder = async ({ address, order_id, raw }: any) => {
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request('/ordx/BuyOrder', context, { // Pass context
    method: 'POST',
    data: { address, order_id, raw },
  });
  return res;
};
export const bulkBuyOrder = async ({ address, order_ids, raw }: any) => {
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request('/ordx/BulkBuyOrder', context, { // Pass context
    method: 'POST',
    data: { address, order_ids, raw },
  });
  return res;
};

export const getBTCPrice = async () => {
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request('/ordx/GetBTCPrice', context, {}); // Pass context
  return res;
};

export const getAssetsAnalytics = async ({ assets_name, assets_type }: any) => {
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request('/ordx/GetAssetsAnalytics', context, { // Pass context
    data: {
      assets_name,
      assets_type,
    },
  });
  return res;
};

export const addChargedTask = async ({ address, fee, txid, type }: any) => {
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request('/ordx/AddChargedTask', context, { // Pass context
    method: 'POST',
    data: { address, fees: fee, txid, type },
  });
  return res;
};

export const getChargedTask = async (tx_id: string) => {
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request('/ordx/GetChargedTask', context, { // Pass context
    data: { tx_id },
  });
  return res;
};
export const getRecommendedFees = async () => {
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request('/ordx/GetRecommendedFees', context); // Pass context
  return res;
};

export const getChargedTaskList = async ({
  address,
  offset,
  size,
  sort_field,
  sort_order,
}: any) => {
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request('/ordx/GetChargedTaskList', context, { // Pass context
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
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request('/ordx/AddOrderTask', context, { // Pass context
    method: 'POST',
    data: { address, fees, parameters, txid, type },
  });
  return res;
};

export const addMintRecord = async ({ address, txid, record_data }: any) => {
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const formData = new FormData();
  formData.append('address', address);
  formData.append('txid', txid);
  formData.append('record_data', record_data);
  const res = await request('/ordx/AddMintRecord', context, { // Pass context
    method: 'POST',
    formData, // Use formData option
  });
  return res;
};

export const deleteMintRecord = async ({ address, txid }: any) => {
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request('/ordx/DeleteMintRecord', context, { // Pass context
    method: 'POST',
    data: {
      address,
      txid,
    },
  });
  return res;
};
export const lockBulkOrder = async ({ address, orderIds }: any) => {
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request('/ordx/LockBulkOrder', context, { // Pass context
    method: 'POST',
    data: {
      address,
      order_id: orderIds,
    },
  });
  return res;
};

export const unlockBulkOrder = async ({ address, orderIds }: any) => {
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request('/ordx/UnlockBulkOrder', context, { // Pass context
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
  publickey, // Note: This publickey seems redundant if it's the same as context.publicKey
  order_ids,
  fee_rate_tier,
  receiver_address,
}: any) => {
  // Fetch context from stores
  const storePublicKey = useReactWalletStore.getState().publicKey;
  const { connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey: storePublicKey, signature, chain, network, connected };

  const res = await request('/ordx/BulkBuyingThirdOrder', context, { // Pass context
    method: 'POST',
    data: {
      address,
      publickey: publickey || storePublicKey, // Use passed publickey or fallback to context's
      order_ids,
      fee_rate_tier,
      receiver_address,
    },
  });
  return res;
};

export const getOrderTask = async (tx_id: string) => {
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request('/ordx/GetOrderTask', context, { // Pass context
    data: { tx_id },
  });
  return res;
};
export const getAddressAssetsValue = async (address: string) => {
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request('/ordx/GetAddressAssetsValue', context, { // Pass context
    data: { address },
  });
  return res;
};

export const getAddressAssetsSummary = async (address: string) => {
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request('/ordx/GetAddressAssetsSummary', context, { // Pass context
    data: { address },
  });
  return res;
};

export const getAddressAssetsList = async (
  address: string,
  assets_type: string,
) => {
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request('/ordx/GetAddressAssetsList', context, { // Pass context
    data: { address, assets_type },
  });
  return res;
};

export const getLastOrderTaskByParameters = async ({
  address,
  parameters,
  type,
}: any) => {
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request('/ordx/GetLastOrderTaskByParameters', context, { // Pass context
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
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request('/ordx/GetOrderTaskList', context, { // Pass context
    data: { address, offset, size, sort_field, sort_order },
  });
  return res;
};

export const getFeeDiscount = async ({ address, project_id }: any) => {
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request(`/ordx/GetFeeDiscount`, context, { // Pass context
    data: {
      address,
      project_id,
    },
  });
  return res;
};
export const getNameCategoryList = async ({ name }: any) => {
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request(`/ordx/GetNameCategoryList`, context, { // Pass context
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
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request('/sat20twitter/bindaccount', context, { // Pass context
    method: 'POST',
    data: { address },
  });
  return res;
};

export const getTwitterAccount = async ({ address }) => {
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request('/sat20twitter/getaccountinfo', context, { // Pass context
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
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request('/sat20twitter/updateactivity', context, { // Pass context
    method: 'POST',
    data: { address, activity_name, result, activity_id },
  });
  return res;
};

export const getTwitterActivity = async ({ address, activity_id }) => {
  // Fetch context from stores
  const { publicKey, connected } = useReactWalletStore.getState();
  const { signature } = useCommonStore.getState();
  const { chain, network } = useCommonStore.getState();
  const context: RequestContext = { publicKey, signature, chain, network, connected };

  const res = await request('/sat20twitter/verifyactivity', context, { // Pass context
    data: { address, activity_id },
  });
  return res;
};
