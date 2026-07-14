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

export async function fetchReferralValidateList(addressOrDid: string): Promise<ReferralValidateResult | undefined> {
  if (!addressOrDid) return undefined;
  try {
    const url = `${BASE}/api/v1/referral/validate_full?address=${encodeURIComponent(addressOrDid)}`;
    const res = await fetch(url, { cache: 'no-store' });
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
