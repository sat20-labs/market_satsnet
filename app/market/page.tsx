'use client';

import { getTopAssets } from '@/api';
import useSWR from 'swr';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableColumn,
  Spinner,
  getKeyValue,
  SortDescriptor,
  Avatar,
  Image,
} from '@nextui-org/react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@iconify/react';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { thousandSeparator, getTickLabel } from '@/lib/utils';
import { SortDropdown } from '@/components/SortDropdown';
import { BtcPrice } from '@/components/BtcPrice';
import { useCommonStore } from '@/store';
import { HomeTypeTabs } from '@/components/market/HomeTypeTabs';
import { NameMarketNav } from '@/components/market/NameMarketNav';

export default function Market() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();
  const { chain } = useCommonStore();
  const paramType = params.get('type') || 'ticker';
  const [type, setType] = useState<string>(paramType);
  const [interval, setInterval] = useState<any>(1);
  const [sortField, setSortField] = useState<any>('');
  const [sortOrder, setSortOrder] = useState<any>(0);

  const sortList = useMemo(
    () => [
      { label: t('common.time_1D'), value: 1 },
      { label: t('common.time_7D'), value: 7 },
      { label: t('common.time_30D'), value: 30 },
    ],
    [i18n.language],
  );
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: '',
    direction: 'ascending',
  });
  const { network } = useReactWalletStore();
  const { data, error, isLoading } = useSWR(
    `/ordx/getTopTickers-${chain}-${network}-${type}-${interval}-${sortField}-${sortOrder}-${chain}`,
    () => {
      let res = getTopAssets({
        assets_type: type,
        interval,
        top_count: 200,
        top_name: '',
        sort_field: sortField,
        sort_order: sortOrder,
      });
      return res;
    },
  );
  const onSortChange = (i?: number) => {
    setInterval(i);
  };
  console.log('data', data);
  const list = useMemo(() => {
    return data?.data || [];
  }, [data]);
  const toDetail = (e) => {
    router.push(`/ordx/ticker?ticker=${e}&assets_type=${type}`);
  };
  const typeChange = (e: string) => {
    setType(e);
    setSortOrder(0);
    setSortField('');
    setSortDescriptor({ column: '', direction: 'ascending' });

    // Update the URL without refreshing the page
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('type', e);
    window.history.replaceState({}, '', newUrl.toString());
  };
  const onTableSortChange = (e: SortDescriptor) => {
    setSortDescriptor(e);
    setSortField(e.column);
    setSortOrder(e.direction === 'ascending' ? 0 : 1);
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
    [i18n.language, type],
  );

  return (
    <div className="bg-transparent p-0 sm:pt-2 w-full">
      <div className="my-2 flex justify-between items-center gap-1">
        <HomeTypeTabs value={type} onChange={typeChange} />
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
          // isStriped
          sortDescriptor={sortDescriptor}
          onSortChange={onTableSortChange}
          color="primary"
          selectionMode="single"
          onRowAction={toDetail}
          aria-label="Table with infinite pagination"
          className='w-full'
          classNames={{
            tr: "border-b border-zinc-800", // 为每一行添加下边框
          }}
          removeWrapper={true} // 移除外层 div          
        >
          <TableHeader className='bg-zinc-800 h-16'>
            {columns.map((column) => (
              <TableColumn
                key={column.key}
                allowsSorting={column.allowsSorting}
                className={`bg-zinc-900 h-14 text-lg font-medium sm:pb-3 sm:pt-3 ${
                  column.key === 'assets_name' ? 'sticky left-0 pl-5 bg-zinc-900 z-10' : ''
                }`}
              >
                {column.label}
              </TableColumn>
            ))}
          </TableHeader>
          <TableBody
            isLoading={isLoading}
            items={list}
            emptyContent={'No Data.'}
            loadingContent={<Spinner />}
          >
            {(item: any) => (
              <TableRow
                key={item.assets_name}
                className="cursor-pointer text-sm md:text-base"
              >
                {(columnKey) => {
                  if (columnKey === 'assets_name') {
                    const tick = getKeyValue(item, 'assets_name');
                    const tick_type = getKeyValue(item, 'assets_type');
                    const nickname = getKeyValue(item, 'nickname');
                    const logo = getKeyValue(item, 'logo');
                    return (
                      <TableCell className="flex items-center sticky left-0 bg-zinc-900/90 z-10">
                        <div className="flex items-center text-sm md:text-base items-left">
                          {logo ? (
                            <Image
                              src={`${process.env.NEXT_PUBLIC_HOST}${network === 'testnet' ? '/testnet' : ''}${logo}`}
                              alt="logo"
                              className="w-9 h-9 min-w-[2.25rem] p-0"
                            />
                          ) : tick_type === 'exotic' ? (
                            <Image
                              src={`/raresats/${nickname ? nickname : getTickLabel(tick)}.svg`}
                              alt="logo"
                              className="w-9 h-9 min-w-[2.25rem] p-0"
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
                  } else if (columnKey === 'lowest_price') {
                    return (
                      <TableCell className='bg-zinc-900/90'>
                        <div className="flex text-sm md:text-base">
                          {getKeyValue(item, columnKey).toFixed(2) + ' sats'}
                        </div>
                      </TableCell>
                    );
                  } else {
                    // Other columns
                    return (
                      <TableCell className="bg-zinc-900/90 font-light text-sm md:text-base">
                        {getKeyValue(item, columnKey)}
                      </TableCell>
                    );
                  }
                }}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
