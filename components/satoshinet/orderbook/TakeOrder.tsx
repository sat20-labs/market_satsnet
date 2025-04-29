import React, { useState, useMemo, useEffect } from "react";
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

interface TakeOrderProps {
  assetInfo: { assetName: string; assetLogo: string; AssetId: string; floorPrice: number };
  tickerInfo?: any;
}

const TakeOrderContainer = ({ assetInfo }: TakeOrderProps) => {
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

  useEffect(() => {
    setPage(1);
    setAllOrders([]);
    setTotalOrders(0);
  }, [assetInfo.assetName, mode]);

  const { data: fetchedData, isLoading, isFetching, error, isSuccess } = useQuery<{ data: { order_list: MarketOrder[], total: number } }>({
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

  // 买入订单业务逻辑
  const handleBuyOrder = async (selectedOrdersData: any[], totalSellAmount: number) => {
    if (selectedOrdersData.length === 0) {
      toast.warning("No orders selected.");
      return;
    }
    const toastId = toast.loading("Processing your order...");
    const NEXT_PUBLIC_SERVICE_ADDRESS =
      network === 'testnet'
        ? process.env.NEXT_PUBLIC_SERVICE_TESTNET_ADDRESS
        : process.env.NEXT_PUBLIC_SERVICE_ADDRESS;
    const intendedOrderIds = selectedOrdersData.map((order) => order.order_id);
    try {
      // === UTXO和PSBT处理逻辑 ===
      const buyUtxoInfos: any[] = [];
      const serviceFeeRate = 0.008; // 0.8%
      const serviceFee = Math.floor(totalSellAmount * serviceFeeRate);
      const networkFee = 10;
      const totalUtxoAmount = totalSellAmount + serviceFee + networkFee;
      const utxoRes = await window.sat20.getUtxosWithAsset_SatsNet(address, "::", totalUtxoAmount);
      const { utxos = [] } = utxoRes;
      if (utxos.length === 0) {
        toast.error("No valid UTXOs available for this transaction. Please check your wallet.");
        return;
      }
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
        toast.error("No valid UTXOs available for this transaction. Please check your wallet.");
        return;
      }
      // === 合并PSBT ===
      // 由UI组件负责lock，UI组件会将lockedOrders的raw传递过来
      // 这里假设UI组件已保证所有订单已锁定，并能提供raw数据
      // 这里我们从selectedOrdersData中提取raw
      const orderRaws = selectedOrdersData.map(order => order.raw).filter(Boolean);
      const mergeRaw = await window.sat20.mergeBatchSignedPsbt_SatsNet(orderRaws, network);
      if (!mergeRaw.data.psbt) {
        throw new Error("Failed to merge PSBTs.");
      }
      const finalizeRes = await window.sat20.finalizeSellOrder_SatsNet(
        mergeRaw.data.psbt,
        buyUtxoInfos.map((v) => JSON.stringify(v)),
        address,
        NEXT_PUBLIC_SERVICE_ADDRESS,
        network,
        serviceFee,
        networkFee,
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
        toast.success("Order placed successfully!", { id: toastId });
        setPage(1);
        for (const utxo of utxos) {
          await window.sat20.lockUtxo_SatsNet(address, utxo, 'buy');
        }
        await getBalance();
        queryClient.invalidateQueries({ queryKey: ['orders', assetInfo.assetName, chain, network, 1, size, mode] });
      } else {
        throw new Error(buyRes.msg || "Failed to place order.");
      }
    } catch (error: any) {
      toast.error(`Order failed: ${error.message || 'Unknown error'}`, { id: toastId });
    }
  };

  const isListLoading = isLoading && page === 1;

  return (
    <>
      <BuySellToggle mode={mode} onChange={setMode} />
      <TakeOrderUI
        orders={allOrders}
        totalOrders={totalOrders}
        isLoading={isListLoading}
        isLoadingMore={isLoadingMore}
        onLoadMore={() => {
          setIsLoadingMore(true);
          setPage(prevPage => prevPage + 1);
        }}
        onBuy={handleBuyOrder}
        mode={mode}
        isFetching={isFetching}
        assetInfo={assetInfo}
        address={address}
        balance={balance}
        network={network}
        chain={chain}
      />
    </>
  );
};

export default TakeOrderContainer;