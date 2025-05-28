'use client';

import { BtcPrice } from "../BtcPrice";
import { useTranslation } from 'react-i18next';

interface AssetInfoProps {
  assetData: {
    assetId: string;
    assetName: string;
    assetType: string;
    protocol: string;
    assetLogo: string;
    floorPrice: string;    
    volume: string;   
    marketCap: string;
    transactions: number;
    holders: number;
    mintProgress: string;
  };
}

export const AssetInfo = ({ assetData }: AssetInfoProps) => {
  const { t } = useTranslation();
  const volumeBtc = assetData.volume ? Number(assetData.volume) /1e8: 0;
  const marketCapBtc = assetData.marketCap ? Number(assetData.marketCap)/1e8 : 0;
  const volumeUsd = assetData.volume ? <BtcPrice btc={volumeBtc} /> : 0;
  const marketCapUsd = assetData.marketCap ? <BtcPrice btc={marketCapBtc} /> : 0;
        
  const mintProgress = assetData.mintProgress ? assetData.mintProgress : '100%';

  return (
    <div className="bg-zinc-900 p-5 rounded-lg w-full h-64 sm:h-52">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:mt-4 text-left">
        {/* Volume */}
        <div className="border-r-1 border-b-1 sm:border-b-0 border-zinc-800 pr-4">
          <span className="text-gray-400 text-sm">{t('common.volume')}</span>
          <p className="text-zinc-200 text-lg font-bold">{volumeBtc} <span className="text-zinc-400">{t('common.btc')}</span></p>
          <p className="text-gray-400 text-xs mb-3">${volumeUsd}</p>
        </div>

        {/* Market Cap */}
        <div className="sm:border-r-1 border-b-1 sm:border-b-0 sm:border-zinc-800 pr-4">
          <span className="text-gray-400 text-sm">{t('common.marketCap')}</span>
          <p className="text-zinc-200 text-lg font-bold">{marketCapBtc.toLocaleString()} <span className="text-zinc-400 text-sm">{t('common.btc')}</span></p>
          <p className="text-gray-400 text-xs">${marketCapUsd}</p>
        </div>

        {/* Transactions */}
        <div className="border-r-1 border-zinc-800 pr-4">
          <span className="text-gray-400 text-sm">{t('common.transactions')}</span>
          <p className="text-zinc-200 text-lg font-bold">{assetData.transactions.toLocaleString()}</p>
        </div>

        {/* Holders */}
        <div>
          <span className="text-gray-400 text-sm">{t('common.holder_count')}</span>
          <p className="text-zinc-200 text-lg font-bold">{assetData.holders.toLocaleString()}</p>
        </div>
      </div>

      {/* Mint Progress */}
      
      <div className="mt-4 mb-2 text-center">
        <span className="text-gray-400 text-sm">{t('common.mintProgress')} {mintProgress}</span> 
        <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
          <div
            className="bg-green-500 h-2 rounded-full mb-2"
            style={{ width: assetData.mintProgress }}
          ></div>
        </div>       
      </div>
    </div>
  );
};