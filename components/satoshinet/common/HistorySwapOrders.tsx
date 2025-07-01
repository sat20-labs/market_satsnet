import React from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { contractService } from "@/domain/services/contract";
import { Chain } from "@/types";
import HistorySwapTable from "./HistorySwapTable";
import { ButtonRefresh } from "@/components/buttons/ButtonRefresh";

interface HistoryOrdersProps {
  contractURL: string;
  type: 'swap' | 'trade';
  ticker: string; // 添加 ticker 属性
}

export default function HistoryOrders({ contractURL, type, ticker }: HistoryOrdersProps) {
  const pageSize = 20;
  const { t } = useTranslation();

  const ORDER_TYPE_LABELS: Record<number, string> = {
    1: t("common.sell"),
    2: t("common.buy"),
    3: t("common.refund"),
    4: t("common.funds"),
    5: t("common.profit"),
    6: t("common.deposit"),
    7: t("common.withdraw"),
    8: t("common.unused"),
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['historyOrders', type, contractURL],
    queryFn: ({ pageParam = 0 }) => contractService.getContractInvokeHistory(contractURL, pageParam * pageSize, pageSize),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.data.length || lastPage.data.length < pageSize) return undefined;
      return allPages.length;
    },
    initialPageParam: 0,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
    enabled: !!contractURL,
  });

  const allOrders = data?.pages.flatMap(page => page.data) ?? [];
  console.log('allOrders', allOrders);
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ButtonRefresh loading={isLoading} onRefresh={() => refetch()} />
      </div>
      <HistorySwapTable
        rawOrders={allOrders}
        orderTypeLabels={ORDER_TYPE_LABELS}
        isLoading={isLoading}
        noDataMessage={type === 'swap' 
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