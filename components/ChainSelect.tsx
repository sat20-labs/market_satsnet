'use client';
import { useCommonStore } from '@/store';
import type { Chain } from '@/store';
import { Icon } from '@iconify/react'; 

const BITCOIN_MARKET_URL =
  process.env.NEXT_PUBLIC_BITCOIN_MARKET_URL
  || (process.env.NODE_ENV === 'development' ? '' : 'https://app.ordx.market/');

const resolveBitcoinMarketUrl = () => {
  const baseUrl = BITCOIN_MARKET_URL
    || `${window.location.protocol}//${window.location.hostname}:3001/market/`;

  const url = new URL(baseUrl, window.location.href);
  const networkParam = new URLSearchParams(window.location.search).get('network');
  const currentNetwork = useCommonStore.getState().network;
  const network = networkParam === 'mainnet' || networkParam === 'testnet'
    ? networkParam
    : currentNetwork;
  if (network === 'mainnet' || network === 'testnet') {
    url.searchParams.set('network', network);
  }
  return url.href;
};

const navigateMarket = (href: string) => {
  if (window.parent !== window) {
    window.parent.postMessage({
      type: 'SAT20_DAPP_NAVIGATE',
      protocol: 'sat20-dapp-connect',
      origin: window.location.origin,
      href,
    }, '*');
    return;
  }

  window.location.href = href;
};

export const ChainSelect = () => {
  const { chain, setChain } = useCommonStore();

  const handleSelectionChange = (value: Chain) => {
    if (value === 'Bitcoin') {
      navigateMarket(resolveBitcoinMarketUrl());
    } else {
      setChain(value);
    }
  };

  
  return (
    <div className="flex items-center gap-1 border border-zinc-700 rounded-lg bg-transparent ml-2 p-0 sm:p-1">
      {/* 桌面端显示按钮，移动端隐藏 */}
      <button
        className={`px-2 py-1.5 rounded-full min-w-[60px] text-xs transition-colors hidden sm:block cursor-pointer ${
          chain === 'Bitcoin'
            ? 'text-white'
            : 'bg-transparent text-gray-500 hover:text-white'
        }`}
        style={
          chain === 'Bitcoin'
            ? { background: 'linear-gradient(to right, #7342dbd5, #d846efc4)' }
            : {}
        }
        onClick={() => handleSelectionChange('Bitcoin')}
      >
        
        Bitcoin
      </button>
      <button
        className={`px-2 py-1.5 rounded-full min-w-[80px] text-xs transition-colors hidden sm:block cursor-pointer ${
          chain !== 'Bitcoin'
            ? 'text-white'
            : 'bg-transparent text-gray-500 hover:text-white'
        }`}
        style={
          chain !== 'Bitcoin'
            ? { background: 'linear-gradient(to right, #7342dbd5, #d846efc4)' }
            : {}
        }
        onClick={() => handleSelectionChange('SatoshiNet')}
      >
        SatoshiNet
      </button>
      {/* 移动端只显示图标 */}
      <button
        className={`block sm:hidden p-2 rounded-full transition-colors cursor-pointer`}
        onClick={() => handleSelectionChange('Bitcoin')}
        aria-label="Bitcoin"
      >
        <Icon icon="cryptocurrency:btc" className="h-6 w-6  ${
          chain !== 'Bitcoin'
            ? 'text-orange-500 hover:text-pink-400'
            : 'bg-transparent text-gray-500 hover:text-white'
        }" />
    
      </button>
      <button
        className={`block sm:hidden p-1 rounded-full transition-colors cursor-pointer`}
        onClick={() => handleSelectionChange('SatoshiNet')}
        aria-label="SatoshiNet"
      >       
        <Icon icon="cryptocurrency:btc" className="h-6 w-6  ${
          chain !== 'Bitcoin'
            ? 'text-gray-500 hover:text-pink-400'
            : 'bg-transparent text-purple-500 hover:text-white'
        }" />
      </button>
    </div>
  );
};
