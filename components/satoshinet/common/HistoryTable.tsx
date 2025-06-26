import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink } from 'lucide-react';
import { generateMempoolUrl } from '@/utils/url';
import { Chain } from "@/types";
import { getValueFromPrecision } from "@/utils";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RawOrderData {
  Id: string | number;
  OrderTime: number;
  OrderType: number;
  UnitPrice?: {
    Value: number;
    Precision: number;
  };
  InAmt?: {
    Value: number;
    Precision: number;
  };
  InValue?: number;
  ExpectedAmt?: {
    Value: number;
    Precision: number;
  };
  OutAmt?: {
    Value: number;
    Precision: number;
  };
  OutValue?: number;
  Done: number;
  OutTxId?: string;
  InUtxo?: string;
  Reason?: string;
}

export interface HistoryTableOrder {
  OrderTime: number;
  side: string;
  price: number;
  quantity: number;
  status: string;
  done: number;
  outAmt: number;
  expectedAmt: number;
  outValue: number;
  inValue: number;
  inAmt: number;
  remainingAmt: number;
  remainingValue: number;
  rawData: RawOrderData;
  reason?: string;
}

interface HistoryTableProps {
  rawOrders: RawOrderData[];
  orderTypeLabels: Record<number, string>;
  isLoading: boolean;
  noDataMessage: string;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
  showReason?: boolean;
  chain?: Chain;
}

function formatTimeToMonthDayHourMinute(orderTime: number) {
  try {
    const date = new Date(orderTime * 1000);
    return format(date, 'MM-dd HH:mm:ss');
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
}

export default function HistoryTable({
  rawOrders,
  orderTypeLabels,
  isLoading,
  noDataMessage,
  isFetchingNextPage,
  hasNextPage,
  onLoadMore,
  showReason = false,
  chain,
}: HistoryTableProps) {
  const { t } = useTranslation();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
          onLoadMore();
        }
      },
      {
        root: null,
        rootMargin: '20px',
        threshold: 0.1,
      }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  // Process raw orders into formatted orders
  const orders = React.useMemo(() => {
    return rawOrders.map((item): HistoryTableOrder => {
      const isBuy = item.OrderType === 2;
      const isCancelled = item.OrderType === 3;
      const side = isCancelled ? "Cancelled" : (isBuy ? "Buy" : "Sell");
      const { value: price } = getValueFromPrecision(item.UnitPrice);
      const { value: inAmt } = getValueFromPrecision(item.InAmt);
      const { value: expectedAmt } = getValueFromPrecision(item.ExpectedAmt);
      const { value: outAmt } = getValueFromPrecision(item.OutAmt);
      
      const inValue = typeof item.InValue === 'number' ? item.InValue : 0;
      const outValue = typeof item.OutValue === 'number' ? item.OutValue : 0;
      const remainingAmt = 0; // Add if needed from raw data
      const remainingValue = 0; // Add if needed from raw data

      let status: string;
      if (item.Done === 1) {
        status = t("common.limitorder_status_completed");
      } else if (item.Done === 2) {
        status = t("common.limitorder_status_cancelled");
      } else {
        status = t("common.limitorder_status_pending");
      }

      return {
        side,
        price,
        quantity: inAmt,
        status,
        done: isCancelled ? 2 : item.Done,
        outAmt,
        expectedAmt,
        outValue,
        inValue,
        inAmt,
        remainingAmt,
        remainingValue,
        OrderTime: item.OrderTime,
        rawData: item,
        reason: item.Reason || '',
      };
    });
  }, [rawOrders, t]);

  if (isLoading) {
    return <div className="text-center py-2">{t("common.loading")}</div>;
  }

  if (!orders.length) {
    return <div className="text-center py-2 text-gray-500">{noDataMessage}</div>;
  }

  return (
    <div className="max-w-full">
      <div className="w-full max-h-80 rounded-md border overflow-y-auto">
        <Table className="overflow-x-auto">
          <TableHeader>
            <TableRow className="bg-zinc-800 text-gray-500 text-xs">
              <TableHead className="text-center whitespace-nowrap">{t("common.limitorder_history_type")}</TableHead>
              <TableHead className="text-center whitespace-nowrap">{t("common.limitorder_history_order_time")}</TableHead>
              <TableHead className="text-center whitespace-nowrap">{t("common.limitorder_history_unit_price")}</TableHead>
              <TableHead className="text-center whitespace-nowrap">{t("common.limitorder_history_order_quantity")}</TableHead>
              <TableHead className="text-center whitespace-nowrap">{t("common.limitorder_history_order_amount_sats")}</TableHead>
              <TableHead className="text-center whitespace-nowrap">{t("common.limitorder_history_trade_quantity")}</TableHead>
              <TableHead className="text-center whitespace-nowrap">{t("common.limitorder_history_trade_amount_sats")}</TableHead>
              <TableHead className="text-center whitespace-nowrap">{t("common.limitorder_history_status")}</TableHead>
              <TableHead className="text-center whitespace-nowrap">Reason</TableHead>
              <TableHead className="text-center whitespace-nowrap">{t("common.tx")}</TableHead>
              <TableHead className="text-center whitespace-nowrap">UTXO</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders
              .slice()
              .sort((a, b) => b.OrderTime - a.OrderTime)
              .map((order, i) => (
                <TableRow className="text-xs" key={`${order.rawData.Id || i}-${i}`}>
                  <TableCell className={`text-center font-bold ${order.rawData.OrderType === 2 ? "text-green-600" : order.rawData.OrderType === 1 ? "text-red-500" : "text-gray-600"}`}>
                    {orderTypeLabels[order.rawData.OrderType] || order.rawData.OrderType}
                  </TableCell>
                  <TableCell className="text-center">{formatTimeToMonthDayHourMinute(order.OrderTime)}</TableCell>
                  <TableCell className="text-center">{order.price}</TableCell> 
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
                  <TableCell className="text-center">{order.reason}</TableCell>
                  <TableCell className="text-center">
                    {order.status === t("common.limitorder_status_completed") && order.rawData.OutTxId ? (
                      <a
                        href={generateMempoolUrl({ network: 'testnet', path: `tx/${order.rawData.OutTxId}`, chain: chain || Chain.SATNET, env: 'dev' })}
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
                        href={generateMempoolUrl({ network: 'testnet', path: `tx/${order.rawData.InUtxo}`, chain: chain || Chain.SATNET, env: 'dev' })}
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
          <div ref={loadMoreRef} className="text-center py-2 bg-background/80 backdrop-blur-sm">
            {isFetchingNextPage && (
              <div className="text-gray-500">{t("common.loading")}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 