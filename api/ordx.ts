/**
 * @author hugh
 * @email ygz14835187@163.com
 * @create date 2024-06-23 18:04:10
 * @modify date 2024-06-23 18:04:10
 * @desc [description]
 */
import axios from 'axios';
import mempool from './mempool';

// axios.defaults.headers.common['Authorization'] = process.env.NEXT_PUBLIC_ORDX_API_AUTHORIZATION;

const generateUrl = (url: string, network?: string) => {
  console.log('network', network);
  console.log(url);
  url = `${process.env.NEXT_PUBLIC_ORDX_HOST}/btc${network === 'testnet' ? '/testnet' : '/mainnet'}/${url}`;
  console.log('hostname', location.hostname);

  if (location.hostname.indexOf('test') > -1) {
    url = url.replace('apiprd', 'apiprd');
  } else if (location.hostname.indexOf('dev') > -1) {
    url = url.replace('apiprd', 'apidev');
  }
  console.log('url', url);
  return url;
};
const generateV3Url = (url: string, network?: string) => {
  url = `${process.env.NEXT_PUBLIC_ORDX_HOST}/btc${network === 'testnet' ? '/testnet' : '/mainnet'}/${url}`;
  console.log('hostname', location.hostname);

  if (location.hostname.indexOf('test') > -1) {
    url = url.replace('apiprd', 'apidev');
  } else if (location.hostname.indexOf('dev') > -1) {
    url = url.replace('apiprd', 'apidev');
  } else {
    url = url.replace('apiprd', 'apidev');
  }
  return url;
};
const responseParse = async (response) => {
  const { code, msg, data } = response?.data || {};
  if (code === 0) {
    return response?.data;
  } else {
    console.log('error: ' + msg);
  }
};
const getOrdxStatusList = async (params: any): Promise<any> => {
  const { data } = await axios.get(
    generateUrl(
      `tick/status?start=${params.start}&limit=${params.limit}`,
      params.network,
    ),
  );
  return data;
};
const fetchChainFeeRate = async (network: string): Promise<any> => {
  const { data } = await axios.get(
    generateUrl(`extension/default/fee-summary`, network),
  );
  return data;
};

const health = async ({ network }) => {
  const { data } = await axios.get(generateUrl(`health`, network));
  return data;
};

const getOrdxInfo = async ({ tick, network }: any) => {
  const { data } = await axios.get(generateUrl(`tick/info/${tick}`, network), {
    timeout: 10000,
  });
  return data;
};
const getTickDeploy = async ({ tick, address, network }: any) => {
  const { data } = await axios.get(
    generateUrl(`deploy/${tick}/${address}`, network),
    {
      timeout: 10000,
    },
  );
  return data;
};

const exoticUtxo = async ({ utxo, network }: any) => {
  const { data } = await axios.get(
    generateUrl(`exotic/utxo/${utxo}`, network),
    {
      timeout: 10000,
    },
  );
  return data;
};
const getNsListByAddress = async ({ address, network, limit = 100 }: any) => {
  const { data } = await axios.get(
    generateUrl(`ns/address/${address}?start=0&limit=${limit}`, network),
    {
      timeout: 10000,
    },
  );
  return data;
};
const getNsListStatus = async ({ network }: any) => {
  const { data } = await axios.get(
    generateUrl(`ns/status?start=0&limit=1`, network),
    {
      timeout: 10000,
    },
  );
  return data;
};

const getOrdxSummary = async ({ address, network }: any) => {
  const { data } = await axios.get(
    generateUrl(`address/summary/${address}`, network),
  );
  return data;
};
const getBestHeight = async ({ network }: any) => {
  const { data } = await axios.get(generateUrl(`bestheight`, network));
  return data;
};
const getHeightInfo = async ({ height, network }: any) => {
  const { data } = await axios.get(generateUrl(`height/${height}`, network));
  return data;
};
const getOrdxTickHolders = async ({ tick, network, start, limit }) => {
  const { data } = await axios.get(
    generateUrl(`tick/holders/${tick}?start=${start}&limit=${limit}`, network),
  );
  return data;
};

