import React, { useState, useMemo, useCallback, useEffect } from "react";
import OrderRow from "@/components/satoshinet/orderbook/OrderRow";
import OrderSummary from "@/components/satoshinet/orderbook/OrderSummary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { WalletConnectBus } from "@/components/wallet/WalletConnectBus";
import { debounce, tryit } from "radash";
import { toast } from "sonner";
import { marketApi } from "@/api";
import { MARKET_FEES, calculateServiceFee } from "@/config/fees";
import { useTranslation } from "react-i18next";

export interface TakeOrderUIProps {
  orders: any[];
  tickerInfo: any;
  totalOrders: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onBuy: (selectedOrdersData: any[], fees: any, summary: any) => Promise<void>;
  mode: "buy" | "sell";
  isFetching: boolean;
  assetInfo: { assetName: string; assetLogo: string; AssetId: string; floorPrice: number };
  address?: string;
  balance: any;
  network: string;
  chain: string;
  assetBalance?: number;
  onSellSuccess?: () => void;
}

const TakeOrderUI: React.FC<TakeOrderUIProps> = ({
  orders,
  totalOrders,
  isLoading,
  isLoadingMore,
  onLoadMore,
  onBuy,
  tickerInfo,
  mode,
  isFetching,
  assetInfo,
  address,
  balance,
  network,
  chain,
  assetBalance,
  onSellSuccess,
}) => {
  // UI交互相关状态
  const { t } = useTranslation();
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [sliderValue, setSliderValue] = useState(0);
  const [isProcessingLock, setIsProcessingLock] = useState(false);
  const [lockedOrders, setLockedOrders] = useState<Map<number, string>>(new Map());

  // 当 mode 发生变化时，初始化选择列表和滑块值
  useEffect(() => {
    setSelectedIndexes([]);
    setSliderValue(0);
    setLockedOrders(new Map());
  }, [mode]);

  // 排除自己的挂单并按单价排序
  const sortedOrders = useMemo(() => {
    return [...orders]
      .filter(order => order.address !== address)
      .sort((a, b) => {
        const unitPriceA = parseFloat(a.assets?.unit_price || "0");
        const unitPriceB = parseFloat(b.assets?.unit_price || "0");
        return unitPriceA - unitPriceB;
      });
  }, [orders, address]);

  // 计算最多可选订单数
  const maxSelectableOrders = useMemo(() => {
    let totalCost = 0;
    let count = 0;
    for (const order of sortedOrders) {
      totalCost += order.value;
      if (totalCost > balance.availableAmt) break;
      count++;
    }
    return count;
  }, [sortedOrders, balance.availableAmt]);

  // 选中订单数据
  const selectedOrdersData = selectedIndexes
    .map((index) => orders[index])
    .filter((order) => order !== undefined && order !== null)
    .map((order) => ({ ...order, raw: lockedOrders.get(order.order_id) }));

  // 订单总价
  const totalBTC = selectedOrdersData.reduce((sum, order) => sum + order.value, 0);

  // 订单摘要
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

  // 卖单时总卖出数量
  const totalSellAmount = useMemo(() => {
    return summarySelectedOrders.reduce((sum, order) => sum + order.quantity, 0);
  }, [summarySelectedOrders]);

  // 余额判断逻辑
  const isBalanceSufficient = mode === 'buy'
    ? balance.availableAmt >= totalBTC
    : (assetBalance !== undefined ? assetBalance >= totalSellAmount : true);

  // 计算费用和汇总信息
  const { fees, summary } = useMemo(() => {
    const totalQuantity = summarySelectedOrders.reduce((sum, order) => sum + order.quantity, 0);
    const totalSats = summarySelectedOrders.reduce((sum, order) => sum + order.totalSats, 0);
    
    // 费用计算
    const serviceFee = calculateServiceFee(totalSats);
    const networkFee = MARKET_FEES.NETWORK_FEE;

    // 根据模式计算支付和接收金额
    let totalPay, totalReceive;
    if (mode === 'buy') {
      totalPay = totalSats + serviceFee + networkFee;
      totalReceive = totalQuantity;
    } else {
      totalPay = totalQuantity;
      totalReceive = totalSats - serviceFee - networkFee;
    }

    return {
      fees: {
        serviceFee,
        networkFee,
      },
      summary: {
        totalQuantity,
        totalSats,
        totalPay,
        totalReceive,
      }
    };
  }, [summarySelectedOrders, mode]);

  // 锁定订单
  // const lockOrders = useCallback(async (orderIds: number[]) => {
  //   if (!address || orderIds.length === 0) return;
  //   setIsProcessingLock(true);
  //   try {
  //     const lockData = await marketApi.lockBulkOrder({ address, orderIds });
  //     if (lockData.code === 200 && lockData.data) {
  //       const newLockedOrders = new Map(lockedOrders);
  //       const failedOrderIndexes: number[] = [];
  //       lockData.data.forEach((item: any) => {
  //         if (item.raw) {
  //           newLockedOrders.set(item.order_id, item.raw);
  //         } else {
  //           const failedIndex = orders.findIndex((order) => order.order_id === item.order_id);
  //           if (failedIndex !== -1) {
  //             failedOrderIndexes.push(failedIndex);
  //           }
  //         }
  //       });
  //       setLockedOrders(newLockedOrders);
  //       if (failedOrderIndexes.length > 0) {
  //         setSelectedIndexes((prev) => prev.filter((index) => !failedOrderIndexes.includes(index)));
  //         toast.error("Some orders are already locked by others");
  //       }
  //     } else {
  //       toast.error(lockData.msg || "Failed to lock orders");
  //     }
  //   } catch (error) {
  //     toast.error("Failed to lock orders");
  //   } finally {
  //     setIsProcessingLock(false);
  //   }
  // }, [address, orders, lockedOrders]);
  const lockOrders = useCallback(
    async (orderIds: number[]) => {
      if (!address || orderIds.length === 0) return;
      try {
        const lockData = await marketApi.lockBulkOrder({ address, orderIds });
        if (lockData.code === 200 && lockData.data) {
          const newLockedOrders = new Map(lockedOrders);
          lockData.data.forEach((item: any) => {
            if (item.raw) {
              newLockedOrders.set(item.order_id, item.raw);
            }
          });
          setLockedOrders(newLockedOrders);
        } else {
          toast.error(lockData.msg || "Failed to lock orders");
        }
      } catch (error) {
        toast.error("Failed to lock orders");
      }
    },
    [address, lockedOrders]
  );

  // 解锁订单
  // const unlockOrders = useCallback(
  //   async (orderIds: number[]) => {
  //   if (!address || orderIds.length === 0) return;
  //   try {
  //     setLockedOrders((prev) => {
  //       const newLockedOrders = new Map(prev);
  //       orderIds.forEach((id) => newLockedOrders.delete(id));
  //       return newLockedOrders;
  //     });
  //     const unlockResult = await marketApi.unlockBulkOrder({ address, orderIds });
  //     if (unlockResult.code !== 200) {
  //       toast.error(unlockResult.msg || "Failed to unlock orders");
  //     }
  //   } catch (error) {
  //     toast.error("Failed to unlock orders");
  //   }
  // }, [address]);
  const unlockOrders = useCallback(
    async (orderIds: number[]) => {
      if (!address || orderIds.length === 0) return;
      try {
        const unlockResult = await marketApi.unlockBulkOrder({ address, orderIds });
        if (unlockResult.code !== 200) {
          toast.error(unlockResult.msg || "Failed to unlock orders");
        } else {
          setLockedOrders((prev) => {
            const newLockedOrders = new Map(prev);
            orderIds.forEach((id) => newLockedOrders.delete(id));
            return newLockedOrders;
          });
        }
      } catch (error) {
        toast.error("Failed to unlock orders");
      }
    },
    [address]
  );

  // 订单点击
  const handleOrderClick = useCallback((index: number) => {
    const order = orders[index];
    if (!order || (order.locked === 1 && !lockedOrders.has(order.order_id)) || order.address === address) {
      return;
    }
    const orderId = order.order_id;
    setSelectedIndexes((prev) => {
      const isSelected = prev.includes(index);
      const newIndexes = isSelected
        ? prev.filter((i) => i !== index)
        : [...prev, index].sort((a, b) => a - b);
      setSliderValue(newIndexes.length);
      if (isSelected) {
        if (lockedOrders.has(orderId)) {
          unlockOrders([orderId]);
        }
      } else {
        lockOrders([orderId]);
      }
      return newIndexes;
    });
  }, [orders, lockedOrders, address, lockOrders, unlockOrders]);

  // // 滑块选择
  // const handleSliderChange = useCallback((newValue: number) => {
  //   setSliderValue(newValue);
  //   const ordersToSelect = sortedOrders.slice(0, newValue);
  //   const newSelectedIndexes = ordersToSelect
  //     .map(order => orders.findIndex(o => o.order_id === order.order_id))
  //     .filter(index => index !== -1)
  //     .sort((a, b) => a - b);
  //   // 计算需要锁定和解锁的订单
  //   const currentOrderIds = new Set(selectedIndexes.map(idx => orders[idx]?.order_id));
  //   const newOrderIds = new Set(newSelectedIndexes.map(idx => orders[idx]?.order_id));
  //   const orderIdsToLock = newSelectedIndexes
  //     .map(idx => orders[idx]?.order_id)
  //     .filter(id => id && !currentOrderIds.has(id));
  //   const orderIdsToUnlock = selectedIndexes
  //     .map(idx => orders[idx]?.order_id)
  //     .filter(id => id && !newOrderIds.has(id));
  //   setSelectedIndexes(newSelectedIndexes);
  //   if (orderIdsToUnlock.length > 0) {
  //     unlockOrders(orderIdsToUnlock);
  //   }
  //   if (orderIdsToLock.length > 0) {
  //     lockOrders(orderIdsToLock);
  //   }
  // }, [sortedOrders, orders, selectedIndexes, lockOrders, unlockOrders]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSliderChange = useCallback(
    async (newValue: number) => {
      if (isProcessing) return; // 如果正在处理锁定或解锁操作，直接返回

      setSliderValue(newValue);
      const ordersToSelect = sortedOrders.slice(0, newValue);
      const newSelectedIndexes = ordersToSelect
        .map((order) => orders.findIndex((o) => o.order_id === order.order_id))
        .filter((index) => index !== -1)
        .sort((a, b) => a - b);

      // 计算需要锁定和解锁的订单
      const currentOrderIds = new Set(selectedIndexes.map((idx) => orders[idx]?.order_id));
      const newOrderIds = new Set(newSelectedIndexes.map((idx) => orders[idx]?.order_id));
      const orderIdsToLock = newSelectedIndexes
        .map((idx) => orders[idx]?.order_id)
        .filter((id) => id && !currentOrderIds.has(id));
      const orderIdsToUnlock = selectedIndexes
        .map((idx) => orders[idx]?.order_id)
        .filter((id) => id && !newOrderIds.has(id));

      setIsProcessing(true); // 设置为处理中
      try {
        if (orderIdsToUnlock.length > 0) {
          await unlockOrders(orderIdsToUnlock);
        }
        if (orderIdsToLock.length > 0) {
          await lockOrders(orderIdsToLock);
        }
        setSelectedIndexes(newSelectedIndexes);
      } catch (error) {
        console.error("Error during lock/unlock:", error);
      } finally {
        setIsProcessing(false); // 操作完成后解除锁定状态
      }
    },
    [sortedOrders, orders, selectedIndexes, lockOrders, unlockOrders, isProcessing]
  );
  // 清除选择
  const clearSelection = useCallback(() => {
    setSelectedIndexes([]);
    setSliderValue(0);
    setLockedOrders(new Map());
  }, []);

  // Buy按钮点击
  const handleBuy = async () => {
    try {
      await onBuy(selectedOrdersData, fees, summary);
      clearSelection(); // 交易成功后清除选择
      if (mode === 'sell' && typeof onSellSuccess === 'function') {
        onSellSuccess();
      }
    } catch (error) {
      // 如果onBuy抛出错误，错误会在这里被捕获
      console.error('Order failed:', error);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-3 text-sm font-semibold text-zinc-500 bg-transparent border-b border-zinc-800 px-2 py-3 rounded">
        <div className="ml-1">{t('common.quantity')}</div>
        <div>{t('common.unit_price')}</div>
        <div>{t('common.total_value')}</div>
      </div>
      <div className="space-y-0 max-h-80 text-sm overflow-y-auto pt-2 w-full scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-gray-200">
        {isLoading ? (
          <div className="text-center py-4">Loading orders...</div>
        ) : orders.length === 0 && !isFetching ? (
          <div className="text-center py-4 text-zinc-500">No orders found.</div>
        ) : (
          orders.map((order, idx) => (
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
      {!isLoading && !isLoadingMore && orders.length < totalOrders && (
        <Button
          variant="outline"
          className="w-full mt-2"
          onClick={onLoadMore}
          disabled={isFetching}
        >
          {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Load More ({orders.length} / {totalOrders})
        </Button>
      )}
      {selectedIndexes.length > 0 && (
        <div className="mt-4">
          <div className="flex justify-between items-center text-sm text-zinc-500 mb-2">
            <span>Selected Orders: {sliderValue}</span>
            <span>Max: {maxSelectableOrders}</span>
          </div>
          <div className="flex items-center gap-4">
            {/* 滑动条 */}
            <input
              type="range"
              min="1"
              max={maxSelectableOrders}
              step="1"
              value={sliderValue}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              className="w-full"
            />
            {/* 输入框 */}
            <Input
              type="number"
              min="1"
              max={maxSelectableOrders}
              value={sliderValue}
              
              onChange={(e) => {
                const value = Math.min(Math.max(Number(e.target.value), 1), maxSelectableOrders);
                handleSliderChange(value);
              }}
              style={{
                width: `${Math.max(sliderValue.toString().length, 2)}ch`, // 根据输入长度动态调整宽度
                minWidth: '8ch', // 设置最小宽度
              }}
              className="w-16 h-10 text-center border border-gray-600 rounded-lg"
            />
          </div>
        </div>
      )}
      {selectedIndexes.length > 0 && (
        <OrderSummary 
          tickerInfo={tickerInfo}
          selectedOrders={summarySelectedOrders} 
          mode={mode}
          fees={fees}
          summary={summary}
        />
      )}
      {!isBalanceSufficient && selectedIndexes.length > 0 && (
        <p className="text-red-500 mt-4 text-xs font-medium">
          Insufficient BTC balance to take the selected orders.
        </p>
      )}
      <WalletConnectBus asChild>
        <Button
          onClick={handleBuy}
          className={`w-full mt-4 ${!(selectedIndexes.length === 0 || !isBalanceSufficient) ? "btn-gradient" : "bg-gray-600 text-zin-500 cursor-not-allowed opacity-60"}`}
          disabled={selectedIndexes.length === 0 || !isBalanceSufficient || isLoading || isFetching}
        >
          {(isLoading || (isFetching && !isLoadingMore)) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? "Processing..." : (mode === 'buy' ? t('common.take_buy') : t('common.take_sell'))}
        </Button>
      </WalletConnectBus>
    </div>
  );
};

export default TakeOrderUI; 