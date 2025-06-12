import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useInfiniteQuery, useQueryClient, useQuery } from "@tanstack/react-query";
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

interface Order {
  side: string;
  price: number;
  quantity: number;
  status: string;
  expectedAmt: number;
  remainingAmt: number;
  remainingValue: number;
  rawData: OrderData;
  done: number; // 0:进行中 1:已成交 2:已撤销
}

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
  Done: number; // 0:进行中 1:已成交 2:已撤销
}

interface OrderResponse {
  total: number;
  start: number;
  data: OrderData[];
}

const getMyContractHistory = async (contractURL: string, address: string, pageStart: number = 0, pageLimit: number = 20): Promise<OrderData[]> => {
  try {
    const result = await window.sat20.getContractInvokeHistoryByAddressInServer(contractURL, address, pageStart, pageLimit);

    if (!result?.history) return [];

    const parsedHistory = JSON.parse(result.history) as OrderResponse;
    console.log('parsedHistory', parsedHistory);
    return parsedHistory.data;
  } catch (e) {
    console.error('Error fetching orders:', e);
    return [];
  }
}
const getMyStatus = async (contractURL: string, address: string) => {
  const { status } = await window.sat20.getAddressStatusInContract(contractURL, address);
  try {
    return JSON.parse(status)?.status;
  } catch (error) {
    return {};
  }
}

interface MyOrdersPanelProps {
  contractURL: string;
  tickerInfo: any;
  assetInfo: any;
}

// 时间格式化函数

function formatTimeToMonthDayHourMinute(orderTime: number) {
  const date = new Date(orderTime * 1000);
  return format(date, 'MM-dd HH:mm');
}

export default function MyOrdersPanel({
  contractURL,
  tickerInfo,
  assetInfo,
}: MyOrdersPanelProps) {

  const { address } = useReactWalletStore();
  const { t } = useTranslation();

  const queryClient = useQueryClient();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['myOrdersStatus', contractURL, address],
    queryFn: ({ pageParam = 0 }) => getMyContractHistory(contractURL, address, pageParam * 20, 20),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 20 ? allPages.length : undefined;
    },
    initialPageParam: 0,
    refetchInterval: 20000,
  });
  const mapOrderData = (orderData: OrderData): Order & { outAmt: number; outValue: number; inAmt: number; inValue: number, remainingAmt: number, remainingValue: number } => {
    const isBuy = orderData.OrderType === 2;
    const isCancelled = orderData.OrderType === 3;
    // 如果是撤销订单，显示撤销，否则根据原始订单类型判断买卖方向
    const side = isCancelled ? "Cancelled" : (isBuy ? "Buy" : "Sell");
    // 精度处理
    const price = orderData.UnitPrice?.Value ? orderData.UnitPrice.Value / Math.pow(10, orderData.UnitPrice.Precision) : 0;
    const inAmt = orderData.InAmt?.Value ? orderData.InAmt.Value / Math.pow(10, orderData.InAmt.Precision) : 0;
    const inValue = orderData.InValue; // 聪本身无精度，直接显示
    const expectedAmt = orderData.ExpectedAmt?.Value ? orderData.ExpectedAmt.Value / Math.pow(10, orderData.ExpectedAmt.Precision) : 0;
    const outAmt = orderData.OutAmt?.Value ? orderData.OutAmt.Value / Math.pow(10, orderData.OutAmt.Precision) : 0; // 买到的资产数量
    const outValue = orderData.OutValue; // 剩余退款，聪本身无精度
    const remainingAmt = orderData.RemainingAmt?.Value ? orderData.RemainingAmt.Value / Math.pow(10, orderData.RemainingAmt.Precision) : 0; // 剩余未卖出
    const remainingValue = orderData.RemainingValue; // 剩余未
    let status: string;
    if (isCancelled) {
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
  console.log('assetInfo', data?.pages);

  const allOrders: (Order & { outAmt: number; outValue: number; inAmt: number; inValue: number })[] = data?.pages.flat().map(mapOrderData) ?? [];
  console.log('allOrders', allOrders);

  const cancelOrder = async () => {
    const params = {
      action: 'refund',
    };

    const result = await window.sat20.invokeContractV2_SatsNet(
      contractURL, JSON.stringify(params), assetInfo.assetName, '1',
      '1', {
      action: 'refund',
      assetName: assetInfo.assetName,
      netFeeSats: 10,
    });
    if (result.txId) {
      toast.success(`Order cancelled successfully, txid: ${result.txId}`);
      queryClient.invalidateQueries({ queryKey: ['myOrdersStatus', contractURL, address] });
      return;
    } else {
      toast.error('Order cancellation failed');
    }
  };

  if (isLoading) {
    return <div className="text-center py-2">Loading orders...</div>;
  }

  if (allOrders.length === 0) {
    return <div className="text-center py-2 text-gray-500">No orders found</div>;
  }

  return (
    <div className="max-w-full overflow-x-auto">
      <div className="flex justify-between items-center mb-4">
        <Button
          variant="outline"
          className="px-4"
          size="sm"
          onClick={cancelOrder}
        >
          Cancel
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-800 text-gray-500 text-xs">
            <TableHead className="text-center whitespace-nowrap">{t("common.limitorder_history_type")}</TableHead>
            <TableHead className="text-center whitespace-nowrap">{t("common.limitorder_history_order_time")}</TableHead>
            <TableHead className="text-center ">{t("common.limitorder_history_unit_price")}</TableHead>
            <TableHead className="text-center whitespace-nowrap">{t("common.limitorder_history_order_quantity")}</TableHead>
            <TableHead className="text-center ">{t("common.limitorder_history_order_amount_sats")}</TableHead>
            <TableHead className="text-center whitespace-nowrap">{t("common.limitorder_history_trade_quantity")}</TableHead>
            <TableHead className="text-center w-36">{t("common.limitorder_history_trade_amount_sats")}</TableHead>
            <TableHead className="text-center whitespace-nowrap">{t("common.limitorder_history_status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
        {allOrders
            .slice() // 不改变原数组
            .sort((a, b) => b.rawData.OrderTime - a.rawData.OrderTime)
            .map((order, i) => (
            <TableRow className="text-xs"
              key={`${order.rawData.Id}-${i}`}
            >
              <TableCell className={`text-center font-bold ${order.side === "Cancelled" ? "text-gray-600" : order.side === "Buy" ? "text-green-600" : "text-red-500"}`}>
                {order.side}
              </TableCell>
              <TableCell className="text-center">{formatTimeToMonthDayHourMinute(order.rawData.OrderTime)}</TableCell>
              <TableCell className="text-center">{Number(order.price)}</TableCell>
              <TableCell className="text-center">{order.side === "Cancelled" ? "-" : (order.side === "Sell" ? order.inAmt : order.expectedAmt)}</TableCell>
              <TableCell className="text-center">{order.side === "Cancelled" ? "-" : order.inValue}</TableCell>
              <TableCell className="text-center">
                {order.side === "Cancelled" ? "-" : order.outAmt}
              </TableCell>
              <TableCell className="text-center">
                {order.side === "Cancelled" ? "-" : (order.side === "Buy" && order.done !== 0) ? order.inValue - order.outValue : '-'}
              </TableCell>
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
} 