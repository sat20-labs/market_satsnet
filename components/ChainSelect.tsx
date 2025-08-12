'use client';
import { useCommonStore } from '@/store';
import type { Chain } from '@/store';
import { Icon } from '@iconify/react'; 

export const ChainSelect = () => {
  const { chain, setChain } = useCommonStore();

  const handleSelectionChange = (value: Chain) => {
    if (value === 'Bitcoin') {
      window.location.href = 'https://app.ordx.market/';
    } else {
      setChain(value);
    }
  };

  
  return (
    <div className="flex items-center gap-1 border border-zinc-700 rounded-lg bg-transparent ml-2 p-0 sm:p-1">
      {/* 桌面端显示按钮，移动端隐藏 */}
      <button
        className={`px-2 py-1.5 rounded-full min-w-[60px] text-xs transition-colors hidden sm:block ${
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
        className={`px-2 py-1.5 rounded-full min-w-[80px] text-xs transition-colors hidden sm:block ${
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
        className={`block sm:hidden p-2 rounded-full transition-colors`}
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
        className={`block sm:hidden p-1 rounded-full transition-colors `}
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