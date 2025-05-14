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
import { CustomPagination } from "@/components/ui/CustomPagination";
import { WalletConnectBus } from '@/components/wallet/WalletConnectBus';
import { ActivityTabs } from './ActivityTabs';
import { FilterSelect } from './FilterSelect';
import { ActivityContent } from './ActivityContent';

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
  const [sort, setSort] = useState(1);
  const [apiFilter, setApiFilter] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'activities' | 'myActivities'>('activities');

  // 1. 定义筛选项常量，只保留1,2,3,4,10,11
  const FILTER_OPTIONS = [
    { label: t('common.all'), value: 0 },
    { label: t('common.executed'), value: 1 },
    { label: t('common.delist'), value: 2 },
    { label: t('common.invalid'), value: 3 },
    { label: t('common.list'), value: 4 },
    { label: t('common.history_sell'), value: 10 },
    { label: t('common.history_buy'), value: 11 },
  ];
  const filterList = useMemo(() => FILTER_OPTIONS, [t]);
  console.log('filterList', filterList);

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
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
    staleTime: 10000,
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

  // 2. transformOrders展示时动态判断eventTypeLabel
  const transformOrders = (orders: Order[]): Activity[] => {
    return orders
      .map((order): Activity | null => {
        try {
          const quantity = Number(order.assets.amount);
          let unitPrice = Number(order.assets.unit_price);
          if (isNaN(quantity) || isNaN(unitPrice)) return null;
          let priceInSats = unitPrice;
          const totalValue = quantity * priceInSats;
          const timeMs = order.txid ? order.txtime : order.order_time;
          const time = formatDistanceToNowStrict(new Date(timeMs), { addSuffix: true });
          let eventTypeLabel = t('common.unknown');
          if (order.result === 4) {
            eventTypeLabel = order.order_type === 1 ? t('common.list_sell') : t('common.list_buy');
          } else {
            // 其它状态直接用映射
            const statusMap = {
              1: t('common.executed'),
              2: t('common.delist'),
              3: t('common.invalid'),
              4: t('common.list'),
              10: t('common.history_sell'),
              11: t('common.history_buy'),
            };
            eventTypeLabel = statusMap[order.result] || t('common.unknown');
          }
          return {
            order_id: order.order_id,
            eventTypeLabel,
            quantity,
            price: priceInSats,
            totalValue,
            time,
            txid: order.txid || undefined,
            from: order.address,
            to: order.txaddress,
          };
        } catch {
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

  const totalCount = currentQuery.data?.data?.total ?? 0;
  const totalPages = useMemo(() => {
    if (totalCount === 0) return 1;
    return Math.ceil(totalCount / pageSize);
  }, [totalCount, pageSize]);

  const handleRefresh = () => {
    currentQuery.refetch();
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1); // Reset to first page when changing page size
  };

  return (
    <div className="bg-zinc-900/90 sm:p-6 rounded-lg text-zinc-200 w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-1 sm:gap-4 mb-4 mt-4">
        <ActivityTabs activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-4 items-center">
          <FilterSelect
            value={apiFilter}
            options={filterList}
            onChange={(val) => setApiFilter(Number(val))}
            placeholder={t('common.filter_placeholder')}
            className="w-[150px] bg-zinc-800 border-zinc-700 text-gray-300 h-8 text-xs sm:text-sm"
          />
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
          <WalletConnectBus>
            <Button variant="outline">{t('common.connect_wallet')}</Button>
          </WalletConnectBus>
        </div>
      ) : (
        <ActivityContent
          activities={activities}
          isLoading={currentQuery.isLoading}
          error={currentQuery.error as Error}
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          availablePageSizes={PAGE_SIZES}
        />
      )}
    </div>
  );
};