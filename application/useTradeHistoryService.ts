import { useQuery } from '@tanstack/react-query';
import { useCommonStore } from '@/store/common';
import { contractService } from '@/domain/services/contract';
import { getDeployedContractInfo } from '@/api/market';

export interface RawUserHistoryItem {
  // Minimal shape based on backend payloads observed elsewhere
  OrderTime?: number; // epoch seconds
  ServiceFee?: number; // sats
  OutAmt?: {
    // Asset amount user received (for purchase records)
    Value?: number; // raw value; precision may be implied in payload
    Precision?: number;
    Ticker?: string;
    Protocol?: string;
  } | null;
  InAmt?: any;
  // plus other backend fields that we keep opaque
  [k: string]: any;
}

export interface PurchaseRecord {
  contractURL: string;
  mode: 'swap' | 'limitorder';
  orderTime: number; // epoch seconds
  serviceFee: number; // sats
  outValue?: number; // from OutAmt.Value
  outPrecision?: number;
  outTicker?: string;
  outProtocol?: string;
  raw: RawUserHistoryItem;
}

async function fetchAllUserHistoryItems(contractUrl: string, address: string, pageLimit = 200, maxPages = 50) {
  // ...first page to get total
  const first = await contractService.getUserHistoryInContract(contractUrl, address, 0, pageLimit);
  const total = first.total || 0;
  const pages = Math.min(Math.ceil(total / pageLimit), maxPages);

  const allPages: Array<{ data: RawUserHistoryItem[]; total: number }> = [first as any];
  const promises: Promise<any>[] = [];
  for (let p = 1; p < pages; p++) {
    promises.push(contractService.getUserHistoryInContract(contractUrl, address, p * pageLimit, pageLimit));
  }
  if (promises.length) {
    const rest = await Promise.all(promises);
    allPages.push(...(rest as any));
  }
  const items = allPages.flatMap((pg) => (pg?.data || [])).filter(Boolean) as RawUserHistoryItem[];
  return items;
}

function detectModeFromUrl(url: string): 'swap' | 'limitorder' {
  // Align with how app pages filter URLs
  if (typeof url === 'string' && url.indexOf('amm.tc') > -1) return 'swap';
  if (typeof url === 'string' && url.indexOf('swap.tc') > -1) return 'limitorder';
  return 'swap';
}

export function useUserPurchaseHistory(address?: string) {
  const { network } = useCommonStore();

  return useQuery({
    queryKey: ['userPurchaseHistory', network, address],
    enabled: !!address,
    refetchOnWindowFocus: false,
    refetchInterval: 120000,
    queryFn: async (): Promise<PurchaseRecord[]> => {
      if (!address) return [];

      // Get all deployed contract URLs and filter for both modes
      const deployed = await getDeployedContractInfo();
      const urls = (deployed?.url || (deployed?.data && deployed.data.url) || []) as string[];
      const targetUrls = Array.isArray(urls)
        ? urls.filter((u) => typeof u === 'string' && (u.indexOf('amm.tc') > -1 || u.indexOf('swap.tc') > -1))
        : [];

      if (targetUrls.length === 0) return [];

      // Fetch user history for each contract URL
      const perContractItems = await Promise.all(
        targetUrls.map(async (url) => {
          try {
            const items = await fetchAllUserHistoryItems(url, address);
            const mode = detectModeFromUrl(url);
            // Map to normalized purchase record shape, focusing on OutAmt.Value, ServiceFee, OrderTime
            const mapped: PurchaseRecord[] = items.map((it) => ({
              contractURL: url,
              mode,
              orderTime: Number(it?.OrderTime ?? 0),
              serviceFee: Number(it?.ServiceFee ?? 0),
              outValue: Number(it?.OutAmt?.Value ?? 0),
              outPrecision: typeof it?.OutAmt?.Precision === 'number' ? it.OutAmt.Precision : undefined,
              outTicker: it?.OutAmt?.Ticker,
              outProtocol: it?.OutAmt?.Protocol,
              raw: it,
            }));
            return mapped;
          } catch (e) {
            console.error('Failed to fetch user history for', url, e);
            return [] as PurchaseRecord[];
          }
        })
      );

      // Flatten, filter to those that have an OrderTime and sort by date desc
      const all = perContractItems.flat().filter((r) => r.orderTime > 0);
      all.sort((a, b) => b.orderTime - a.orderTime);
      return all;
    },
  });
}
