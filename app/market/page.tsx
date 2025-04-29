'use client';

import { marketApi } from '@/api';
import { useQuery } from '@tanstack/react-query';
import type { Key as ReactKey } from 'react';
import type { Key } from '@react-types/shared';
import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, useSearchParams } from 'next/navigation';
import { SortDropdown } from '@/components/SortDropdown';
import { getLabelForAssets } from '@/utils';
import { useCommonStore } from '@/store';
import { HomeTypeTabs } from '@/components/market/HomeTypeTabs';
import { NameMarketNav } from '@/components/market/NameMarketNav';

import { BtcPrice } from "@/components/BtcPrice";

import { satsToBitcoin, formatBtcAmount, formatLargeNumber } from '@/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { Loader2, ArrowUp, ArrowDown } from 'lucide-react';

interface AssetItem {
  assets_name: string;
  assets_type: string;
  nickname?: string;
  logo?: string;
  lowest_price: number;
  lowest_price_change: number;
  tx_total_volume: number;
  market_cap: number;
  tx_order_count: number;
  holder_count: number;
  onsell_order_count: number;
}

type SortDirection = 'ascending' | 'descending';

type StrictSortDescriptor = {
  column: Key;
  direction: SortDirection;
};

export default function Market() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();
  const { chain, network } = useCommonStore();
  const paramType = params.get('type') || 'ticker';
  const paramProtocol = params.get('protocol') || 'ordx';
  const [type, setType] = useState<string>(paramType);
  const [protocol, setProtocol] = useState<string>(paramProtocol);
  const [interval, setInterval] = useState<number>(1);
  const [sortField, setSortField] = useState<Key>('assets_name');
  const [sortOrder, setSortOrder] = useState<0 | 1>(0);
  const [labelMap, setLabelMap] = useState<Record<string, string>>({});

  const sortList = useMemo(
    () => [
      { label: t('common.time_1D'), value: 1 },
      { label: t('common.time_7D'), value: 7 },
      { label: t('common.time_30D'), value: 30 },
    ],
    [t],
  );

  const [sortDescriptor, setSortDescriptor] = useState<StrictSortDescriptor>({
    column: 'assets_name',
    direction: 'ascending',
  });

  const queryKey = [
    'topAssets',
    chain,
    network,
    protocol,
    type,
    interval,
    sortField,
    sortOrder,
  ];

  const {
    data: queryData,
    error,
    isLoading,
  } = useQuery<any[], Error>({
    queryKey,
    queryFn: async () => {
      const response = await marketApi.getTopAssets({
        assets_protocol: protocol,
        interval,
        top_count: 200,
        top_name: '',
        sort_field: String(sortField),
        sort_order: sortOrder,
      });
      return response?.data || [];
    },
    enabled: !!chain && !!network,
  });

  const onSortChange = (i?: number) => {
    if (typeof i === 'number') {
      setInterval(i);
    }
  };

  const list = useMemo(() => {
    return queryData?.map((item) => {
      const key = getLabelForAssets(item.assets_name)
      return {
        ...item,
        assets_name: key,
      };
    }) || [];
  }, [queryData]);

  useEffect(() => {
    if (!list.length || typeof window === 'undefined' || !window.sat20) return;
    let isMounted = true;
    const fetchLabels = async () => {
      const entries = await Promise.all(
        list.map(async (item) => {
          try {
            const infoRes = await window.sat20.getTickerInfo(item.assets_name);
            if (infoRes?.ticker) {
              const result = JSON.parse(infoRes.ticker);
              return [item.assets_name, result?.displayname || item.assets_name];
            }
          } catch {}
          return [item.assets_name, item.assets_name];
        })
      );
      if (isMounted) setLabelMap(Object.fromEntries(entries));
    };
    fetchLabels();
    return () => { isMounted = false; };
  }, [list]);

  const listWithLabel = useMemo(() => {
    return list.map((item) => ({
      ...item,
      label: labelMap[item.assets_name] || item.assets_name,
    }));
  }, [list, labelMap]);

  const toDetail = (key: ReactKey) => {
    const assetName = String(key);
    router.push(`/order?asset=${assetName}`);
  };

  const protocolChange = (e: string) => {
    setProtocol(e);
    setSortOrder(0);
    setSortField('assets_name');
    setSortDescriptor({ column: 'assets_name', direction: 'ascending' });

    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('protocol', e);
    window.history.replaceState({}, '', newUrl.toString());
  };

  const handleSort = (columnKey: Key) => {
    const columnConfig = columns.find(col => col.key === columnKey);
    if (!columnConfig || !columnConfig.allowsSorting) {
      return;
    }

    let newDirection: SortDirection = 'ascending';
    if (sortDescriptor.column === columnKey && sortDescriptor.direction === 'ascending') {
      newDirection = 'descending';
    }

    const newDescriptor: StrictSortDescriptor = {
      column: columnKey,
      direction: newDirection,
    };

    setSortDescriptor(newDescriptor);
    setSortField(columnKey);
    setSortOrder(newDirection === 'ascending' ? 0 : 1);
  };

  const columns = useMemo(
    () => [
      {
        key: 'assets_name',
        label:
          type === 'ns' ? t('common.domain_name') : t('common.assets_name'),
        allowsSorting: true,
      },
      {
        key: 'onsell_lowest_price',
        label: t('common.lowest_price'),
        allowsSorting: true,
      },
      {
        key: 'onsell_lowest_price_change',
        label: t('common.price_change'),
        allowsSorting: true,
      },
      {
        key: 'tx_total_volume',
        label: t('common.tx_total_volume'),
        allowsSorting: true,
      },
      {
        key: 'market_cap',
        label: t('common.total_amount'),
        allowsSorting: true,
      },
      {
        key: 'tx_order_count',
        label: t('common.tx_order_count'),
        allowsSorting: true,
      },
      {
        key: 'holder_count',
        label: t('common.holder_count'),
        allowsSorting: true,
      },
      {
        key: 'onsell_order_count',
        label: t('common.order_num'),
        allowsSorting: true,
      },
    ],
    [t, type],
  );

  if (error) {
    console.error('Error fetching assets:', error);
  }

  return (
    <div className="bg-transparent p-0 sm:pt-2 w-full">
      <div className="my-2 px-2 sm:px-1 flex justify-between items-center gap-1">
        <HomeTypeTabs value={protocol} onChange={protocolChange} />
        <SortDropdown
          sortList={sortList}
          value={interval}
          disabled={isLoading || !list.length}
          onChange={onSortChange}
        ></SortDropdown>
      </div>
      {type === 'ns' && <NameMarketNav />}
      <div className="relative overflow-x-auto w-full px-3 pt-2 bg-zinc-900 rounded-lg">
        <Table className="w-full ">
          <TableHeader className="top-0 z-20 bg-zinc-800">
            <TableRow className="rounded-2xl">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  onClick={() => handleSort(column.key)}
                  className={`h-12 py-3 text-sm font-medium text-gray-300  whitespace-nowrap ${column.allowsSorting ? 'cursor-pointer hover:bg-zinc-700' : ''
                    } ${column.key === 'assets_name'
                      ? 'z-30 bg-zinc-800 pl-8 pr-4'
                      : 'px-4'
                    }`}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {column.allowsSorting && sortDescriptor.column === column.key && (
                      sortDescriptor.direction === 'ascending' ?
                        <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isLoading && listWithLabel.length === 0 ? (
              <TableRow className="hover:bg-zinc-800/50">
                <TableCell colSpan={columns.length} className="h-24 text-center text-zinc-500 py-3">
                  No Data.
                </TableCell>
              </TableRow>
            ) : (
              listWithLabel.map((item: any) => (
                <TableRow
                  key={item.assets_name}
                  onClick={() => toDetail(item.assets_name)}
                  className="cursor-pointer  hover:bg-zinc-800/50 text-gray-300"
                >
                  {columns.map((column) => {
                    const columnKey = column.key;
                    const value = item[columnKey as keyof any];

                    if (columnKey === 'assets_name') {
                      const tick = item.assets_name;
                      const tick_type = item.assets_type;
                      const nickname = item.nickname;
                      const logo = item.logo;
                      const displayTick = item.label || nickname || tick;
                      console.log('displayTick:', displayTick);

                      const ticker = typeof displayTick === 'string'
                        ? displayTick.split(':').pop() || displayTick
                        : '';

                      return (
                        <TableCell
                          key={columnKey}
                          className="z-10 pl-5 pr-4 py-3"
                        >
                          <div className="flex items-center text-sm md:text-base">
                            {logo ? (
                              <Image
                                src={`${process.env.NEXT_PUBLIC_HOST}${network === 'testnet' ? '/testnet' : ''}${logo}`}
                                alt="logo"
                                width={36}
                                height={36}
                                className="rounded-full flex-shrink-0"
                              />
                            ) : tick_type === 'exotic' ? (
                              <Image
                                src={`/raresats/${nickname || displayTick}.svg`}
                                alt="logo"
                                width={36}
                                height={36}
                                className="flex-shrink-0"
                                onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-avatar.png'; }}
                              />
                            ) : (
                              <Avatar className="w-9 h-9 flex-shrink-0">
                                <AvatarFallback className="text-xl text-gray-300 font-black bg-zinc-700">
                                  {typeof ticker === 'string' ? ticker.slice(0, 1).toUpperCase() : '?'}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <span className="pt-0 ml-2 break-keep whitespace-nowrap">
                              {ticker}
                            </span>
                          </div>
                        </TableCell>
                      );
                    }

                    if (columnKey === 'lowest_price') {
                      return (
                        <TableCell key={columnKey} className="px-4 py-3">
                          <div className="flex text-sm md:text-base whitespace-nowrap">
                            {typeof value === 'number' ? `${value.toFixed(2)} sats` : '-'}
                          </div>
                        </TableCell>
                      );
                    }

                    if (columnKey === 'onsell_lowest_price_change') {
                      const numericValue = typeof value === 'string' ? parseFloat(value) : value;
                    
                      return (
                        <TableCell key={columnKey} className="px-4 py-3">
                          <div
                            className={`flex text-sm md:text-base whitespace-nowrap ${
                              numericValue > 0 ? 'text-red-500' : numericValue < 0 ? 'text-green-500' : 'text-gray-300'
                            }`}
                          >
                            {typeof value === 'string' ? value : '-'}
                          </div>
                        </TableCell>
                      );
                    }

                    if (columnKey === 'tx_total_volume') {
                      const changeValue = item.tx_amount_change; // 获取交易量变化值
                      const numericChangeValue = typeof changeValue === 'string' ? parseFloat(changeValue) : changeValue;
                  
                      return (
                        <TableCell key={columnKey} className="px-4 py-3">
                          <div className="flex flex-col text-sm md:text-base whitespace-nowrap">
                            {/* 显示交易量 */}
                            <span>{typeof value === 'number' ? value.toLocaleString() : '-'}</span>
                  
                            {/* 显示交易量变化 */}
                            {changeValue !== '0.00%' && (
                            <span
                              className={`text-xs ${
                                numericChangeValue > 0
                                  ? 'text-red-500'
                                  : numericChangeValue < 0
                                  ? 'text-green-500'
                                  : 'text-gray-300'
                              }`}
                            >
                              {typeof changeValue === 'string' ? changeValue : '-'}
                            </span>
                            )}
                          </div>
                        </TableCell>
                      );
                    }

                    if (columnKey === 'market_cap') {
                      const marketCapInBtc = satsToBitcoin(value ); // 转换为 BTC
                      //const marketCapInUsd = useBtcPriceNumber(marketCapInBtc || 0); // 始终调用 useBtcPrice
                      
                      // const marketCapInUsd = <BtcPrice btc={marketCapInBtc} />
                      const formattedMarketCapInBtc = formatLargeNumber(marketCapInBtc); // 格式化 BTC 值

                      //const formattedMarketCapInUsd = formatLargeNumber(Number(usdValue)); // 格式化 USD 值

                      return (
                        <TableCell key={columnKey} className="px-4 py-3">
                          <div className="flex flex-col text-sm md:text-base whitespace-nowrap">
                            {/* 显示 BTC 值 */}
                            <span>{formattedMarketCapInBtc} <span className='text-zinc-500 font-bold'>BTC</span></span>
                    
                            {/* 显示美元值 */}
                            <span className="text-xs text-gray-400">
                              $ <BtcPrice btc={marketCapInBtc} />
                            </span>
                          </div>
                        </TableCell>
                      );
                    }

                    if (columnKey === 'holder_count') {
                      const changeValue = item.holder_count_change; // 获取持有人变化值
                      const numericChangeValue = typeof changeValue === 'string' ? parseFloat(changeValue) : changeValue;
                  
                      return (
                        <TableCell key={columnKey} className="px-4 py-3">
                          <div className="flex flex-col text-sm md:text-base whitespace-nowrap">
                            {/* 显示交易量 */}
                            <span>{typeof value === 'number' ? value.toLocaleString() : '-'}</span>
                  
                            {/* 显示交易量变化 */}
                            {changeValue !== '0.00%' && (
                            <span
                              className={`text-xs ${
                                numericChangeValue > 0
                                  ? 'text-red-500'
                                  : numericChangeValue < 0
                                  ? 'text-green-500'
                                  : 'text-gray-300'
                              }`}
                            >
                              {typeof changeValue === 'string' ? changeValue : '-'}
                            </span>
                          )}
                          </div>
                        </TableCell>
                      );
                    }


                    return (
                      <TableCell key={columnKey} className="text-sm md:text-base px-4 py-3">
                        {typeof value === 'number'
                          ? value.toLocaleString()
                          : (value ?? '-')}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-40 rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}
