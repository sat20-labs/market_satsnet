import React, { useState, useMemo } from "react";
import { Icon } from "@iconify/react";
import { useAssetStore } from '@/store/asset';
import { AssetItem } from "@/store/asset";

interface SellOrderProps {
  assetInfo: { assetLogo: string; assetName: string; AssetId: string; floorPrice: number };
}

const SellOrder = ({ assetInfo }: SellOrderProps) => {
  const assetsState = useAssetStore(state => state.assets);
  const isLoading = useAssetStore(state => state.loading);

  const userAssetBalance = useMemo(() => {
    if (!assetInfo.assetName || isLoading) return 0;
    console.log(assetInfo.assetName);
    const [protocol = 'plain', , ticker] = assetInfo.assetName.split(':');
    const protocolKey = protocol as keyof typeof assetsState;

    const protocolAssets = Array.isArray(assetsState[protocolKey]) ? assetsState[protocolKey] : [];

    const userAsset = protocolAssets.find((asset: AssetItem) => asset.key === assetInfo.assetName);
    console.log(userAsset);
    return userAsset ? userAsset.amount : 0;

  }, [assetInfo.assetName, assetsState, isLoading]);

  const [quantity, setQuantity] = useState<number | "">("");
  const [price, setPrice] = useState<number | "">("");

  const calculatedBTC = (quantity as number) * (price as number);

  const isSellValid =
    quantity !== "" &&
    price !== "" &&
    (quantity as number) > 0 &&
    (price as number) > 0 &&
    (quantity as number) <= userAssetBalance;

  const handleMaxClick = () => {
    setQuantity(userAssetBalance);
  };

  const displayBalance = isLoading ? "Loading..." : userAssetBalance;

  const handleSell = () => {
    console.log("Sell order submitted");
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6 p-4 bg-zinc-800/50 rounded-lg">
        <img src={assetInfo.assetLogo} alt={assetInfo.assetName} className="w-10 h-10 rounded-full" />
        <div className="leading-relaxed">
          <p className="text-sm sm:text-base text-zinc-200 font-medium">{assetInfo.assetName} <span className="text-zinc-500 text-sm">({assetInfo.AssetId})</span></p>
          <p className="text-sm text-gray-400">
            Your Balance: {displayBalance}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-1">
          Quantity to Sell:
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={quantity}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "" || Number(val) >= 0) {
                setQuantity(val === "" ? "" : Number(val));
              }
            }}
            placeholder="Enter quantity"
            className="w-full bg-zinc-800 text-zinc-200 p-2 rounded"
            min="0"
            disabled={isLoading}
          />
          <button
            onClick={handleMaxClick}
            className={`px-2 py-2 h-10 bg-zinc-800 text-zinc-300 text-sm rounded whitespace-nowrap ${isLoading ? 'cursor-not-allowed opacity-50' : 'hover:bg-zinc-600'}`}
            disabled={isLoading}
          >
            Max
          </button>
          <span className="text-sm text-gray-400">
            {assetInfo.assetName}
          </span>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-1">Unit Price:</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={price}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "" || Number(val) >= 0) {
                setPrice(val === "" ? "" : Number(val));
              }
            }}
            placeholder="Enter price"
            className="w-full bg-zinc-800 text-white p-2 rounded"
            min="0"
            disabled={isLoading}
          />
          <span className="text-sm text-gray-400">sats/{assetInfo.assetName}</span>
        </div>
      </div>

      <div className="gap-2 mb-4 bg-zinc-800/50 rounded-lg p-4 min-h-[100px]">
        <p className="flex justify-between gap-1 text-sm text-gray-400">
          <span>Available Asset Balance: </span>
          <span className="gap-1">{displayBalance} {assetInfo.assetName}</span>
        </p>

        {quantity !== "" && !isSellValid && (quantity as number) > userAssetBalance && (
          <p className="text-red-500 text-sm font-medium mt-2">
            Insufficient asset balance for this order.
          </p>
        )}
        {quantity !== "" && price !== "" && !isSellValid && (quantity as number) <= 0 && (
          <p className="text-red-500 text-sm font-medium mt-2">
            Quantity must be greater than zero.
          </p>
        )}
        {quantity !== "" && price !== "" && !isSellValid && (price as number) <= 0 && (
          <p className="text-red-500 text-sm font-medium mt-2">
            Price must be greater than zero.
          </p>
        )}


        {quantity && price && calculatedBTC > 0 && !isLoading && (
          <div className="mt-4 pt-4 border-t border-zinc-700">
            <p className="font-medium text-gray-400 text-sm">
              You will receive: <span className="font-semibold text-zinc-200">{calculatedBTC} sats</span>
            </p>
          </div>
        )}
      </div>

      <button
        onClick={handleSell}
        className={`w-full mt-4 py-3 rounded-xl text-zinc-200 text-sm font-semibold ${!isSellValid || isLoading
          ? "bg-gray-700 cursor-not-allowed opacity-50"
          : "btn-gradient-sell"
          }`}
        disabled={!isSellValid || isLoading}
      >
        {isLoading ? "Loading Balance..." : `Sell ${assetInfo.assetName}`}
      </button>
    </div>
  );
};

export default SellOrder;