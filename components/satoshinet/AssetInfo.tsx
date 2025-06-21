'use client';

import { BtcPrice } from "../BtcPrice";
import { useTranslation } from 'react-i18next';

interface AssetInfoProps {
  depthData: any;
  assetData: any; // Allow any type for assetData to re-introduce it
}

export const AssetInfo = ({ depthData, assetData }: AssetInfoProps) => {
  const { t } = useTranslation();

  const volumeBtc = depthData && depthData['24hour']?.volume ? Number(depthData['24hour'].volume) : 0;
  const marketCapBtc = depthData && depthData.SatsValueInPool ? Number(depthData.SatsValueInPool) : 0;
  const transactions = depthData && depthData.TotalDealCount ? Number(depthData.TotalDealCount) : 0;
  const floorPrice = depthData && depthData.LowestSellPrice?.Value !== undefined ? Number(depthData.LowestSellPrice.Value) / (10 ** (depthData.LowestSellPrice?.Precision || 0)) : 0;
  const assetSymbol = depthData && depthData.Contract?.assetName?.Ticker ? depthData.Contract.assetName.Ticker : '';

  const volumeUsd = volumeBtc ? <BtcPrice btc={volumeBtc / 1e8} /> : 0;
  const marketCapUsd = marketCapBtc ? <BtcPrice btc={marketCapBtc / 1e8} /> : 0;
        
  // mintProgress and holders are not directly available in depthData, so we will remove or set defaults
  // const mintProgress = assetData.mintProgress ? assetData.mintProgress : '100%';

  return (
    <div className="bg-zinc-900 p-5 rounded-lg w-full h-64 sm:h-52">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:mt-4 text-left">
        {/* Volume */}
        <div className="border-r-1 border-b-1 sm:border-b-0 border-zinc-800 pr-4">
          <span className="text-gray-400 text-sm">{t('common.volume')}</span>
          <p className="text-zinc-200 text-lg font-bold">{volumeBtc.toLocaleString()} <span className="text-zinc-400 text-sm">{t('common.sats')}</span></p>
          <p className="text-gray-400 text-xs mb-3">${volumeUsd}</p>
        </div>

        {/* Market Cap */}
        <div className="sm:border-r-1 border-b-1 sm:border-b-0 sm:border-zinc-800 pr-4">
          <span className="text-gray-400 text-sm">{t('common.marketCap')}</span>
          <p className="text-zinc-200 text-lg font-bold">{marketCapBtc.toLocaleString()} <span className="text-zinc-400 text-sm">{t('common.sats')}</span></p>
          <p className="text-gray-400 text-xs">${marketCapUsd}</p>
        </div>

        {/* Transactions */}
        <div className="border-r-1 border-zinc-800 pr-4">
          <span className="text-gray-400 text-sm">{t('common.transactions')}</span>
          <p className="text-zinc-200 text-lg font-bold">{transactions.toLocaleString()}</p>
        </div>

        {/* Holders */}
        <div>
          <span className="text-gray-400 text-sm">{t('common.holder_count')}</span>
          <p className="text-zinc-200 text-lg font-bold">{assetData.holders.toLocaleString()}</p>
        </div>
      </div>

      {/* Mint Progress */}
      
      <div className="mt-4 mb-2 text-center">
        <span className="text-gray-400 text-sm">{t('common.mintProgress')} {assetData.mintProgress}</span> 
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