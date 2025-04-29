import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WalletConnectBus } from "@/components/wallet/WalletConnectBus";
import { Avatar, AvatarFallback } from "@/components/ui/avatar"; 

interface BuyOrderProps {
  userWallet: { btcBalance: number; assetBalance: number };
  assetInfo: { assetLogo: string; assetName: string; AssetId: string; floorPrice: number };
}

const BuyOrder = ({ userWallet, assetInfo }: BuyOrderProps) => {
  console.log('BuyOrder', assetInfo);

  const [quantity, setQuantity] = useState<number | "">("");
  const [price, setPrice] = useState<number | "">("");

  const calculatedBTC = Number(quantity) * Number(price);

  const walletBalance =  userWallet.btcBalance * 100000000;
  const isBuyValid = Number(walletBalance) >= calculatedBTC && calculatedBTC > 0;

  const ticker = useMemo(() => assetInfo.assetName.split(':').pop() || assetInfo.assetName, [assetInfo.assetName]);

  return (
    <div>
      {/* Asset Information */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-zinc-800/50 rounded-lg">
      {assetInfo.assetLogo ? (
         <img
              src={assetInfo.assetLogo}
              alt={ticker}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <Avatar className="w-12 h-12 flex-shrink-0">
              <AvatarFallback className="text-xl text-gray-300 font-black bg-zinc-800">
                {typeof ticker === 'string'
                  ? ticker.slice(0, 1).toUpperCase()
                  : '?'}
              </AvatarFallback>
            </Avatar>
          )}
        <div className="leading-relaxed">
          <p className="text-sm sm:text-base text-zinc-200 font-medium">{ticker} 
            {/* <span className="text-zinc-500 text-sm">({assetInfo.AssetId})</span> */}
            </p>
          <p className="text-sm text-gray-400">Floor Price: <span className="ml-2">{assetInfo.floorPrice} sats</span></p>
        </div>
      </div>

      {/* Quantity Input */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-1">
          Quantity to Buy ({ticker}):
        </label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            placeholder="Enter quantity"
            className="w-full h-10 bg-zinc-800 text-zinc-200 p-2 rounded"
            min="0" // Add min attribute for better UX
          />         
        </div>
      </div>

      {/* Price Input */}
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-1">Unit Price (sats/{ticker}):</label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            placeholder="Enter price"
            className="w-full h-10 bg-zinc-800 text-white p-2 rounded"
            min="0" // Add min attribute for better UX
          />
          {/* <span className="text-sm text-gray-400">BTC/{assetInfo.assetName}</span> */}
        </div>
      </div>

      {/* Balance & Validation */}
      <div className="gap-2 mb-4 bg-zinc-800/50 rounded-lg p-4 min-h-[100px]"> {/* Added min-height */}
        <p className="flex justify-between gap-1 text-sm text-gray-400">
          <span>Available BTC Balance: </span>
          <span className="flex justify-start gap-1">{walletBalance.toLocaleString()} sats</span>
        </p>

        {/* Validation Messages */}
        {quantity !== "" && price !== "" && !isBuyValid && (
          <p className="text-red-500 text-sm font-medium mt-2">
            Insufficient BTC balance or invalid amount/price for this order.
          </p>
        )}

        {/* Summary */}
        {quantity && price && calculatedBTC > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-800"> {/* Added border */}
            <p className="flex justify-between font-medium text-gray-400"> 
              <span className="text-lg">You will pay:</span> 
              <span className="flex justify-start gap-1 text-gray-200 text-lg font-mono font-bold">{calculatedBTC/100000000} BTC</span>             
            </p>
            <p className="flex justify-end text-gray-400 text-xs"> {calculatedBTC.toLocaleString()} sats</p>
          </div>
        )}
      </div>

      {/* Action Button */}
      <WalletConnectBus asChild>
      <Button
        className={`w-full h-10 mt-4 py-3 rounded-xl text-zinc-200 text-sm font-semibold ${!isBuyValid
          ? "bg-gray-700 cursor-not-allowed"
          : "btn-gradient" // Assuming btn-gradient is for buy
          }`}
        disabled={!isBuyValid}
      >
        Buy {ticker}
      </Button>
      </WalletConnectBus>
    </div>
  );
};

export default BuyOrder; 