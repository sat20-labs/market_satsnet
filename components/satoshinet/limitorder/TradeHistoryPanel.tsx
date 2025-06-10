import React from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
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

interface TradeHistoryPanelProps {
  contractURL: string;
}

// TradeHistory 数据结构映射到 MyOrdersPanel 的表格字段
const fetchTradeHistory = async (contractURL: string, pageStart: number = 0, pageLimit: number = 20) => {
  if (!contractURL) return [];
  try {
    const result = await window.sat20.getContractInvokeHistoryInServer(contractURL, pageStart, pageLimit);
    let tradeList: any[] = [];
    if (result && result.history) {
      try {
        const historyObj = JSON.parse(result.history);
        const data = Array.isArray(historyObj.data) ? historyObj.data : [];
        tradeList = data.map((item: any) => {
          // 类型
          const isBuy = item.OrderType === 2;
          // 单价
          const price = item.UnitPrice && typeof item.UnitPrice.Value === 'number' && typeof item.UnitPrice.Precision === 'number'
            ? item.UnitPrice.Value / Math.pow(10, item.UnitPrice.Precision)
            : 0;
          // 挂单数量
          const inAmt = item.InAmt && typeof item.InAmt.Value === 'number' && typeof item.InAmt.Precision === 'number'
            ? item.InAmt.Value / Math.pow(10, item.InAmt.Precision)
            : 0;
          // 挂单金额（聪）
          const inValue = typeof item.InValue === 'number' ? item.InValue : 0;
          // 期望数量
          const expectedAmt = item.ExpectedAmt && typeof item.ExpectedAmt.Value === 'number' && typeof item.ExpectedAmt.Precision === 'number'
            ? item.ExpectedAmt.Value / Math.pow(10, item.ExpectedAmt.Precision)
            : 0;
          // 成交数量
          const outAmt = item.OutAmt && typeof item.OutAmt.Value === 'number' && typeof item.OutAmt.Precision === 'number'
            ? item.OutAmt.Value / Math.pow(10, item.OutAmt.Precision)
            : 0;
          // 剩余退款
          const outValue = typeof item.OutValue === 'number' ? item.OutValue : 0;
          // 完成状态
          let status: string;
          switch (item.Done) {
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
            done: item.Done,
            outAmt,
            expectedAmt,
            outValue,
            inValue,
            inAmt,
            OrderTime: item.OrderTime,
            rawData: item,
          };
        });
        // 按时间倒序排序
        tradeList.sort((a, b) => (b.OrderTime || 0) - (a.OrderTime || 0));
      } catch (e) {
        console.error('history parse error', e);
      }
    }
    return tradeList;
  } catch (e) {
    return [];
  }
};

function formatTimeToMonthDayHourMinute(orderTime: number) {
  const date = new Date(orderTime / 1000);
  return format(date, 'MM-dd HH:mm');
}

export default function TradeHistoryPanel({ contractURL }: TradeHistoryPanelProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['tradeHistoryPanel', contractURL],
    queryFn: ({ pageParam = 0 }) => fetchTradeHistory(contractURL, pageParam * 20, 20),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 20 ? allPages.length : undefined;
    },
    initialPageParam: 0,
    refetchInterval: 10000,
    enabled: !!contractURL,
  });

  const allOrders = data?.pages.flat() ?? [];

  if (isLoading) {
    return <div className="text-center py-4">加载中...</div>;
  }

  if (allOrders.length === 0) {
    return <div className="text-center py-4 text-gray-500">暂无成交记录</div>;
  }

  return (
    <div className="max-w-full overflow-x-auto">
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {allOrders.map((order, i) => (
            <TableRow key={`${order.rawData.Id || i}-${i}`}>  {/* Id 可能不存在 */}
              <TableCell className={`text-center font-bold ${order.side === "buy" ? "text-green-600" : "text-red-500"}`}>{order.side === "buy" ? "买" : "卖"}</TableCell>
              <TableCell className="text-center">{formatTimeToMonthDayHourMinute(order.OrderTime)}</TableCell>
              <TableCell className="text-center">{Number(order.price).toFixed(10)}</TableCell>
              <TableCell className="text-center">{order.side === "sell" ? order.inAmt : order.expectedAmt}</TableCell>
              <TableCell className="text-center">{order.inValue}</TableCell>
              <TableCell className="text-center">{order.outAmt}</TableCell>
              <TableCell className="text-center">{(order.side === "buy" && order.done !== 0) ? order.inValue - order.outValue : '-'}</TableCell>
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