'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getHistory } from '@/api';
import { useMemo, useState } from 'react';
import { hideStr, resolveMempoolTxLink } from '@/lib/utils';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { Pagination } from '@/components/Pagination';

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useCommonStore } from '@/store/common';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { ExternalLink, Copy, Bitcoin, Loader2 } from 'lucide-react';

interface OrderItem {
  utxo: string;
  result: number;
  assets?: { assets_name: string }[];
  assets_name?: string;
  price: number | string;
  currency: string;
  value: number | string;
  address: string;
  txaddress: string;
  txtime: string | number;
  txid: string;
  sourcename: string;
}

interface HistoryApiResponse {
  code: number;
  msg: string;
  data: {
    total: number;
    order_list: OrderItem[];
  };
}

interface OrdxOrderHistoryListProps {
  assets_name?: string;
  assets_type?: string;
  address?: string;
}
export const OrdxOrderHistoryList = ({
  assets_name,
  assets_type,
  address,
}: OrdxOrderHistoryListProps) => {
  const { t, i18n } = useTranslation();
  const { network } = useReactWalletStore((state) => state);
  const { chain } = useCommonStore();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(12);
  const [sort, setSort] = useState(0);
  const [filter, setFilter] = useState<any>(undefined);

  const queryKey = [
    'ordxHistory',
    { assets_name, address, page, size, sort, filter, chain, assets_type },
  ];
  const { data, isLoading } = useQuery<HistoryApiResponse, Error>({
    queryKey,
    queryFn: () =>
      getHistory({
        offset: (page - 1) * size,
        size,
        assets_name,
        assets_type,
        address,
        sort,
        filter: filter === 0 ? undefined : filter,
      }),
    placeholderData: keepPreviousData,
  });

  const onSortChange = (sort?: number) => {
    if (sort !== undefined) {
      setSort(sort);
      setPage(1);
    }
  };
  const onFilterChange = (f?: number) => {
    if (f !== undefined) {
      setFilter(f);
      setPage(1);
    }
  };
  const total = useMemo(
    () => (data?.data?.total ? Math.ceil(data.data.total / size) : 0),
    [data, size],
  );
  const typeMap = useMemo(() => {
    return {
      1: t('common.executed'),
      2: t('common.delist'),
      3: t('common.invalid'),
      4: t('common.list'),
      10: t('common.history_sell'),
      11: t('common.buy'),
    };
  }, [i18n.language, t]);
  const filterList = useMemo(() => {
    const _list = [
      { label: t('common.filter_all'), value: 0 },
      { label: t('common.executed'), value: 1 },
      { label: t('common.delist'), value: 2 },
      { label: t('common.invalid'), value: 3 },
      { label: t('common.list'), value: 4 },
    ];
    if (address) {
      _list.splice(1, 1);
      _list.push({ label: t('common.history_sell'), value: 10 });
      _list.push({ label: t('common.history_buy'), value: 11 });
    }
    return _list;
  }, [i18n.language, address, t]);
  const columns = useMemo(() => {
    const defaultColumns = [
      {
        key: 'result_text',
        label: 'Type',
        className: 'text-center',
      },
      {
        key: 'utxo',
        label: t('common.utxo'),
        className: 'text-center',
      },
      {
        key: 'assets_name',
        label: t('common.assets_name'),
        className: 'text-center',
      },
      {
        key: 'price',
        label: t('common.price'),
        className: 'text-left',
      },
      {
        key: 'value',
        label: t('common.num'),
        className: 'text-center',
      },
      {
        key: 'address',
        label: t('common.from'),
        className: 'text-center',
      },
      {
        key: 'txaddress',
        label: t('common.to'),
        className: 'text-center',
      },
      {
        key: 'txtime',
        label: t('common.time'),
        className: 'text-center',
      },
      {
        key: 'txid',
        label: t('common.tx'),
        className: 'text-center',
      },
      {
        key: 'sourcename',
        label: t('common.source'),
        className: 'text-center',
      },
    ];
    return defaultColumns;
  }, [address, i18n.language, t]);
  const sortList = useMemo(() => [
    { label: t('common.not_sort'), value: 0 },
    { label: t('common.sort_price_ascending'), value: 1 },
    { label: t('common.sort_price_descending'), value: 2 },
    { label: t('common.sort_time_ascending'), value: 3 },
    { label: t('common.sort_time_descending'), value: 4 },
  ], [t]);
  const list = useMemo(
    () =>
      data?.data?.order_list?.map((v) => ({
        ...v,
        result_text: typeMap[v.result],
      })) || [],
    [data, typeMap],
  );
  const renderCellContent = (item: OrderItem, columnKey: string) => {
    if (
      columnKey === 'utxo' ||
      columnKey === 'txaddress' ||
      columnKey === 'address'
    ) {
      const value = item[columnKey as 'utxo' | 'txaddress' | 'address'];
      return value ? (
        <div className="flex items-center justify-center">
          <span className="font-light">{hideStr(value, 6)}</span>
        </div>
      ) : (
        '-'
      );
    } else if (columnKey === 'txid') {
      const value = item.txid;
      return value ? (
        <a
          href={resolveMempoolTxLink(value, network)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center hover:text-primary"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      ) : (
        '-'
      );
    } else if (columnKey === 'txtime') {
      const value = item.txtime;
      return value ? (
        <span className="text-sm md:text-base font-light">
          {new Date(Number(value)).toLocaleString()}
        </span>
      ) : (
        '-'
      );
    } else if (columnKey === 'price') {
      const value = item.price;
      return (
        <div className="flex items-center text-sm md:text-base font-light">
          {item.currency === 'BTC' && (
            <Bitcoin className="mr-1 h-4 w-4 text-orange-500" />
          )}
          {value}
          {item.currency !== 'BTC' && ` ${item.currency}`}
        </div>
      );
    } else if (columnKey === 'assets_name') {
      const assets = item.assets || [];
      const ticker = assets.map((asset) => asset.assets_name).join('-');
      const value = item.assets_name;
      return (
        <span className="text-center font-light text-sm md:text-base">
          {ticker || value || '-'}
        </span>
      );
    } else if (columnKey === 'sourcename') {
      const value = item.sourcename;
      const sourceMap: { [key: string]: string } = {
        'Magic Eden': '/icon/m-me.png',
        OKX: '/icon/m-okx.png',
      };
      const src =
        typeof value === 'string'
          ? sourceMap[value] || '/icon/m-sat20.png'
          : '/icon/m-sat20.png';
      return value ? (
        <div className="flex justify-center">
          <Image
            src={src}
            alt={String(value) || 'source icon'}
            width={24}
            height={24}
            className="w-6 h-6"
          />
        </div>
      ) : (
        '-'
      );
    } else {
      const value = item[columnKey as keyof OrderItem];
      if (typeof value === 'string' || typeof value === 'number') {
        return (
          <span className="text-center font-light text-sm md:text-base">
            {value ?? '-'}
          </span>
        );
      }
      return (
        <span className="text-center font-light text-sm md:text-base">
          -
        </span>
      );
    }
  };
  const currentFilterLabel = useMemo(() => {
    return filterList.find((f) => f.value === filter)?.label || t('common.filter');
  }, [filter, filterList, t]);
  const currentSortLabel = useMemo(() => {
    return sortList.find((s) => s.value === sort)?.label || t('common.sort');
  }, [sort, sortList, t]);
  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-4 flex-wrap">
        <div className="flex items-center">
          <span className="mr-2 text-sm">{t('common.filter')}：</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isLoading || !list.length}>
                {currentFilterLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {filterList.map((f) => (
                <DropdownMenuItem
                  key={f.value}
                  onSelect={() => onFilterChange(f.value)}
                  disabled={f.value === filter}
                >
                  {f.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center">
          <span className="mr-2 text-sm">{t('common.sort')}：</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isLoading || !list.length}>
                {currentSortLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {sortList.map((s) => (
                <DropdownMenuItem
                  key={s.value}
                  onSelect={() => onSortChange(s.value)}
                  disabled={s.value === sort}
                >
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key} className={c.className}>
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex justify-center items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                </TableCell>
              </TableRow>
            ) : list.length > 0 ? (
              list.map((item: any, i) => (
                <TableRow key={item.utxo + i}>
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {renderCellContent(item, column.key)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {total > 1 && (
        <div className="flex justify-center pt-4">
          <Pagination
            total={total}
            page={page}
            onChange={(newPage: number) => {
              setPage(newPage);
            }}
          />
        </div>
      )}
    </div>
  );
};
