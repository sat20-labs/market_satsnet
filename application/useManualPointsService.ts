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
const ENV_TOKEN = process.env.NEXT_PUBLIC_POINTS_API_TOKEN || 'sat20@satoshinet@satswap';

function getAuthToken(): string {
  if (typeof window === 'undefined') return ENV_TOKEN;
  const key = 'points_api_token';
  let token = localStorage.getItem(key) || sessionStorage.getItem(key) || '';
  if (!token) token = ENV_TOKEN;
  return token;
}

function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return { 'Authorization': `Bearer ${token}`, 'X-API-Token': token };
}

async function fetchJson<T>(path: string): Promise<T | undefined> {
  try {
    const res = await fetch(`${BASE}${path}`, { cache: 'no-store', headers: getAuthHeaders() });
    if (!res.ok) return undefined;
    return res.json();
  } catch { return undefined; }
}

// Create manual points record (add or subtract). One of points or points_x100 is required.
export async function addManualPoints(payload: { address: string; points?: number; points_x100?: number; reason?: string; operator?: string; ref_id?: string | number }): Promise<{ record: ManualPointRecord; created: boolean } | undefined> {
  try {
    const body: any = { address: payload.address };
    if (typeof payload.points_x100 === 'number') {
      body.points_x100 = Math.trunc(payload.points_x100);
    } else if (typeof payload.points === 'number') {
      body.points = payload.points; // backend will multiply by 100 and round
    } else {
      throw new Error('points or points_x100 required');
    }
    if (payload.reason) body.reason = payload.reason;
    if (payload.operator) body.operator = payload.operator;
    if (payload.ref_id != null) body.ref_id = payload.ref_id;

    const res = await fetch(`${BASE}/api/v1/points/manual/add`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return undefined;
    const env = await res.json() as ApiEnvelope<{ record: any; created?: boolean } & { Record?: any; Created?: boolean }>;
    if (!env || env.code !== 0) return undefined;
    const data: any = env.data || {};
    const raw = data.record || data.Record;
    const created = !!(data.created ?? data.Created);
    if (!raw) return undefined;
    const px100 = Number(raw.points_x100 ?? raw.PointsX100 ?? 0);
    let createdAt = raw.created_at ?? raw.CreatedAt;
    if (createdAt && createdAt <= 1e12) createdAt = createdAt * 1000; // s -> ms
    const mapped: ManualPointRecord = {
      id: Number(raw.id || raw.ID || 0),
      address: raw.address,
      points: px100 / 100,
      rawPointsX100: px100,
      reason: raw.reason,
      operator: raw.operator,
      refId: raw.ref_id ?? raw.refId,
      status: raw.status,
      reverseOf: raw.reverse_of ?? raw.reverseOf ?? null,
      createdAt,
    };
    return { record: mapped, created };
  } catch {
    return undefined;
  }
}

// Reverse a manual record by id
export async function reverseManualPoints(payload: { id: number | string; operator?: string; reason?: string; ref_id?: string | number }): Promise<ManualPointRecord | undefined> {
  try {
    const body: any = { id: payload.id };
    if (payload.operator) body.operator = payload.operator;
    if (payload.reason) body.reason = payload.reason;
    if (payload.ref_id != null) body.ref_id = payload.ref_id;

    const res = await fetch(`${BASE}/api/v1/points/manual/reverse`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return undefined;
    const env = await res.json() as ApiEnvelope<any>;
    if (!env || env.code !== 0) return undefined;
    const raw = env.data || {};
    const px100 = Number(raw.points_x100 ?? raw.PointsX100 ?? 0);
    let createdAt = raw.created_at ?? raw.CreatedAt;
    if (createdAt && createdAt <= 1e12) createdAt = createdAt * 1000; // s -> ms
    const mapped: ManualPointRecord = {
      id: Number(raw.id || raw.ID || 0),
      address: raw.address,
      points: px100 / 100,
      rawPointsX100: px100,
      reason: raw.reason,
      operator: raw.operator,
      refId: raw.ref_id ?? raw.refId,
      status: raw.status,
      reverseOf: raw.reverse_of ?? raw.reverseOf ?? null,
      createdAt,
    };
    return mapped;
  } catch {
    return undefined;
  }
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
  // Sort newest first (by createdAt desc, fallback id desc)
  records.sort((a, b) => (Number(b.createdAt || 0) - Number(a.createdAt || 0)) || (Number(b.id || 0) - Number(a.id || 0)));
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
    } else {
      // mark initialized to avoid infinite re-requests when 404/undefined
      if (reset) setRecords([]);
      setHasMore(false);
      setInitialized(true);
    }
    setLoading(false);
  }, [address, cursor, hasMore, initialized, loading, pageSize]);

  const resetAndLoad = useCallback(() => load(true), [load]);

  return { records, loading, hasMore, loadMore: () => load(false), resetAndLoad, initialized, setRecords, setCursor };
}

