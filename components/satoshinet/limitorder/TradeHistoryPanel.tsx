import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { format } from 'date-fns';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface TradeHistoryPanelProps {
  contractURL: string;
}

async function fetchTradeHistory(contractURL: string, pageStart: number = 0, pageLimit: number = 20) {
  if (!contractURL) return [];
  try {
    const result = await window.sat20.getContractInvokeHistoryInServer(contractURL, pageStart, pageLimit);
    // 解析 result.history
    let tradeList: any[] = [];
    if (result && result.history) {
      try {
        const historyObj = JSON.parse(result.history);
        const data = Array.isArray(historyObj.data) ? historyObj.data : [];
        tradeList = data.map((item: any) => {
          // 价格处理：Value / 10^Precision
          let price = '--';
          if (item.UnitPrice && typeof item.UnitPrice.Value === 'number' && typeof item.UnitPrice.Precision === 'number') {
            price = (item.UnitPrice.Value / Math.pow(10, item.UnitPrice.Precision)).toString();
          }
          // 数量处理：优先 InValue，没有则用 RemainingValue
          let amt = '--';
          if (typeof item.InValue === 'number') {
            amt = item.InValue.toString();
          } else if (typeof item.RemainingValue === 'number') {
            amt = item.RemainingValue.toString();
          }
          return {
            Time: item.OrderTime,
            Price: price,
            Amt: amt,
            // 可扩展更多字段
          };
        });
        // 按时间倒序排序
        tradeList.sort((a, b) => (b.Time || 0) - (a.Time || 0));
      } catch (e) {
        // history 字符串解析失败
        console.error('history parse error', e);
      }
    }
    return tradeList;
  } catch (e) {
    return [];
  }
}

function formatTimeToMonthDayHourMinute(orderTime: number) {
  const date = new Date(orderTime / 1000);
  return format(date, 'MM-dd HH:mm');
}

export default function TradeHistoryPanel({ contractURL }: TradeHistoryPanelProps) {
  const { data: tradeHistory = [], isLoading } = useQuery({
    queryKey: ["tradeHistory", contractURL],
    queryFn: () => fetchTradeHistory(contractURL),
    enabled: !!contractURL,
  });
  console.log('tradeHistory', tradeHistory);
  

  return (
    <div className="h-64 overflow-auto">
      {isLoading ? (
        <div className="text-center text-zinc-400 py-4">加载中...</div>
      ) : tradeHistory.length === 0 ? (
        <div className="text-center text-zinc-400 py-4">暂无成交记录</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>时间</TableHead>
              <TableHead>价格</TableHead>
              <TableHead>数量</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tradeHistory.map((trade: any, i: number) => (
              <TableRow key={i}>
                <TableCell>{trade.Time ? formatTimeToMonthDayHourMinute(trade.Time) : (trade.Utxo || '--')}</TableCell>
                <TableCell>{trade.Price || trade.price || '--'}</TableCell>
                <TableCell>{trade.Amt || trade.amount || '--'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
} 