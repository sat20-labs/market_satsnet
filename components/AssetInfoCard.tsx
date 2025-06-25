import { useMemo } from 'react';
import { getValueFromPrecision } from '@/utils';
import { useTranslation } from 'react-i18next';
import { ButtonRefresh } from '@/components/buttons/ButtonRefresh';

interface AssetInfoCardProps {
  asset: string;
  ticker: string;
  contractUrl: string;
  tickerInfo: any;
  protocol: string;
  swapData: any;
  refresh: () => void;
  isRefreshing: boolean;
}

export function AssetInfoCard({ 
  asset, 
  ticker, 
  contractUrl, 
  tickerInfo, 
  protocol,
  swapData,
  refresh,
  isRefreshing
}: AssetInfoCardProps) {
  const { t } = useTranslation();
  const assetAmt = useMemo(() => getValueFromPrecision(swapData?.AssetAmtInPool)?.value, [swapData?.AssetAmtInPool]);
  const satValue = useMemo(() => swapData?.SatsValueInPool || 0, [swapData?.SatsValueInPool]);
  const currentPrice = useMemo(() => getValueFromPrecision(swapData?.LastDealPrice)?.formatted, [swapData?.LastDealPrice]);

  return (
    <div className="flex items-center gap-3 mb-4 pb-2">
      <div className="bg-zinc-900 rounded-xl p-4 flex flex-col text-sm w-full border border-zinc-700 shadow-lg relative">
        <div className="absolute top-5 right-4 z-10">
          <ButtonRefresh
            onRefresh={refresh}
            loading={isRefreshing}
            className="bg-zinc-800/50"
          />
        </div>
        <div className="flex items-center mb-2 gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-700 flex items-center justify-center text-zinc-300 text-xl font-bold">
            {ticker.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-zinc-400 font-semibold text-lg">{ticker}</p>
            <p className="text-zinc-500 text-xs gap-2">
              {t('common.contractAddress')}：<span className="text-blue-400 mr-2">{contractUrl.slice(0, 8)}...{contractUrl.slice(-4)}</span>
              {t('common.protocol')}：{protocol}
            </p>
          </div>
        </div>
        <div className="text-sm pt-2 text-zinc-500 border-t border-zinc-800 space-y-2">
          <div className="flex justify-start items-start">
            <span className="text-zinc-500">{t('common.poolAssetInfo')}：</span>
            <div className="text-left text-zinc-500 space-y-1">
              <p><span className="font-bold mr-2">{assetAmt?.toLocaleString()}</span> {ticker}</p>
              <p><span className="font-bold mr-2">{satValue?.toLocaleString()}</span> sats</p>
            </div>
          </div>
          <div className="flex justify-start items-center gap-1">
            <span className="text-zinc-500">{t('common.currentPrice')}：</span>
            <span className="text-green-600 font-bold">
              ~ {currentPrice || '--'}
            </span>
            sats
          </div>
        </div>
      </div>
    </div>
  );
}