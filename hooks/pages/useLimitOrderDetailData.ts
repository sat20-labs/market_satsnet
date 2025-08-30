import { useQuery, useQueryClient } from "@tanstack/react-query";
import { clientApi, marketApi } from "@/api";
import { contractService } from "@/domain/services/contract";
import { useMemo } from "react";
import { useCommonStore, useWalletStore } from "@/store";
import { useAssetBalance } from '@/application/useAssetBalanceService';
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";

interface TickerInfo {
  name: {
    Protocol: string;
    Type: string;
    Ticker: string;
  };
  displayname: string;
  id: number;
  selfmint: number;
  deployHeight: number;
  deployBlockTime: number;
  deployTx: string;
  limit: string;
  n: number;
  totalMinted: string;
  mintTimes: number;
  maxSupply: string;
  holdersCount: number;
}

export const useLimitOrderDetailData = (asset: string) => {
  const { network } = useCommonStore();
  const ticker = asset.split(':')[2];
  const { address } = useReactWalletStore();
  const tickerQuery = useQuery<any>({
    queryKey: ['ticker', asset, network],
    queryFn: () => clientApi.getTickerInfo(asset),
    enabled: !!asset,
  });

  const holdersQuery = useQuery<any>({
    queryKey: ['ticker', 'holders', asset, network],
    queryFn: () => clientApi.getTickerHolders(asset, 1, 10),
    enabled: !!asset,
    refetchInterval: 120000, // 增加到2分钟，减少刷新频率
    refetchIntervalInBackground: false, // 禁止后台刷新
    refetchOnWindowFocus: false,
  });

  const contractUrlQuery = useQuery({
    queryKey: ['contractUrl', network],
    queryFn: () => contractService.getDeployedContractInfo(),
    enabled: !!ticker,
  });
  const contractUrl = useMemo(() => {
    return contractUrlQuery.data?.filter((url: string) => url.indexOf(`${ticker}_swap.tc`) > -1)[0];
  }, [contractUrlQuery.data, ticker]);

  const { data: contractStatus, isPending: isContractStatusPending, isLoading: isContractStatusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ["swap", 'status', contractUrl, network],
    queryFn: () => contractService.getContractStatus(contractUrl),
    refetchInterval: 15000, // 增加到15秒，减少刷新频率
    refetchIntervalInBackground: false, // 禁止后台刷新
    enabled: !!contractUrl,
    refetchOnWindowFocus: false,
  });

  const { data: analytics, isPending: isAnalyticsPending, isLoading: isAnalyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ["swap", 'analytics', contractUrl, network],
    queryFn: () => contractService.getContractAnalytics(contractUrl),
    refetchInterval: 120000, // 增加到2分钟，减少刷新频率
    refetchIntervalInBackground: false, // 禁止后台刷新
    enabled: !!contractUrl,
    refetchOnWindowFocus: false,
  });

  const isLoading = tickerQuery.isPending || isContractStatusPending || isAnalyticsPending;

  const { balance: satsBalance, getBalance } = useWalletStore();
  const { balance: assetBalance, refetch: refreshAssetBalance } = useAssetBalance(address, asset);

  const refresh = async () => {
    refetchStatus();
    getBalance();
    refreshAssetBalance();
  }
  return {
    ticker,
    isTickerLoading: tickerQuery.isLoading,
    isContractStatusLoading,
    isAnalyticsLoading,
    tickerInfo: tickerQuery.data?.data || {},
    isLoading,
    contractUrl,
    contractData: contractStatus,
    satsBalance,
    assetBalance,
    analyticsData: analytics,
    holders: holdersQuery.data?.data || {},
    refresh
  }
};