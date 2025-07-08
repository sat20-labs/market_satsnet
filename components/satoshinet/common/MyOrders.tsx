import React from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import { useTranslation } from "react-i18next";
import { contractService } from "@/domain/services/contract";
import { Chain } from "@/types";
import HistoryTable from "./HistoryTable";
import { ButtonRefresh } from "@/components/buttons/ButtonRefresh";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface MyOrdersProps {
  contractURL: string;
  asset: string;
  type: 'swap' | 'trade';
}

export default function MyOrders({ contractURL, type, asset }: MyOrdersProps) {
  const pageSize = 20;
  const { t } = useTranslation();
  const { address } = useReactWalletStore();

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
    queryKey: ['myOrders', type, contractURL, address],
    queryFn: ({ pageParam = 0 }) => contractService.getUserHistoryInContract(contractURL, address, pageParam * pageSize, pageSize),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.data.length || lastPage.data.length < pageSize) return undefined;
      return allPages.length;
    },
    initialPageParam: 0,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
    enabled: !!contractURL && !!address,
  });
  const cancelOrder = async () => {
    const params = {
      action: 'refund',
    };

    const result = await window.sat20.invokeContract_SatsNet(
      contractURL,
      JSON.stringify(params),
      '1',
    );
    if (result.txId) {
      setTimeout(() => {
        refetch();
      }, 1000);
      toast.success(`Order cancelled successfully, txid: ${result.txId}`);
      return;
    } else {
      toast.error('Order cancellation failed');
    }
  };
  const allOrders = data?.pages.flatMap(page => page.data) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end items-center gap-2">
        <Button
          variant="outline"
          className="px-4"
          size="sm"
          onClick={cancelOrder}
        >
          Cancel
        </Button>
        <ButtonRefresh loading={isLoading} onRefresh={() => refetch()} />
      </div>
      <HistoryTable
        rawOrders={allOrders}
        orderTypeLabels={ORDER_TYPE_LABELS}
        isLoading={isLoading}
        noDataMessage={t("common.nodata")}
        onLoadMore={fetchNextPage}
        isFetchingNextPage={isFetchingNextPage}
        hasNextPage={hasNextPage}
        chain={Chain.SATNET}
        showReason={true}
      />
    </div>
  );
} 