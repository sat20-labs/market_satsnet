import React, { useState, useMemo, useEffect, forwardRef, useImperativeHandle } from "react";
import { useCommonStore, useAssetStore, useWalletStore } from "@/store";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { clientApi, marketApi } from "@/api";
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import { toast } from "sonner";
import { tryit } from "radash";
import TakeOrderUI from "@/components/satoshinet/orderbook/TakeOrderUI";
import BuySellToggle from "@/components/satoshinet/orderbook/BuySellToggle";
// --- Start: Define types locally (Consider moving to types/market.ts later) ---
export interface MarketOrderAsset {
  assets_name: {
    Protocol: string;
    Type: string;
    Ticker: string;
  };
  content_type: string;
  delegate: string;
  amount: string;
  unit_price: string;
  unit_amount: number;
}

export interface MarketOrder {
  order_id: number;
  address: string;
  order_type: number;
  currency: string;
  price: number;
  utxo: string;
  value: number;
  assets: MarketOrderAsset;
  order_time: number;
  locked: number;
  order_source: string;
}
// --- End: Define types locally ---

const MAX_RETRIES = 30;
const RETRY_DELAY_MS = 2000;

async function getUtxoInfoWithRetry(utxo: string) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const [error, utxoInfo] = await tryit(clientApi.getUtxoInfo)(utxo);
    if (!error && utxoInfo && utxoInfo.code === 0 && utxoInfo.data) {
      return utxoInfo.data;
    }
    if (attempt < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  throw new Error(`Failed to get UTXO info for ${utxo} after ${MAX_RETRIES} attempts.`);
}

export interface TakeOrderRef {
  forceRefresh: () => Promise<void>;
}

interface TakeOrderProps {
  assetInfo: { assetName: string; assetLogo: string; AssetId: string; floorPrice: number };
  tickerInfo?: any;
  assetBalance?: number;
  onSellSuccess?: () => void;
}

