import React from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { ExternalLink } from "lucide-react";
import { generateMempoolUrl } from "@/utils/url";
import { Chain } from "@/types";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface OrderData {
  Version: number;
  Id: number;
  OrderType: number;
  OrderTime: number;
  AssetName: string;
  UnitPrice: {
    Precision: number;
    Value: number;
  };
  ExpectedAmt: {
    Precision: number;
    Value: number;
  };
  Address: string;
  FromL1: boolean;
  InUtxo: string;
  InValue: number;
  InAmt: {
    Precision: number;
    Value: number;
  };
  RemainingAmt: {
    Precision: number;
    Value: number;
  };
  RemainingValue: number;
  OutTxId: string;
  OutAmt: {
    Precision: number;
    Value: number;
  };
  OutValue: number;
  Valid: boolean;
  Done: number;
}

interface OrderResponse {
  total: number;
  start: number;
  data: OrderData[];
}

const getMyAmmOrderHistory = async (
  contractURL: string,
  address: string,
  pageStart: number = 0,
  pageLimit: number = 20
): Promise<OrderData[]> => {
  try {
    const result = await window.sat20.getContractInvokeHistoryByAddressInServer(
      contractURL,
      address,
      pageStart,
      pageLimit
    );
    if (!result?.history) return [];
    const parsedHistory = JSON.parse(result.history) as OrderResponse;
    return parsedHistory.data;
  } catch (e) {
    return [];
  }
};

function formatTimeToMonthDayHourMinute(orderTime: number) {
  const date = new Date(orderTime * 1000);
  return format(date, 'MM-dd HH:mm');
}

const mapOrderData = (orderData: OrderData, t: any) => {
  const isBuy = orderData.OrderType === 2;
  const isCancelled = orderData.OrderType === 3;
  const side = isCancelled ? "Cancelled" : (isBuy ? "Buy" : "Sell");
  const price = orderData.UnitPrice?.Value ? orderData.UnitPrice.Value / Math.pow(10, orderData.UnitPrice.Precision) : 0;
  const inAmt = orderData.InAmt?.Value ? orderData.InAmt.Value / Math.pow(10, orderData.InAmt.Precision) : 0;
  const inValue = orderData.InValue;
  const expectedAmt = orderData.ExpectedAmt?.Value ? orderData.ExpectedAmt.Value / Math.pow(10, orderData.ExpectedAmt.Precision) : 0;
  const outAmt = orderData.OutAmt?.Value ? orderData.OutAmt.Value / Math.pow(10, orderData.OutAmt.Precision) : 0;
  const outValue = orderData.OutValue;
  const remainingAmt = orderData.RemainingAmt?.Value ? orderData.RemainingAmt.Value / Math.pow(10, orderData.RemainingAmt.Precision) : 0;
  const remainingValue = orderData.RemainingValue;
  let status: string;
  if (orderData.Valid === false) {
    status = "异常";
  } else if (isCancelled) {
    status = "Cancelled";
  } else {
    switch (orderData.Done) {
      case 1:
        status = t("common.limitorder_status_completed");
        break;
      case 2:
        status = t("common.limitorder_status_cancelled");
        break;
      default:
        status = t("common.limitorder_status_pending");
    }
  }
  return {
    side,
    price,
    quantity: inAmt,
    status,
    rawData: orderData,
    done: isCancelled ? 2 : orderData.Done,
    outAmt,
    expectedAmt,
    outValue,
    inValue,
    inAmt,
    remainingAmt,
    remainingValue,
  };
};

interface SwapMyOrdersPanelProps {
  contractURL: string;
}

