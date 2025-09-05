import React from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { contractService } from "@/domain/services/contract";
import { Chain } from "@/types";
import HistoryTranscendTable from "./HistoryTranscendTable";
import { ButtonRefresh } from "@/components/buttons/ButtonRefresh";
import { useCommonStore } from "@/store/common";

interface HistoryTranscendOrdersProps {
  contractURL: string;
  type: 'transcend' | 'trade';
  ticker: string; // 添加 ticker 属性
}

export default function HistoryTranscendOrders({ contractURL, type, ticker }: HistoryTranscendOrdersProps) {
  const pageSize = 20;
  const { t } = useTranslation();
  const { network } = useCommonStore();
  const ORDER_TYPE_LABELS: Record<number, string> = {
    1: t("common.sell"),
    2: t("common.buy"),
    3: t("common.refund"),
    4: t("common.funds"),
    5: t("common.profit"),
    6: t("common.deposit"),
    7: t("common.withdraw"),
    8: t("common.unused"),
    9: t("common.stake"),
    10: t("common.unstake"),
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['historyTranscendOrders', contractURL, network],
    queryFn: ({ pageParam = 0 }) => contractService.getContractHistory(contractURL, pageParam * pageSize, pageSize),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.data.length || lastPage.data.length < pageSize) return undefined;
      return allPages.length;
    },
    initialPageParam: 0,
    refetchInterval: 10000, // 增加到10秒，减少刷新频率
    refetchIntervalInBackground: false, // 禁止后台刷新
    enabled: !!contractURL,
  });

  const allOrders = data?.pages.flatMap(page => page.data) ?? [];
  console.log('allTranscendOrders', allOrders);
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ButtonRefresh loading={isLoading} onRefresh={() => refetch()} />
      </div>
      <HistoryTranscendTable
        rawOrders={allOrders}
        orderTypeLabels={ORDER_TYPE_LABELS}
        isLoading={isLoading}
        noDataMessage={type === 'transcend'
          ? t("common.history_no_records")
          : t("common.history_no_records")
        }
        ticker={ticker}
        onLoadMore={fetchNextPage}
        isFetchingNextPage={isFetchingNextPage}
        hasNextPage={hasNextPage}
        chain={Chain.SATNET}
      />
    </div>
  );
} 