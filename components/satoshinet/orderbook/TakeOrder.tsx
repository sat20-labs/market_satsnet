import React, { useState, useMemo, useCallback, useEffect } from "react";
import OrderRow from "@/components/satoshinet/orderbook/OrderRow";
import OrderSummary from "@/components/satoshinet/orderbook/OrderSummary";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useCommonStore, useAssetStore, useUtxoStore, useWalletStore } from "@/store";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { WalletConnectBus } from "@/components/wallet/WalletConnectBus";
import { tryit } from "radash";
import { clientApi, marketApi } from "@/api";
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import { toast } from "sonner";
import { debounce } from "radash";
import { set } from "lodash";
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

// Helper function for retrying getUtxoInfo
const MAX_RETRIES = 30; // Maximum number of retries
const RETRY_DELAY_MS = 2000; // Delay between retries in milliseconds

async function getUtxoInfoWithRetry(utxo: string) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const [error, utxoInfo] = await tryit(clientApi.getUtxoInfo)(utxo);

    if (!error && utxoInfo && utxoInfo.code === 0 && utxoInfo.data) {
      console.log(`Successfully fetched UTXO info for ${utxo} on attempt ${attempt}`);
      return utxoInfo.data; // Return data on success
    }

    console.warn(`Attempt ${attempt} failed for UTXO ${utxo}: ${error || utxoInfo?.msg}. Retrying...`);

    if (attempt < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }

  // If all retries fail, throw an error
  throw new Error(`Failed to get UTXO info for ${utxo} after ${MAX_RETRIES} attempts.`);
}

interface TakeOrderProps {
  mode: "buy" | "sell";
  setMode: (mode: "buy" | "sell") => void;
  userWallet: { btcBalance: number; assetBalance: number, address: string };
  assetInfo: { assetName: string; assetLogo: string; AssetId: string; floorPrice: number };
}

