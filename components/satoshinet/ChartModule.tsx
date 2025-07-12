'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { OrderLineChart } from '@/components/chart/OrderLineChart';
import { ContentLoading } from '@/components/ContentLoading';
import { ButtonRefresh } from '@/components/buttons/ButtonRefresh';
import Link from 'next/link';

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
  const [type, setType] = useState('24h');

  const dataSource = useMemo(() => {
    if (!analyticsData) return [];
    const items_24hours = analyticsData?.items_24hours?.filter(Boolean) || [];
    const items_30days = analyticsData?.items_30days?.filter(Boolean) || [];

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

    if (type === '24h') {
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
      const label =
        type === '24h' ? item.time : item.date?.replace(/^[0-9]{4}-/, '').replace('-', '/');
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
    return lineArr;
  }, [dataSource, type]);

  const types = [
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

  return (
    <div className="w-full h-full bg-zinc-900/50 border-1 border-zinc-700/50 rounded-lg">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <h2 className="text-lg font-bold text-zinc-400 ml-4 py-4">Chart for {ticker}</h2>
          <Button variant="outline" className="ml-4">
            <Link href={`/ticker/detail/?asset=${asset}`} prefetch className="text-zinc-400">
              View Info
            </Link>
          </Button>
        </div>

        <div className="mr-4">
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


