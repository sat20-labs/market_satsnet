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
}

class ClientApi {
  private readonly BASE_URL = process.env.NEXT_PUBLIC_ORDX_HOST;

  private generatePath = (path: string, chain: string, network: string): string => {    
    console.log('clientApi chain/network:', chain,"/", network);
    if (chain === 'SatoshiNet') {
      return `${this.BASE_URL}/satsnet${
        network === 'testnet' ? '/testnet' : '/mainnet'
      }/${path}`;
    } else {
      return `${this.BASE_URL}${
        network === 'testnet' ? '/btc/testnet' : '/btc/mainnet'
      }/${path}`;
    }
  }

  private request = async <T>(
    path: string,
    params: RequestParams = {},
    method: 'GET' | 'POST' = 'GET',
  ): Promise<T> => {
    const store = useCommonStore.getState();
    const { network } = useReactWalletStore.getState();
    const { chain } = store;
    
    const url = this.generatePath(path, chain, network);
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (method === 'POST' && params.hex) {
      options.body = JSON.stringify({ SignedTxHex: params.hex });
    }

    const response = await fetch(url);
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
    const url = `https://apiprd.ordx.market/${
      network === 'mainNet' ? 'btc' : 'testnet/'
    }ordx/GetRecommendedFees`;
    const response = await fetch(url);
    return response.json();
  }
}

const clientApi = new ClientApi();
export default clientApi;
