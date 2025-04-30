import React from "react";
import { Icon } from "@iconify/react";
import { MARKET_FEES } from "@/config/fees";

interface OrderSummaryProps {
  selectedOrders: { ticker: string, quantity: number; price: number; totalSats: number; }[];
  mode: 'buy' | 'sell';
  fees: {
    serviceFee: number;
    networkFee: number;
  };
  tickerInfo: any,
  summary: {
    totalQuantity: number;
    totalSats: number;
    totalPay: number;
    totalReceive: number;
  };
}

const OrderSummary = ({ selectedOrders, mode, fees, summary, tickerInfo }: OrderSummaryProps) => {
  const assetsName = selectedOrders.length > 0 ? tickerInfo.displayname : undefined;
  const serviceFeeRate = MARKET_FEES.SERVICE_FEE_RATE * 100; // Convert to percentage

  return (
    <div className="mt-4 px-3 pt-4 pb-1 bg-zinc-800/60 divide-y text-sm text-zinc-300 divide-zinc-800 rounded-2xl shadow-lg">
      <div className="flex font-extrabold text-gray-400 mb-2">Order Summary</div>
      <div className="mt-2 text-xs text-zinc-400">
        <div className="flex justify-between py-1">
          Total Quantity: <span className="font-medium">{summary.totalQuantity} {assetsName}</span>
        </div>
        <div className="flex justify-between py-1">
          Total Sats: <span className="font-medium">{summary.totalSats} sats</span>
        </div>

        {/* 服务费显示逻辑 */}
        <div className="flex justify-between py-2">
          <span>Service Fee ({serviceFeeRate}%, min {MARKET_FEES.MIN_SERVICE_FEE} sats)</span>
          <span className="font-medium">
            {fees.serviceFee} sats
            {mode === 'sell' && <span className="text-yellow-500 ml-1">(Paid by you)</span>}
          </span>
        </div>
        
        <div className="flex justify-between py-2">
          <span>Network Fee</span>
          <span className="font-medium">{fees.networkFee} sats</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 py-2">
        <div className="flex justify-between">
          <span>You Pay</span>
          <span className="flex justify-end font-extrabold gap-1">
            {mode === 'buy' ? (
              <>
                 <Icon icon="cryptocurrency:btc" className="mr-1 custom-btc-small-icon" />
                {summary.totalPay} <span className="text-zinc-400 font-normal ml-2">sats</span>
              </>
            ) : (
              <>{summary.totalPay} <span className="text-zinc-400 font-normal ml-2">{assetsName}</span></>
            )}
          </span>
        </div>
        <div className="flex justify-between">
          <span>You Receive</span>
          <span className="flex justify-end font-extrabold gap-1">
            {mode === 'buy' ? (
              <>{summary.totalReceive} <span className="text-zinc-400 font-normal ml-2">{assetsName}</span></>
            ) : (
              <>
                {/* <Icon icon="cryptocurrency-color:btc" className="mr-1 mt-0.5 " /> */}
                <Icon icon="cryptocurrency:btc" className="mr-1 custom-btc-small-icon" />
                {summary.totalReceive} <span className="text-zinc-400 font-normal ml-2">sats</span>
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;