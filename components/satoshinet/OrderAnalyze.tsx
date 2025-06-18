'use client';

import { useMemo, useEffect, useRef, useState, use } from 'react';
import { Button } from '@/components/ui/button';

import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { marketApi } from '@/api';
import { OrderLineChart } from '@/components/chart/OrderLineChart';
import { useQuery } from '@tanstack/react-query';
import { useCommonStore } from '@/store';
import { ContentLoading } from '@/components/ContentLoading';

interface OrderAnalyzeProps {
  contractURL: string;
}
export const OrderAnalyze = ({
  contractURL,
}: OrderAnalyzeProps) => {
  const [type, setType] = useState('24h');
  const { network } = useReactWalletStore();
  const { chain } = useCommonStore();

  const queryKey = useMemo(
    () => ['getContractAnalytics', contractURL, chain, network],
    [contractURL, chain, network],
  );

  const { data: queryResult, isLoading } = useQuery({
    queryKey: queryKey,
    queryFn: () =>
      marketApi.getContractAnalytics(
        contractURL,
      ),
    enabled: !!contractURL,
  });

  const data = JSON.parse(queryResult?.status || '{}');

  console.log('OrderAnalyze', data);

  const dataSource = useMemo(() => {
    const items_24hours = data?.items_24hours?.filter(Boolean) || [];
    const items_30days = data?.items_30days?.filter(Boolean) || [];

    if (type === '24h') {
      return items_24hours;
    } else if (type === '7d') {
      return items_30days?.slice(-7);
    } else if (type === '30d') {
      return items_30days;
    }
    return [];
  }, [data, type]);

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
        valueFormatted, // Add the formatted value with "sats"
        count,
        realValue,
        volume
      });
    }
    return lineArr;
  }, [dataSource, type]);

  // const marketData = useMemo(() => {
  //   let sat20_count = 0;
  //   let me_count = 0;
  //   let okx_count = 0;
  //   let sat20_volume = 0;
  //   let me_volume = 0;
  //   let okx_volume = 0;
  //   if (!dataSource) return [];
  //   for (const item of dataSource) {
  //     if (item.date) {
  //       sat20_count += item.sat20.order_count;
  //       sat20_volume += item.sat20.volume;
  //     }
  //   }
  //   return [
  //     {
  //       id: 'sat20',
  //       label: 'SAT20Market',
  //       count: sat20_count,
  //       volume: sat20_volume,
  //     },
  //     {
  //       id: 'me',
  //       label: 'Magiceden',
  //       count: me_count,
  //       volume: me_volume,
  //     },
  //     {
  //       id: 'okx',
  //       label: 'OKX',
  //       count: okx_count,
  //       volume: okx_volume,
  //     },
  //   ];
  // }, [dataSource]);

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
    <div className="p-2  max-w-[100rem]">
      <ContentLoading loading={isLoading}>
        <div className="flex justify-end items-center mb-4">
          <div className="flex items-center gap-2">
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
        <div className="flex flex-col md:flex-row justify-between items-center gap-2  bg-no-repeat bg-center bg-[url('/bg_satswap.png')]">
          <OrderLineChart data={lineChartData || []} />
          {/* <OrderPieChart data={marketData || []} /> */}
        </div>
      </ContentLoading>
    </div>
  );
};