const getOrdxAddressHistory = async ({
  address,
  ticker,
  network,
  start,
  limit,
}: any) => {
  const { data } = await axios.get(
    generateUrl(
      `address/history/${address}/${ticker}?start=${start}&limit=${limit}`,
      network,
    ),
  );
  return data;
};

const getOrdxNsUxtos = async ({ address, sub, network, start, limit }) => {
  const { data } = await axios.get(
    generateUrl(
      `ns/address/${address}/${sub}?start=${start}&limit=${limit}`,
      network,
    ),
  );
  return data;
};
const getOrdxAddressHolders = async ({
  address,
  ticker,
  network,
  start,
  limit,
}: any) => {
  const { data } = await axios.get(
    generateUrl(
      `address/utxolist/${address}/${ticker}?start=${start}&limit=${limit}`,
      network,
    ),
  );
  return data;
};

const getOrdxTickHistory = async ({ start, limit, ticker, network }: any) => {
  const { data } = await axios.get(
    generateUrl(
      `tick/history/${ticker}?start=${start}&limit=${limit}`,
      network,
    ),
  );
  return data;
};

const getUtxoByValue = async ({ address, value = 600, network }: any) => {
  const { data } = await axios.get(
    generateUrl(`utxo/address/${address}/${value}`, network),
  );
  return data;
};

// server端无此接口
const savePaidOrder = async ({ key, content, network }: any) => {
  const { data } = await axios.post(
    generateUrl(`v1/indexer/tx/putkv/${key}`, network),
    {
      key,
      content: JSON.stringify(content),
    },
  );
  return data;
};

const getInscriptiontInfo = async ({ inscriptionId, network }: any) => {
  const { data } = await axios.get(
    generateUrl(`mint/details/${inscriptionId}`, network),
  );
  return data;
};
const getAllUtxos = async ({ address, network }: any) => {
  const { data } = await axios.get(
    generateUrl(`allutxos/address/${address}`, network),
  );
  return data;
};
const getTickerPermission = async ({ address, ticker, network }: any) => {
  const { data } = await axios.get(
    generateUrl(`mint/permission/${ticker}/${address}`, network),
  );
  return data;
};

const getAppVersion = async () => {
  const { data } = await axios.get(`/version.txt`);
  return data;
};

const getTxStatus = async ({ txid, network }: any) => {
  const { data } = await axios.get(
    `https://blockstream.info/${
      network === 'testnet' ? 'testnet/' : ''
    }api/tx/${txid}`,
  );
  return data;
};

const getTxHex = async ({ txid, network }: any) => {
  const { data } = await axios.get(generateUrl(`btc/rawtx/${txid}`, network));
  return data;
};

const getSats = async ({ address, network }: any) => {
  const { data } = await axios.get(
    generateUrl(`exotic/address/${address}`, network),
  );
  return data;
};

const getSplittedSats = async ({ ticker, network }: any) => {
  const { data } = await axios.get(
    // generateUrl(`v1/indexer/ordx/${ticker}/splittedInscriptions`, network),
    generateUrl(`splittedInscriptions/${ticker}`, network),
  );
  return data;
};

const getAssetByUtxo = async ({ utxo, network }: any) => {
  const { data } = await axios.get(
    generateUrl(`utxo/abbrassets/${utxo}`, network),
  );
  return data;
};
const getSeedByUtxo = async ({ utxo, network }: any) => {
  const { data } = await axios.get(generateUrl(`utxo/seed/${utxo}`, network));
  return data;
};

const getUtxoByType = async ({ address, type, network }: any) => {
  const { data } = await axios.get(
    generateUrl(`exotic/address/${address}/${type}`, network),
  );
  return data;
};

