import React from "react";
import { Icon } from "@iconify/react";


interface OrderSummaryProps {
  selectedOrders: { ticker: string, quantity: number; price: number; totalSats: number; }[];
}

const OrderSummary = ({ selectedOrders }: OrderSummaryProps) => {
  // 计算汇总信息
  const totalQuantity = selectedOrders.reduce((sum, order) => {
    console.log("order.quantity:", order.quantity);
    return sum + (order.quantity || 0);
  }, 0);

  const totalBTC = selectedOrders.reduce((sum, order) => sum + order.price, 0);

  const assetsName = selectedOrders.length > 0 ? selectedOrders[0].ticker : undefined;

    // Service Fee 计算 (假设费率为 0.8%)
    const serviceFeeRate = 0.008; // 0.8%
    const serviceFee = Math.floor(totalBTC * serviceFeeRate); // 向下取整
    
    const networkFee = 10; // 假设网络费用为 10 sats
    //const networkFeeBTC = networkFee / 1e8; // 转换为 BTC
    // 总支付金额计算


    const totalPay = totalBTC + serviceFee + networkFee;
    //console.log("totalBTC:", totalBTC, "serviceFee:", serviceFee, "networkFee:", networkFee, "totalPay:", totalPay);


  return (
    <div className="mt-4 px-3 pt-4 pb-1 bg-zinc-800/60 divide-y text-sm text-zinc-300 divide-zinc-800 rounded-2xl shadow-lg">
      <div className="flex font-extrabold text-gray-400 mb-2">Order Summary</div>
      <div className="mt-2 text-xs text-zinc-400">
        <div className="flex justify-between py-1">
          Total Quantity: <span className="font-medium">{totalQuantity} {assetsName}</span>
        </div>
        <div className="flex justify-between py-1">
          Total Sats: <span className="font-medium">{totalBTC} sats</span>
        </div>

        <div className="flex justify-between py-2">
          <span>Service Fee (0.8%)</span>
          <span className="font-medium">{serviceFee} sats</span>
        </div>
        <div className="flex justify-between py-2">
          <span>Network Fee</span>
          <span className="font-medium">{networkFee} sats</span>
        </div>
      </div>
      <div className="flex justify-between py-2">
        <span>You Pay</span>
        <span className="flex justify-end font-extrabold gap-1">
          <Icon icon="cryptocurrency-color:btc" className="mr-1 mt-0.5" />
          {totalPay} sats
        </span>
      </div>
    </div>
  );
};

export default OrderSummary;