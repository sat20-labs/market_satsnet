import { useMemo } from 'react';
import { getValueFromPrecision } from '@/utils';
import { useTranslation } from 'react-i18next';
import { ButtonRefresh } from '@/components/buttons/ButtonRefresh';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { getAsset, getContractPriceChange } from '@/api/market';
import AssetLogo from '@/components/AssetLogo';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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

  // Handle status 101 case - use Contract data for startup message
  const isPoolStartupRequired = swapData?.status === 101;
  const contractAssetAmt = useMemo(() => {
    if (isPoolStartupRequired && swapData?.Contract?.assetAmt) {
      return Number(swapData.Contract.assetAmt);
    }
    return 0;
  }, [isPoolStartupRequired, swapData?.Contract?.assetAmt]);

  const contractSatValue = useMemo(() => {
    if (isPoolStartupRequired && swapData?.Contract?.satValue) {
      return Number(swapData.Contract.satValue);
    }
    return 0;
  }, [isPoolStartupRequired, swapData?.Contract?.satValue]);

  // For normal pool display (non-101 status)
  const assetAmt = useMemo(() => {
    const precisionResult = getValueFromPrecision(swapData?.AssetAmtInPool);
    console.log('AssetInfoCard - swapData?.AssetAmtInPool:', swapData?.AssetAmtInPool);
    console.log('AssetInfoCard - getValueFromPrecision result:', precisionResult);
    return parseFloat(precisionResult?.value || '0');
  }, [swapData?.AssetAmtInPool]);
  const satValue = useMemo(() => swapData?.SatsValueInPool || 0, [swapData?.SatsValueInPool]);

  const displayName = useMemo(() => {
    if (protocol?.toLowerCase() === 'brc20' && tickerInfo?.displayName) {
      return tickerInfo.displayName;
    }
    return ticker;
  }, [protocol, tickerInfo?.displayName, ticker]);

  const currentPrice = useMemo(() => {
    // 使用池子数据计算价格，不使用接口返回的LastDealPrice
    if (satValue && assetAmt && assetAmt > 0) {
      const calculatedPrice = satValue / assetAmt;
      return calculatedPrice.toFixed(10);
    }
    return '--';
  }, [satValue, assetAmt]);

  // NEW: fetch asset metadata for social links in header
  const { data: assetMetaResp } = useQuery({
    queryKey: ['assetMeta', asset],
    queryFn: () => getAsset(asset),
    enabled: !!asset,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const assetMeta: any = assetMetaResp?.data || assetMetaResp || {};
  const website = assetMeta?.website as string | undefined;
  const twitter = assetMeta?.twitter as string | undefined;
  const telegram = assetMeta?.telegram as string | undefined;
  const discord = assetMeta?.discord as string | undefined;
  const description = assetMeta?.description as string | undefined;
  const shortDesc = useMemo(() => {
    if (!description) return '';
    const s = description.trim();
    return s.length > 240 ? s.slice(0, 240) + '...' : s;
  }, [description]);

  return (
    <div className="flex items-center gap-3 mb-4 pb-2">
      <div className="bg-zinc-900 rounded-xl p-4 flex flex-col text-sm w-full border border-zinc-700 shadow-lg relative">
        {/* <div className="absolute top-2 sm:top-5 right-2 sm:right-4 z-10">
          <ButtonRefresh
            onRefresh={refresh}
            loading={isRefreshing}
            className="bg-zinc-800/50"
          />
        </div> */}
        <div className="flex items-center mb-2 gap-4">
          <div className="w-11 h-11 rounded-full bg-zinc-700 flex items-center justify-start text-zinc-300 text-xl font-bold">
            {/* {ticker.charAt(0).toUpperCase()} */}
            <div className='text-base'>
              <Avatar className="w-12 h-12 text-xl text-gray-300 font-medium bg-zinc-700">
                <AssetLogo protocol={protocol} ticker={ticker} className="w-12 h-12" />
                <AvatarFallback>
                  {ticker?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

          </div>
          <div className=''>
            <div className="flex justify-start items-center text-zinc-400 font-semibold text-sm sm:text-base">
              <div>{displayName}</div>
              {/* NEW: social icons next to View Info */}
              {(twitter || telegram || discord) && (
                <div className="ml-4 flex items-center gap-2">
                  {website && (
                    <Link
                      href={website}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Website"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-zinc-700 text-zinc-400 hover:bg-purple-500 hover:text-zinc-900 transition-colors"
                    >
                      <Icon icon="fa7-brands:weebly" className="w-4 h-4" />
                    </Link>
                  )}
                  {twitter && (
                    <Link
                      href={twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Twitter"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-zinc-700 text-zinc-400 hover:bg-purple-500 hover:text-zinc-900 transition-colors"
                    >
                      <Icon icon="fa7-brands:x-twitter" className="w-4 h-4" />
                    </Link>
                  )}
                  {telegram && (
                    <Link
                      href={telegram}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Telegram"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-zinc-700 text-zinc-400 hover:bg-purple-500 hover:text-zinc-900 transition-colors"
                    >
                      <Icon icon="mdi:telegram" className="w-5 h-5" />
                    </Link>
                  )}

                  {discord && (
                    <Link
                      href={discord}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Discord"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-zinc-700 text-indigo-400 hover:bg-indigo-400 hover:text-zinc-900 transition-colors"
                    >
                      <Icon icon="fa7-brands:discord" className="w-4 h-4" />
                    </Link>
                  )}

                </div>
              )}
            </div>

            <p className="text-zinc-500 mt-2 text-xs gap-2">
              {t('common.contractAddress')}：<span className="text-blue-400 mr-2">{contractUrl.slice(0, 8)}...{contractUrl.slice(-4)}</span>
              {/* {t('common.protocol')}：{protocol} */}
            </p>

          </div>
        </div>
        {shortDesc && (
          <div className="ml-2 mb-2 text-sm text-zinc-500" title={description}>
            {shortDesc}
            <Button variant="outline" size="sm" className="ml-2">
              <Link href={`/ticker/detail/?asset=${asset}`} prefetch className="text-zinc-400  text-xs sm:text-sm">
                Detail
              </Link>
            </Button>
          </div>
        )}
        <div className="text-xs sm:text-sm pt-2 text-zinc-500 border-t border-zinc-800 space-y-2">
          {isPoolStartupRequired ? (
            // Status 101: Show startup message
            <div className="flex justify-start items-center">
              <span className="text-orange-400 font-medium">
                {t('common.poolStartupRequired', {
                  assetAmount: contractAssetAmt?.toLocaleString(),
                  ticker: displayName,
                  satsAmount: contractSatValue?.toLocaleString()
                })}
              </span>
            </div>
          ) : (
            // Normal status: Show pool info
            <>
              <div className="flex justify-start items-start">
                <span className="text-zinc-500">{t('common.poolAssetInfo')}：</span>
                <div className="text-left text-zinc-500 space-y-1">
                  <p><span className="font-bold mr-2">{assetAmt?.toLocaleString()}</span> {displayName}</p>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}