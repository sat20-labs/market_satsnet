import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useInfiniteQuery, useQueryClient, useQuery } from "@tanstack/react-query";
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import { format } from 'date-fns';
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
import { Card } from "@/components/ui/card";
import { ExternalLink } from 'lucide-react';
import { generateMempoolUrl } from '@/utils/url';
import { Chain } from '@/types';

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
    const side = isCancelled ? "撤销" : (isBuy ? "买" : "卖");
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
      status = "已撤销";
    } else {
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
    return <div className="text-center py-4">Loading orders...</div>;
  }

  if (allOrders.length === 0) {
    return <div className="text-center py-4 text-gray-500">No orders found</div>;
  }

  return (
    <div className="max-w-full overflow-x-auto">
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={cancelOrder}
        >
          撤销
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center whitespace-nowrap">类型</TableHead>
            <TableHead className="text-center whitespace-nowrap">挂单时间</TableHead>
            <TableHead className="text-center whitespace-nowrap">单价</TableHead>
            <TableHead className="text-center whitespace-nowrap">挂单数量</TableHead>
            <TableHead className="text-center whitespace-nowrap">挂单金额（sats）</TableHead>
            <TableHead className="text-center whitespace-nowrap">成交数量</TableHead>
            <TableHead className="text-center whitespace-nowrap">成交金额（sats）</TableHead>
            <TableHead className="text-center whitespace-nowrap">完成</TableHead>
            <TableHead className="text-center whitespace-nowrap">交易</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allOrders.map((order, i) => (
            <TableRow
              key={`${order.rawData.Id}-${i}`}
            >
              <TableCell className={`text-center font-bold ${order.side === "撤销" ? "text-gray-600" : order.side === "买" ? "text-green-600" : "text-red-500"}`}>
                {order.side}
              </TableCell>
              <TableCell className="text-center">{formatTimeToMonthDayHourMinute(order.rawData.OrderTime)}</TableCell>
              <TableCell className="text-center">{Number(order.price)}</TableCell>
              <TableCell className="text-center">{order.side === "撤销" ? "-" : (order.side === "卖" ? order.inAmt : order.expectedAmt)}</TableCell>
              <TableCell className="text-center">{order.side === "撤销" ? "-" : order.inValue}</TableCell>
              <TableCell className="text-center">
                {order.side === "撤销" ? "-" : order.outAmt}
              </TableCell>
              <TableCell className="text-center">
                {order.side === "撤销" ? "-" : (order.side === "买" && order.done !== 0) ? order.inValue - order.outValue : '-'}
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
              <TableCell className="text-center">
                {order.status === "已成交" && order.rawData.OutTxId ? (
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