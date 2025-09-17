import { useQuery } from '@tanstack/react-query';

// Public types kept (trimmed) so existing components (PointsDashboard) continue to work
export interface TradePointsSummary {
  totalFee: number; // sats
  totalPoints: number; // after rate
  monthlyFee: number; // sats
  monthlyPoints: number; // after rate
  totalTxCount: number; // optional (may be 0 if backend not provides)
}

export interface PointsSummary {
  trade: TradePointsSummary;
  referral: number; // referral total points (after commission), 2 decimals
  reward: number; // 手动奖励积分（Manual）总计
  community: number; // reserved
  total: number; // overall total (trade + referral + others)
  vipLevel: number;
  vipProgress: number; // 0-100
  effectiveRate: number; // if backend exposes later; fallback 0.35 or 0.37 when hasReferrer
  hasReferrer: boolean; // binding flag (fallback false)
  referralDetails?: Array<{ address: string; points: number; bindBlock?: number }>;
  referralMonthly?: number; // monthly referral points
  rewardMonthly?: number; // monthly manual reward points
  calcVersion?: number;
  updatedAt?: number;
}

// ---- Backend API helpers ----

interface ApiEnvelope<T> { code: number; msg?: string; data?: T }

interface SummaryV2Resp {
  // legacy snake_case (still supported)
  trade?: { total_fee?: number; monthly_fee?: number; total_points_x100?: number; monthly_points_x100?: number; trade_count?: number };
  referral?: { total_points_x100?: number; monthly_points_x100?: number };
  total_points_x100?: number;
  monthly_points_x100?: number;
  vip_level?: number;
  vip_progress?: number;
  calc_version?: number;
  updated_at?: number;
  effective_rate?: number;
  has_referrer?: boolean;
  // new PascalCase fields
  Address?: string;
  CalcVersion?: number;
  Trade?: { TotalFee?: number; MonthlyFee?: number; TotalPointsX100?: number; MonthlyPointsX100?: number; TradeCount?: number };
  Referral?: { TotalPointsX100?: number; MonthlyPointsX100?: number };
  TotalPointsX100?: number;
  MonthlyPointsX100?: number;
  VIPLevel?: number;
  VIPProgress?: number;
  UpdatedAt?: number;
  Manual?: { total_points_x100?: number; monthly_points_x100?: number; TotalPointsX100?: number; MonthlyPointsX100?: number };
}

interface ReferralSummaryResp { referrer: string; total_points?: number; monthly_points?: number; updated_at?: number }
// Accept PascalCase variant too
interface ReferralSummaryPascalResp { Referrer?: string; TotalPoints?: number; MonthlyPoints?: number; UpdatedAt?: number }

interface ReferralDetailsResp { referrer: string; details: Array<{ referree: string; points: number; bind_block?: number }>; next_cursor?: string; has_more?: boolean }

const DEFAULT_RATE_BASE = 0.35; // base 35%
const REFERRAL_BONUS = 0.02; // +2% when has referrer (fallback)

// Resolve backend base path (relative by default -> same origin proxy)
const POINTS_API_BASE = process.env.NEXT_PUBLIC_POINTS_API_BASE || '';
// API token (front-end build time). For higher security configure via environment variable.
const API_TOKEN = process.env.NEXT_PUBLIC_POINTS_API_TOKEN || 'sat20@satoshinet@satswap';
const AUTH_HEADERS: Record<string, string> = {
  'Authorization': `Bearer ${API_TOKEN}`,
  'X-API-Token': API_TOKEN,
};

async function fetchJson<T = any>(path: string, init?: RequestInit): Promise<T | undefined> {
  try {
    const mergedHeaders: Record<string, string> = {
      ...AUTH_HEADERS,
      ...(init?.headers as any || {}),
    };
    const res = await fetch(`${POINTS_API_BASE}${path}`, { cache: 'no-store', ...init, headers: mergedHeaders });
    if (!res.ok) return undefined;
    const json = await res.json();
    return json as T;
  } catch {
    return undefined;
  }
}

async function fetchSummaryV2(address: string): Promise<SummaryV2Resp | undefined> {
  const env = await fetchJson<ApiEnvelope<SummaryV2Resp>>(`/api/v1/points/summary_v2?address=${address}`);
  if (!env || env.code !== 0) return undefined;
  return env.data;
}