const SwapMyOrdersPanel: React.FC<SwapMyOrdersPanelProps> = ({ contractURL }) => {
  const { address } = useReactWalletStore();
  const { t } = useTranslation();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["swapMyOrders", contractURL, address],
    queryFn: ({ pageParam = 0 }) => getMyAmmOrderHistory(contractURL, address, pageParam * 20, 20),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 20 ? allPages.length : undefined;
    },
    initialPageParam: 0,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });

  const allOrders = data?.pages.flat().map((d) => mapOrderData(d, t)) ?? [];

  if (isLoading) {
    return <div className="text-center py-2">Loading orders...</div>;
  }

  if (allOrders.length === 0) {
    return <div className="text-center py-2 text-gray-500">No orders found</div>;
  }

  return (
    <div className="max-w-full">
      <div className="mb-2 font-bold text-sm">{t("swap.my_orders")}</div>
      <ScrollArea className="w-full max-h-80 rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-800 text-gray-500 text-xs">
              <TableHead className="text-center whitespace-nowrap">{t("common.limitorder_history_type")}</TableHead>
              <TableHead className="text-center whitespace-nowrap">{t("common.limitorder_history_order_time")}</TableHead>
              <TableHead className="text-center whitespace-nowrap">{t("common.limitorder_history_order_quantity")}</TableHead>
              <TableHead className="text-center  whitespace-nowrap">{t("common.limitorder_history_order_amount_sats")}</TableHead>
              <TableHead className="text-center whitespace-nowrap">{t("common.limitorder_history_trade_quantity")}</TableHead>
              <TableHead className="text-center  whitespace-nowrap">{t("common.limitorder_history_trade_amount_sats")}</TableHead>
              <TableHead className="text-center whitespace-nowrap">{t("common.limitorder_history_status")}</TableHead>
              <TableHead className="text-center whitespace-nowrap">{t("common.tx")}</TableHead>
              <TableHead className="text-center whitespace-nowrap">UTXO</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allOrders
              .slice()
              .sort((a, b) => b.rawData.OrderTime - a.rawData.OrderTime)
              .map((order, i) => (
                <TableRow className="text-xs" key={`${order.rawData.Id || i}-${i}`}>
                  <TableCell className={`text-center font-bold ${order.side === "Cancelled" ? "text-gray-600" : order.side === "Buy" ? "text-green-600" : order.side === "Sell" ? "text-red-500" : "text-red-500"}`}>{order.side}</TableCell>
                  <TableCell className="text-center">{formatTimeToMonthDayHourMinute(order.rawData.OrderTime)}</TableCell>
                  <TableCell className="text-center">{order.side === "Cancelled" ? "-" : (order.side === "Sell" ? order.inAmt : order.expectedAmt)}</TableCell>
                  <TableCell className="text-center">{order.side === "Cancelled" ? "-" : order.inValue}</TableCell>
                  <TableCell className="text-center">{order.side === "Cancelled" ? "-" : order.side === "Buy" ? order.outAmt : order.expectedAmt}</TableCell>
                  <TableCell className="text-center">{order.side === "Cancelled" ? "-" : (order.side === "Buy" && order.done !== 0) ? order.inValue - order.outValue : order.outValue}</TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`whitespace-nowrap px-2 py-0.5 rounded border text-xs font-semibold ${Number(order.done) === 1
                        ? "bg-green-500 text-green-700 border-green-400"
                        : Number(order.done) === 2
                          ? "bg-gray-500 text-gray-700 border-gray-400"
                          : "bg-blue-500 text-blue-700 border-blue-400"
                        }`}
                      title={order.status}
                    >
                      {order.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {order.status === t("common.limitorder_status_completed") && order.rawData.OutTxId ? (
                      <a
                        href={generateMempoolUrl({ network: 'testnet', path: `tx/${order.rawData.OutTxId}`, chain: Chain.SATNET, env: 'dev' })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center hover:text-primary"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {order.rawData.InUtxo ? (
                      <a
                        href={generateMempoolUrl({ network: 'testnet', path: `tx/${order.rawData.InUtxo}`, chain: Chain.SATNET, env: 'dev' })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center hover:text-primary"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </ScrollArea>
      {hasNextPage && (
        <div className="text-center py-2">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Loadding...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default SwapMyOrdersPanel; 