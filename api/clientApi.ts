import { useCommonStore } from '../store/common';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';

interface RequestParams {
  address?: string;
  network?: string;
  txid?: string;
  utxo?: string;
  name?: string;
  ticker?: string;
  start?: number;
  limit?: number;
  sub?: string;
  page?: number;
  pagesize?: number;
  hex?: string;
  utxos?: string[];
}

class ClientApi {
  private readonly BASE_URL = process.env.NEXT_PUBLIC_ORDX_HOST;

  // 新增：ticker 信息缓存，key 为 ticker，value 为接口返回数据
  private tickerInfoCache: Map<string, any> = new Map();

  private generatePath = (path: string, chain: string, network: string): string => {
    if (chain === 'SatoshiNet') {
      return `${this.BASE_URL}/satsnet${network === 'testnet' ? '/testnet' : '/mainnet'
        }/${path}`;
    } else {
      return `${this.BASE_URL}${network === 'testnet' ? '/btc/testnet' : '/btc/mainnet'
        }/${path}`;
    }
  }

  private request = async <T>(
    path: string,
    params: RequestParams = {},
    method: 'GET' | 'POST' = 'GET',
  ): Promise<T> => {
    const { chain, network } = useCommonStore.getState();

    const url = this.generatePath(path, chain, network);

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (method === 'POST') {
      if (params && Object.keys(params).length > 0) {
        options.body = JSON.stringify(params);
      }
    }

    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  getUtxos = async (address: string): Promise<any> => {
    return this.request(`allutxos/address/${address}`);
  }

  getTxRaw = async (txid: string): Promise<any> => {
    return this.request(`btc/rawtx/${txid}`);
  }

  getPlainUtxos = async (address: string): Promise<any> => {
    return this.request(`utxo/address/${address}/0`);
  }

  getRareUtxos = async (address: string): Promise<any> => {
    return this.request(`exotic/address/${address}`);
  }

  getUtxo = async (utxo: string): Promise<any> => {
    return this.request(`utxo/range/${utxo}`);
  }
  getUtxoInfo = async (utxo: string): Promise<any> => {
    return this.request(`v3/utxo/info/${utxo}`);
  }
  getUtxosInfo = async (utxos: string[]): Promise<any> => {
    return this.request(`v3/utxos/info`, { utxos }, 'POST');
  }
  /**
   * 获取ticker信息，始终请求btc主链接口（无论当前chain是什么）
   * @param ticker 资产ticker
   */
  getTickerInfo = async (ticker: string): Promise<any> => {
    const CACHE_EXPIRE_TIME = 10 * 60 * 1000; // 10分钟缓存失效时间（毫秒）
    const currentTime = Date.now();

    // 1. 先查内存缓存
    if (this.tickerInfoCache.has(ticker)) {
      const cachedData = this.tickerInfoCache.get(ticker);
      // 检查缓存是否过期
      if (currentTime - cachedData.timestamp < CACHE_EXPIRE_TIME) {
        return cachedData.data;
      } else {
        // 缓存过期，删除内存缓存
        this.tickerInfoCache.delete(ticker);
      }
    }

    // 2. 再查 sessionStorage
    const sessionKey = `tickerInfoCache_${ticker}`;
    const cachedStr = sessionStorage.getItem(sessionKey);
    if (cachedStr) {
      try {
        const cachedData = JSON.parse(cachedStr);
        // 检查缓存是否过期
        if (currentTime - cachedData.timestamp < CACHE_EXPIRE_TIME) {
          // 同步到内存缓存
          this.tickerInfoCache.set(ticker, cachedData);
          return cachedData.data;
        } else {
          // 缓存过期，删除sessionStorage缓存
          sessionStorage.removeItem(sessionKey);
        }
      } catch (e) {
        // 解析失败则忽略，继续请求接口
      }
    }

    // 3. 都没有则请求接口
    const { network } = useCommonStore.getState();
    const baseUrl = `${this.BASE_URL}${network === 'testnet' ? '/btc/testnet' : '/btc/mainnet'}`;
    const url = `${baseUrl}/v3/tick/info/${ticker}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    // 写入缓存（内存+sessionStorage），包含时间戳
    const cacheData = {
      data: data,
      timestamp: currentTime
    };
    this.tickerInfoCache.set(ticker, cacheData);
    sessionStorage.setItem(sessionKey, JSON.stringify(cacheData));
    return data;
  }
  getNsName = async (name: string): Promise<any> => {
    return this.request(`ns/name/${name}`);
  }

  getAddressSummary = async (address: string): Promise<any> => {
    return this.request(`v3/address/summary/${address}`);
  }
  getBestHeight = async (): Promise<any> => {
    return this.request(`bestheight`);
  }
  getNsListByAddress = async (address: string): Promise<any> => {
    return this.request(`ns/address/${address}`);
  }
  getSeedByUtxo = async (utxo: string): Promise<any> => {
    return this.request(`utxo/seed/${utxo}`);
  };

  getOrdxAddressHolders = async (
    address: string,
    ticker: string,
    start: number = 0,
    limit: number = 10,
  ): Promise<any> => {
    return this.request(
      `v3/address/asset/${address}/${ticker}?start=${start}&limit=${limit}`,
    );
  }

  getOrdxNsUxtos = async (
    address: string,
    sub: string,
    page: number = 1,
    pagesize: number = 10,
  ): Promise<any> => {
    const start = (page - 1) * pagesize;
    const limit = pagesize;
    return this.request(
      `ns/address/${address}/${sub}?start=${start}&limit=${limit}`,
    );
  }

  pushTx = async (hex: string): Promise<any> => {
    return this.request('btc/tx', { hex }, 'POST');
  }

  getRecommendedFees = async (): Promise<any> => {
    const store = useCommonStore.getState();
    const { network } = store;
    const url = `https://apiprd.ordx.market/${network === 'mainnet' ? '' : 'testnet/'
      }ordx/GetRecommendedFees`;
    const response = await fetch(url);
    return response.json();
  }
  getTickerHolders = async (ticker: string, page: number = 1, pagesize: number = 10): Promise<any> => {
    const start = (page - 1) * pagesize;
    return this.request(`v3/tick/holders/${ticker}?start=${start}&limit=${pagesize}`);
  }
}

const clientApi = new ClientApi();
export default clientApi;