async function fetchSummaryV1(address: string): Promise<any | undefined> {
  const env = await fetchJson<ApiEnvelope<any>>(`/api/v1/points/summary?address=${address}`);
  if (!env || env.code !== 0) return undefined;
  return env.data;
}

async function fetchReferralSummary(address: string): Promise<ReferralSummaryResp | undefined> {
  const env = await fetchJson<ApiEnvelope<ReferralSummaryResp & ReferralSummaryPascalResp>>(`/api/v1/referral/summary?address=${address}`);
  if (!env || env.code !== 0) return undefined;
  const d: any = env.data || {};
  return {
    referrer: d.referrer || d.Referrer || '',
    total_points: d.total_points ?? d.TotalPoints ?? 0,
    monthly_points: d.monthly_points ?? d.MonthlyPoints ?? 0,
    updated_at: d.updated_at ?? d.UpdatedAt,
  } as ReferralSummaryResp;
}

async function fetchReferralDetails(address: string, limit = 100): Promise<ReferralDetailsResp | undefined> {
  const env = await fetchJson<ApiEnvelope<ReferralDetailsResp>>(`/api/v1/referral/details?referrer=${address}&limit=${limit}`);
  if (!env || env.code !== 0) return undefined;
  return env.data;
}

function mapSummaryV2(data: SummaryV2Resp | undefined, hasReferrer: boolean): PointsSummary {
  if (!data) {
    return {
      trade: { totalFee: 0, monthlyFee: 0, totalPoints: 0, monthlyPoints: 0, totalTxCount: 0 },
      referral: 0, referralMonthly: 0, reward: 0, rewardMonthly: 0, community: 0, total: 0,
      vipLevel: 0, vipProgress: 0, effectiveRate: DEFAULT_RATE_BASE + (hasReferrer ? REFERRAL_BONUS : 0), hasReferrer,
    } as PointsSummary;
  }
  // Support both styles
  const tradeBlock = data.Trade || data.trade || {} as any;
  const referralBlock = data.Referral || data.referral || {} as any;
  const manualBlock = data.Manual || (data as any).manual || {} as any;
  const tradeFee = tradeBlock.TotalFee ?? tradeBlock.total_fee ?? 0;
  const tradeMonthlyFee = tradeBlock.MonthlyFee ?? tradeBlock.monthly_fee ?? 0;
  const tradeTotalPts = (tradeBlock.TotalPointsX100 ?? tradeBlock.total_points_x100 ?? 0) / 100;
  const tradeMonthlyPts = (tradeBlock.MonthlyPointsX100 ?? tradeBlock.monthly_points_x100 ?? 0) / 100;
  const referralPts = (referralBlock.TotalPointsX100 ?? referralBlock.total_points_x100 ?? 0) / 100;
  const referralMonthly = (referralBlock.MonthlyPointsX100 ?? referralBlock.monthly_points_x100 ?? 0) / 100;
  const rewardPts = (manualBlock.TotalPointsX100 ?? manualBlock.total_points_x100 ?? manualBlock.total_points_x100 ?? 0) / 100;
  const rewardMonthly = (manualBlock.MonthlyPointsX100 ?? manualBlock.monthly_points_x100 ?? 0) / 100;
  const total = (data.TotalPointsX100 ?? data.total_points_x100 ?? (tradeTotalPts * 100 + referralPts * 100 + rewardPts * 100)) / 100;
  const effectiveRate = data.effective_rate || (DEFAULT_RATE_BASE + (hasReferrer ? REFERRAL_BONUS : 0));
  const vipLevel = data.VIPLevel ?? data.vip_level ?? 0;
  const vipProgress = data.VIPProgress ?? data.vip_progress ?? 0;
  const calcVersion = data.CalcVersion ?? data.calc_version;
  const updatedAt = data.UpdatedAt ?? data.updated_at;
  return {
    trade: {
      totalFee: tradeFee,
      monthlyFee: tradeMonthlyFee,
      totalPoints: tradeTotalPts,
      monthlyPoints: tradeMonthlyPts,
      totalTxCount: tradeBlock.TradeCount ?? tradeBlock.trade_count ?? 0,
    },
    referral: referralPts,
    referralMonthly,
    reward: rewardPts,
    rewardMonthly,
    community: 0,
    total,
    vipLevel,
    vipProgress,
    effectiveRate,
    hasReferrer: data.has_referrer ?? hasReferrer,
    calcVersion,
    updatedAt,
  };
}

