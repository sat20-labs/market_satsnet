'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { OrderLineChart } from '@/components/chart/OrderLineChart';
import { ContentLoading } from '@/components/ContentLoading';
import { ButtonRefresh } from '@/components/buttons/ButtonRefresh';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AssetLogo from '@/components/AssetLogo';
import { getAsset } from '@/api/market';
import Link from 'next/link';
import { t } from 'i18next';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@iconify/react';

interface ChartModuleProps {
  ticker: string;
  asset: string;
  analyticsData?: any;
  isLoading?: boolean;
  refresh?: () => void;
  isRefreshing?: boolean;
  chartHeight?: string; // NEW: optional height classes for chart container
}

export const ChartModule = ({
  ticker,
  asset,
  analyticsData,
  isLoading = false,
  refresh,
  isRefreshing = false,
  chartHeight = '', // default empty so existing layouts unaffected
}: ChartModuleProps) => {
  const [type, setType] = useState('15m');
  console.log('analyticsData', analyticsData);

  const dataSource = useMemo(() => {
    if (!analyticsData) return [];
    const items_24hours = analyticsData?.items_24hours?.filter(Boolean) || [];
    const items_30days = analyticsData?.items_30days?.filter(Boolean) || [];
    const items_15hours = analyticsData?.items_15hours?.filter(Boolean) || [];

    // 排序函数：先按 date 升序，再按 time 升序
    const sortAsc = (a: any, b: any) => {
      if (a.date && b.date) {
        if (a.date < b.date) return -1;
        if (a.date > b.date) return 1;
        // date 相同，比较 time
        if (a.time && b.time) {
          if (a.time < b.time) return -1;
          if (a.time > b.time) return 1;
        }
      }
      return 0;
    };

    if (type === '15m') {
      return [...items_15hours].sort(sortAsc);
    } else if (type === '24h') {
      return [...items_24hours].sort(sortAsc);
    } else if (type === '7d') {
      return [...items_30days].sort(sortAsc).slice(-7);
    } else if (type === '30d') {
      return [...items_30days].sort(sortAsc);
    }
    return [];
  }, [analyticsData, type]);

  const lineChartData = useMemo(() => {
    const lineArr: any[] = [];
    if (!dataSource) return [];

    // 先抽取原始数据（不做填补）
    const rawPoints = dataSource.map((item: any) => {
      let label;
      if (type === '15m' || type === '24h') {
        label = item.time || item.date;
      } else if (type === '7d' || type === '30d') {
        label = item.date?.replace(/^[0-9]{4}-/, '').replace('-', '/');
      }
      const rawPrice = item.avg_price
        ? Number(item.avg_price.Value) / Math.pow(10, Number(item.avg_price.Precision))
        : 0;
      const volume = item.volume || 0;
      const count = item.order_count;
      return { item, label, rawPrice, volume, count };
    });

    // 找到第一个有效价格（有成交量且价格>0，或者价格>0 任选其一）
    const firstValid = rawPoints.find(p => (p.volume > 0 && p.rawPrice > 0) || p.rawPrice > 0);
    if (!firstValid) {
      // 全部无有效价格，直接返回原样（全部基线）
      return rawPoints.map(p => ({
        label: p.label,
        value: 0,
        valueFormatted: '- ',
        count: p.count,
        realValue: 0,
        volume: p.volume,
        filled: false,
      }));
    }

    const firstPrice = firstValid.rawPrice; // 用于前置回填
    let lastValidPrice = firstPrice;

    rawPoints.forEach((p) => {
      const realValue = p.rawPrice; // 真实原始价格
      let displayPrice = p.rawPrice;
      let filled = false;

      if ((p.volume === 0 || !p.rawPrice || p.rawPrice <= 0)) {
        // 当前点无有效成交 -> 使用最近一次有效价
        displayPrice = lastValidPrice;
        filled = true;
      } else if (p.rawPrice > 0) {
        lastValidPrice = p.rawPrice;
      }

      lineArr.push({
        label: p.label,
        value: displayPrice,
        valueFormatted: displayPrice ? `${displayPrice} sats` : '- ',
        count: p.count,
        realValue, // 保留原始值
        volume: p.volume,
        filled, // 标记是否填补
      });
    });

    // 处理前部：如果最前面的若干点在第一次有效价之前且被填补逻辑保持为 firstPrice
    // 上面逻辑已覆盖（因为我们将 lastValidPrice 初始化为 firstPrice），无需额外处理。

    return lineArr;
  }, [dataSource, type]);

  const types = [
    {
      label: '15m',
      value: '15m',
    },
    {
      label: '24h',
      value: '24h',
    },
    {
      label: '7d',
      value: '7d',
    },
    {
      label: '30d',
      value: '30d',
    },
  ];
  const protocol = asset?.split(':')[0] || '';

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
    return s.length > 120 ? s.slice(0, 120) + '...' : s;
  }, [description]);

  return (
    <div className="w-full h-full bg-zinc-900/50 border-1 border-zinc-700/50 rounded-lg">
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <div className="flex items-center">
            <h2 className="flex justify-center items-center text-lg font-bold text-zinc-400 ml-4 py-4 gap-2">
              <Avatar className="w-10 h-10 text-xl text-gray-300 font-medium bg-zinc-700">
                <AssetLogo protocol={protocol} ticker={ticker} className="w-10 h-10" />
                <AvatarFallback>
                  {ticker?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className='text-zinc-300 text-xs sm:text-xl uppercase'>{ticker}</span>
            </h2>
            <Button variant="outline" size="sm" className="ml-2">
              <Link href={`/ticker/detail/?asset=${asset}`} prefetch className="text-zinc-400 text-xs sm:text-sm">
                Detail
              </Link>
            </Button>

            {/* NEW: social icons next to View Info */}
            {(twitter || telegram || discord) && (
              <div className="ml-2 flex items-center gap-2">
                {website && (
                  <Link
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Website"
                    className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-md border border-zinc-700 text-zinc-400 hover:bg-purple-500 hover:text-zinc-900 transition-colors"
                  >
                    <Icon icon="fa7-brands:weebly" className="w-4 h-4 sm:w-6 sm:h-6" />
                  </Link>
                )}
                {twitter && (
                  <Link
                    href={twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Twitter"
                    className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-md border border-zinc-700 text-zinc-400 hover:bg-purple-500 hover:text-zinc-900 transition-colors"
                  >
                    <Icon icon="fa7-brands:x-twitter" className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Link>
                )}
                {telegram && (
                  <Link
                    href={telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Telegram"
                    className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-md border border-zinc-700 text-zinc-400 hover:bg-purple-500 hover:text-zinc-900 transition-colors"
                  >
                    <Icon icon="mdi:telegram" className="w-5 h-5 sm:w-6 sm:h-6" />
                  </Link>
                )}

                {discord && (
                  <Link
                    href={discord}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Discord"
                    className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9  rounded-md border border-zinc-700 text-indigo-400 hover:bg-indigo-400 hover:text-zinc-900 transition-colors"
                  >
                    <Icon icon="fa7-brands:discord" className="w-4 h-4 sm:w-6 sm:h-6" />
                  </Link>
                )}
              </div>
            )}
            <span></span>
          </div>
          {/* second line: description (30 chars, ellipsis). Hover to show full */}
          {shortDesc && (
            <div className="ml-4 -mt-2 mb-2 text-sm text-zinc-500" title={description}>
              {shortDesc}
            </div>
          )}
        </div>

        {/* <div className="mr-2">
          <ButtonRefresh
            onRefresh={refresh}
            loading={isRefreshing}
            className="bg-zinc-800/50"
          />
        </div> */}
      </div>
      <div className="p-2 max-w-[100rem]">
        <ContentLoading loading={isLoading}>
          <div className="flex justify-end items-center mb-4">
            <div className="flex items-center mr-1 sm:mr-6 gap-2">
              {types.map((item) => (
                <Button
                  key={item.value}
                  variant={type === item.value ? 'default' : 'outline'}
                  className={type === item.value ? 'btn-gradient' : 'bg-zinc-700 hover:text-zinc-200'}
                  onClick={() => setType(item.value)}
                  size="sm"
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
          {/* Wrapped chart area with mb-6 and changed items-center -> items-stretch */}
          <div className="mb-6">
            <div className={`flex flex-col md:flex-row justify-between items-stretch gap-1 bg-no-repeat bg-center bg-[url('/bg_satswap.png')] ${chartHeight}`}>
              <OrderLineChart data={lineChartData || []} chartHeight={chartHeight} timeFrame={type} />
            </div>
          </div>
        </ContentLoading>
      </div>
    </div>
  );
};


