'use client';
import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink } from 'lucide-react';
import { generateMempoolUrl } from '@/utils/url';
import { Chain } from "@/types";
import { getValueFromPrecision } from "@/utils";
import { format } from "date-fns";
import { BtcPrice } from "../../BtcPrice";
import { Icon } from '@iconify/react';
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
  ToL1?: boolean;
  FromL1?: boolean;
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
  ticker: string;
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

export default function HistorySwapTable({
  rawOrders,
  orderTypeLabels,
  isLoading,
  noDataMessage,
  isFetchingNextPage,
  hasNextPage,
  onLoadMore,
  showReason = false,
  chain,
  ticker,
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

  const orders = React.useMemo(() => {
    const mapped = rawOrders.map((item): HistoryTableOrder => {
      const isBuy = item.OrderType === 2;
      const isCancelled = item.OrderType === 3;
      const side = isCancelled ? 'Cancelled' : (isBuy ? 'Buy' : 'Sell');
      const { value: price } = getValueFromPrecision(item.UnitPrice);
      const { value: inAmt } = getValueFromPrecision(item.InAmt);
      const { value: expectedAmt } = getValueFromPrecision(item.ExpectedAmt);
      const { value: outAmt } = getValueFromPrecision(item.OutAmt);
      const inValue = typeof item.InValue === 'number' ? item.InValue : 0;
      const outValue = typeof item.OutValue === 'number' ? item.OutValue : 0;
      const remainingAmt = 0;
      const remainingValue = 0;
      let status: string;
      if (item.Done === 1) status = t('common.limitorder_status_completed');
      else if (item.Done === 2) status = t('common.limitorder_status_cancelled');
      else status = t('common.limitorder_status_pending');
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
    mapped.sort((a, b) => b.OrderTime - a.OrderTime);
    return mapped;
  }, [rawOrders, t]);

  const ordersVirtualized = orders.length > 150; // moved up so effects can use it

  useEffect(() => {
    if (ordersVirtualized) return;
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (ordersVirtualized) return;
    const handle = () => {
      if (!hasNextPage || isFetchingNextPage) return;
      const el = mobileLoadMoreRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.top - window.innerHeight < 100) {
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

  if (isLoading) {
    return <div className="text-center py-2">{t("common.loading")}</div>;
  }

  if (!orders.length) {
    return <div className="text-center py-2 text-gray-500">{noDataMessage}</div>;
  }

  return (
    <div className="max-w-full ">
      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {orders.map((order, i) => {
          const typeLabel = orderTypeLabels[order.rawData.OrderType] || order.rawData.OrderType;
          const direction = order.rawData.OrderType === 2
            ? `SATS → ${ticker?.toUpperCase?.()}`
            : order.rawData.OrderType === 1
              ? `${ticker?.toUpperCase?.()} → SATS`
              : '-';
          const sats = (order.side === 'Buy' && order.done !== 0)
            ? order.inValue - order.outValue
            : order.outValue;
          const usdVal = formatUsdFromSats(Number(sats));
          return (
            <div key={`${order.rawData.Id ?? `${order.OrderTime}-${order.rawData.InUtxo || order.rawData.OutTxId || i}`}-m`} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
              <div className="flex items-start justify-between  border-b border-zinc-800 gap-3">
                <div className="flex items-center gap-2 pb-3">
                  <span className={`px-2 py-0.5 rounded-sm text-[11px] first-letter:uppercase font-semibold ${order.rawData.OrderType === 2 ? 'bg-green-500/20 text-green-400 border border-green-500/40' : order.rawData.OrderType === 1 ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-zinc-700/40 text-zinc-300 border border-zinc-600/60'}`}>{typeLabel}</span>
                  <span className="text-[9px] sm:text-[11px] text-zinc-400">{direction}</span>
                </div>
                <div className="text-[11px] text-zinc-400">{formatTimeToMonthDayHourMinute(order.OrderTime)}</div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                <div className="bg-zinc-900/50 rounded p-1">
                  <div className="text-zinc-400">Price</div>
                  <div className="font-semibold">{order.price.toFixed(8)} <span className="text-zinc-500">sats</span></div>
                </div>
                <div className="bg-zinc-900/50 rounded p-1">
                  <div className="text-zinc-400">Qty</div>
                  <div className="font-semibold">{order.side === "Cancelled" ? "-" : order.rawData.OrderType === 10 ? <> {order.outAmt} </> : order.side === "Buy" ? <> {order.outAmt} </> : <> {order.inAmt} </>}<span className="text-zinc-500  text-[9px] sm:text-sm">${ticker}</span></div>
                </div>
                <div className="bg-zinc-900/50 rounded p-1">
                  <div className="text-zinc-400">Amount</div>
                  <div className="font-semibold">{sats} <span className="text-zinc-500">sats</span><br />
                    <span className="text-[10px] text-zinc-500 ">${usdVal}</span>
                  </div>
                </div>
                <div className="bg-zinc-900/50 rounded p-1">
                  <div className="text-zinc-400">Status</div>
                  <div>
                    <span className={`whitespace-nowrap text-[11px] font-semibold ${Number(order.done) === 1 ? 'bg-zinc-800 text-green-600' : Number(order.done) === 2 ? 'bg-gray-500 text-gray-700' : 'bg-blue-500 text-blue-700'}`}>{order.status}</span>
                  </div>
                </div>
              </div>
              <div className="mt-1 flex justify-end items-center gap-3 text-zinc-400">
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
                <TableRow className="bg-zinc-800 text-gray-500 text-sm sm:text-sm">
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">{t("common.limitorder_history_type")}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">{t("common.limitorder_history_order_time")}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">{t("common.swap")}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">{t("common.limitorder_price")}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-left whitespace-nowrap">{t("common.swap_order_quantity")}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-left whitespace-nowrap">{t("common.swap_trade_quantity")}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">{t("common.limitorder_history_trade_amount_sats")}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">{t("common.limitorder_history_status")}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">{t("common.tx")}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">UTXO</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order, i) => {
                  const sats = order.side === 'Buy' && order.done !== 0 ? order.inValue - order.outValue : order.outValue;
                  const usdVal = formatUsdFromSats(Number(sats));
                  return (
                    <TableRow className="text-xs" key={`${order.rawData.Id ?? `${order.OrderTime}-${order.rawData.InUtxo || order.rawData.OutTxId || i}`}-pc`}>
                      <TableCell className={`text-center first-letter:uppercase font-bold ${order.rawData.OrderType === 2 ? "text-green-500" : order.rawData.OrderType === 1 ? "text-red-500" : "text-gray-600"}`}>
                        {orderTypeLabels[order.rawData.OrderType] || order.rawData.OrderType}
                      </TableCell>
                      <TableCell className="text-center">{formatTimeToMonthDayHourMinute(order.OrderTime)}</TableCell>
                      <TableCell className="text-center text-zinc-400 text-xs">{order.rawData.OrderType === 2 ? "SATS → " + ticker?.toUpperCase() : order.rawData.OrderType === 1 ? ticker?.toUpperCase() + " → SATS" : "-"}</TableCell>
                      <TableCell className="text-center">{order.price.toFixed(8)}</TableCell>
                      <TableCell className="text-left">{order.rawData.OrderType === 2 ? <>{order.inValue} <span className="text-zinc-400"> sats </span></> : order.rawData.OrderType === 1 ? <> {order.inAmt} <span className="text-zinc-400 text-[11px]">${ticker}</span></> : "-"}</TableCell>
                      <TableCell className="text-left">{order.side === "Cancelled" ? "-" : order.rawData.OrderType === 10 ? <> {order.outAmt} </> : order.side === "Buy" ? <> {order.outAmt} </> : <> {order.inAmt} </>}<span className="text-zinc-400 text-[11px]">${ticker}</span></TableCell>
                      <TableCell className="text-center">
                        {order.side === "Cancelled" ? "-" : (
                          <div className="flex flex-col items-center leading-none gap-2">
                            <div className="text-[13px]">{sats}</div>
                            <div className="text-[10px] font-medium text-zinc-500">${usdVal}</div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`whitespace-nowrap px-2 py-0.5 rounded border text-xs font-semibold ${Number(order.done) === 1
                            ? "bg-zinc-800 text-green-600"
                            : Number(order.done) === 2
                              ? "bg-zinc-800 text-gray-600"
                              : "bg-zinc-800 text-blue-600"
                            }`}
                          title={order.status}
                        >
                          {order.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {order.rawData.OutTxId ? (
                          <a
                            href={generateMempoolUrl({ network: network, path: `tx/${order.rawData.OutTxId}`, chain: order.rawData?.ToL1 ? Chain.BTC : Chain.SATNET, env: 'dev' })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center hover:text-primary"
                          >
                            <ExternalLink className="w-4 h-4" />
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
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        ) : (
                          "-"
                        )}
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
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex items-center justify-center text-[11px] text-gray-500 bg-background/60 backdrop-blur-sm h-6">
                {t('common.loading')}
              </div>
            )}
          </div>
        )}
        {ordersVirtualized && (
          <div className="relative w-full h-[60vh] min-h-[420px] rounded-md border overflow-hidden">
            <TableVirtuoso
              data={orders}
              endReached={() => tryLoadMore()}
              overscan={50}
              components={{
                Table: (props) => <Table {...props} className="overflow-x-auto" />,
                TableHead: (props) => <thead {...props} />,
                TableRow: (props) => <tr {...props} className="text-xs border-b border-zinc-800 hover:bg-zinc-800/50" />,
              }}
              fixedHeaderContent={() => (
                <TableRow className="bg-zinc-800 text-gray-500 text-sm">
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">{t('common.limitorder_history_type')}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">{t('common.limitorder_history_order_time')}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">{t('common.swap')}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">{t('common.limitorder_price')}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-left whitespace-nowrap">{t('common.swap_order_quantity')}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-left whitespace-nowrap">{t('common.swap_trade_quantity')}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">{t('common.limitorder_history_trade_amount_sats')}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">{t('common.limitorder_history_status')}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">{t('common.tx')}</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">UTXO</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-zinc-800 text-center whitespace-nowrap">Reason</TableHead>
                </TableRow>
              )}
              itemContent={(index, order: HistoryTableOrder) => {
                const sats = order.side === 'Buy' && order.done !== 0 ? order.inValue - order.outValue : order.outValue;
                const usdVal = formatUsdFromSats(Number(sats));
                return (
                  <>
                    <TableCell className={`text-center first-letter:uppercase font-bold ${order.rawData.OrderType === 2 ? 'text-green-500' : order.rawData.OrderType === 1 ? 'text-red-500' : 'text-gray-600'}`}>{orderTypeLabels[order.rawData.OrderType] || order.rawData.OrderType}</TableCell>
                    <TableCell className="text-center">{formatTimeToMonthDayHourMinute(order.OrderTime)}</TableCell>
                    <TableCell className="text-center text-zinc-400 text-xs">{order.rawData.OrderType === 2 ? 'SATS → ' + ticker?.toUpperCase() : order.rawData.OrderType === 1 ? ticker?.toUpperCase() + ' → SATS' : '-'}</TableCell>
                    <TableCell className="text-center">{order.price.toFixed(8)}</TableCell>
                    <TableCell className="text-left">{order.rawData.OrderType === 2 ? <>{order.inValue} <span className="text-zinc-400"> sats </span></> : order.rawData.OrderType === 1 ? <> {order.inAmt} <span className="text-zinc-400 text-[11px]">${ticker}</span></> : '-'}</TableCell>
                    <TableCell className="text-left">{order.side === 'Cancelled' ? '-' : order.rawData.OrderType === 10 ? <> {order.outAmt} </> : order.side === 'Buy' ? <> {order.outAmt} </> : <> {order.inAmt} </>}<span className="text-zinc-400 text-[11px]">${ticker}</span></TableCell>
                    <TableCell className="text-center">
                      {order.side === 'Cancelled' ? '-' : (
                        <div className="flex flex-col items-center leading-none gap-2">
                          <div className="text-[13px]">{sats}</div>
                          <div className="text-[10px] font-medium text-zinc-500">${usdVal}</div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`whitespace-nowrap px-2 py-0.5 rounded-sm border text-xs font-semibold ${Number(order.done) === 1 ? 'bg-zinc-800 text-green-600' : Number(order.done) === 2 ? 'bg-zinc-800 text-gray-600' : 'bg-zinc-800 text-blue-700'}`}>{order.status}</span>
                    </TableCell>
                    <TableCell className="text-center text-zinc-400">
                      {order.rawData.OutTxId ? (
                        <a href={generateMempoolUrl({ network: network, path: `tx/${order.rawData.OutTxId}`, chain: order.rawData?.ToL1 ? Chain.BTC : Chain.SATNET, env: 'dev' })} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center hover:text-primary">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : ('-')}
                    </TableCell>
                    <TableCell className="text-center text-zinc-400">
                      {order.rawData.InUtxo ? (
                        <a href={generateMempoolUrl({ network: network, path: `tx/${order.rawData.InUtxo}`, chain: order.rawData.FromL1 ? Chain.BTC : Chain.SATNET, env: 'dev' })} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center hover:text-primary">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : ('-')}
                    </TableCell>
                    <TableCell className="text-center">{order.reason}</TableCell>
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