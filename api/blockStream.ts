import axios from 'axios';
import { Address, Signer, Tap, Tx, Script } from '@cmdcode/tapscript';
export const pushBTCpmt = async (rawtx, network) => {
  let txid;
  try {
    const result = await axios(
      `https://blockstream.info/${
        network === 'testnet' ? 'testnet/' : ''
      }api/tx`,
      { data: rawtx, method: 'POST' },
    );
    txid = result?.data;
  } catch (error: any) {
    if (
      error?.response?.data?.indexOf('Transaction already in block chain') > -1
    ) {
      txid = Tx.util.getTxid(Tx.decode(rawtx));
    } else {
      throw error;
    }
  }

  return txid;
};

export async function pollPushBTCpmt(
  rawtx,
  network,
  delay = 2000,
  retryCount = 10,
) {
  try {
    const result = await pushBTCpmt(rawtx, network);
    if (result) {
      return result;
    } else if (retryCount > 0) {
      console.log('pushBTCpmt returned no result, retrying...');
      return new Promise((resolve) => {
        setTimeout(
          () => resolve(pollPushBTCpmt(rawtx, network, delay, retryCount - 1)),
          delay,
        );
      });
    } else {
      throw new Error('Maximum retry attempts exceeded');
    }
  } catch (error) {
    if (retryCount > 0) {
      console.error('pushBTCpmt failed, retrying...');
      return new Promise((resolve) => {
        setTimeout(
          () => resolve(pollPushBTCpmt(rawtx, network, delay, retryCount - 1)),
          delay,
        );
      });
    } else {
      throw new Error('Maximum retry attempts exceeded');
    }
  }
}

export const getBlockHash = async ({ height, network }: any) => {
  const { data } = await axios.get(
    `https://blockstream.info/${
      network === 'testnet' ? 'testnet/' : ''
    }api/block-height/${height}`,
  );
  return data;
};
export const getTipBlockHeight = async ({ network }: any) => {
  const { data } = await axios.get(
    `https://blockstream.info/${
      network === 'testnet' ? 'testnet/' : ''
    }api/blocks/tip/height`,
  );
  return data;
};
export const getBlockStatus = async ({ height, network }: any) => {
  try {
    const hash = await getBlockHash({ height, network });
    if (hash) {
      const { data } = await axios.get(
        `https://blockstream.info/${
          network === 'testnet' ? 'testnet/' : ''
        }api/block/${hash}`,
      );
      return data;
    }
  } catch (error) {
    console.error('Error in getBlockStatus:', error);
    throw error;
  }
};
