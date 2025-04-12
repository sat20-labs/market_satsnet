import React from "react";
import { Icon } from "@iconify/react";

// const OrderSummary = ({ selectedOrder }: { selectedOrder: any }) => {
//     return (
//         <div className="mt-4 text-sm divide-y text-zinc-500 divide-zinc-800">
//             <div className="flex justify-between py-2">
//                 <span className="text-zinc-400">You Pay</span>
//                 <span className="font-bold text-zinc-400">{selectedOrder ? `${selectedOrder.totalBTC} BTC ($${selectedOrder.totalUSD})` : "0 BTC"}</span>
//             </div>
//             <div className="flex justify-between py-2">
//                 <span>Unit Price</span>
//                 <span>{selectedOrder ? `${selectedOrder.price} BTC` : "-"}</span>
//             </div>
//             <div className="flex justify-between py-2">
//                 <span>Network Fee (fast)</span>
//                 <span>10 sats</span>
//             </div>
//             <div className="flex justify-between py-2">
//                 <span>Confirmed Balance</span>
//                 <span>0.476 BTC</span>
//             </div>
//         </div>
//     );
// };
  
//   export default OrderSummary;

interface OrderSummaryProps {
    selectedOrders: { quantity: number; price: number; totalBTC: number; totalUSD: number }[];
  }
  
  const OrderSummary = ({ selectedOrders }: OrderSummaryProps) => {
    // 计算汇总信息
    const totalQuantity = selectedOrders.reduce((sum, order) => sum + order.quantity, 0);
    const totalBTC = selectedOrders.reduce((sum, order) => sum + order.totalBTC, 0);
    const totalUSD = selectedOrders.reduce((sum, order) => sum + order.totalUSD, 0);

    // Service Fee 计算 (假设费率为 0.8%)
    const serviceFeeRate = 0.008; // 0.8%
    const serviceFee = totalBTC * serviceFeeRate;
    
    const networkFee = 10; // 假设网络费用为 10 sats
    const networkFeeBTC = networkFee / 1e8; // 转换为 BTC
    // 总支付金额计算
    const totalPay = totalBTC + serviceFee + networkFeeBTC;

  
    return (
        <div className="mt-4 px-3 pt-4 pb-1 bg-zinc-800/60 divide-y text-sm text-zinc-300 divide-zinc-800 rounded-2xl shadow-lg">
          <div className="flex font-medium text-gray-400 mb-2">Order Summary</div>
          <div className="mt-2 text-xs text-zinc-400">
            <div className="flex justify-between py-1">
              Total Quantity: <span className="font-medium">{totalQuantity}</span>
            </div>
            <div className="flex justify-between py-1">
              Total BTC: <span className="font-medium">{totalBTC.toFixed(6)} BTC</span>
            </div>
            <div className="flex justify-between pb-1">
              <span></span> <span className="font-medium">${totalUSD.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span>Service Fee (0.8%)</span>
              <span className="font-medium">{serviceFee.toFixed(6)} BTC</span>
            </div>
            <div className="flex justify-between py-2">
              <span>Network Fee</span>
              <span className="font-medium">10 sats</span>
            </div>
          </div>
          <div className="flex justify-between py-2">
            <span>You Pay</span>
            <span className="flex justify-end font-medium gap-1">
              <Icon icon="cryptocurrency-color:btc" className="mr-1 mt-0.5" />
              {totalPay.toFixed(6)}
            </span>
          </div>
        </div>
      );
    };
  
  export default OrderSummary;