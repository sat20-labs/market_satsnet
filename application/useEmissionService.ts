import { useQuery } from '@tanstack/react-query';

export interface EmissionInfo {
  total_minted_x100: number;
  total_cap_x100: number;
  current_halvings: number; // n
  current_multiplier_den: number; // 2^n
  step_size_x100: number;
  next_halving_at_x100: number;
  remaining_to_next_halving_x100: number;
  minted_percent: number; // 0-100
  current_multiplier_num?: number;
}

const BASE = (process.env.NEXT_PUBLIC_POINTS_API_BASE || '').replace(/\/$/, '');

async function fetchEmission(): Promise<EmissionInfo | undefined> {
  try {
    const url = `${BASE}/api/v1/points/emission`;
    const resp = await fetch(url, { cache: 'no-store' });
    if (!resp.ok) return undefined;
    const env = await resp.json();
    if (!env || env.code !== 0) return undefined;
    return env.data as EmissionInfo;
  } catch { return undefined; }
}

export function useEmission() {
  return useQuery({ queryKey: ['points-emission'], queryFn: fetchEmission, refetchInterval: 30_000 });
}
