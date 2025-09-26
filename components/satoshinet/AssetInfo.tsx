'use client';

import { BtcPrice } from "../BtcPrice";
import { useTranslation } from 'react-i18next';
import { formatLargeNumber } from "@/utils";
import { getValueFromPrecision } from "@/utils";

interface AssetInfoProps {
  depthData: any;
  holders: any;
  tickerInfo: any; // Allow any type for assetData to re-introduce it
}

export const AssetInfo = ({ depthData, tickerInfo, holders }: AssetInfoProps) => {
  const { t } = useTranslation();
  console.log('depthData', depthData);
  let mintProgress = tickerInfo?.totalMinted > 0 && tickerInfo?.maxSupply > 0
    ? `${Math.floor((tickerInfo.totalMinted / tickerInfo.maxSupply) * 100)}%`
    : '100%';
  if (mintProgress === '0%' || isNaN(Number(mintProgress))) {
    mintProgress = '100%';
  }

  const totalVolumeBtc = depthData?.TotalDealSats ?? 0;
  const volumeBtc = depthData && depthData['24hour']?.volume ? Number(depthData['24hour'].volume) : 0;
  const lastPrice = depthData && depthData.LastDealPrice ? getValueFromPrecision(depthData.LastDealPrice).value : 0;
  const marketCapBtc = Math.floor(tickerInfo.maxSupply * lastPrice);
  const transactions = depthData?.TotalDealCount ?? 0;

  const totalVolumeUsd = totalVolumeBtc ? <BtcPrice btc={totalVolumeBtc / 1e8} /> : 0;
  const volumeUsd = volumeBtc ? <BtcPrice btc={volumeBtc / 1e8} /> : 0;
  console.log('marketCapBtc', marketCapBtc);

  const marketCapUsd = marketCapBtc ? <BtcPrice btc={marketCapBtc / 1e8} /> : 0;

  return (
    <div className="bg-zinc-900 mt-4 p-4 rounded-lg w-full h-90 sm:h-40 border-none sm:border-1 border-zinc-700">
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 sm:mt-1 text-left">
        {/* Volume */}
        <div className="sm:border-r-1 border-b-1 sm:border-b-0 border-zinc-800 pr-4">
          <span className="text-gray-400 text-sm">{t('common.volume')}</span>
          <p className="text-zinc-200 text-lg font-bold gap-1">{formatLargeNumber(volumeBtc / 1e8)} <span className="text-zinc-400 text-sm">{t('common.btc')}</span></p>
          <p className="text-gray-400 text-xs mb-3">${volumeUsd}</p>
        </div>

        {/* Total Deal Assets  */}
        <div className="sm:border-r-1 border-b-1 sm:border-b-0 border-zinc-800 pr-4">
          <span className="text-gray-400 text-sm">{t('common.tx_total_volume')}</span>
          <p className="text-zinc-200 text-lg font-bold gap-1">{formatLargeNumber(totalVolumeBtc / 1e8)} <span className="text-zinc-400 text-sm">{t('common.btc')}</span></p>
          <p className="text-gray-400 text-xs mb-3">${totalVolumeUsd}</p>
        </div>

        {/* Market Cap */}
        <div className="sm:border-r-1 border-b-1 sm:border-b-0 border-zinc-800  pb-2 sm:pb-0 pr-4">
          <span className="text-gray-400 text-sm">{t('common.marketCap')}</span>
          <p className="text-zinc-200 text-lg font-bold gap-1">{formatLargeNumber(marketCapBtc / 1e8)} <span className="text-zinc-400 text-sm">{t('common.btc')}</span></p>
          <p className="text-gray-400 text-xs">${marketCapUsd}</p>
        </div>

        {/* Max Supply */}
        <div className="sm:border-r-1 border-b-1 sm:border-b-0 border-zinc-800 pr-4">
          <span className="text-gray-400 text-sm">{t('common.max_supply')}</span>
          <p className="text-zinc-200 text-lg font-bold">{formatLargeNumber(tickerInfo.maxSupply)}</p>
        </div>

        {/* Transactions */}
        <div className="sm:border-r-1 border-b-1 sm:border-b-0 border-zinc-800 pb-4 sm:pb-0 pr-4">
          <span className="text-gray-400 text-sm">{t('common.transactions')}</span>
          <p className="text-zinc-200 text-lg font-bold">{transactions.toLocaleString()}</p>
        </div>

        {/* Holders */}
        <div className="border-b-1 sm:border-b-0 border-zinc-800 pb-4 sm:pb-0 pr-4">
          <span className="text-gray-400 text-sm">{t('common.holder_count')}</span>
          <p className="text-zinc-200 text-lg font-bold">{holders.total}</p>
        </div>
      </div>

      {/* Mint Progress */}

      <div className="mt-3 sm:mt-0 mb-2 text-center">
        <span className="text-gray-400 text-sm">{t('common.mintProgress')} {mintProgress}</span>
        <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
          <div
            className="bg-green-500 h-2 rounded-full mb-2"
            style={{ width: mintProgress }}
          ></div>
        </div>
      </div>
    </div>
  );
};