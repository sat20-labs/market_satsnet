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
import { useCommonStore } from "@/store";

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
  RemainingAmt?: {
    Value: number;
    Precision: number;
  };
  OutValue?: number;
  ServiceFee?: number;
  RemainingValue?: number;
  Done: number;
  OutTxId?: string;
  InUtxo?: string;
  Reason?: string;
  ToL1?: boolean;
  FromL1?: boolean;
}

export interface HistoryTableOrder {
  OrderTime: number;
  orderType: number;
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
  toL1?: boolean;

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
  const { network } = useCommonStore();
  console.log('rawOrders', rawOrders);
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
    return rawOrders.map((item): HistoryTableOrder & {
      displayOrderQuantity: number;
      displayTradeQuantity: number;
      displayTradeAmountSats: number;
      serviceFee: number;
      displayOrderTypeLabel: string | number;
      displayOrderStatusClass: string;
      displayOrderStatusBgClass: string;
    } => {
      const { value: price } = getValueFromPrecision(item.UnitPrice);
      const { value: inAmt } = getValueFromPrecision(item.InAmt);
      const { value: expectedAmt } = getValueFromPrecision(item.ExpectedAmt);
      const { value: outAmt } = getValueFromPrecision(item.OutAmt);
      const { value: remainingAmt } = getValueFromPrecision(item.RemainingAmt);
      if (item.OrderType === 3)  {
        console.log('item', item);
        
        console.log('price', price, 'inAmt', inAmt, 'expectedAmt', expectedAmt, 'outAmt', outAmt, 'remainingAmt', remainingAmt);
      }
      const inValue = item.InValue ? Number(item.InValue) : 0;
      const outValue = item.OutValue ? Number(item.OutValue) : 0;
      const remainingValue = item.RemainingValue ? Number(item.RemainingValue) : 0;
      const serviceFee = item.ServiceFee ? Number(item.ServiceFee) : 0;
      const displayOrderStatusClass = item.OrderType === 2 ? "text-green-600" : item.OrderType === 1 ? "text-red-500" : "text-gray-600";
      const displayOrderStatusBgClass = Number(item.Done) === 1
        ? "bg-green-500 text-green-700 border-green-400"
        : Number(item.Done) === 2
          ? "bg-gray-500 text-gray-700 border-gray-400"
          : "bg-blue-500 text-blue-700 border-blue-400";

      const displayOrderTypeLabel = orderTypeLabels[item.OrderType] || item.OrderType;
      const displayOrderQuantity = expectedAmt;
      let displayTradeQuantity = outAmt;
      let displayTradeAmountSats = outValue;
      
      if (item.OrderType === 1) {
        displayTradeQuantity = inAmt - remainingAmt - outAmt;
      }

      if (item.OrderType === 2 && outAmt > 0) {
        displayTradeAmountSats = inValue - remainingValue - serviceFee - outValue;
      }
      let status = t("common.limitorder_status_completed");
      if (item.OrderType === 1) {
        if (item.Done === 1) {
          status = t("common.limitorder_status_completed");
        } else if (item.Done === 2) {
          status = t("common.limitorder_status_cancelled");
        } else {
          status = t("common.limitorder_status_pending_sell");
        }
      }
      if (item.OrderType === 2) {
        if (item.Done === 1) {
          status = t("common.limitorder_status_completed");
        } else if (item.Done === 2) {
          status = t("common.limitorder_status_cancelled");
        } else {
          status = t("common.limitorder_status_pending_buy");
        }
      }

      return {
        orderType: item.OrderType,
        price,
        quantity: inAmt,
        status,
        done: item.Done,
        outAmt,
        expectedAmt,
        outValue,
        inValue,
        inAmt,
        remainingAmt,
        remainingValue,
        OrderTime: item.OrderTime,
        rawData: item,
        toL1: item.ToL1,
        reason: item.Reason || '',
        displayOrderTypeLabel,
        displayOrderQuantity,
        displayTradeQuantity,
        displayTradeAmountSats,
        serviceFee,
        displayOrderStatusClass,
        displayOrderStatusBgClass,
      };
    });
  }, [rawOrders, t, orderTypeLabels]);
  console.log('orders', orders);
  if (isLoading) {
    return <div className="text-center py-2">{t("common.loading")}</div>;
  }

  if (!orders.length) {
    return <div className="text-center py-2 text-gray-500">{noDataMessage}</div>;
  }

  return (
    <div className="max-w-full">
      <div className="w-full max-h-80 rounded-md overflow-y-auto">
        <Table className="overflow-x-auto">
          <TableHeader>
            <TableRow className="bg-zinc-800 text-gray-500 text-xs">
              <TableHead className="text-center whitespace-nowrap">{t("common.limitorder_history_type")}</TableHead>
              <TableHead className="text-center whitespace-nowrap">{t("common.limitorder_history_order_time")}</TableHead>
              <TableHead className="text-center whitespace-nowrap">{t("common.limitorder_history_unit_price")}</TableHead>
              <TableHead className="text-center whitespace-nowrap">{t("common.limitorder_history_order_quantity")}</TableHead>
              <TableHead className="text-center whitespace-nowrap">{t("common.limitorder_history_trade_quantity")}</TableHead>
              <TableHead className="text-center whitespace-nowrap">{t("common.limitorder_history_trade_amount_sats")}</TableHead>
              {/* <TableHead className="text-center whitespace-nowrap">{t("common.service_fee")}</TableHead> */}
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
                  <TableCell className={`text-center font-bold ${order.displayOrderStatusClass}`}>
                    {order.displayOrderTypeLabel}
                  </TableCell>
                  <TableCell className="text-center">{formatTimeToMonthDayHourMinute(order.OrderTime)}</TableCell>
                  <TableCell className="text-center">{order.price.toFixed(8)}</TableCell>
                  <TableCell className="text-center">{order.displayOrderQuantity}</TableCell>
                  <TableCell className="text-center">{order.displayTradeQuantity}</TableCell>
                  <TableCell className="text-center">{order.displayTradeAmountSats}</TableCell>
                  {/* <TableCell className="text-center">{order.serviceFee}</TableCell> */}
                  <TableCell className="text-center">
                    <span
                      className={`whitespace-nowrap px-2 py-0.5 rounded border text-xs font-semibold ${order.displayOrderStatusBgClass}`}
                      title={order.status}
                    >
                      {order.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">{order.reason}</TableCell>
                  <TableCell className="text-center">
                    {order.rawData.OutTxId ? (
                      <a
                        href={generateMempoolUrl({ network: network, path: `tx/${order.rawData.OutTxId}`, chain: order.rawData?.ToL1 ? Chain.BTC : Chain.SATNET, env: 'dev' })}
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
                        href={generateMempoolUrl({ network: network, path: `tx/${order.rawData.InUtxo}`, chain: order.rawData.FromL1 ? Chain.BTC : Chain.SATNET, env: 'dev' })}
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