const getSatsByAddress = async ({ address, sats, network }: any) => {
  const { data } = await axios.post(
    generateUrl(`sat/FindSatsInAddress`, network),
    {
      address: address,
      sats: sats,
    },
  );
  return data;
};

const getSatsByUtxo = async ({ utxo, network }: any) => {
  const { data } = await axios.get(generateUrl(`exotic/utxo/${utxo}`, network));
  return data;
};

const getSatTypes = async ({ network }: any) => {
  const { data } = await axios.get(generateUrl(`info/satributes`, network));
  return data;
};

const getUtxo = async ({ utxo, network }: any) => {
  const { data } = await axios.get(generateUrl(`utxo/assets/${utxo}`, network));
  return data;
};

const getDeployInfo = async ({ asset, network }: any) => {
  const { data } = await axios.get(generateV3Url(`deploy/${asset}`, network));
  return data;
}
const getTickInfo = async ({ asset, network }: any) => {
  const { data } = await axios.get(generateV3Url(`v3/tick/info/${asset}`, network));
  return data;
}
const getOrdinalsAssets = async ({ address, network }: any) => {
  const { data } = await axios.get(
    `https://${network === 'testnet' ? 'testnet4' : 'mainnet'}-ordinals.sat20.org/address/${address}`,
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    },
  );
  return data;
};

const pushTx = async ({ hex, network }: any) => {
  const { data } = await axios.post(generateUrl(`btc/tx`, network), {
    SignedTxHex: hex,
  });
  if (data.code === 0) {
    return data.data;
  } else {
    throw new Error(data.msg);
  }
};

export const getNsName = async ({ name, network }: any) => {
  const { data } = await axios.get(generateUrl(`ns/name/${name}`, network));
  return data;
};

export const checkNsNames = async ({ names, network }: any) => {
  const { data } = await axios.post(generateUrl(`ns/check`, network), {
    Names: names,
  });
  return data;
};

async function pollGetTxStatus(
  txid: string,
  network: string,
  delay = 2000,
  retryCount = 30,
) {
  try {
    const result = await mempool.getTxHex(txid, network);
    if (result) {
      console.log('getTxStatus succeeded, stopping poll.');
      console.log(result);
      return result;
    } else if (retryCount > 0) {
      console.log('getTxStatus returned no result, retrying...');
      return new Promise((resolve) => {
        setTimeout(
          () => resolve(pollGetTxStatus(txid, network, delay, retryCount - 1)),
          delay,
        );
      });
    } else {
      throw new Error('Maximum retry attempts exceeded');
    }
  } catch (error) {
    if (retryCount > 0) {
      console.error('getTxStatus failed, retrying...');
      return new Promise((resolve) => {
        setTimeout(
          () => resolve(pollGetTxStatus(txid, network, delay, retryCount - 1)),
          delay,
        );
      });
    } else {
      throw new Error('Maximum retry attempts exceeded');
    }
  }
}

export const ordx = {
  getOrdxStatusList,
  health,
  getOrdxInfo,
  getOrdxSummary,
  getOrdxTickHolders,
  getOrdxAddressHistory,
  getOrdxAddressHolders,
  getOrdxTickHistory,
  getUtxoByValue,
  savePaidOrder,
  getInscriptiontInfo,
  getAppVersion,
  getTxStatus,
  getSats,
  getSplittedSats,
  getAssetByUtxo,
  getSeedByUtxo,
  getUtxoByType,
  getSatsByAddress,
  getSatsByUtxo,
  getSatTypes,
  getUtxo,
  pollGetTxStatus,
  exoticUtxo,
  getHeightInfo,
  getNsListByAddress,
  getNsName,
  checkNsNames,
  getBestHeight,
  getTickerPermission,
  pushTx,
  getTickDeploy,
  fetchChainFeeRate,
  getTxHex,
  getNsListStatus,
  getAllUtxos,
  getOrdinalsAssets,
  getOrdxNsUxtos,
  getDeployInfo,
  getTickInfo,
};
