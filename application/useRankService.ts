import { useCallback, useEffect, useState } from 'react';

interface ApiEnvelope<T> { code: number; message?: string; msg?: string; data?: T }

export type RankKind = 'trade' | 'referral';
export type RankPeriod = 'total' | 'month';

export interface RankEntry {
  address: string;
  pointsX100: number;
}

export interface RankPage {
  kind: RankKind;
  period: RankPeriod;
  entries: RankEntry[];
  nextCursor?: string;
  hasMore: boolean;
}

const BASE = (process.env.NEXT_PUBLIC_POINTS_API_BASE || '').replace(/\/$/, '');
const DEFAULT_TOKEN = 'sat20@satoshinet@satswap';
const ENV_TOKEN = process.env.NEXT_PUBLIC_POINTS_API_TOKEN || DEFAULT_TOKEN;

function getToken(): string {
  if (typeof window === 'undefined') return ENV_TOKEN;
  return (
    localStorage.getItem('points_api_token') ||
    sessionStorage.getItem('points_api_token') ||
    ENV_TOKEN ||
    DEFAULT_TOKEN
  );
}

function withApiToken(url: string, token?: string) {
  if (!token) return url;
  const hasQuery = url.includes('?');
  const hasToken = /[?&]api_token=/.test(url);
  if (hasToken) return url;
  return `${url}${hasQuery ? '&' : '?'}api_token=${encodeURIComponent(token)}`;
}

async function fetchRank(kind: RankKind, period: RankPeriod, limit = 20, cursor?: string): Promise<RankPage | undefined> {
  try {
    const tk = getToken();
    const headers: Record<string, string> = {};
    if (tk) { headers['Authorization'] = `Bearer ${tk}`; headers['X-API-Token'] = tk; }
    const qs = new URLSearchParams();
    qs.set('period', period);
    if (limit) qs.set('limit', String(limit));
    if (cursor) qs.set('cursor', cursor);
    let url = `${BASE}/api/v1/points/rank/${kind}?${qs.toString()}`;
    url = withApiToken(url, tk);
    const res = await fetch(url, { headers, cache: 'no-store' });
    if (!res.ok) return undefined;
    const env = await res.json() as ApiEnvelope<any>;
    if (!env || env.code !== 0) return undefined;
    const d = env.data || {};
    const entries = (d.entries || []).map((e: any) => ({ address: e.address, pointsX100: Number(e.points_x100 ?? e.PointsX100 ?? 0) })) as RankEntry[];
    return {
      kind: (d.kind as RankKind) || kind,
      period: (d.period as RankPeriod) || period,
      entries,
      nextCursor: d.next_cursor || d.nextCursor || undefined,
      hasMore: !!(d.has_more ?? d.hasMore),
    };
  } catch {
    return undefined;
  }
}

export function useRankPagination(kind: RankKind, period: RankPeriod, pageSize = 20) {
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<RankEntry[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const load = useCallback(async (reset: boolean = false) => {
    if (loading) return;
    if (!reset && initialized && !hasMore) return;
    setLoading(true);
    const page = await fetchRank(kind, period, pageSize, reset ? undefined : cursor);
    if (page) {
      setEntries(prev => reset ? page.entries : [...prev, ...page.entries]);
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
      setInitialized(true);
    } else {
      if (reset) setEntries([]);
      setHasMore(false);
      setInitialized(true);
    }
    setLoading(false);
  }, [kind, period, pageSize, cursor, initialized, hasMore, loading]);

  useEffect(() => {
    // reset when kind/period changes
    setEntries([]);
    setCursor(undefined);
    setHasMore(false);
    setInitialized(false);
  }, [kind, period]);

  const resetAndLoad = useCallback(() => load(true), [load]);

  return { entries, loading, hasMore, loadMore: () => load(false), resetAndLoad, initialized };
}

export function formatPtsX100(x: number) { return (x / 100).toFixed(2); }
