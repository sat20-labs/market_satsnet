import React, { useState, useMemo } from "react";
import OrderRow from "@/components/satoshinet/orderbook/OrderRow";
import OrderSummary from "@/components/satoshinet/orderbook/OrderSummary";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useCommonStore, useAssetStore, useUtxoStore } from "@/store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { WalletConnectBus } from "@/components/wallet/WalletConnectBus";
import { tryit } from "radash";
import { clientApi, marketApi } from "@/api";
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import { toast } from "sonner";
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

interface TakeOrderProps {
  mode: "buy" | "sell";
  setMode: (mode: "buy" | "sell") => void;
  userWallet: { btcBalance: number; assetBalance: number };
  assetInfo: { assetName: string; assetLogo: string; AssetId: string; floorPrice: number };
}

const TakeOrder = ({ assetInfo, mode, setMode, userWallet }: TakeOrderProps) => {
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const { chain, network } = useCommonStore();
  const { assets } = useAssetStore();
  const { list: utxoList } = useUtxoStore();
  console.log('assets', assets);

  const { address, btcWallet } = useReactWalletStore();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(12);
  const queryClient = useQueryClient();
  console.log('utxoList', utxoList);

  const queryKey = useMemo(() => {
    return ['orders', assetInfo.assetName, chain, network, page, size, mode];
  }, [assetInfo.assetName, page, size, network, chain, mode]);

  const { data, isLoading, refetch } = useQuery<{ data: { order_list: MarketOrder[], total: number } }>({
    queryKey: queryKey,
    queryFn: () =>
      marketApi.getOrders({
        offset: (page - 1) * size,
        size,
        assets_name: assetInfo.assetName,
        hide_locked: false,
      }),
    enabled: !!assetInfo.assetName,
  });

  const orders: MarketOrder[] = useMemo(() => data?.data?.order_list ?? [], [data]);
  console.log(orders);

  const selectedOrdersData = selectedIndexes.map((index) => orders[index]).filter(Boolean);
  const totalBTC = selectedOrdersData.reduce((sum, order) => {
    return sum + order.value / 100_000_000;
  }, 0);

  const isBalanceSufficient = userWallet.btcBalance >= totalBTC;

  const handleOrderClick = (index: number) => {
    if (selectedIndexes.includes(index)) {
      setSelectedIndexes(selectedIndexes.filter((i) => i !== index));
    } else {
      setSelectedIndexes([...selectedIndexes, index]);
    }
  };

  const summarySelectedOrders = useMemo(() => {
    return selectedOrdersData.map(order => {
      const quantity = parseInt(order.assets[0]?.amount ?? '0', 10);
      const pricePerUnitSats = order.price;
      const totalSats = order.price;
      return {
        quantity,
        price: pricePerUnitSats,
        totalSats: totalSats,
      };
    });
  }, [selectedOrdersData]);
  const [isLoadingState, setIsLoadingState] = useState(false);

  const handleBuyOrder = async () => {
    setIsLoadingState(true);
    const toastId = toast.loading("Processing your order...");

    const NEXT_PUBLIC_SERVICE_ADDRESS =
      network === 'testnet'
        ? process.env.NEXT_PUBLIC_SERVICE_TESTNET_ADDRESS
        : process.env.NEXT_PUBLIC_SERVICE_ADDRESS;

    const lockOrderIds = selectedOrdersData.map((order) => order.order_id);

    try {
      console.log("Locking orders:", lockOrderIds);
      const lockData = await marketApi.lockBulkOrder({ address, orderIds: lockOrderIds });
      console.log("Lock result:", lockData);
      if (lockData.code !== 200 || !lockData.data || lockData.data.length === 0) {
        throw new Error(lockData.msg || "Failed to lock orders.");
      }

      const rawMap: { [key: number]: string } = {};
      let successfulLocks = 0;
      lockData.data.forEach((v) => {
        if (v.raw) {
          rawMap[v.order_id] = v.raw;
          successfulLocks++;
        } else {
          console.warn(`Order ${v.order_id} locked but no raw data returned.`);
        }
      });

      if (successfulLocks !== lockOrderIds.length) {
        await marketApi.unlockBulkOrder({ address, orderIds: Object.keys(rawMap).map(Number) }).catch(unlockError => {
          console.error("Failed to unlock orders after partial lock failure:", unlockError);
        });
        throw new Error("Could not lock all selected orders successfully.");
      }

      const buyUtxoInfos: any[] = [];
      const serviceFee = 0;
      const networkFee = 10;

      console.log("Fetching UTXO info for:", utxoList);
      for (const { utxo } of utxoList) {
        const [error2, utxoInfo] = await tryit(clientApi.getUtxoInfo)(utxo);
        if (error2 || !utxoInfo || utxoInfo.code !== 200) {
          throw new Error(`Failed to get UTXO info for ${utxo}: ${error2 || utxoInfo?.msg}`);
        }
        buyUtxoInfos.push({ ...utxoInfo.data });
      }
      console.log("UTXO infos fetched:", buyUtxoInfos);

      const firstOrderRaw = rawMap[selectedOrdersData[0].order_id];
      if (!firstOrderRaw) {
        throw new Error(`Raw transaction data not found for order ${selectedOrdersData[0].order_id}.`);
      }

      console.log("Finalizing sell order...");
      const finalizeRes = await window.sat20.finalizeSellOrder(
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
        throw new Error("Failed to finalize sell order.");
      }

      console.log("Signing PSBT...");
      const signedPsbt = await btcWallet?.signPsbt(finalizeRes.psbt, { chain: 'sat20' });
      if (!signedPsbt) {
        throw new Error('Failed to sign PSBT.');
      }
      console.log("PSBT signed.");

      console.log("Extracting transaction from PSBT...");
      const buyRaw = await window.sat20?.extractTxFromPsbt(signedPsbt, chain);
      if (!buyRaw) {
        throw new Error('Failed to extract transaction from PSBT.');
      }
      console.log('buyRaw extracted:', buyRaw);

      const order_ids_to_buy = selectedOrdersData.map((v) => v.order_id);
      console.log("Submitting bulk buy order for IDs:", order_ids_to_buy);
      const buyRes = await marketApi.bulkBuyOrder({
        address,
        order_ids: order_ids_to_buy,
        raw: buyRaw,
      });
      console.log('bulkBuyOrder response:', buyRes);

      if (buyRes.code === 200) {
        toast.success("Order placed successfully!", { id: toastId });
        queryClient.invalidateQueries({ queryKey: queryKey });
        setSelectedIndexes([]);
        refetch();
      } else {
        await marketApi.unlockBulkOrder({ address, orderIds: lockOrderIds }).catch(unlockError => {
          console.error("Failed to unlock orders after bulk buy failure:", unlockError);
        });
        throw new Error(buyRes.msg || "Failed to place order.");
      }
    } catch (error: any) {
      console.error("Error during buy order process:", error);
      toast.error(`Order failed: ${error.message || 'Unknown error'}`, { id: toastId });
      if (lockOrderIds.length > 0) {
        try {
          console.log("Attempting to unlock orders due to error:", lockOrderIds);
          await marketApi.unlockBulkOrder({ address, orderIds: lockOrderIds });
          console.log("Orders unlocked successfully after error.");
        } catch (unlockError) {
          console.error("Failed to automatically unlock orders after error:", unlockError);
          toast.warning("Failed to automatically unlock orders. Please check manually.", { duration: 5000 });
        }
      }
    } finally {
      setIsLoadingState(false);
    }
  }
  console.log('selectedIndexes', selectedIndexes);
  console.log('orders', orders);
  
  const isProcessing = isLoading || isLoadingState;

  return (
    <div>
      <div className="grid grid-cols-3 text-sm font-semibold text-zinc-500 bg-transparent border-b border-zinc-800 px-2 py-3 rounded">
        <div className="ml-1">Quantity</div>
        <div>Price (sats/unit)</div>
        <div>Total</div>
      </div>

      <div className="space-y-0 max-h-80 text-sm overflow-y-auto pt-2 w-full scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-gray-200">
        {isLoading ? (
          <div className="text-center py-4">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-4 text-zinc-500">No orders found.</div>
        ) : (
          orders.map((order, idx) => (
            <OrderRow
              key={order.order_id}
              order={order}
              selected={selectedIndexes.includes(idx)}
              onClick={() => handleOrderClick(idx)}
            />
          ))
        )}
      </div>

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
        disabled={selectedIndexes.length === 0 || !isBalanceSufficient || isProcessing}
      >
        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'buy' ? 'Buy' : 'Sell'}
        </Button>
      </WalletConnectBus>
    </div>
  );
};
export default TakeOrder;