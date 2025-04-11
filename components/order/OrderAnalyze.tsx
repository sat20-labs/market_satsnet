'use client';

import { useMemo, useEffect, useRef, useState, use } from 'react';
import { ButtonGroup, Button, RadioGroup, Radio } from '@nextui-org/react';
import { getAssetsAnalytics } from '@/api';
import { Chart } from '@antv/g2';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { OrderPieChart } from './OrderPieChart';
import { OrderLineChart } from './OrderLineChart';
import useSWR from 'swr';
import { useCommonStore } from '@/store';
import { ContentLoading } from '@/components/ContentLoading';

interface OrderAnalyzeProps {
  assets_name: string;
  assets_type: string;
}
export const OrderAnalyze = ({
  assets_name,
  assets_type,
}: OrderAnalyzeProps) => {
  const [type, setType] = useState('24h');
  const [valueType, setValueType] = useState('avg_price');
  const { network } = useReactWalletStore();
  const { chain } = useCommonStore();
  const swrKey = useMemo(() => {
    return `getAssetsAnalytics-${assets_name}-${assets_type}-${chain}-${network}`;
  }, [assets_name, network, assets_type, chain]);

  const { data, isLoading, mutate } = useSWR(swrKey, () =>
    getAssetsAnalytics({
      assets_name,
      assets_type,
      hide_locked: true,
    }),
  );
  const dataSource = useMemo(() => {
    if (type === '24h') {
      return data?.data?.items_24hours?.filter(Boolean) || [];
    } else if (type === '7d') {
      return data?.data?.items_30days?.slice(-7)?.filter(Boolean) || [];
    } else if (type === '30d') {
      return data?.data?.items_30days?.filter(Boolean) || [];
    }
  }, [data, type, valueType]);
  const lineChartData = useMemo(() => {
    const lineArr: any[] = [];
    console.log('dataSource', dataSource);
    for (let i = 0; i < dataSource.length; i++) {
      const item = dataSource[i];
      const label =
        type === '24h' ? item.time : item.date?.replace(/^\d{4}-/, '');
      let value = item.avg_price;
      const volume = item.volume;
      let realValue = value;
      if (i > 0 && (value === undefined || value <= 0)) {
        console.log(value);

        value = lineArr[i - 1].value;
      }
      const count = item.order_count;
      lineArr.push({ label, value, count, realValue, volume });
    }
    return lineArr;
  }, [dataSource, valueType, type]);

  const marketData = useMemo(() => {
    let sat20_count = 0;
    let me_count = 0;
    let okx_count = 0;
    let sat20_volume = 0;
    let me_volume = 0;
    let okx_volume = 0;
    for (const item of dataSource) {
      if (item.date) {
        sat20_count += item.sat20.order_count;
        me_count += item.magic_eden.order_count;
        okx_count += item.okx.order_count;
        sat20_volume += item.sat20.volume;
        me_volume += item.magic_eden.volume;
        okx_volume += item.okx.volume;
      }
    }
    return [
      {
        id: 'sat20',
        label: 'SAT20Market',
        count: sat20_count,
        volume: sat20_volume,
      },
      {
        id: 'me',
        label: 'Magiceden',
        count: me_count,
        volume: me_volume,
      },
      {
        id: 'okx',
        label: 'OKX',
        count: okx_count,
        volume: okx_volume,
      },
    ];
  }, [dataSource]);

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
          <ButtonGroup>
            {types.map((item) => (
              <Button
                key={item.value}
                color={type === item.value ? 'primary' : 'default'}
                onClick={() => setType(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </ButtonGroup>
        </div>
        {/* <div className="flex justify-end items-center mb-2">
        <RadioGroup
          onValueChange={setValueType}
          orientation="horizontal"
          value={valueType}
        >
          <Radio value="volume">Volume</Radio>
          <Radio value="aavg_pricevg">Avg Price</Radio>
        </RadioGroup>
      </div> */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-2">
          <OrderLineChart data={lineChartData} />
          <OrderPieChart data={marketData} />
        </div>
      </ContentLoading>
    </div>
  );
};
