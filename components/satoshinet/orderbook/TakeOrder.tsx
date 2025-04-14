import React, { useState, useMemo } from "react";
import OrderRow from "@/components/satoshinet/orderbook/OrderRow";
import OrderSummary from "@/components/satoshinet/orderbook/OrderSummary";
import { Button } from "@nextui-org/react";
import { useCommonStore } from "@/store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { tryit } from "radash";
import { clientApi, marketApi } from "@/api";
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
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
  assets: MarketOrderAsset[];
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
  const { address, btcWallet } = useReactWalletStore();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(12);
  const queryClient = useQueryClient();

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
      const pricePerUnitSats = order.price * 100_000_000;
      const orderTotalBTC = order.value / 100_000_000;
      const totalUSD = 0;
      return {
        quantity,
        price: pricePerUnitSats,
        totalBTC: orderTotalBTC,
        totalUSD
      };
    });
  }, [selectedOrdersData]);
  const handleBuyOrder = async () => {
    console.log(selectedOrdersData);
        const NEXT_PUBLIC_SERVICE_ADDRESS =
          network === 'testnet'
            ? process.env.NEXT_PUBLIC_SERVICE_TESTNET_ADDRESS
            : process.env.NEXT_PUBLIC_SERVICE_ADDRESS;
        const buyUtxoInfos: any[] = [];
        const lockOrderIds = selectedOrdersData.map((order) => order.order_id);
        const lockData = await marketApi.lockBulkOrder({ address, orderIds: lockOrderIds })
        const rawMap: any = {}
        lockData.data.forEach((v) => {
          rawMap[v.order_id] = v.raw;
        })
        const serviceFee = 0
        const networkFee = 10
        for (let i = 0; i < selectedOrdersData.length; i++) {
          const { utxo, order_id } = selectedOrdersData[i];
          const [error2, utxoInfo] = await tryit(clientApi.getUtxoInfo)(utxo);
          if (error2) {
            throw error2;
          }
          buyUtxoInfos.push({
            ...utxoInfo.data
          });
        }
        console.log(lockData);
        
        const res = await window.sat20.finalizeSellOrder(
          rawMap[selectedOrdersData[0].order_id],
          buyUtxoInfos.map((v) => JSON.stringify(v)),
          address,
          NEXT_PUBLIC_SERVICE_ADDRESS,
          network,
          serviceFee,
          networkFee,
        );
        console.log('finalizeSellOrder res', res);
        
        const signedPsbt = await btcWallet?.signPsbt(res.psbt, { chain: 'sat20' });
        if (!signedPsbt) {
          throw new Error('signPsbt failed');
        }
        const buyRaw = await window.sat20?.extractTxFromPsbt(signedPsbt, chain);
        console.log('buyRaw', buyRaw);
        if (!buyRaw) {
          throw new Error('extractTxFromPsbt failed');
        }
        const order_ids = selectedOrdersData.map((v) => v.order_id);
        const buyRes = await marketApi.bulkBuyOrder({
          address,
          order_ids,
          raw: buyRaw,
        });
        console.log('buyRes', buyRes);
        if (buyRes.code === 200) {
           queryClient.invalidateQueries({ queryKey: queryKey });
           setSelectedIndexes([]);
           refetch();
        } else {
          console.error('bulkBuyOrder failed:', buyRes);
        }
  }
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

      <OrderSummary selectedOrders={summarySelectedOrders} />

      {!isBalanceSufficient && selectedIndexes.length > 0 && (
        <p className="text-red-500 mt-4 text-xs font-medium">
          Insufficient BTC balance to take the selected orders.
        </p>
      )}

      <Button
        onClick={handleBuyOrder}
        className={`w-full mt-4 py-2 rounded-xl text-white text-sm font-semibold ${selectedIndexes.length === 0 || !isBalanceSufficient
          ? "bg-gray-700 cursor-not-allowed"
          : "btn-gradient"
          }`}
        disabled={selectedIndexes.length === 0 || !isBalanceSufficient || isLoading }
        isLoading={isLoading}
      >
        {mode === 'buy' ? 'Buy' : 'Sell'}
      </Button>
    </div>
  );
};
export default TakeOrder;