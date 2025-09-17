import { useState, useCallback } from 'react';

interface ApiEnvelope<T> { code: number; message?: string; msg?: string; data?: T }

export interface ManualPointRecord {
  id: number;
  address: string;
  points: number; // 已除以100
  rawPointsX100: number;
  reason?: string;
  operator?: string;
  refId?: string | number | null;
  status?: number | string;
  reverseOf?: number | null;
  createdAt?: number; // 秒级或毫秒级时间戳
}

export interface ManualPointsPage {
  address: string;
  records: ManualPointRecord[];
  nextCursor?: string;
  hasMore: boolean;
}

const BASE = process.env.NEXT_PUBLIC_POINTS_API_BASE || '';
const API_TOKEN = process.env.NEXT_PUBLIC_POINTS_API_TOKEN || 'sat20@satoshinet@satswap';
const AUTH_HEADERS: Record<string,string> = { 'Authorization': `Bearer ${API_TOKEN}`, 'X-API-Token': API_TOKEN };

async function fetchJson<T>(path: string): Promise<T | undefined> {
  try {
    const res = await fetch(`${BASE}${path}`, { cache: 'no-store', headers: AUTH_HEADERS });
    if (!res.ok) return undefined;
    return res.json();
  } catch { return undefined; }
}

export async function getManualPoints(address: string, cursor?: string, limit: number = 50): Promise<ManualPointsPage | undefined> {
  if (!address) return undefined;
  const q = new URLSearchParams();
  q.set('address', address);
  if (cursor) q.set('cursor', cursor);
  if (limit) q.set('limit', String(limit));
  const env = await fetchJson<ApiEnvelope<any>>(`/api/v1/points/manual?${q.toString()}`);
  if (!env || env.code !== 0) return undefined;
  const d = env.data || {};
  const recs: any[] = d.records || d.Records || [];
  const records: ManualPointRecord[] = recs.map(r => {
    const px100 = Number(r.points_x100 ?? r.PointsX100 ?? 0);
    let created = r.created_at ?? r.CreatedAt;
    if (created && created > 1e12) { // might already be ms
      // if it's > 1e12 assume ms, else s -> ms
      created = created;
    } else if (created) {
      created = created * 1000; // seconds -> ms
    }
    return {
      id: Number(r.id || r.ID || 0),
      address: r.address,
      points: px100 / 100,
      rawPointsX100: px100,
      reason: r.reason,
      operator: r.operator,
      refId: r.ref_id ?? r.refId,
      status: r.status,
      reverseOf: r.reverse_of ?? r.reverseOf ?? null,
      createdAt: created,
    };
  });
  return {
    address: d.address || d.Address || address,
    records,
    nextCursor: d.next_cursor || d.nextCursor,
    hasMore: !!(d.has_more ?? d.hasMore),
  };
}

export function useManualPointsPagination(address?: string, pageSize: number = 40) {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<ManualPointRecord[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const load = useCallback(async (reset: boolean = false) => {
    if (!address || loading) return;
    if (!reset && initialized && !hasMore) return; // nothing more
    setLoading(true);
    const page = await getManualPoints(address, reset ? undefined : cursor, pageSize);
    if (page) {
      setRecords(prev => reset ? page.records : [...prev, ...page.records]);
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
      setInitialized(true);
    }
    setLoading(false);
  }, [address, cursor, hasMore, initialized, loading, pageSize]);

  const resetAndLoad = useCallback(() => load(true), [load]);

  return { records, loading, hasMore, loadMore: () => load(false), resetAndLoad, initialized };
}
