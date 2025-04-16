'use client';

import { useState, useMemo } from 'react';
import { Icon } from '@iconify/react';
import { useCommonStore } from '@/store';
import { marketApi } from '@/api';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNowStrict } from 'date-fns';
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from 'react-i18next';
import { Activity, Order, ApiResponse } from './types';
import { ActivityTable } from './ActivityTable';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface ActivityLogProps {
  assets_name: string | null;
}

const PAGE_SIZES = [10, 20, 50, 100];

export const ActivityLog = ({ assets_name }: ActivityLogProps) => {
  const { t } = useTranslation();
  const { chain } = useCommonStore();
  const { address } = useReactWalletStore();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState(0);
  const [apiFilter, setApiFilter] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'activities' | 'myActivities'>('activities');

  // Dynamic filter list based on address and translation
  const filterList = useMemo(() => {
    const _list = [
      { label: t('common.filter_all'), value: 0 },
      { label: t('common.executed'), value: 1 },
      { label: t('common.delist'), value: 2 },
      { label: t('common.invalid'), value: 3 },
      { label: t('common.list'), value: 4 },
    ];
    if (address) {
      const executedIndex = _list.findIndex(item => item.value === 1);
      if (executedIndex > -1) {
        _list.splice(executedIndex, 1);
      }
      _list.push({ label: t('common.history_sell'), value: 10 });
      _list.push({ label: t('common.history_buy'), value: 11 });
    }
    _list.sort((a, b) => a.value - b.value);
    return _list;
  }, [t, address]);

  // Query for all activities
  const allActivitiesQuery = useQuery<ApiResponse>({
    queryKey: ['history', assets_name, page, pageSize, sort, apiFilter, chain, 'all'],
    queryFn: () =>
      marketApi.getHistory({
        offset: (page - 1) * pageSize,
        size: pageSize,
        assets_name,
        sort,
        filter: apiFilter === 0 ? undefined : apiFilter,
      }),
    enabled: !!assets_name && activeTab === 'activities',
  });

  // Query for my activities
  const myActivitiesQuery = useQuery<ApiResponse>({
    queryKey: ['history', assets_name, page, pageSize, sort, apiFilter, chain, 'my', address],
    queryFn: () =>
      marketApi.getHistory({
        offset: (page - 1) * pageSize,
        size: pageSize,
        assets_name,
        sort,
        filter: apiFilter === 0 ? undefined : apiFilter,
        address,
      }),
    enabled: !!assets_name && !!address && activeTab === 'myActivities',
  });

  const transformOrders = (orders: Order[]): Activity[] => {
    return orders
      .map((order): Activity | null => {
        try {
          const quantity = Number(order.assets.amount);
          let unitPrice = Number(order.assets.unit_price);

          if (isNaN(quantity) || isNaN(unitPrice)) {
            console.warn(`Skipping order ${order.order_id}: Invalid quantity or price`);
            return null;
          }

          // Keep price in original unit (SAT or BTC)
          let priceInSats: number;
          if (order.currency === 'SAT') {
            priceInSats = unitPrice;
          } else if (order.currency === 'BTC') {
            priceInSats = unitPrice * 100_000_000;
          } else {
            console.warn(`Skipping order ${order.order_id}: Unsupported currency ${order.currency}`);
            return null;
          }

          const totalValue = quantity * priceInSats;
          const timeMs = order.txid ? order.txtime : order.order_time;
          const time = formatDistanceToNowStrict(new Date(timeMs), { addSuffix: true });

          let eventTypeLabel = t('common.unknown');
          let eventTypeStatus = order.result;

          if (address && order.result === 1) {
            if (order.address === address) {
              eventTypeStatus = order.order_type === 1 ? 10 : 11;
            } else if (order.txaddress === address) {
              eventTypeStatus = order.order_type === 1 ? 11 : 10;
            } else {
              eventTypeStatus = 1;
            }
          } else if (order.result === undefined || order.result === null) {
            eventTypeStatus = 4;
          } else if (order.result === 0) {
            eventTypeStatus = 4;
          }

          const foundFilter = filterList.find(f => f.value === eventTypeStatus);
          if (foundFilter) {
            eventTypeLabel = foundFilter.label;
          } else {
            eventTypeLabel = `${t('common.unknown')} (${eventTypeStatus})`;
          }

          return {
            order_id: order.order_id,
            eventTypeLabel,
            quantity,
            price: priceInSats,
            totalValue,
            time,
            txid: order.txid || undefined,
          };
        } catch (error) {
          console.error(`Error transforming order ${order.order_id}:`, order, error);
          return null;
        }
      })
      .filter((activity): activity is Activity => activity !== null);
  };

  const currentQuery = activeTab === 'activities' ? allActivitiesQuery : myActivitiesQuery;
  const activities = useMemo(() => {
    if (!currentQuery.data?.data?.order_list) return [];
    return transformOrders(currentQuery.data.data.order_list);
  }, [currentQuery.data]);

  const totalPages = useMemo(() => {
    if (!currentQuery.data?.data?.total) return 1;
    return Math.ceil(currentQuery.data.data.total / pageSize);
  }, [currentQuery.data?.data?.total, pageSize]);

  const handleRefresh = () => {
    currentQuery.refetch();
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1); // Reset to first page when changing page size
  };

  return (
    <div className="bg-zinc-900/90 sm:p-6 rounded-lg text-zinc-200 w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-1 sm:gap-4 mb-4 mt-4">
        <div className="flex gap-1 w-full sm:w-auto">
          <Button
            variant="ghost"
            className={`text-sm sm:text-base font-medium h-auto px-3 py-1.5 ${
              activeTab === 'activities'
                ? 'text-blue-500 border-b-2 border-blue-500 rounded-none'
                : 'text-gray-400 border-b-2 border-transparent rounded-none'
            }`}
            onClick={() => setActiveTab('activities')}
          >
            {t('common.activity')}
          </Button>
          <Button
            variant="ghost"
            className={`text-sm sm:text-base font-medium h-auto px-3 py-1.5 ${
              activeTab === 'myActivities'
                ? 'text-blue-500 border-b-2 border-blue-500 rounded-none'
                : 'text-gray-400 border-b-2 border-transparent rounded-none'
            }`}
            onClick={() => setActiveTab('myActivities')}
            disabled={!address}
          >
            {t('common.my_activities')}
          </Button>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-4 items-center">
          <Select
            value={String(apiFilter)}
            onValueChange={(value) => setApiFilter(Number(value))}
          >
            <SelectTrigger className="w-[150px] bg-zinc-800 border-zinc-700 text-gray-300 h-8 text-xs sm:text-sm">
              <SelectValue placeholder={t('common.filter_placeholder')} />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700 text-gray-300">
              {filterList.map((filter) => (
                <SelectItem
                  key={filter.value}
                  value={String(filter.value)}
                  className="text-xs sm:text-sm"
                >
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white transition-colors h-8 w-8"
            aria-label={t('common.refresh')}
            onClick={handleRefresh}
          >
            <Icon icon="mdi:refresh" className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {activeTab === 'myActivities' && !address ? (
        <div className="flex flex-col items-center justify-center py-10 gap-4">
          <p className="text-gray-400">{t('common.connect_wallet_to_view')}</p>
          <Button
            variant="outline"
            onClick={() => {
              // Trigger wallet connect action
              // This should be implemented based on your wallet connection logic
            }}
          >
            {t('common.connect_wallet')}
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-4">
            <ActivityTable
              activities={activities}
              isLoading={currentQuery.isLoading}
              error={currentQuery.error as Error}
            />
          </div>
          
          <div className="mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => handlePageChange(page - 1)}
                    className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNumber = i + 1;
                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        onClick={() => handlePageChange(pageNumber)}
                        isActive={page === pageNumber}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                <PaginationItem>
                  <PaginationNext
                    onClick={() => handlePageChange(page + 1)}
                    className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>

          <div className="mt-4 flex justify-end items-center gap-2">
            <span className="text-sm text-gray-400">{t('common.items_per_page')}</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => handlePageSizeChange(Number(value))}
            >
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
};