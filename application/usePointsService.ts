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
  trade?: { total_fee?: number; monthly_fee?: number; total_points_x100?: number; monthly_points_x100?: number; trade_count?: number; effective_rate_percent?: number; has_referral?: boolean };
  referral?: { total_points_x100?: number; monthly_points_x100?: number };
  total_points_x100?: number;
  monthly_points_x100?: number;
  vip_level?: number;
  vip_progress?: number;
  calc_version?: number;
  updated_at?: number;
  effective_rate?: number; // legacy top-level decimal (e.g. 0.37)
  has_referrer?: boolean; // legacy top-level flag
  // new PascalCase fields
  Address?: string;
  CalcVersion?: number;
  Trade?: { TotalFee?: number; MonthlyFee?: number; TotalPointsX100?: number; MonthlyPointsX100?: number; TradeCount?: number; EffectiveRatePercent?: number; HasReferral?: boolean };
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
const MIN_RATE_WITH_REF = DEFAULT_RATE_BASE + REFERRAL_BONUS; // 0.37

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
  const tradeBlock = (data as any).Trade || (data as any).trade || {};
  const referralBlock = (data as any).Referral || (data as any).referral || {};
  const manualBlock = (data as any).Manual || (data as any).manual || {};
  const tradeFee = tradeBlock.TotalFee ?? tradeBlock.total_fee ?? 0;
  const tradeMonthlyFee = tradeBlock.MonthlyFee ?? tradeBlock.monthly_fee ?? 0;
  const tradeTotalPts = (tradeBlock.TotalPointsX100 ?? tradeBlock.total_points_x100 ?? 0) / 100;
  const tradeMonthlyPts = (tradeBlock.MonthlyPointsX100 ?? tradeBlock.monthly_points_x100 ?? 0) / 100;
  const referralPts = (referralBlock.TotalPointsX100 ?? referralBlock.total_points_x100 ?? 0) / 100;
  const referralMonthly = (referralBlock.MonthlyPointsX100 ?? referralBlock.monthly_points_x100 ?? 0) / 100;
  const rewardPts = (manualBlock.TotalPointsX100 ?? manualBlock.total_points_x100 ?? 0) / 100;
  const rewardMonthly = (manualBlock.MonthlyPointsX100 ?? manualBlock.monthly_points_x100 ?? 0) / 100;
  // Recompute total to include all parts (some backends may not include Manual in TotalPointsX100)
  const total = Number((tradeTotalPts + referralPts + rewardPts).toFixed(2));
  // Prefer new trade-scoped fields
  const apiRatePercent = tradeBlock.EffectiveRatePercent ?? tradeBlock.effective_rate_percent;
  const apiHasReferral = tradeBlock.HasReferral ?? tradeBlock.has_referral;
  // Legacy top-level
  const legacyEffectiveRate = (data as any).effective_rate;
  const legacyHasReferrer = (data as any).has_referrer;
  // Final flags
  const hasReferralFinal = (apiHasReferral !== undefined ? apiHasReferral : (legacyHasReferrer !== undefined ? legacyHasReferrer : hasReferrer)) as boolean;
  const effectiveRate = (apiRatePercent !== undefined && apiRatePercent !== null)
    ? Number(apiRatePercent) / 100
    : (legacyEffectiveRate !== undefined && legacyEffectiveRate !== null)
      ? Number(legacyEffectiveRate)
      : (DEFAULT_RATE_BASE + (hasReferralFinal ? REFERRAL_BONUS : 0));
  const vipLevel = (data as any).VIPLevel ?? (data as any).vip_level ?? 0;
  const vipProgress = (data as any).VIPProgress ?? (data as any).vip_progress ?? 0;
  const calcVersion = (data as any).CalcVersion ?? (data as any).calc_version;
  const updatedAt = (data as any).UpdatedAt ?? (data as any).updated_at;
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
    hasReferrer: hasReferralFinal,
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
        const base = mapSummaryV2(summaryV2 as any, false);

        // Determine if API provided binding and/or rate explicitly
        const tradeRaw: any = (summaryV2 as any).Trade || (summaryV2 as any).trade || {};
        const apiHasBinding = ('has_referral' in tradeRaw) || ('HasReferral' in tradeRaw) || ('has_referrer' in (summaryV2 as any));
        const apiHasRate = ('effective_rate_percent' in tradeRaw) || ('EffectiveRatePercent' in tradeRaw) || ('effective_rate' in (summaryV2 as any));

        // Only fallback to referral summary when API didn't provide binding or rate
        if (!apiHasBinding || !apiHasRate) {
          const refSum = await fetchReferralSummary(address);
          if (refSum && refSum.referrer) {
            base.hasReferrer = true;
            // Only set rate if API didn't provide one
            if (!apiHasRate) {
              base.effectiveRate = Math.max(base.effectiveRate, MIN_RATE_WITH_REF);
            }
          }
          if (!apiHasBinding) {
            // enrich totals if API omitted referral section
            if (base.referral === 0 && (refSum?.total_points ?? 0) > 0) {
              base.referral = Number(refSum!.total_points || 0);
              base.referralMonthly = Number(refSum!.monthly_points || 0);
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
        if (refSum.referrer) {
          baseV1.hasReferrer = true;
          baseV1.effectiveRate = Math.max(baseV1.effectiveRate, MIN_RATE_WITH_REF);
        }
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
