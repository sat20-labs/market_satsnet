import { Chain, Env } from '@/types';

export const generateOrdUrl = ({
  network,
  path,
  locale,
}: {
  network: string;
  path?: string;
  locale?: string;
}) => {
  const base =
    network === 'testnet'
      ? 'https://ord-testnet4.sat20.org'
      : 'https://ord-mainnet.sat20.org';
  let url = base;
  if (locale) {
    url += `/${locale}`;
  }
  if (path) {
    url += `/${path}`;
  }
  return url;
};

export const generateMempoolUrl = ({
  network,
  path,
  locale,
  chain,
  env,
}: {
  network: string;
  path?: string;
  locale?: string;
  chain?: Chain;
  env?: Env;
}) => {
  const satMempoolUrl: Record<Env, string> = {
    dev: 'https://mempool.sat20.org',
    test: 'https://mempool.sat20.org',
    prod: 'https://mempool.sat20.org',
  }
  const btcMempoolUrl = 'https://mempool.space'
  let base = btcMempoolUrl;
  if (chain && chain === Chain.SATNET && env) {
    base = satMempoolUrl[env];
  }
  let url = base;
  if (chain !== Chain.SATNET && locale) {
    url += `/${locale}`;
  }
  if (chain === Chain.SATNET && network === 'testnet') {
    url += '/testnet';
  } else if (network === 'testnet') {
    url += `/testnet4`;
  }
  if (path) {
    url += `/${path}`;
  }
  return url;
};

export const resolveMempoolTxLink = (txid: string, network: string) => {
  const href = generateMempoolUrl({ network, path: `tx/${txid}` });
  return href;
};
