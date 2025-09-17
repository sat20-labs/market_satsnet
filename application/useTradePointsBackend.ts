import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';

interface ApiEnvelope<T> { code: number; msg?: string; data?: T }

const BASE = process.env.NEXT_PUBLIC_POINTS_API_BASE || '';
const API_TOKEN = process.env.NEXT_PUBLIC_POINTS_API_TOKEN || 'sat20@satoshinet@satswap';
const AUTH_HEADERS: Record<string,string> = { 'Authorization': `Bearer ${API_TOKEN}`, 'X-API-Token': API_TOKEN };

function shortenContract(c?: string): { short?: string; full?: string } {
  if (!c) return { short: undefined, full: undefined };
  const idx = c.indexOf('_');
  if (idx >= 0) return { short: c.substring(idx + 1), full: c };
  return { short: c, full: c };
}

function deriveModeFromContract(short?: string, explicit?: string): string | undefined {
  if (explicit) return explicit;
  if (!short) return undefined;
  const lower = short.toLowerCase();
  if (/(^|[_:])amm(\.|$)/.test(lower)) return 'Swap';
  if (/(^|[_:])swap(\.|$)/.test(lower)) return 'limitOrder';
  return undefined;
}

async function fetchJson<T>(path: string): Promise<T | undefined> {
  try {
    const res = await fetch(`${BASE}${path}`, { cache: 'no-store', headers: { ...AUTH_HEADERS } });
    if (!res.ok) return undefined;
    return res.json();
  } catch { return undefined; }
}

// ---- Trade Assets (aggregated per asset/contract) ----
export interface TradeAssetItem {
  asset?: string;
  contract?: string; // shortened
  contractFull?: string; // original full contract id
  totalPoints: number;
  monthlyPoints: number;
  totalFee: number;
  monthlyFee: number;
  tradeCount: number;
}

interface TradeAssetsRespItem {
  asset?: string; contract?: string; total_points_x100?: number; monthly_points_x100?: number; total_fee?: number; monthly_fee?: number; trade_count?: number;
}

export function useTradeAssets(address?: string) {
  return useQuery<TradeAssetItem[]>({
    queryKey: ['points-trade-assets', address],
    enabled: !!address,
    refetchInterval: 60000,
    queryFn: async () => {
      if (!address) return [];
      const env = await fetchJson<ApiEnvelope<{ assets: TradeAssetsRespItem[] }>>(`/api/v1/points/trade_assets?address=${address}`);
      if (!env || env.code !== 0) return [];
      const arr = env.data?.assets || [];
      return arr.map(a => {
        const { short, full } = shortenContract(a.contract);
        const totalPoints = (a.total_points_x100 || 0) / 100;
        const monthlyPoints = (a.monthly_points_x100 || 0) / 100;
        return {
          asset: a.asset || short || full,
          contract: short,
          contractFull: full,
          totalPoints,
          monthlyPoints,
          totalFee: a.total_fee || 0,
          monthlyFee: a.monthly_fee || 0,
          tradeCount: a.trade_count || 0,
        } as TradeAssetItem;
      });
    }
  });
}

// ---- Trade Orders (paginated) ----
export interface TradeOrderItem {
  id?: string;
  contract?: string; // shortened
  contractFull?: string; // original
  asset?: string;
  orderType: number; // 1 sell / 2 buy
  fee: number; // sats
  points: number; // user credited points
  referrerPoints?: number; // optional referrer share
  orderTime: number; // epoch sec
  txid?: string;
  mode?: string; // swap / limit
}

interface OrdersResp { orders: Array<{ id?: string; contract?: string; asset?: string; order_type?: number; fee?: number; fee_sats?: number; points_x100?: number; credited_points_x100?: number; referrer_points_x100?: number; order_time?: number; txid?: string; mode?: string }>; next_cursor?: string; has_more?: boolean }

export function useTradeOrdersPagination(address?: string, pageSize: number = 50) {
  const [orders, setOrders] = useState<TradeOrderItem[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const load = useCallback(async (reset: boolean = false) => {
    if (!address) return;
    if (loading) return;
    if (!reset && initialized && !hasMore) return;
    setLoading(true);
    const params = new URLSearchParams();
    params.set('address', address);
    params.set('limit', String(pageSize));
    if (!reset && cursor) params.set('cursor', cursor);
    const env = await fetchJson<ApiEnvelope<OrdersResp>>(`/api/v1/points/orders?${params.toString()}`);
    if (env && env.code === 0) {
      const d = env.data || { orders: [] } as OrdersResp;
      const mapped = (d.orders || []).map(o => {
        const { short, full } = shortenContract(o.contract);
        const ptsX100 = o.credited_points_x100 ?? o.points_x100 ?? 0;
        const refPtsX100 = o.referrer_points_x100 ?? 0;
        return {
          id: o.id || o.txid,
          contract: short,
          contractFull: full,
          asset: o.asset || short || full,
          orderType: Number(o.order_type || 0),
          fee: Number(o.fee_sats || o.fee || 0),
          points: ptsX100 / 100,
          referrerPoints: refPtsX100 / 100,
          orderTime: Number(o.order_time || 0),
          txid: o.txid,
          mode: deriveModeFromContract(short, o.mode),
        } as TradeOrderItem;
      });
      setOrders(prev => reset ? mapped : [...prev, ...mapped]);
      setCursor(d.next_cursor);
      setHasMore(!!d.has_more);
      setInitialized(true);
    } else if (reset) {
      setOrders([]);
      setCursor(undefined);
      setHasMore(false);
    }
    setLoading(false);
  }, [address, cursor, hasMore, loading, pageSize, initialized]);

  const resetAndLoad = useCallback(() => load(true), [load]);

  return { orders, hasMore, loadMore: () => load(false), resetAndLoad, loading, initialized };
}
