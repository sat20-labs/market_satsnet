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

    const parseDate = (d?: string) => {
      if (!d) return null as any;
      // prefer YYYY-MM-DD; fallback to MM/DD of current year
      if (/^\d{4}-\d{2}-\d{2}/.test(d)) return new Date(d + 'T00:00:00Z');
      if (/^\d{2}[-\/]\d{2}$/.test(d)) {
        const y = new Date().getUTCFullYear();
        const norm = d.replace('-', '/');
        return new Date(`${y}-${norm.replace('/', '-')}T00:00:00Z`);
      }
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? null : dt;
    };

    const sortAsc = (a: any, b: any) => {
      const da = parseDate(a.date);
      const db = parseDate(b.date);
      if (da && db) return da.getTime() - db.getTime();
      if (a.date && b.date) return String(a.date).localeCompare(String(b.date));
      return 0;
    };

    let arr: any[] = [];
    if (type === '15m') arr = [...items_15hours];
    else if (type === '24h') arr = [...items_24hours];
    else if (type === '7d') {
      const sorted = [...items_30days].sort(sortAsc);
      const last = sorted[sorted.length - 1];
      if (last?.date) {
        const lastDt = parseDate(last.date);
        if (lastDt) {
          const start = new Date(lastDt);
          start.setUTCDate(start.getUTCDate() - 6);
          arr = sorted.filter(it => {
            const dt = parseDate(it.date);
            return dt && dt >= start && dt <= lastDt;
          });
          // fallback if filter returned empty
          if (!arr.length) arr = sorted.slice(-7);
        } else {
          arr = sorted.slice(-7);
        }
      } else {
        arr = sorted.slice(-7);
      }
    }
    else if (type === '30d') arr = [...items_30days];

    if (!arr.length) {
      if (items_24hours.length) arr = [...items_24hours];
      else if (items_15hours.length) arr = [...items_15hours];
      else if (items_30days.length) arr = [...items_30days];
    }

    return arr.sort(sortAsc);
  }, [analyticsData, type]);

  const lineChartData = useMemo(() => {
    const lineArr: any[] = [];
    if (!dataSource) return [];

    const parseDate = (d?: string) => {
      if (!d) return null as any;
      if (/^\d{4}-\d{2}-\d{2}/.test(d)) return new Date(d + 'T00:00:00Z');
      if (/^\d{2}[-\/]\d{2}$/.test(d)) {
        const y = new Date().getUTCFullYear();
        const norm = d.replace('-', '/');
        return new Date(`${y}-${norm.replace('/', '-')}T00:00:00Z`);
      }
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? null : dt;
    };
    const parseDateTime = (date?: string, time?: string) => {
      const base = parseDate(date);
      if (!base) return null as any;
      if (!time) return base;
      // expect HH:mm; build ISO in UTC
      const m = time.match(/^(\d{1,2}):(\d{2})/);
      if (m) {
        const h = Number(m[1]);
        const mm = Number(m[2]);
        const dt = new Date(base);
        dt.setUTCHours(h, mm, 0, 0);
        return dt;
      }
      return base;
    };

    for (let i = 0; i < dataSource.length; i++) {
      const item = dataSource[i];
      // ts from date/time depending on current type
      let tsDate: Date | null = null;
      if (type === '15m' || type === '24h') {
        tsDate = parseDateTime(item.date, item.time);
      } else {
        tsDate = parseDate(item.date);
      }
      // fallback: use increasing index with today base
      if (!tsDate) {
        const base = new Date();
        base.setUTCHours(0, 0, 0, 0);
        base.setUTCDate(base.getUTCDate() - (dataSource.length - i));
        tsDate = base;
      }

      let label;
      if (type === '15m' || type === '24h') {
        label = item.time || item.date;
      } else if (type === '7d' || type === '30d') {
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
      const valueFormatted = value ? `${value} sats` : '-';
      lineArr.push({
        ts: tsDate, // time scale key
        label,
        value,
        valueFormatted,
        count,
        realValue,
        volume,
      });
    }

    return lineArr.sort((a, b) => (a.ts as Date).getTime() - (b.ts as Date).getTime());
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
    <div className="w-full h-full bg-zinc-900/50 border-1 border-zinc-700/50 rounded-lg flex flex-col">
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
      <div className="p-2 max-w-[100rem] flex-1 min-h-0">
        <ContentLoading loading={isLoading}>
          <div className="flex flex-col h-full">
            <div className="flex justify-end items-center mb-2">
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
            {/* Chart takes the remaining height */}
            <div className="flex-1 min-h-0">
              <div className="h-full flex flex-col md:flex-row justify-between items-stretch gap-1 bg-no-repeat bg-center bg-[url('/bg_satswap.png')]">
                <OrderLineChart data={lineChartData || []} mode={type as any} />
              </div>
            </div>
          </div>
        </ContentLoading>
      </div>
    </div>
  );
};


