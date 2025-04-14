'use client';

import { marketApi } from '@/api';
import { useQuery } from '@tanstack/react-query';
import type { SortDescriptor as NextUISortDescriptor } from '@nextui-org/react';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableColumn,
  Spinner,
  getKeyValue,
  Avatar,
  Image,
} from '@nextui-org/react';
import type { Key as ReactKey } from 'react';
import type { Key } from '@react-types/shared';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, useSearchParams } from 'next/navigation';
import { getLabelForAssets } from '@/lib/utils';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { getTickLabel } from '@/lib/utils';
import { SortDropdown } from '@/components/SortDropdown';
import { useCommonStore } from '@/store';
import { HomeTypeTabs } from '@/components/market/HomeTypeTabs';
import { NameMarketNav } from '@/components/market/NameMarketNav';

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

// 定义一个严格的 SortDescriptor 类型，column 必须是 Key
type StrictSortDescriptor = {
  column: Key;
  direction: 'ascending' | 'descending';
};

export default function Market() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();
  const { chain, network } = useCommonStore();
  const paramType = params.get('type') || 'ticker';
  const paramProtocol = params.get('protocol') || 'ordinals';
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

  // 使用 StrictSortDescriptor 类型初始化状态
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
  } = useQuery<AssetItem[], Error>({
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
    return queryData?.map(
      (item) => {
        return {
          ...item,
          assets_name: getLabelForAssets(item.assets_name as any),
        };
      }
    ) || [];
  }, [queryData]);

  const toDetail = (key: ReactKey) => {
    const assetName = String(key);
    router.push(`/order?asset=${assetName}`);
  };

  const typeChange = (e: string) => {
    setType(e);
    setSortOrder(0);
    setSortField('assets_name');
    setSortDescriptor({ column: 'assets_name', direction: 'ascending' });

    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('type', e);
    window.history.replaceState({}, '', newUrl.toString());
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

  const onTableSortChange = (descriptor: NextUISortDescriptor) => {
    if (descriptor.column !== undefined) {
      const newDescriptor: StrictSortDescriptor = {
        column: descriptor.column,
        direction: descriptor.direction || 'ascending',
      };
      setSortDescriptor(newDescriptor);
      setSortField(descriptor.column);
      setSortOrder(descriptor.direction === 'ascending' ? 0 : 1);
    } else {
      console.warn(
        'onTableSortChange received descriptor with undefined column:',
        descriptor,
      );
      const defaultDescriptor: StrictSortDescriptor = {
        column: 'assets_name',
        direction: 'ascending',
      };
      setSortDescriptor(defaultDescriptor);
      setSortField(defaultDescriptor.column);
      setSortOrder(0);
    }
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
          disabled={!list.length}
          onChange={onSortChange}
        ></SortDropdown>
      </div>
      {type === 'ns' && <NameMarketNav />}
      <div className="overflow-x-auto w-full">
        <Table
          isHeaderSticky
          sortDescriptor={sortDescriptor as StrictSortDescriptor}
          onSortChange={onTableSortChange}
          color="primary"
          selectionMode="single"
          onRowAction={toDetail}
          aria-label="Table with infinite pagination"
          className="w-full"
          classNames={{
            tr: 'border-b border-zinc-800',
          }}
          removeWrapper={true}
        >
          <TableHeader className="bg-zinc-800 h-16">
            {columns.map((column) => (
              <TableColumn
                key={column.key}
                allowsSorting={column.allowsSorting}
                className={`bg-zinc-900 h-14 text-lg font-medium sm:pb-3 sm:pt-3 ${
                  column.key === 'assets_name'
                    ? 'sticky left-0 pl-5 bg-zinc-900 z-10'
                    : ''
                }`}
              >
                {column.label}
              </TableColumn>
            ))}
          </TableHeader>
          <TableBody
            isLoading={isLoading}
            items={list}
            emptyContent={!isLoading ? 'No Data.' : ' '}
            loadingContent={<Spinner />}
          >
            {(item: AssetItem) => (
              <TableRow
                key={item.assets_name}
                className="cursor-pointer text-sm md:text-base"
              >
                {(columnKey) => {
                  const value = item[columnKey as keyof AssetItem];

                  if (columnKey === 'assets_name') {
                    const tick = item.assets_name;
                    const tick_type = item.assets_type;
                    const nickname = item.nickname;
                    const logo = item.logo;
                    return (
                      <TableCell className="flex items-center sticky left-0 bg-zinc-900/90 z-10 pl-5">
                        <div className="flex items-center text-sm md:text-base">
                          {logo ? (
                            <Image
                              src={`${process.env.NEXT_PUBLIC_HOST}${network === 'Testnet' ? '/testnet' : ''}${logo}`}
                              alt="logo"
                              className="w-9 h-9 min-w-[2.25rem] p-0"
                            />
                          ) : tick_type === 'exotic' ? (
                            <Image
                              src={`/raresats/${nickname || getTickLabel(tick)}.svg`}
                              alt="logo"
                              className="w-9 h-9 min-w-[2.25rem] p-0"
                              fallbackSrc="/placeholder-avatar.png"
                            />
                          ) : (
                            <Avatar
                              name={tick.slice(0, 1).toUpperCase()}
                              className="text-2xl text-gray-300 font-black w-10 h-10 bg-zinc-800"
                            />
                          )}
                          <span className="pt-0 ml-2 break-keep whitespace-nowrap">
                            {nickname ? nickname : getTickLabel(tick)}
                          </span>
                        </div>
                      </TableCell>
                    );
                  }

                  if (columnKey === 'lowest_price') {
                    return (
                      <TableCell className="bg-zinc-900/90">
                        <div className="flex text-sm md:text-base">
                          {`${Number(value).toFixed(2)} sats`}
                        </div>
                      </TableCell>
                    );
                  }

                  return (
                    <TableCell className="bg-zinc-900/90 font-light text-sm md:text-base">
                      {typeof value === 'number'
                        ? value.toLocaleString()
                        : value}
                    </TableCell>
                  );
                }}
              </TableRow>
            )}
          </TableBody>
        </Table>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
            <Spinner />
          </div>
        )}
      </div>
    </div>
  );
}
