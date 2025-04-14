import React, { useState, useMemo } from "react";
import { Icon } from "@iconify/react";
import { useCommonStore } from "@/store";
import { getOrders } from "@/api/request";
import { useQuery } from "@tanstack/react-query";

interface BuyOrderProps {
  userWallet: { btcBalance: number; assetBalance: number }; // Keep assetBalance for potential future use or consistency
  assetInfo: { assetLogo: string; assetName: string; AssetId: string; floorPrice: number };
}

const BuyOrder = ({ userWallet, assetInfo }: BuyOrderProps) => {
  console.log('BuyOrder', assetInfo);

  

  const [quantity, setQuantity] = useState<number | "">("");
  const [price, setPrice] = useState<number | "">("");

  // 计算用户需要支付的 BTC - 使用 Number() 进行安全转换
  const calculatedBTC = Number(quantity) * Number(price);

  // 买单校验逻辑 - 简化条件，依赖 calculatedBTC > 0
  const isBuyValid = userWallet.btcBalance >= calculatedBTC && calculatedBTC > 0;

  return (
    <div>
      {/* Asset Information */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-zinc-800/50 rounded-lg">
        <img src={assetInfo.assetLogo} alt={assetInfo.assetName} className="w-10 h-10 rounded-full" />
        <div className="leading-relaxed">
          <p className="text-sm sm:text-base text-zinc-200 font-medium">{assetInfo.assetName} <span className="text-zinc-500 text-sm">({assetInfo.AssetId})</span></p>
          <p className="text-sm text-gray-400">Floor Price: {assetInfo.floorPrice.toFixed(6)} BTC</p>
        </div>
      </div>

      {/* Quantity Input */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-1">
          Quantity to Buy:
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            placeholder="Enter quantity"
            className="w-full bg-zinc-800 text-zinc-200 p-2 rounded"
            min="0" // Add min attribute for better UX
          />
          <span className="text-sm text-gray-400">
            {assetInfo.assetName}
          </span>
        </div>
      </div>

      {/* Price Input */}
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-1">Unit Price:</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            placeholder="Enter price"
            className="w-full bg-zinc-800 text-white p-2 rounded"
            min="0" // Add min attribute for better UX
          />
          <span className="text-sm text-gray-400">BTC/{assetInfo.assetName}</span>
        </div>
      </div>

      {/* Balance & Validation */}
      <div className="gap-2 mb-4 bg-zinc-800/50 rounded-lg p-4 min-h-[100px]"> {/* Added min-height */}
        <p className="flex justify-between gap-1 text-sm text-gray-400">
          <span>Available BTC Balance: </span>
          <span className="flex justify-start gap-1"><Icon icon="cryptocurrency-color:btc" className="mr-1 mt-0.5" />{userWallet.btcBalance.toFixed(6)} </span>
        </p>

        {/* Validation Messages */}
        {quantity !== "" && price !== "" && !isBuyValid && (
          <p className="text-red-500 text-sm font-medium mt-2">
            Insufficient BTC balance or invalid amount/price for this order.
          </p>
        )}

        {/* Summary */}
        {quantity && price && calculatedBTC > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-700"> {/* Added border */}
            <p className="font-medium text-gray-400 text-sm"> {/* Adjusted text size */}
              You will pay: <span className="font-semibold text-zinc-200">{calculatedBTC.toFixed(6)} BTC</span>
            </p>
          </div>
        )}
      </div>

      {/* Action Button */}
      <button
        className={`w-full mt-4 py-3 rounded-xl text-zinc-200 text-sm font-semibold ${!isBuyValid
          ? "bg-gray-700 cursor-not-allowed"
          : "btn-gradient" // Assuming btn-gradient is for buy
          }`}
        disabled={!isBuyValid}
      >
        Buy {assetInfo.assetName}
      </button>
    </div>
  );
};

export default BuyOrder; 