const TakeOrder = ({ assetInfo, mode, setMode, userWallet }: TakeOrderProps) => {
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [sliderValue, setSliderValue] = useState(0);
  const [isProcessingLock, setIsProcessingLock] = useState(false);
  const [lockedOrders, setLockedOrders] = useState<Map<number, string>>(new Map());
  const { chain, network } = useCommonStore();
  const { assets } = useAssetStore();
  const { list: utxoList } = useUtxoStore();

  const { address, btcWallet } = useReactWalletStore();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(100);
  const [allOrders, setAllOrders] = useState<MarketOrder[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const queryClient = useQueryClient();

  const queryKey = useMemo(() => {
    return ['orders', assetInfo.assetName, chain, network, page, size, mode];
  }, [assetInfo.assetName, page, size, network, chain, mode]);

  // 定义 debouncedLock
  const debouncedLock = useMemo(
    () => debounce({ delay: 300 }, async (orderIds: number[]) => {
      if (!address || orderIds.length === 0) return;

      const ordersToLock = allOrders.filter(order => orderIds.includes(order.order_id));
      if (ordersToLock.length !== orderIds.length) {
        console.warn("Some orders to lock were not found in allOrders");
      }

      setIsProcessingLock(true);
      try {
        const lockData = await marketApi.lockBulkOrder({ address, orderIds });

        if (lockData.code === 200 && lockData.data) {
          const newLockedOrders = new Map(lockedOrders);
          const failedOrderIndexes: number[] = [];

          lockData.data.forEach((item) => {
            if (item.raw) {
              newLockedOrders.set(item.order_id, item.raw);
            } else {
              const failedIndex = allOrders.findIndex(order => order.order_id === item.order_id);
              if (failedIndex !== -1) {
                failedOrderIndexes.push(failedIndex);
              }
            }
          });

          console.log("Updated lockedOrders after lock:", Array.from(newLockedOrders.keys()));

          setLockedOrders(newLockedOrders);

          if (failedOrderIndexes.length > 0) {
            setSelectedIndexes(prev =>
              prev.filter(index => !failedOrderIndexes.includes(index))
            );
            toast.error("Some orders are already locked by others");
            queryClient.invalidateQueries({ queryKey: queryKey });
          }
        } else {
          toast.error(lockData.msg || "Failed to lock orders");
          queryClient.invalidateQueries({ queryKey: queryKey });
        }
      } catch (error) {
        console.error("Lock orders failed:", error);
        toast.error("Failed to lock orders");
        queryClient.invalidateQueries({ queryKey: queryKey });
      } finally {
        setIsProcessingLock(false);
      }
    }),
    [address, allOrders, lockedOrders, queryClient, queryKey]
  );

  // 定义 debouncedUnlock
  const debouncedUnlock = useMemo(
    () => debounce({ delay: 300 }, async (orderIds: number[]) => {
      if (!address || orderIds.length === 0) return;

      try {
        // 更新本地状态，移除解锁的订单
        setLockedOrders(prev => {
          const newLockedOrders = new Map(prev);
          orderIds.forEach(id => newLockedOrders.delete(id));
          console.log("Updated lockedOrders after unlock:", Array.from(newLockedOrders.keys()));
          return newLockedOrders;
        });

        // 调用解锁 API
        const unlockResult = await marketApi.unlockBulkOrder({ address, orderIds });

        if (unlockResult.code !== 200) {
          console.error("Failed to unlock orders:", orderIds);
          toast.error(unlockResult.msg || "Failed to unlock orders");
        }
      } catch (error) {
        console.error("Unlock orders failed:", error);
        toast.error("Failed to unlock orders");
      }
    }),
    [address, lockedOrders]
  );

  useEffect(() => {
    setPage(1);
    setAllOrders([]);
    setTotalOrders(0);
    setSelectedIndexes([]);
    setSliderValue(0);
    setLockedOrders(new Map());
  }, [assetInfo.assetName, mode]);

  const { data: fetchedData, isLoading, isFetching, error, isSuccess } = useQuery<{ data: { order_list: MarketOrder[], total: number } }>({
    queryKey: queryKey,
    queryFn: () => {
      console.log(`Fetching orders: page=${page}, size=${size}`);
      return marketApi.getOrders({
        offset: (page - 1) * size,
        size,
        sort: 1,
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
      console.log(`Processing successful data for page ${page}:`, fetchedData);
      const newOrders = fetchedData.data.order_list ?? [];
      const total = fetchedData.data.total ?? 0;

      setAllOrders(prevOrders => {
        if (page === 1) {
          console.log("Setting orders for page 1");
          return newOrders;
        } else {
          const existingOrderIds = new Set(prevOrders.map(o => o.order_id));
          const uniqueNewOrders = newOrders.filter(o => !existingOrderIds.has(o.order_id));
          console.log(`Appending ${uniqueNewOrders.length} new unique orders for page ${page}`);
          return [...prevOrders, ...uniqueNewOrders];
        }
      });
      setTotalOrders(total);
      setIsLoadingMore(false);
    }
  }, [fetchedData, isSuccess, page]);

  useEffect(() => {
    if (error) {
      console.error("Failed to fetch orders:", error);
      toast.error("Failed to load orders.");
      setIsLoadingMore(false);
    }
  }, [error]);

  const currentWalletAddress = address;

  // 排除用户自己的挂单并按单价排序
  const sortedOrders = useMemo(() => {
    return [...allOrders]
      .filter(order => order.address !== currentWalletAddress) // 排除自己的挂单
      .sort((a, b) => {
        const unitPriceA = parseFloat(a.assets?.unit_price || "0");
        const unitPriceB = parseFloat(b.assets?.unit_price || "0");
        return unitPriceA - unitPriceB;
      });
  }, [allOrders, currentWalletAddress]);

  // 计算用户最多可以选择的挂单数量
  const maxSelectableOrders = useMemo(() => {
    let totalCost = 0;
    let count = 0;

    for (const order of sortedOrders) {
      totalCost += order.value / 100_000_000; // 转换为 BTC
      if (totalCost > userWallet.btcBalance) break; // 超出余额时停止
      count++;
    }

    return count;
  }, [sortedOrders, userWallet.btcBalance]);

  const handleOrderClick = useCallback(async (index: number) => {
    const order = allOrders[index];
    if (!order || (order.locked === 1 && !lockedOrders.has(order.order_id)) || order.address === address) {
      console.warn("Clicked on a disabled or invalid order row.");
      return;
    }

    const orderId = order.order_id;
    
    setSelectedIndexes(prev => {
      const isSelected = prev.includes(index);
      const newIndexes = isSelected 
        ? prev.filter(i => i !== index)
        : [...prev, index].sort((a, b) => a - b);
      
      // 更新滑动条值以匹配选择状态
      setSliderValue(newIndexes.length);
      
      // 处理锁定/解锁
      if (isSelected) {
        if (lockedOrders.has(orderId)) {
          debouncedUnlock([orderId]);
        }
      } else {
        debouncedLock([orderId]);
      }
      
      return newIndexes;
    });
  }, [allOrders, lockedOrders, debouncedLock, debouncedUnlock, address]);

  const handleSliderChange = useCallback((newValue: number) => {
    setSliderValue(newValue);
    
    const ordersToSelect = sortedOrders.slice(0, newValue);
    const newSelectedIndexes = ordersToSelect
      .map(order => allOrders.findIndex(o => o.order_id === order.order_id))
      .filter(index => index !== -1)
      .sort((a, b) => a - b);

    // 计算需要锁定和解锁的订单
    const currentOrderIds = new Set(selectedIndexes.map(idx => allOrders[idx]?.order_id));
    const newOrderIds = new Set(newSelectedIndexes.map(idx => allOrders[idx]?.order_id));
    
    const orderIdsToLock = newSelectedIndexes
      .map(idx => allOrders[idx]?.order_id)
      .filter(id => id && !currentOrderIds.has(id));
      
    const orderIdsToUnlock = selectedIndexes
      .map(idx => allOrders[idx]?.order_id)
      .filter(id => id && !newOrderIds.has(id));

    // 更新选择状态
    setSelectedIndexes(newSelectedIndexes);

    // 处理锁定/解锁
    if (orderIdsToUnlock.length > 0) {
      debouncedUnlock(orderIdsToUnlock);
    }
    if (orderIdsToLock.length > 0) {
      debouncedLock(orderIdsToLock);
    }
  }, [sortedOrders, allOrders, selectedIndexes, debouncedLock, debouncedUnlock]);

  const selectedOrdersData = selectedIndexes
    .map((index) => allOrders[index])
    .filter((order) => order !== undefined && order !== null);

  const totalBTC = selectedOrdersData.reduce((sum, order) => {
    return sum + order.value / 100_000_000;
  }, 0);

  const isBalanceSufficient = userWallet.btcBalance >= totalBTC;

  const summarySelectedOrders = useMemo(() => {
    return selectedOrdersData.map(order => {
      const ticker = typeof order.assets?.assets_name === 'string'
        ? order.assets.assets_name
        : order.assets?.assets_name?.Ticker || 'Unknown';
      const quantity = parseInt(order.assets?.amount ?? '0', 10);
      const pricePerUnitSats = order.price;
      const totalSats = order.price;
      return {
        ticker,
        quantity,
        price: pricePerUnitSats,
        totalSats: totalSats,
      };
    });
  }, [selectedOrdersData]);
  const totalSellAmount = useMemo(() => {
    return summarySelectedOrders.reduce((sum, order) => {
      return sum + order.totalSats
    }, 0);
  }, [summarySelectedOrders]);
  const [isLoadingState, setIsLoadingState] = useState(false);

  const handleBuyOrder = async () => {
    if (selectedOrdersData.length === 0) {
      toast.warning("No orders selected.");
      return;
    }

    setIsLoadingState(true);
    const toastId = toast.loading("Processing your order...");

    const NEXT_PUBLIC_SERVICE_ADDRESS =
      network === 'testnet'
        ? process.env.NEXT_PUBLIC_SERVICE_TESTNET_ADDRESS
        : process.env.NEXT_PUBLIC_SERVICE_ADDRESS;

    const intendedOrderIds = selectedOrdersData.map((order) => order.order_id);
    let successfullyLockedIds: number[] = [];

    try {
      console.log("Attempting to ensure lock on orders:", intendedOrderIds);
      const lockData = await marketApi.lockBulkOrder({ address, orderIds: intendedOrderIds });
      console.log("Pre-buy lock result:", lockData);

      if (lockData.code !== 200 || !lockData.data) {
        throw new Error(lockData.msg || "Failed to secure lock on selected orders before buying.");
      }

      const rawMap: { [key: number]: string } = {};
      const failedToLockIds: number[] = [];

      lockData.data.forEach((item) => {
        if (intendedOrderIds.includes(item.order_id)) {
          if (item.raw) {
            rawMap[item.order_id] = item.raw;
            successfullyLockedIds.push(item.order_id);
          } else {
            failedToLockIds.push(item.order_id);
            console.warn(`Order ${item.order_id} lock confirmed but no raw data returned.`);
          }
        }
      });

      if (successfullyLockedIds.length !== intendedOrderIds.length) {
        const missingLocks = intendedOrderIds.filter(id => !successfullyLockedIds.includes(id));
        console.error("Could not successfully lock all intended orders:", missingLocks);
        if (successfullyLockedIds.length > 0) {
          await marketApi.unlockBulkOrder({ address, orderIds: successfullyLockedIds }).catch(unlockError => {
            console.error("Failed to unlock orders after partial lock failure during buy:", unlockError);
          });
        }
        throw new Error(`Failed to lock orders: ${missingLocks.join(', ')}. Please try again.`);
      }

      const buyUtxoInfos: any[] = [];
      const serviceFee = 0;
      const networkFee = 10;

      for (const { utxo } of utxoList) {
        try {
          //console.log(`Fetching UTXO info for: ${utxo}`);
          const utxoData = await getUtxoInfoWithRetry(utxo);
          buyUtxoInfos.push({ ...utxoData });
        } catch (error) {
          console.error(`Failed to fetch UTXO info for: ${utxo}`, error);
          toast.error(`Failed to fetch UTXO info for: ${utxo}. Skipping this UTXO.`);
          continue; // 跳过无效的 UTXO
        }
      }

      if (buyUtxoInfos.length === 0) {
        toast.error("No valid UTXOs available for this transaction. Please check your wallet.");
        return;
      }

      console.log("UTXO infos fetched:", buyUtxoInfos);

      const firstOrderRaw = rawMap[intendedOrderIds[0]];
      if (!firstOrderRaw) {
        throw new Error(`Critical error: Raw transaction data not found for first order ${intendedOrderIds[0]} even after successful lock.`);
      }

      console.log("Finalizing sell order (based on first selected order)...");
      const finalizeRes = await window.sat20.finalizeSellOrder_SatsNet(
        firstOrderRaw,
        buyUtxoInfos.map((v) => JSON.stringify(v)),
        address,
        NEXT_PUBLIC_SERVICE_ADDRESS,
        network,
        serviceFee,
        networkFee,
      );
      console.log('finalizeSellOrder res', finalizeRes);
      if (!finalizeRes || !finalizeRes.psbt) {
        await marketApi.unlockBulkOrder({ address, orderIds: successfullyLockedIds }).catch(unlockError => console.error("Unlock failed in finalizeSellOrder error path:", unlockError));
        throw new Error("Failed to finalize sell order.");
      }

      console.log("Signing PSBT...");
      const signedPsbt = await btcWallet?.signPsbt(finalizeRes.psbt, { chain: 'sat20' });
      if (!signedPsbt) {
        await marketApi.unlockBulkOrder({ address, orderIds: successfullyLockedIds }).catch(unlockError => console.error("Unlock failed in signPsbt error path:", unlockError));
        throw new Error('Failed to sign PSBT.');
      }
      console.log("PSBT signed.");

      console.log("Extracting transaction from PSBT...");
      const buyRaw = await window.sat20?.extractTxFromPsbt(signedPsbt, chain);
      if (!buyRaw) {
        await marketApi.unlockBulkOrder({ address, orderIds: successfullyLockedIds }).catch(unlockError => console.error("Unlock failed in extractTx error path:", unlockError));
        throw new Error('Failed to extract transaction from PSBT.');
      }
      console.log('buyRaw extracted:', buyRaw);

      console.log("Submitting bulk buy order for IDs:", intendedOrderIds);
      const buyRes = await marketApi.bulkBuyOrder({
        address,
        order_ids: intendedOrderIds,
        raw: buyRaw,
      });
      console.log('bulkBuyOrder response:', buyRes);

      if (buyRes.code === 200) {
        toast.success("Order placed successfully!", { id: toastId });
        setSelectedIndexes([]);
        setPage(1);
        for (const utxo of utxoList) {
          const res = await window.sat20.lockUtxo_SatsNet(address, utxo, 'buy')
          console.log('lockUtxo_SatsNet res', res);
        }
        queryClient.invalidateQueries({ queryKey: ['orders', assetInfo.assetName, chain, network, 1, size, mode] });
      } else {
        await marketApi.unlockBulkOrder({ address, orderIds: successfullyLockedIds }).catch(unlockError => {
          console.error("Failed to unlock orders after bulk buy failure:", unlockError);
        });
        throw new Error(buyRes.msg || "Failed to place order.");
      }
    } catch (error: any) {
      console.error("Error during buy order process:", error);
      toast.error(`Order failed: ${error.message || 'Unknown error'}`, { id: toastId });
      if (successfullyLockedIds.length > 0) {
        try {
          console.log("Attempting to unlock orders due to error:", successfullyLockedIds);
          await marketApi.unlockBulkOrder({ address, orderIds: successfullyLockedIds });
          console.log("Orders unlocked successfully after error.");
        } catch (unlockError) {
          console.error("Failed to automatically unlock orders after error:", unlockError);
          toast.warning("Failed to automatically unlock orders. Please check manually.", { duration: 5000 });
        }
      }
      setLockedOrders(prev => {
        const newMap = new Map(prev);
        successfullyLockedIds.forEach(id => newMap.delete(id));
        return newMap;
      })
    } finally {
      setIsLoadingState(false);
    }
  }

  const isListLoading = isLoading && page === 1;

  return (
    <div>
      <div className="grid grid-cols-3 text-sm font-semibold text-zinc-500 bg-transparent border-b border-zinc-800 px-2 py-3 rounded">
        <div className="ml-1">Quantity</div>
        <div>Price (unit)</div>
        <div>Total</div>
      </div>

      <div className="space-y-0 max-h-80 text-sm overflow-y-auto pt-2 w-full scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-gray-200">
        {isListLoading ? (
          <div className="text-center py-4">Loading orders...</div>
        ) : allOrders.length === 0 && !isFetching ? (
          <div className="text-center py-4 text-zinc-500">No orders found.</div>
        ) : (
          allOrders.map((order, idx) => (
            <OrderRow
              key={order.order_id}
              order={order}
              selected={selectedIndexes.includes(idx)}
              onClick={() => handleOrderClick(idx)}
              currentWalletAddress={address}
              isLocked={lockedOrders.has(order.order_id)}
              isProcessingLock={isProcessingLock && selectedIndexes.includes(idx)}
            />
          ))
        )}
        {isLoadingMore && (
          <div className="text-center py-2"><Loader2 className="h-4 w-4 animate-spin inline-block" /> Loading more...</div>
        )}
      </div>

      {!isListLoading && !isLoadingMore && allOrders.length < totalOrders && (
        <Button
          variant="outline"
          className="w-full mt-2"
          onClick={() => {
            setIsLoadingMore(true);
            setPage(prevPage => prevPage + 1);
          }}
          disabled={isFetching}
        >
          {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Load More ({allOrders.length} / {totalOrders})
        </Button>
      )}

      {selectedIndexes.length > 0 && (
        <div className="mt-4">
          <div className="flex justify-between items-center text-sm text-zinc-500 mb-2">
            <span>Selected Orders: {sliderValue}</span>
            <span>Max: {maxSelectableOrders}</span>
          </div>
          <input
            type="range"
            min="1"
            max={maxSelectableOrders}
            value={sliderValue}
            onChange={(e) => handleSliderChange(Number(e.target.value))}
            className="w-full"
          />
        </div>
      )}

      {selectedIndexes.length > 0 && <OrderSummary selectedOrders={summarySelectedOrders} />}

      {!isBalanceSufficient && selectedIndexes.length > 0 && (
        <p className="text-red-500 mt-4 text-xs font-medium">
          Insufficient BTC balance to take the selected orders.
        </p>
      )}
      <WalletConnectBus asChild>
        <Button
          onClick={handleBuyOrder}
          className={`w-full mt-4 ${!(selectedIndexes.length === 0 || !isBalanceSufficient) ? "btn-gradient" : ""}`}
          disabled={selectedIndexes.length === 0 || !isBalanceSufficient || isLoadingState || isFetching}
        >
          {(isLoadingState || (isFetching && !isLoadingMore)) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoadingState ? "Processing..." : (mode === 'buy' ? 'Buy' : 'Sell')}
        </Button>
      </WalletConnectBus>
    </div>
  );
};

export default TakeOrder;