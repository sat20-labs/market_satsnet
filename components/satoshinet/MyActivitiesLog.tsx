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
import { FilterSelect } from './FilterSelect';


interface MyActivitiesLogProps {
  assets_name?: string | null;
  address: string;
}

const PAGE_SIZES = [10, 20, 50, 100];

export const MyActivitiesLog = ({ assets_name, address }: MyActivitiesLogProps) => {
  const { t } = useTranslation();
  const { chain } = useCommonStore();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState(1);
  const [apiFilter, setApiFilter] = useState<number>(0);

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
    enabled: !!address,
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
    staleTime: 10000,
  });

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
          let eventTypeStatus = order.result;
          // 只在result为4时区分挂买单/挂卖单
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

  const activities = useMemo(() => {
    if (!myActivitiesQuery.data?.data?.order_list) return [];
    return transformOrders(myActivitiesQuery.data.data.order_list);
  }, [myActivitiesQuery.data]);

  const totalCount = myActivitiesQuery.data?.data?.total ?? 0;
  const totalPages = useMemo(() => {
    if (totalCount === 0) return 1;
    return Math.ceil(totalCount / pageSize);
  }, [totalCount, pageSize]);

  const handleRefresh = () => {
    myActivitiesQuery.refetch();
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  return (
    <div className="bg-zinc-900/90 sm:p-6 rounded-lg text-zinc-200 w-full">
      <div className="flex justify-end flex-col sm:flex-row items-start sm:items-center gap-2 px-1 sm:gap-4 mb-4 mt-4">
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
      <div className="mt-4">
        <ActivityTable
          activities={activities}
          isLoading={myActivitiesQuery.isLoading}
          error={myActivitiesQuery.error as Error}
        />
      </div>
      {totalCount > 0 && (
        <CustomPagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          availablePageSizes={PAGE_SIZES}
          isLoading={myActivitiesQuery.isLoading}
        />
      )}
    </div>
  );
}; 