const TakeOrderContainer = forwardRef<TakeOrderRef, TakeOrderProps>(({ assetInfo, tickerInfo, assetBalance, onSellSuccess }, ref) => {
  const { chain, network } = useCommonStore();
  const { balance, getBalance } = useWalletStore();
  const { address, btcWallet } = useReactWalletStore();
  const [page, setPage] = useState(1);
  const [size] = useState(100);
  const [allOrders, setAllOrders] = useState<MarketOrder[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => {
    return ['orders', assetInfo.assetName, chain, network, page, size, mode];
  }, [assetInfo.assetName, page, size, network, chain, mode]);

  const { data: fetchedData, isLoading, isFetching, error, isSuccess, refetch } = useQuery<{ data: { order_list: MarketOrder[], total: number } }>({
    queryKey: queryKey,
    queryFn: () => {
      return marketApi.getOrders({
        offset: (page - 1) * size,
        size,
        sort: 1,
        type: mode === "buy" ? 1 : 2,
        assets_name: assetInfo.assetName,
        hide_locked: false,
      });
    },
    enabled: !!assetInfo.assetName,
    placeholderData: keepPreviousData,
    refetchInterval: 20000,
    refetchIntervalInBackground: false,
    staleTime: 20000,
  });

  // 暴露强制刷新方法给父组件
  useImperativeHandle(ref, () => ({
    forceRefresh: async () => {
      if (page === 1) {
        await refetch();
      } else {
        setPage(1);
      }
    }
  }));

  useEffect(() => {
    if (isSuccess && fetchedData?.data) {
      const newOrders = fetchedData.data.order_list ?? [];
      const total = fetchedData.data.total ?? 0;
      setAllOrders(prevOrders => {
        if (page === 1) {
          return newOrders;
        } else {
          const existingOrderIds = new Set(prevOrders.map(o => o.order_id));
          const uniqueNewOrders = newOrders.filter(o => !existingOrderIds.has(o.order_id));
          return [...prevOrders, ...uniqueNewOrders];
        }
      });
      setTotalOrders(total);
      setIsLoadingMore(false);
    }
  }, [fetchedData, isSuccess, page]);

  useEffect(() => {
    if (error) {
      toast.error("Failed to load orders.");
      setIsLoadingMore(false);
    }
  }, [error]);

  // 处理买入订单
  const handleBuyAsset = async (selectedOrdersData: any[], fees: any, summary: any) => {
    const toastId = toast.loading("Processing your buy order...");
    const NEXT_PUBLIC_SERVICE_ADDRESS =
      network === 'testnet'
        ? process.env.NEXT_PUBLIC_SERVICE_TESTNET_ADDRESS
        : process.env.NEXT_PUBLIC_SERVICE_ADDRESS;
    const intendedOrderIds = selectedOrdersData.map((order) => order.order_id);
    try {
      // === UTXO和PSBT处理逻辑 ===
      const buyUtxoInfos: any[] = [];

      // 获取UTXO
      const utxoRes = await window.sat20.getUtxosWithAsset_SatsNet(address, "::", summary.totalPay);
      const { utxos = [] } = utxoRes;
      if (utxos.length === 0) {
        throw new Error("No valid UTXOs available for this transaction. Please check your wallet.");
      }

      // 获取UTXO信息
      for (const utxo of utxos) {
        try {
          const utxoData = await getUtxoInfoWithRetry(utxo);
          buyUtxoInfos.push({ ...utxoData });
        } catch (error) {
          toast.error(`Failed to fetch UTXO info for: ${utxo}. Skipping this UTXO.`);
          continue;
        }
      }
      if (buyUtxoInfos.length === 0) {
        throw new Error("No valid UTXOs available for this transaction. Please check your wallet.");
      }

      // === 合并PSBT ===
      const orderRaws = selectedOrdersData.map(order => order.raw).filter(Boolean);
      const mergeRaw = await window.sat20.mergeBatchSignedPsbt_SatsNet(orderRaws, network);
      if (!mergeRaw.data.psbt) {
        throw new Error("Failed to merge PSBTs.");
      }

      // Finalize PSBT
      const finalizeRes = await window.sat20.finalizeSellOrder_SatsNet(
        mergeRaw.data.psbt,
        buyUtxoInfos.map((v) => JSON.stringify(v)),
        address,
        NEXT_PUBLIC_SERVICE_ADDRESS,
        network,
        fees.serviceFee,
        fees.networkFee,
      );

      if (!finalizeRes || !finalizeRes.psbt) {
        throw new Error("Failed to finalize buy order.");
      }

      const signedPsbt = await btcWallet?.signPsbt(finalizeRes.psbt, { chain: 'sat20' });
      if (!signedPsbt) {
        throw new Error('Failed to sign PSBT.');
      }

      const buyRaw = await window.sat20?.extractTxFromPsbt(signedPsbt, chain);
      if (!buyRaw) {
        throw new Error('Failed to extract transaction from PSBT.');
      }

      const buyRes = await marketApi.bulkBuyOrder({
        address,
        order_ids: intendedOrderIds,
        raw: buyRaw,
      });

      if (buyRes.code === 200) {
        toast.success("Buy order placed successfully!", { id: toastId });
        setPage(1);
        for (const utxo of buyUtxoInfos) {
          await window.sat20.lockUtxo_SatsNet(address, utxo.Outpoint, 'buy');
        }
        await getBalance();
        queryClient.invalidateQueries({ queryKey: ['orders', assetInfo.assetName, chain, network, 1, size, mode] });
        return; // 成功完成
      } else {
        throw new Error(buyRes.msg || "Failed to place buy order.");
      }
    } catch (error: any) {
      toast.error(`Buy order failed: ${error.message || 'Unknown error'}`, { id: toastId });
      throw error; // 重新抛出错误，这样UI组件可以捕获到
    }
  };

  // 处理卖出订单
  const handleSellAsset = async (selectedOrdersData: any[], fees: any, summary: any) => {
    const toastId = toast.loading("Processing your sell order...");
    const NEXT_PUBLIC_SERVICE_ADDRESS =
      network === 'testnet'
        ? process.env.NEXT_PUBLIC_SERVICE_TESTNET_ADDRESS
        : process.env.NEXT_PUBLIC_SERVICE_ADDRESS;
    const intendedOrderIds = selectedOrdersData.map((order) => order.order_id);
    try {
      // === UTXO和PSBT处理逻辑 ===
      const buyUtxoInfos: any[] = [];

      // 获取资产UTXO
      const utxoRes = await window.sat20.getUtxosWithAsset_SatsNet(address, assetInfo.assetName, summary.totalPay);
      const { utxos = [] } = utxoRes;
      if (utxos.length === 0) {
        throw new Error(`No valid ${assetInfo.assetName} UTXOs available for this transaction. Please check your wallet.`);
      }

      // 获取UTXO信息
      for (const utxo of utxos) {
        try {
          const utxoData = await getUtxoInfoWithRetry(utxo);
          buyUtxoInfos.push({ ...utxoData });
        } catch (error) {
          toast.error(`Failed to fetch UTXO info for: ${utxo}. Skipping this UTXO.`);
          continue;
        }
      }
      if (buyUtxoInfos.length === 0) {
        throw new Error(`No valid ${assetInfo.assetName} UTXOs available for this transaction. Please check your wallet.`);
      }

      // === 合并PSBT ===
      const orderRaws = selectedOrdersData.map(order => order.raw).filter(Boolean);
      const mergeRaw = await window.sat20.mergeBatchSignedPsbt_SatsNet(orderRaws, network);
      if (!mergeRaw.data.psbt) {
        throw new Error("Failed to merge PSBTs.");
      }

      // Finalize PSBT
      const finalizeRes = await window.sat20.finalizeSellOrder_SatsNet(
        mergeRaw.data.psbt,
        buyUtxoInfos.map((v) => JSON.stringify(v)),
        address,
        NEXT_PUBLIC_SERVICE_ADDRESS,
        network,
        fees.serviceFee,
        fees.networkFee,
      );

      if (!finalizeRes || !finalizeRes.psbt) {
        throw new Error("Failed to finalize sell order.");
      }

      const signedPsbt = await btcWallet?.signPsbt(finalizeRes.psbt, { chain: 'sat20' });
      if (!signedPsbt) {
        throw new Error('Failed to sign PSBT.');
      }

      const buyRaw = await window.sat20?.extractTxFromPsbt(signedPsbt, chain);
      if (!buyRaw) {
        throw new Error('Failed to extract transaction from PSBT.');
      }

      const buyRes = await marketApi.bulkBuyOrder({
        address,
        order_ids: intendedOrderIds,
        raw: buyRaw,
      });

      if (buyRes.code === 200) {
        toast.success("Sell order placed successfully!", { id: toastId });
        setPage(1);
        for (const utxo of buyUtxoInfos) {
          await window.sat20.lockUtxo_SatsNet(address, utxo.Outpoint, 'sell');
        }
        await getBalance();
        queryClient.invalidateQueries({ queryKey: ['orders', assetInfo.assetName, chain, network, 1, size, mode] });
        if (typeof onSellSuccess === 'function') {
          onSellSuccess();
        }
        return; // 成功完成
      } else {
        throw new Error(buyRes.msg || "Failed to place sell order.");
      }
    } catch (error: any) {
      toast.error(`Sell order failed: ${error.message || 'Unknown error'}`, { id: toastId });
      throw error; // 重新抛出错误，这样UI组件可以捕获到
    }
  };

  // 统一处理函数
  const handleOrder = async (selectedOrdersData: any[], fees: any, summary: any) => {
    if (selectedOrdersData.length === 0) {
      toast.warning("No orders selected.");
      return;
    }

    try {
      if (mode === 'buy') {
        await handleBuyAsset(selectedOrdersData, fees, summary);
      } else {
        await handleSellAsset(selectedOrdersData, fees, summary);
      }
    } catch (error) {
      // 错误已经在具体处理函数中显示给用户了，这里只需要继续传播错误
      throw error;
    }
  };

  const isListLoading = isLoading && page === 1;

  return (
    <>
      <BuySellToggle mode={mode} source="takeorder" onChange={setMode} />
      <TakeOrderUI
        tickerInfo={tickerInfo}
        orders={allOrders}
        totalOrders={totalOrders}
        isLoading={isListLoading}
        isLoadingMore={isLoadingMore}
        onLoadMore={() => {
          setIsLoadingMore(true);
          setPage(prevPage => prevPage + 1);
        }}
        onBuy={handleOrder}
        mode={mode}
        isFetching={isFetching}
        assetInfo={assetInfo}
        address={address}
        balance={balance}
        network={network}
        chain={chain}
        assetBalance={mode === 'sell' ? assetBalance : balance.availableAmt}
        {...(mode === 'sell' ? { onSellSuccess } : {})}
      />
    </>
  );
});

TakeOrderContainer.displayName = 'TakeOrderContainer';

export default TakeOrderContainer;