import { useQuery, useQueryClient } from "@tanstack/react-query";
import { clientApi, marketApi } from "@/api";
import { contractService } from "@/domain/services/contract";
import { useMemo } from "react";
import { useWalletStore } from "@/store";
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
  const ticker = asset.split(':')[2];

  const { address } = useReactWalletStore();
  const tickerQuery = useQuery<any>({
    queryKey: ['ticker', asset],
    queryFn: () => clientApi.getTickerInfo(asset),
    enabled: !!asset,
  });

  const contractUrlQuery = useQuery({
    queryKey: ['contractUrl'],
    queryFn: () => contractService.getDeployedContractInfo(),
    enabled: !!ticker,
  });
  const contractUrl = useMemo(() => {
    return contractUrlQuery.data?.filter((url: string) => url.indexOf(`${ticker}_swap.tc`) > -1)[0];
  }, [contractUrlQuery.data, ticker]);

  const { data: contractStatus, isLoading: isContractStatusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ["swap", 'status', contractUrl],
    queryFn: () => contractService.getContractStatus(contractUrl),
    refetchInterval: 6000,
    enabled: !!contractUrl,
    refetchOnWindowFocus: false,
  });

  const { data: analytics, isLoading: isAnalyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ["swap", 'analytics', contractUrl],
    queryFn: () => contractService.getContractAnalytics(contractUrl),
    refetchInterval: 60000,
    enabled: !!contractUrl,
    refetchOnWindowFocus: false,
  });

  const isLoading = tickerQuery.isLoading || isContractStatusLoading || isAnalyticsLoading;

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
    refresh
  }
};