function mapSummaryV1(data: any, hasReferrer: boolean): PointsSummary {
  // V1 integer points (already truncated). Keep semantics consistent by treating them as full points.
  const tradeTotalPts = Number(data?.total_points || 0);
  const tradeMonthlyPts = Number(data?.monthly_points || 0);
  const tradeFee = Number(data?.total_fee || 0);
  const tradeMonthlyFee = Number(data?.monthly_fee || 0);
  const vipLevel = Number(data?.vip_level || data?.vipLevel || 0);
  const vipProgress = Number(data?.vip_progress || data?.vipProgress || 0);
  const total = tradeTotalPts; // V1 contains only trade points; referral must be fetched separately.
  const effectiveRate = DEFAULT_RATE_BASE + (hasReferrer ? REFERRAL_BONUS : 0);
  return {
    trade: {
      totalFee: tradeFee,
      monthlyFee: tradeMonthlyFee,
      totalPoints: tradeTotalPts,
      monthlyPoints: tradeMonthlyPts,
      totalTxCount: 0,
    },
    referral: 0,
    referralMonthly: 0,
    reward: 0,
    rewardMonthly: 0,
    community: 0,
    total,
    vipLevel,
    vipProgress,
    effectiveRate,
    hasReferrer,
    calcVersion: data?.calc_version,
    updatedAt: data?.updated_at,
  };
}

export function useMarketPoints(_contractUrl?: string, address?: string) {
  return useQuery<PointsSummary>({
    queryKey: ['points-summary-v2', address],
    enabled: !!address,
    refetchInterval: 60000, // 60s polling; backend aggregated
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!address) {
        return mapSummaryV2(undefined, false); // zeros
      }

      // 1. attempt summary_v2
      const [summaryV2] = await Promise.all([
        fetchSummaryV2(address),
      ]);

      if (summaryV2) {
        const base = mapSummaryV2(summaryV2 as any, !!(summaryV2 as any)?.has_referrer);
        // 2. fetch referral details (optional, light) only if referral points > 0 (directly from summary_v2)
        if (base.referral > 0) {
          const detailsResp = await fetchReferralDetails(address, 200);
          if (detailsResp?.details?.length) {
            base.referralDetails = detailsResp.details.map(d => ({ address: (d as any).referree || (d as any).Referree, points: (d as any).points ?? (d as any).Points, bindBlock: (d as any).bind_block ?? (d as any).BindBlock }));
          }
        } else {
          // fallback: maybe user is a referrer but referral part zero because backend summary_v2 omitted it
          const refSum = await fetchReferralSummary(address);
          if (refSum) {
            base.referral = Number(refSum.total_points || 0);
            base.referralMonthly = Number(refSum.monthly_points || 0);
            // NEW: fetch details now that we know referral > 0
            if (base.referral > 0) {
              const detailsResp = await fetchReferralDetails(address, 200);
              if (detailsResp?.details?.length) {
                base.referralDetails = detailsResp.details.map(d => ({ address: (d as any).referree || (d as any).Referree, points: (d as any).points ?? (d as any).Points, bindBlock: (d as any).bind_block ?? (d as any).BindBlock }));
              }
            }
          }
        }
        base.total = Number((base.trade.totalPoints + base.referral + base.reward + base.community).toFixed(2));
        return base;
      }

      // 3. fallback summary_v1
      const summaryV1 = await fetchSummaryV1(address);
      const baseV1 = mapSummaryV1(summaryV1 || {}, false);
      // fetch referral summary separately (V1 has no referral fields)
      const refSum = await fetchReferralSummary(address);
      if (refSum) {
        baseV1.referral = Number(refSum.total_points || 0);
        baseV1.referralMonthly = Number(refSum.monthly_points || 0);
      }
      // details only if referral total > 0
      if (baseV1.referral > 0) {
        const detailsResp = await fetchReferralDetails(address, 200);
        if (detailsResp?.details?.length) {
          baseV1.referralDetails = detailsResp.details.map(d => ({ address: d.referree, points: d.points, bindBlock: d.bind_block }));
        }
      }
      baseV1.total = Number((baseV1.trade.totalPoints + baseV1.referral + baseV1.reward).toFixed(2));
      return baseV1;
    },
  });
}
