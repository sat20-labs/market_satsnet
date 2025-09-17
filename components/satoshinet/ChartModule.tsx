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
}

export const ChartModule = ({
  ticker,
  asset,
  analyticsData,
  isLoading = false,
  refresh,
  isRefreshing = false
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
    for (let i = 0; i < dataSource.length; i++) {
      const item = dataSource[i];
      let label;
      if (type === '15m') {
        // 对于15分钟数据，显示时间格式为 HH:MM
        label = item.time || item.date;
      } else if (type === '24h') {
        label = item.time;
      } else {
        label = item.date?.replace(/^[0-9]{4}-/, '').replace('-', '/');
      }

      let value = item.avg_price
        ? Number(item.avg_price.Value) / Math.pow(10, Number(item.avg_price.Precision))
        : 0;
      const volume = item.volume;
      let realValue = value;
      if (i > 0 && (value === undefined || value <= 0)) {
        value = lineArr[i - 1]?.value;
      }
      const count = item.order_count;
      // Add a formatted value with the "sats" suffix
      const valueFormatted = value ? `${value} sats` : '-';
      lineArr.push({
        label,
        value,
        valueFormatted,
        count,
        realValue,
        volume
      });
    }


    // console.log('lineArr', lineArr);

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
              <span className='text-zinc-300 text-2xl'>{ticker}</span>
            </h2>
            <Button variant="outline" className="ml-2">
              <Link href={`/ticker/detail/?asset=${asset}`} prefetch className="text-zinc-400">
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
                    className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-zinc-700 text-zinc-400 hover:bg-purple-500 hover:text-zinc-900 transition-colors"
                  >
                    <Icon icon="fa7-brands:weebly" className="w-6 h-6" />
                  </Link>
                )}
                {twitter && (
                  <Link
                    href={twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Twitter"
                    className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-zinc-700 text-zinc-400 hover:bg-purple-500 hover:text-zinc-900 transition-colors"
                  >
                    <Icon icon="fa7-brands:x-twitter" className="w-5 h-5" />
                  </Link>
                )}
                {telegram && (
                  <Link
                    href={telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Telegram"
                    className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-zinc-700 text-zinc-400 hover:bg-purple-500 hover:text-zinc-900 transition-colors"
                  >
                    <Icon icon="mdi:telegram" className="w-6 h-6" />
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
                    <Icon icon="fa7-brands:discord" className="w-5 h-5" />
                  </Link>
                )}
              </div>
            )}
            <span></span>
          </div>
          {/* second line: description (30 chars, ellipsis). Hover to show full */}
          {shortDesc && (
            <div className="ml-4 -mt-2 mb-2 text-sm text-zinc-400" title={description}>
              {shortDesc}
            </div>
          )}
        </div>

        <div className="mr-2">
          <ButtonRefresh
            onRefresh={refresh}
            loading={isRefreshing}
            className="bg-zinc-800/50"
          />
        </div>
      </div>
      <div className="p-2 max-w-[100rem]">
        <ContentLoading loading={isLoading}>
          <div className="flex justify-end items-center mb-4">
            <div className="flex items-center mr-6 gap-2">
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
          <div className="flex flex-col md:flex-row justify-between items-center gap-2 bg-no-repeat bg-center bg-[url('/bg_satswap.png')]">
            <OrderLineChart data={lineChartData || []} />
          </div>
        </ContentLoading>
      </div>
    </div>
  );
};