export async function getManualPointsByOperator(operator: string, address?: string, cursor?: string, limit: number = 50): Promise<ManualPointsPage | undefined> {
  if (!operator) return undefined;
  const q = new URLSearchParams();
  q.set('operator', operator);
  if (address) q.set('address', address);
  if (cursor) q.set('cursor', cursor);
  if (limit) q.set('limit', String(limit));
  const env = await fetchJson<ApiEnvelope<any>>(`/api/v1/points/manual/by_operator?${q.toString()}`);
  if (!env || env.code !== 0) return undefined;
  const d = env.data || {};
  const recs: any[] = d.records || d.Records || [];
  const records: ManualPointRecord[] = recs.map(r => {
    const px100 = Number(r.points_x100 ?? r.PointsX100 ?? 0);
    let created = r.created_at ?? r.CreatedAt;
    if (created && created > 1e12) { created = created; } else if (created) { created = created * 1000; }
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
  // newest first
  records.sort((a, b) => (Number(b.createdAt || 0) - Number(a.createdAt || 0)) || (Number(b.id || 0) - Number(a.id || 0)));
  return {
    address: address || d.address || d.Address || '',
    records,
    nextCursor: d.next_cursor || d.nextCursor,
    hasMore: !!(d.has_more ?? d.hasMore),
  };
}

export function useManualPointsByOperatorPagination(operator?: string, addressFilter?: string, pageSize: number = 40) {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<ManualPointRecord[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const load = useCallback(async (reset: boolean = false) => {
    if (!operator || loading) return;
    if (!reset && initialized && !hasMore) return;
    setLoading(true);
    const page = await getManualPointsByOperator(operator, addressFilter, reset ? undefined : cursor, pageSize);
    if (page) {
      setRecords(prev => reset ? page.records : [...prev, ...page.records]);
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
      setInitialized(true);
    } else {
      if (reset) setRecords([]);
      setHasMore(false);
      setInitialized(true);
    }
    setLoading(false);
  }, [operator, addressFilter, cursor, hasMore, initialized, loading, pageSize]);

  const resetAndLoad = useCallback(() => load(true), [load]);

  return { records, loading, hasMore, loadMore: () => load(false), resetAndLoad, initialized, setCursor, setRecords };
}

export async function getManualPointById(id: number | string): Promise<ManualPointRecord | undefined> {
  if (id === undefined || id === null || id === '') return undefined;
  const env = await fetchJson<ApiEnvelope<any>>(`/api/v1/points/manual/get?id=${id}`);
  if (!env || env.code !== 0) return undefined;
  const r: any = env.data || {};
  const px100 = Number(r.points_x100 ?? r.PointsX100 ?? 0);
  let created = r.created_at ?? r.CreatedAt;
  if (created && created > 1e12) { created = created; } else if (created) { created = created * 1000; }
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
}
