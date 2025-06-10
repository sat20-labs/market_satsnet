import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface Order {
  side: string;
  price: number;
  quantity: number;
  status: string;
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

const getMyContractStatus = async (contractURL: string, address: string, pageStart: number = 0, pageLimit: number = 20): Promise<OrderData[]> => {
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

interface MyOrdersPanelProps {
  contractURL: string;
  tickerInfo: any;
  assetInfo: any;
}

export default function MyOrdersPanel({
  contractURL,
  tickerInfo,
  assetInfo,
}: MyOrdersPanelProps) {
  const statusColor = {
    open: "bg-blue-500 text-blue-700 border-blue-400",
    partially_filled: "bg-yellow-500 text-yellow-800 border-yellow-400",
    filled: "bg-green-500 text-green-700 border-green-400",
    cancelled: "bg-gray-600 text-gray-500 border-gray-400",
    expired: "bg-red-500 text-red-700 border-red-400",
  };

  const { address } = useReactWalletStore();
  const queryClient = useQueryClient();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['myOrdersStatus', contractURL, address],
    queryFn: ({ pageParam = 0 }) => getMyContractStatus(contractURL, address, pageParam * 20, 20),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 20 ? allPages.length : undefined;
    },
    initialPageParam: 0,
    refetchInterval: 20000,
  });
  console.log('data', data);
  const mapOrderData = (orderData: OrderData): Order & { outAmt: number; outValue: number; inAmt: number; inValue: number } => {
    const isBuy = orderData.OrderType === 2;
    // 精度处理
    const price = orderData.UnitPrice.Value / Math.pow(10, orderData.UnitPrice.Precision);
    const inAmt = orderData.InAmt.Value / Math.pow(10, orderData.InAmt.Precision);
    const inValue = orderData.InValue; // 聪本身无精度，直接显示
    // 买单
    let outAmt = 0;
    let outValue = 0;
    if (isBuy) {
      outAmt = orderData.OutAmt.Value / Math.pow(10, orderData.OutAmt.Precision); // 买到的资产数量
      outValue = orderData.OutValue; // 剩余退款，聪本身无精度
    } else {
      outAmt = orderData.OutAmt.Value / Math.pow(10, orderData.OutAmt.Precision); // 剩余未卖出
      outValue = orderData.OutValue; // 卖出去的货款，聪本身无精度
    }
    // 状态映射
    let status: string;
    switch (orderData.Done) {
      case 1:
        status = "已成交";
        break;
      case 2:
        status = "已撤销";
        break;
      default:
        status = "进行中";
    }
    return {
      side: isBuy ? "buy" : "sell",
      price,
      quantity: inAmt,
      status,
      rawData: orderData,
      done: orderData.Done,
      outAmt,
      outValue,
      inValue,
      inAmt,
    };
  };

  const allOrders: (Order & { outAmt: number; outValue: number; inAmt: number; inValue: number })[] = data?.pages.flat().map(mapOrderData) ?? [];

  const cancelOrder = async (order: Order) => {
    const params = {
      action: 'refund',
    };

    const _asset = order.rawData.OrderType === 2 ? '::' : assetInfo.assetName;
    const result = await window.sat20.invokeContractV2_SatsNet(
      contractURL, JSON.stringify(params), _asset, Math.ceil(order.price * order.quantity).toString(),
      order.price, order.quantity, 0, '1');
    console.log('result', result);
    if (result.txId) {
      toast.success(`Order cancelled successfully, txid: ${result.txId}`);
      queryClient.invalidateQueries({ queryKey: ['myOrdersStatus', contractURL, address] });
      return;
    } else {
      toast.error('Order cancellation failed');
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading orders...</div>;
  }

  if (allOrders.length === 0) {
    return <div className="text-center py-4 text-gray-500">No orders found</div>;
  }

  return (
    <div className="max-w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center">类型</TableHead>
            <TableHead className="text-center">单价</TableHead>
            <TableHead className="text-center">输入资产数量</TableHead>
            <TableHead className="text-center">输入聪</TableHead>
            <TableHead className="text-center">{`买到/卖出数量`}</TableHead>
            <TableHead className="text-center">{`剩余退款/未卖出`}</TableHead>
            <TableHead className="text-center">完成</TableHead>
            <TableHead className="text-center">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allOrders.map((order, i) => (
            <TableRow
              key={`${order.rawData.Id}-${i}`}
            >
              <TableCell className={`text-center font-bold ${order.side === "buy" ? "text-green-600" : "text-red-500"}`}>
                {order.side === "buy" ? "买" : "卖"}
              </TableCell>
              <TableCell className="text-center">{order.price}</TableCell>
              <TableCell className="text-center">{order.inAmt}</TableCell>
              <TableCell className="text-center">{order.inValue}</TableCell>
              <TableCell className="text-center">
                {order.side === "buy" ? order.outAmt : order.outValue}
              </TableCell>
              <TableCell className="text-center">
                {order.side === "buy" ? order.outValue : order.outAmt}
              </TableCell>
              <TableCell className="text-center">
                <span
                  className={`whitespace-nowrap px-2 py-0.5 rounded border text-xs font-semibold ${
                    Number(order.done) === 1
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cancelOrder(order)}
                  disabled={Number(order.done) !== 0}
                >
                  撤销
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {hasNextPage && (
        <div className="text-center py-4">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? '加载中...' : '加载更多'}
          </Button>
        </div>
      )}
    </div>
  );
} 