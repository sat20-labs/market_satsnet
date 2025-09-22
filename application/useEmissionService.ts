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
// Provide safe default token matching backend sample if env/storage missing
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

async function fetchEmission(): Promise<EmissionInfo | undefined> {
  try {
    const tk = getToken();
    const headers: Record<string, string> = {};
    if (tk) { headers['Authorization'] = `Bearer ${tk}`; headers['X-API-Token'] = tk; }
    // Build URL and also include api_token as query for compatibility
    let url = `${BASE}/api/v1/points/emission`;
    url = withApiToken(url, tk);
    const resp = await fetch(url, { headers, cache: 'no-store' });
    if (!resp.ok) return undefined;
    const env = await resp.json();
    if (!env || env.code !== 0) return undefined;
    return env.data as EmissionInfo;
  } catch { return undefined; }
}

export function useEmission() {
  return useQuery({ queryKey: ['points-emission'], queryFn: fetchEmission, refetchInterval: 30_000 });
}
