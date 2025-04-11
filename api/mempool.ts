'use client';

import { generateMempoolUrl } from '@/lib/utils';

const getTxHex = async (txId: string, network: string) => {
  const url = generateMempoolUrl({
    network,
    path: `api/tx/${txId}/hex`,
  });
  const txHex: string = await fetch(url)
    .then((res) => res.text())
    .then((txHex: string) => {
      if (txHex === 'Transaction not found') {
        throw new Error(
          'Some error happened when finding BTC to pay. Please try again later.',
        );
      }
      return txHex;
    });

  return txHex;
};

const pushTx = async (txHex: string, network: string) => {
  const url = generateMempoolUrl({
    network,
    path: `api/tx`,
  });
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ hex: txHex }),
  });
  const data = await response.text();
  return data;
};

export default { getTxHex, pushTx };
