import React, { useEffect, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next"; // 引入 i18next

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExternalLink } from 'lucide-react';
import { generateMempoolUrl } from '@/utils/url';
import { Chain } from "@/types";
import { getContractInvokeHistory } from "@/api/market";

interface TradeHistoryPanelProps {
  contractURL: string;
}

// TradeHistory 数据结构映射到 MyOrdersPanel 的表格

function formatTimeToMonthDayHourMinute(orderTime: number) {
  const date = new Date(orderTime * 1000);
  return format(date, 'MM-dd HH:mm');
}

export default function TradeHistoryPanel({ contractURL }: TradeHistoryPanelProps) {
  const pageSize = 20;
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation(); // 使用 useTranslation 钩子

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

  const fetchTradeHistory = async (contractURL: string, pageStart: number = 0, pageLimit: number = 20) => {
    if (!contractURL) return { data: [], total: 0 };
    try {
      const { status } = await getContractInvokeHistory(contractURL, pageStart, pageLimit);
      let tradeList: any[] = [];
      let total = 0;
      if (status) {
        try {
          const historyObj = JSON.parse(status);
          const data = Array.isArray(historyObj.data) ? historyObj.data.filter(Boolean) : [];
          total = historyObj.total || data.length;
          tradeList = data.map((item: any) => {
            const price = item.UnitPrice && typeof item.UnitPrice.Value === 'number' && typeof item.UnitPrice.Precision === 'number'
              ? item.UnitPrice.Value / Math.pow(10, item.UnitPrice.Precision)
              : 0;
            const inAmt = item.InAmt && typeof item.InAmt.Value === 'number' && typeof item.InAmt.Precision === 'number'
              ? item.InAmt.Value / Math.pow(10, item.InAmt.Precision)
              : 0;
            const inValue = typeof item.InValue === 'number' ? item.InValue : 0;
            const expectedAmt = item.ExpectedAmt && typeof item.ExpectedAmt.Value === 'number' && typeof item.ExpectedAmt.Precision === 'number'
              ? item.ExpectedAmt.Value / Math.pow(10, item.ExpectedAmt.Precision)
              : 0;
            const outAmt = item.OutAmt && typeof item.OutAmt.Value === 'number' && typeof item.OutAmt.Precision === 'number'
              ? item.OutAmt.Value / Math.pow(10, item.OutAmt.Precision)
              : 0;
            const outValue = typeof item.OutValue === 'number' ? item.OutValue : 0;
            let status: string;
            switch (item.Done) {
              case 1:
                status = t("common.limitorder_status_completed");
                break;
              case 2:
                status = t("common.limitorder_status_cancelled");
                break;
              default:
                status = t("common.limitorder_status_pending");
            }
            return {
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
          tradeList.sort((a, b) => (b.OrderTime || 0) - (a.OrderTime || 0));
        } catch (e) {
          console.error('history parse error', e);
        }
      }
      return { data: tradeList, total };
    } catch (e) {
      return { data: [], total: 0 };
    }
  };
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['tradeHistoryPanel', contractURL],
    queryFn: ({ pageParam = 0 }) => fetchTradeHistory(contractURL, pageParam * pageSize, pageSize),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.data.length) return undefined;
      return allPages.length;
    },
    initialPageParam: 0,
    // refetchInterval: 3000,
    refetchIntervalInBackground: false,
    enabled: !!contractURL,
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allOrders = data?.pages.flatMap(page => page.data) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  console.log('allOrders', allOrders);
  if (isLoading) {
    return <div className="text-center py-4">{t("common.limitorder_history_loading")}</div>;
  }

  if (allOrders.length === 0) {
    return <div className="text-center py-4 text-gray-500">{t("common.limitorder_history_no_trade_records")}</div>;
  }

  return (
    <div className="max-w-full overflow-x-auto">
      <Table>
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
            <TableHead className="text-center whitespace-nowrap">{t("common.tx")}</TableHead>
            <TableHead className="text-center whitespace-nowrap">UTXO</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allOrders .slice()
            .sort((a, b) => b.rawData.OrderTime - a.rawData.OrderTime)
            .map((order, i) => (
            <TableRow className="text-xs" key={`${order.rawData.Id || i}-${i}`}>
              <TableCell className={`text-center font-bold ${order.rawData.OrderType === 2 ? "text-green-600" : order.rawData.OrderType === 1 ? "text-red-500" : "text-gray-600"}`}>
                {ORDER_TYPE_LABELS[order.rawData.OrderType] || order.rawData.OrderType}
              </TableCell>
              <TableCell className="text-center">{formatTimeToMonthDayHourMinute(order.OrderTime)}</TableCell>
              <TableCell className="text-center">{Number(order.price)}</TableCell>
              <TableCell className="text-center">{order.quantity}</TableCell>
              <TableCell className="text-center">{order.inValue}</TableCell>
              <TableCell className="text-center">{order.outAmt}</TableCell>
              <TableCell className="text-center">{order.outValue}</TableCell>
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
      <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
        {isFetchingNextPage ? (
          <div className="text-gray-500">{t("common.limitorder_history_loading")}</div>
        ) : hasNextPage ? (
          <div className="text-gray-500">{t("common.limitorder_history_scroll_to_load_more")}</div>
        ) : (
          <div className="text-gray-500">{t("common.limitorder_history_no_more_data")}</div>
        )}
      </div>
    </div>
  );
} 