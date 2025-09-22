export interface ReferralValidateEntry {
  address: string;
  points?: number; // optional in external_list
  bindBlock?: number;
}

export interface ReferralValidateResult {
  referrer?: string;
  externalTotal: number;
  externalList: ReferralValidateEntry[];
  internalTotal: number;
  internalList: ReferralValidateEntry[];
  validCount: number;
  validItems: ReferralValidateEntry[];
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

export async function fetchReferralValidateList(addressOrDid: string): Promise<ReferralValidateResult | undefined> {
  if (!addressOrDid) return undefined;
  try {
    const tk = getToken();
    const headers: Record<string, string> = {};
    if (tk) { headers['Authorization'] = `Bearer ${tk}`; headers['X-API-Token'] = tk; }
    let url = `${BASE}/api/v1/referral/validate_full?address=${encodeURIComponent(addressOrDid)}`;
    url = withApiToken(url, tk);
    const res = await fetch(url, { headers, cache: 'no-store' });
    if (!res.ok) return undefined;
    const env = await res.json();
    if (!env || env.code !== 0) return undefined;
    const d = env.data || {};
    const mapArr = (arr: any[]) => (arr || []).map((it: any) => ({ address: it.address, points: (it.points != null ? Number(it.points) : undefined), bindBlock: it.bind_block })) as ReferralValidateEntry[];
    return {
      referrer: d.referrer,
      externalTotal: Number(d.external_total || 0),
      externalList: mapArr(d.external_list || []),
      internalTotal: Number(d.internal_total || 0),
      internalList: mapArr(d.internal_list || []),
      validCount: Number(d.valid_count || 0),
      validItems: mapArr(d.valid_items || []),
    };
  } catch {
    return undefined;
  }
}
