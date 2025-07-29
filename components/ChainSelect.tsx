'use client';
import { useCommonStore } from '@/store';
import type { Chain } from '@/store';

export const ChainSelect = () => {
  const { chain, setChain } = useCommonStore();

  const handleSelectionChange = (value: Chain) => {
    if (value === 'Bitcoin') {
      window.location.href = 'https://test.ordx.market/';
    } else {
      setChain(value);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        className={`px-3 py-1.5 rounded-full min-w-[90px] text-sm transition-colors ${
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
        className={`px-3 py-1.5 rounded-full min-w-[90px] text-sm transition-colors ${
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
    </div>
  );
};