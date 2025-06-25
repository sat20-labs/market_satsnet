import React from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { contractService } from "@/domain/services/contract";
import { Chain } from "@/types";
import HistoryTable from "./HistoryTable";
import { ButtonRefresh } from "@/components/buttons/ButtonRefresh";

interface HistoryOrdersProps {
  contractURL: string;
  type: 'swap' | 'trade';
}

export default function HistoryOrders({ contractURL, type }: HistoryOrdersProps) {
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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ButtonRefresh loading={isLoading} onRefresh={() => refetch()} />
      </div>
      <HistoryTable
        rawOrders={allOrders}
        orderTypeLabels={ORDER_TYPE_LABELS}
        isLoading={isLoading}
        noDataMessage={type === 'swap' 
          ? t("common.swap_history_no_records")
          : t("common.limitorder_history_no_trade_records")
        }
        onLoadMore={fetchNextPage}
        isFetchingNextPage={isFetchingNextPage}
        hasNextPage={hasNextPage}
        chain={Chain.SATNET}
      />
    </div>
  );
} 