'use client';
import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink } from 'lucide-react';
import { generateMempoolUrl } from '@/utils/url';
import { Chain } from "@/types";
import { getValueFromPrecision } from "@/utils";
import { format } from "date-fns";
import { BtcPrice } from "../../BtcPrice";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCommonStore } from "@/store";
import { TableVirtuoso } from 'react-virtuoso';
import { AssetInfo } from "../AssetInfo";

interface RawOrderData {
  Id: string | number;
  AssetName?: string;
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
  const { network, btcPrice } = useCommonStore();
  const mobileLoadMoreRef = useRef<HTMLDivElement>(null);
  const desktopLoadMoreRef = useRef<HTMLDivElement>(null);
  const desktopScrollRef = useRef<HTMLDivElement>(null);
  const lastLoadRef = useRef(0);
  const MIN_LOAD_INTERVAL = 800; // ms throttle

  const tryLoadMore = React.useCallback(() => {
    const now = Date.now();
    if (!hasNextPage || isFetchingNextPage) return;
    if (now - lastLoadRef.current < MIN_LOAD_INTERVAL) return; // throttle
    lastLoadRef.current = now;
    onLoadMore();
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  // Process raw orders into formatted orders
  const orders = React.useMemo(() => {
    const mapped = rawOrders.map((item): HistoryTableOrder & {
      displayOrderQuantity: number;
      displayTradeQuantity: number;
      displayTradeAmountSats: number;
      serviceFee: number;
      displayOrderTypeLabel: string | number;
      displayOrderStatusClass: string;
      displayOrderStatusBgClass: string;
      displayAssetName?: React.ReactNode;
    } => {
      const formatAssetName = (raw?: string): React.ReactNode => {
        if (!raw) return '';
        const parts = raw.split(':');
        if (parts.length >= 2) {
          const protocol = parts[0];
          const name = parts[parts.length - 1];
          if (name) {
            return <>{name.toUpperCase()} <span className="text-zinc-500">({protocol})</span></>;
          }
        }
        return raw;
      };
      const { value: price } = getValueFromPrecision(item.UnitPrice);
      const { value: inAmt } = getValueFromPrecision(item.InAmt);
      const { value: expectedAmt } = getValueFromPrecision(item.ExpectedAmt);
      const { value: outAmt } = getValueFromPrecision(item.OutAmt);
      const { value: remainingAmt } = getValueFromPrecision(item.RemainingAmt);
      if (item.OrderType === 3) {
        //console.log('item', item);

        //console.log('price', price, 'inAmt', inAmt, 'expectedAmt', expectedAmt, 'outAmt', outAmt, 'remainingAmt', remainingAmt);
      }
      const inValue = item.InValue ? Number(item.InValue) : 0;
      const outValue = item.OutValue ? Number(item.OutValue) : 0;
      const remainingValue = item.RemainingValue ? Number(item.RemainingValue) : 0;
      const serviceFee = item.ServiceFee ? Number(item.ServiceFee) : 0;
      const displayOrderStatusClass = item.OrderType === 2 ? "text-green-600" : item.OrderType === 1 ? "text-red-500" : "text-gray-600";
      const displayOrderStatusBgClass = Number(item.Done) === 1
        ? "text-green-500"
        : Number(item.Done) === 2
          ? "text-gray-400"
          : "text-blue-500";

      const displayOrderTypeLabel = orderTypeLabels[item.OrderType] || item.OrderType;
      const displayOrderQuantity = expectedAmt;
      let displayTradeQuantity = outAmt;
      let displayTradeAmountSats = outValue;
      const displayAssetName = formatAssetName(item.AssetName);

      if (item.OrderType === 1) {
        displayTradeQuantity = inAmt - remainingAmt - outAmt;
      }

      if (item.OrderType === 2 && outAmt > 0) {
        displayTradeAmountSats = inValue - remainingValue - serviceFee - outValue;
      }
      let status = item.Done === 1 ? t("common.limitorder_status_completed") : item.Done === 2 ? t("common.limitorder_status_cancelled") : t("common.limitorder_status_pending");
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
        displayAssetName,
      };
    });
    // Sort once here (desc by time)
    mapped.sort((a, b) => b.OrderTime - a.OrderTime);
    return mapped;
  }, [rawOrders, t, orderTypeLabels]);
  const ordersVirtualized = orders.length > 150;

  // Intersection observer for non-virtualized lists (desktop + mobile)
  useEffect(() => {
    if (ordersVirtualized) return; // virtuoso handles endReached
    const observer = new IntersectionObserver(
      (entries) => {
        for (const target of entries) {
          if (target.isIntersecting) {
            tryLoadMore();
            break;
          }
        }
      },
      {
        root: desktopScrollRef.current ?? null,
        rootMargin: '20px',
        threshold: 0.1,
      }
    );
    if (mobileLoadMoreRef.current) observer.observe(mobileLoadMoreRef.current);
    if (desktopLoadMoreRef.current) observer.observe(desktopLoadMoreRef.current);
    return () => {
      if (mobileLoadMoreRef.current) observer.unobserve(mobileLoadMoreRef.current);
      if (desktopLoadMoreRef.current) observer.unobserve(desktopLoadMoreRef.current);
    };
  }, [hasNextPage, isFetchingNextPage, tryLoadMore, ordersVirtualized]);

  // Window scroll fallback for mobile
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (ordersVirtualized) return;
    const handle = () => {
      if (!hasNextPage || isFetchingNextPage) return;
      const el = mobileLoadMoreRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.top - window.innerHeight < 120) {
        tryLoadMore();
      }
    };
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          handle();
        });
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    handle();
    return () => window.removeEventListener('scroll', onScroll);
  }, [hasNextPage, isFetchingNextPage, tryLoadMore, ordersVirtualized]);

  const formatUsdFromSats = React.useCallback((sats: number) => {
    if (!btcPrice) return '-';
    const usd = (sats / 1e8) * btcPrice;
    if (!Number.isFinite(usd)) return '-';
    return usd.toFixed(2);
  }, [btcPrice]);
  console.log('orders', orders);
  if (isLoading) {
    return <div className="text-center py-2">{t("common.loading")}</div>;
  }

  if (!orders.length) {
    return <div className="text-center py-2 text-gray-500">{noDataMessage}</div>;
  }

  return (
    <div className="max-w-full">
      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {orders.map((order, i) => {
          const sats = order.displayTradeAmountSats;
          const usdVal = formatUsdFromSats(Number(sats));
          return (
            <div key={`${order.rawData.Id || i}-m`} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
              <div className="flex items-start justify-between pb-2 border-b border-zinc-800 gap-3">
                <div className="flex justify-center items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-sm text-[11px] font-medium first-letter:uppercase ${order.orderType === 2 ? 'bg-green-500/50 text-zinc-200 border border-green-500/40' : order.orderType === 1 ? 'bg-red-500/50 text-zinc-200 border border-red-500/40' : 'bg-zinc-700/40 text-zinc-300 border border-zinc-600/60'}`}>{order.displayOrderTypeLabel}</span>
                  {order.displayAssetName && <span className="text-[11px] text-zinc-400">{order.displayAssetName}</span>}
                </div>
                <div className="text-[11px] text-zinc-400">{formatTimeToMonthDayHourMinute(order.OrderTime)}</div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                <div className="bg-zinc-900/50 rounded p-1">
                  <div className="text-zinc-400">{t('common.limitorder_history_unit_price')}</div>
                  <div className="font-semibold">{order.price.toFixed(8)}</div>
                </div>
                <div className="bg-zinc-900/50 rounded p-1">
                  <div className="text-zinc-400">{t('common.limitorder_history_order_quantity')}</div>
                  <div className="font-semibold">{order.displayOrderQuantity}</div>
                </div>
                <div className="bg-zinc-900/50 rounded p-1">
                  <div className="text-zinc-400">{t('common.limitorder_history_trade_quantity')}</div>
                  <div className="font-semibold">{order.displayTradeQuantity}</div>
                </div>
                <div className="bg-zinc-900/50 rounded p-1">
                  <div className="text-zinc-400">{t('common.limitorder_history_trade_amount_sats')}</div>
                  <div className="font-semibold">{sats}<span className="text-zinc-500"> sats</span><br /><span className="text-[10px] text-zinc-500">${usdVal}</span></div>
                </div>
                {/* <div className="bg-zinc-900/50 rounded p-1 col-span-2">
                  <div className="text-zinc-400">{t('common.limitorder_history_status')}</div>
                  <span className={`whitespace-nowrap px-2 py-0.5 rounded border text-[11px] font-semibold ${order.displayOrderStatusBgClass}`}>{order.status}</span>
                </div> */}
              </div>
              <div className="mt-2 flex justify-between items-center gap-3 text-zinc-400">
                <span className={`whitespace-nowrap px-2 py-0.5 rounded text-[11px] font-semibold ${order.displayOrderStatusBgClass}`}>{order.status}</span>
                <span className="flex items-center gap-3">
                  <a
                    href={order.rawData.OutTxId ? generateMempoolUrl({ network: network, path: `tx/${order.rawData.OutTxId}`, chain: order.rawData?.ToL1 ? Chain.BTC : Chain.SATNET, env: 'dev' }) : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1 ${order.rawData.OutTxId ? 'hover:text-primary' : 'opacity-50 pointer-events-none'}`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="text-[11px]">TX</span>
                  </a>
                  <a
                    href={order.rawData.InUtxo ? generateMempoolUrl({ network: network, path: `tx/${order.rawData.InUtxo}`, chain: order.rawData.FromL1 ? Chain.BTC : Chain.SATNET, env: 'dev' }) : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1 ${order.rawData.InUtxo ? 'hover:text-primary' : 'opacity-50 pointer-events-none'}`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="text-[11px]">UTXO</span>
                  </a>
                </span>
              </div>
              {showReason && order.reason && (
                <div className="mt-2 text-[11px] text-amber-400/90">{order.reason}</div>
              )}
            </div>
          );
        })}
        {hasNextPage && (
          <div ref={mobileLoadMoreRef} className="h-8 flex items-center justify-center text-gray-500 text-xs">
            {isFetchingNextPage && <span>{t('common.loading')}</span>}
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        {!ordersVirtualized && (
          <div ref={desktopScrollRef} className="relative w-full h-[60vh] min-h-[420px] rounded-md border overflow-y-auto">
            <Table className="overflow-x-auto">
              <TableHeader>
                <TableRow className="bg-zinc-800 text-gray-500 text-xs">
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">{t("common.limitorder_history_type")}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">{t("common.limitorder_history_order_time")}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">{t("common.limitorder_history_unit_price")}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">{t("common.limitorder_history_order_quantity")}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">{t("common.limitorder_history_trade_quantity")}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">{t("common.limitorder_history_trade_amount_sats")}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">{t("common.limitorder_history_status")}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">{t("common.tx")}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">UTXO</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order, i) => {
                  return (
                    <TableRow className="text-xs" key={`${order.rawData.Id || i}-d`}>
                      <TableCell className={`text-center font-medium first-letter:uppercase ${order.displayOrderStatusClass}`}>{order.displayOrderTypeLabel}

                      </TableCell>
                      <TableCell className="text-center">{formatTimeToMonthDayHourMinute(order.OrderTime)}</TableCell>
                      <TableCell className="text-center">{order.price.toFixed(8)}</TableCell>
                      <TableCell className="text-center">{order.displayOrderQuantity}</TableCell>
                      <TableCell className="text-center">{order.displayTradeQuantity}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center leading-none gap-2">
                          <div className="text-[13px]">{order.displayTradeAmountSats}</div>
                          <div className="text-[10px] font-medium text-zinc-500">$<BtcPrice btc={Number(order.displayTradeAmountSats) / 100000000} /></div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`whitespace-nowrap px-2 py-0.5 rounded border text-xs ${order.displayOrderStatusBgClass}`} title={order.status}>{order.status}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {order.rawData.OutTxId ? (
                          <a href={generateMempoolUrl({ network: network, path: `tx/${order.rawData.OutTxId}`, chain: order.rawData?.ToL1 ? Chain.BTC : Chain.SATNET, env: 'dev' })} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center hover:text-primary">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : ('-')}
                      </TableCell>
                      <TableCell className="text-center">
                        {order.rawData.InUtxo ? (
                          <a href={generateMempoolUrl({ network: network, path: `tx/${order.rawData.InUtxo}`, chain: order.rawData.FromL1 ? Chain.BTC : Chain.SATNET, env: 'dev' })} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center hover:text-primary">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : ('-')}
                      </TableCell>
                      <TableCell className="text-center">{order.reason}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {hasNextPage && (
              <div ref={desktopLoadMoreRef} className="h-8 flex items-center justify-center text-gray-500 text-xs">
                {isFetchingNextPage && <span>{t('common.loading')}</span>}
              </div>
            )}
            {isFetchingNextPage && (
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex items-center justify-center text-[11px] text-gray-500 bg-background/60 backdrop-blur-sm h-6">{t('common.loading')}</div>
            )}
          </div>
        )}
        {ordersVirtualized && (
          <div className="relative w-full h-[60vh] min-h-[420px] rounded-md border overflow-hidden">
            <TableVirtuoso
              data={orders}
              endReached={() => tryLoadMore()}
              overscan={60}
              components={{
                Table: (props) => <Table {...props} className="overflow-x-auto" />,
                TableHead: (props) => <thead {...props} />,
                TableRow: (props) => <tr {...props} className="text-xs" />,
              }}
              fixedHeaderContent={() => (
                <TableRow className="bg-zinc-800 text-gray-500 text-xs">
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">{t('common.limitorder_history_type')}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">{t('common.limitorder_history_order_time')}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">{t('common.limitorder_history_unit_price')}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">{t('common.limitorder_history_order_quantity')}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">{t('common.limitorder_history_trade_quantity')}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">{t('common.limitorder_history_trade_amount_sats')}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">{t('common.limitorder_history_status')}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">{t('common.tx')}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">UTXO</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">Reason</TableHead>
                </TableRow>
              )}
              itemContent={(index, order) => {
                return (
                  <>
                    <TableCell className={`text-center font-bold ${order.displayOrderStatusClass}`}>{order.displayOrderTypeLabel}
                      {order.displayAssetName && (
                        <div className="mt-0.5 text-[10px] font-normal text-zinc-400">{order.displayAssetName}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{formatTimeToMonthDayHourMinute(order.OrderTime)}</TableCell>
                    <TableCell className="text-center">{order.price.toFixed(8)}</TableCell>
                    <TableCell className="text-center">{order.displayOrderQuantity}</TableCell>
                    <TableCell className="text-center">{order.displayTradeQuantity}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center leading-none gap-2">
                        <div className="text-[13px]">{order.displayTradeAmountSats}</div>
                        <div className="text-[10px] font-medium text-zinc-500">($<BtcPrice btc={Number(order.displayTradeAmountSats) / 100000000} />)</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`whitespace-nowrap px-2 py-0.5 rounded border text-xs font-semibold ${order.displayOrderStatusBgClass}`}>{order.status}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {order.rawData.OutTxId ? (
                        <a href={generateMempoolUrl({ network: network, path: `tx/${order.rawData.OutTxId}`, chain: order.rawData?.ToL1 ? Chain.BTC : Chain.SATNET, env: 'dev' })} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center text-zinc-500 hover:text-primary">
                          <ExternalLink className="h-4 w-4 text-zinc-500" />
                        </a>
                      ) : ('-')}
                    </TableCell>
                    <TableCell className="text-center">
                      {order.rawData.InUtxo ? (
                        <a href={generateMempoolUrl({ network: network, path: `tx/${order.rawData.InUtxo}`, chain: order.rawData.FromL1 ? Chain.BTC : Chain.SATNET, env: 'dev' })} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center text-zinc-500 hover:text-primary">
                          <ExternalLink className="h-4 w-4 text-zinc-500" />
                        </a>
                      ) : ('-')}
                    </TableCell>
                    <TableCell className="text-center text-zinc-400">{order.reason}</TableCell>
                  </>
                );
              }}
            />
            {isFetchingNextPage && (
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex items-center justify-center text-[11px] text-gray-500 bg-background/60 backdrop-blur-sm h-6">{t('common.loading')}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}