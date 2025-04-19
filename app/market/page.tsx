'use client';

import { marketApi } from '@/api';
import { useQuery } from '@tanstack/react-query';
import type { Key as ReactKey } from 'react';
import type { Key } from '@react-types/shared';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, useSearchParams } from 'next/navigation';
import { SortDropdown } from '@/components/SortDropdown';
import { getLabelForAssets } from '@/utils';
import { useCommonStore } from '@/store';
import { HomeTypeTabs } from '@/components/market/HomeTypeTabs';
import { NameMarketNav } from '@/components/market/NameMarketNav';
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
      return {
        ...item,
        assets_name: getLabelForAssets(item.assets_name),
      };
    }) || [];
  }, [queryData]);

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
        key: 'lowest_price',
        label: t('common.lowest_price'),
        allowsSorting: true,
      },
      {
        key: 'lowest_price_change',
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
      <div className="my-2 flex justify-between items-center gap-1">
        <HomeTypeTabs value={protocol} onChange={protocolChange} />
        <SortDropdown
          sortList={sortList}
          value={interval}
          disabled={isLoading || !list.length}
          onChange={onSortChange}
        ></SortDropdown>
      </div>
      {type === 'ns' && <NameMarketNav />}
      <div className="relative overflow-x-auto w-full rounded-lg">
        <Table className="w-full ">
          <TableHeader className="sticky top-0 z-20 bg-zinc-800">
            <TableRow className="">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  onClick={() => handleSort(column.key)}
                  className={`h-12 py-3 text-sm font-medium text-gray-300 whitespace-nowrap ${column.allowsSorting ? 'cursor-pointer hover:bg-zinc-700' : ''
                    } ${column.key === 'assets_name'
                      ? 'sticky left-0 z-30 bg-zinc-800 pl-5 pr-4'
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
            {!isLoading && list.length === 0 ? (
              <TableRow className="hover:bg-zinc-800/50">
                <TableCell colSpan={columns.length} className="h-24 text-center text-zinc-500 py-3">
                  No Data.
                </TableCell>
              </TableRow>
            ) : (
              list.map((item: any) => (
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
                      const displayTick = nickname || tick;
                      console.log('displayTick:', displayTick);

                      // 直接在回调函数中计算 ticker
                    const ticker = typeof displayTick === 'string'
                    ? displayTick.split(':').pop() || displayTick
                    : '';

                      return (
                        <TableCell
                          key={columnKey}
                          className="sticky left-0 z-10 pl-5 pr-4 py-3"
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
