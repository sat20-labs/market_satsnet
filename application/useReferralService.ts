import { useState, useCallback } from 'react';

interface ApiEnvelope<T> { code: number; msg?: string; data?: T }

export interface ReferralSummary {
  referrer?: string;
  totalPoints: number; // already divided by 100 (integer, truncated)
  monthlyPoints: number; // already divided by 100 (integer, truncated)
  updatedAt?: number;
}

export interface ReferralDetailItem {
  address: string; // referree
  points: number;  // already divided by 100 (integer truncated)
  bindBlock?: number;
}

export interface ReferralDetailsPage {
  referrer?: string;
  items: ReferralDetailItem[];
  nextCursor?: string;
  hasMore: boolean;
}

const BASE = process.env.NEXT_PUBLIC_POINTS_API_BASE || '';
const API_TOKEN = process.env.NEXT_PUBLIC_POINTS_API_TOKEN || 'sat20@satoshinet@satswap';
const AUTH_HEADERS: Record<string,string> = { 'Authorization': `Bearer ${API_TOKEN}`, 'X-API-Token': API_TOKEN };

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T | undefined> {
  try {
    const headers = { ...AUTH_HEADERS, ...(init?.headers as any || {}) };
    const res = await fetch(`${BASE}${path}`, { cache: 'no-store', ...init, headers });
    if (!res.ok) return undefined;
    return res.json();
  } catch { return undefined; }
}

export async function getReferralSummary(address: string): Promise<ReferralSummary | undefined> {
  const env = await fetchJson<ApiEnvelope<any>>(`/api/v1/referral/summary?address=${address}`);
  if (!env || env.code !== 0) return undefined;
  const d = env.data || {};
  return {
    referrer: d.referrer,
    totalPoints: Number(d.total_points || 0),
    monthlyPoints: Number(d.monthly_points || 0),
    updatedAt: d.updated_at,
  };
}

export async function getReferralDetails(referrerOrAddress: string, cursor?: string, limit: number = 50): Promise<ReferralDetailsPage | undefined> {
  const q = new URLSearchParams();
  // Backend may accept either referrer= or address=. Use address to allow DID/address auto resolve.
  q.set('address', referrerOrAddress);
  if (cursor) q.set('cursor', cursor);
  if (limit) q.set('limit', String(limit));
  const env = await fetchJson<ApiEnvelope<any>>(`/api/v1/referral/details?${q.toString()}`);
  if (!env || env.code !== 0) return undefined;
  const d = env.data || {};
  // Support PascalCase and snake_case variants
  const detailsArr = d.details || d.Details || [];
  return {
    referrer: d.referrer || d.Referrer,
    items: detailsArr.map((it: any) => ({
      address: it.referree || it.Referree,
      points: Number(it.points ?? it.Points ?? 0),
      bindBlock: it.bind_block ?? it.BindBlock,
    })),
    nextCursor: d.next_cursor || d.nextCursor,
    hasMore: !!(d.has_more ?? d.hasMore),
  };
}

export async function refreshReferralBinding(address: string): Promise<{ address?: string; referrer?: string; bindBlock?: number; found?: boolean } | undefined> {
  try {
    const res = await fetch(`${BASE}/api/v1/referral/refresh?address=${address}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS } });
    if (!res.ok) return undefined;
    const env: ApiEnvelope<any> = await res.json();
    if (env.code !== 0) return undefined;
    const d = env.data || {};
    return { address: d.address, referrer: d.referrer, bindBlock: d.bind_block, found: d.found };
  } catch { return undefined; }
}

// Simple hook for paginated referral details (manual trigger when dialog opens)
export function useReferralDetailsPagination(referrerOrAddress?: string) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ReferralDetailItem[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const load = useCallback(async (reset: boolean = false) => {
    if (!referrerOrAddress) return;
    if (loading) return;
    if (!reset && initialized && !hasMore && cursor) return; // nothing more
    setLoading(true);
    const page = await getReferralDetails(referrerOrAddress, reset ? undefined : cursor);
    if (page) {
      setItems(prev => reset ? page.items : [...prev, ...page.items]);
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
      setInitialized(true);
    }
    setLoading(false);
  }, [referrerOrAddress, loading, cursor, hasMore, initialized]);

  const resetAndLoad = useCallback(() => load(true), [load]);
  return { items, loading, hasMore, loadMore: () => load(false), resetAndLoad, initialized };
}
