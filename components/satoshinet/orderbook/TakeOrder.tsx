import React, { useState } from "react";
import OrderRow from "@/components/satoshinet/orderbook/OrderRow";
import OrderSummary from "@/components/satoshinet/orderbook/OrderSummary";
import { Button } from "@nextui-org/react";

interface TakeOrderProps {
    mode: "buy" | "sell";
    setMode: (mode: "buy" | "sell") => void;
    userWallet: { btcBalance: number; assetBalance: number };
    orders: { quantity: number; price: number; totalBTC: number; totalUSD: number }[];
}

const TakeOrder = ({ mode, setMode, userWallet, orders }: TakeOrderProps) => {
    const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);

    // 计算选中订单的总金额
    const selectedOrders = selectedIndexes.map((index) => orders[index]);
    const totalBTC = selectedOrders.reduce((sum, order) => sum + order.totalBTC, 0);
  
    // 校验用户余额是否足够
    const isBalanceSufficient = userWallet.btcBalance >= totalBTC;
  
    // 处理订单选择和取消
    const handleOrderClick = (index: number) => {
      if (selectedIndexes.includes(index)) {
        // 如果已选中，则取消选择
        setSelectedIndexes(selectedIndexes.filter((i) => i !== index));
      } else {
        // 如果未选中，则添加到选中列表
        setSelectedIndexes([...selectedIndexes, index]);
      }
    };

    return (
        <div>
          {/* Table Header */}
          <div className="grid grid-cols-3 text-sm font-semibold text-zinc-500 bg-transparent border-b border-zinc-800 px-2 py-3 rounded">
            <div className="ml-1">Quantity</div>
            <div>Price</div>
            <div>Total</div>
          </div>
    
          {/* Order List */}
          <div className="space-y-0 max-h-80 text-sm overflow-y-auto pt-2 w-full scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-gray-200">
            {orders.map((order, idx) => (
              <OrderRow
                key={idx}
                order={order}
                selected={selectedIndexes.includes(idx)}
                onClick={() => handleOrderClick(idx)}
              />
            ))}
          </div>
    
          
          {/* Summary */}
          <OrderSummary selectedOrders={selectedOrders} />
          {/* Balance Check */}
          {!isBalanceSufficient && (
            <p className="text-red-500 mt-4 text-xs font-medium">
              Insufficient BTC balance to take the selected orders.
            </p>
          )}
    
    
          {/* Action Button */}
          <Button
            className={`w-full mt-4 py-2 rounded-xl text-white text-sm font-semibold ${
              selectedIndexes.length === 0 || !isBalanceSufficient
                ? "bg-gray-700 cursor-not-allowed"
                : "btn-gradient"
            }`}
            disabled={selectedIndexes.length === 0 || !isBalanceSufficient}
          >
            Buy
          </Button>
        </div>
      );
    };
export default TakeOrder;