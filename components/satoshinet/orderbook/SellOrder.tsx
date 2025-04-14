import React, { useState, useMemo } from "react";
import { SellUtxoInfo } from "@/types";
import { useAssetStore } from '@/store/asset';
import { AssetItem } from "@/store/asset";
import { clientApi, marketApi } from "@/api";
import { useCommonStore, useUtxoStore } from "@/store";
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";

interface SellOrderProps {
  assetInfo: { assetLogo: string; assetName: string; AssetId: string; floorPrice: number };
}

// Helper function for retrying async operations
async function retryAsyncOperation<T>(
  asyncFn: (...args: any[]) => Promise<{ data: T }>,
  args: any[],
  options: { delayMs: number; maxAttempts: number }
): Promise<T> {
  const { delayMs, maxAttempts } = options;
  let attempts = 0;
  let lastError: any = null;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const result = await asyncFn(...args);

      if (result?.data) {
        return result.data;
      } else {
        lastError = new Error(`${asyncFn.name} returned successfully but without expected data format on attempt ${attempts}.`);
        console.warn(lastError.message + ` Retrying in ${delayMs}ms...`);
      }

    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempts} failed for ${asyncFn.name}. Error: ${error}. Retrying in ${delayMs}ms...`);
    }

    if (attempts >= maxAttempts) {
      console.error(`${asyncFn.name} failed after ${maxAttempts} attempts.`);
      throw lastError || new Error(`${asyncFn.name} failed after ${maxAttempts} attempts.`);
    }

    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  throw new Error('Retry logic failed unexpectedly.');
}

const SellOrder = ({ assetInfo }: SellOrderProps) => {
  const { loading, assets } = useAssetStore();
  const { address, btcWallet } = useReactWalletStore();
  const { network } = useCommonStore();
  
  const userAssetBalance = useMemo(() => {
    if (!assetInfo.assetName || loading) return 0;
    const [protocol = 'plain', , ticker] = assetInfo.assetName.split(':');
    const protocolKey = protocol as keyof typeof assets;

    const protocolAssets = Array.isArray(assets[protocolKey]) ? assets[protocolKey] : [];

    const userAsset = protocolAssets.find((asset: AssetItem) => asset.key === assetInfo.assetName);
    return userAsset ? userAsset.amount : 0;

  }, [assetInfo.assetName, assets, loading]);

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

  const displayBalance = loading ? "Loading..." : userAssetBalance;

  const handleSell = async () => {
    console.log("Initiating sell for quantity:", quantity, "at price:", price);
    if (!address || !network) {
      console.error("Address or network not available");
      return;
    }


    try {
      console.log(`Splitting asset ${assetInfo.assetName} for quantity ${quantity}`);
      const splitRes = await window.sat20.splitAsset(assetInfo.assetName, quantity as number);
      if (!splitRes?.txId) {
        throw new Error('Failed to split asset or txId missing.');
      }
      const txid = splitRes.txId;
      const vout = 0;
      const utxo = `${txid}:${vout}`;
      console.log(`Asset split successful. UTXO created: ${utxo}`);

      console.log(`Attempting to fetch UTXO info for ${utxo}...`);
      const utxoData: any = await retryAsyncOperation(
        clientApi.getUtxoInfo,
        [utxo],
        { delayMs: 2000, maxAttempts: 20 }
      );
      const sellUtxoInfos: SellUtxoInfo[] = [{
        ...utxoData,
        Price: price,
      }];
      const sat20SellOrder = await window.sat20.buildBatchSellOrder(
        sellUtxoInfos.map((v) => JSON.stringify(v)),
        address,
        network,
      );
      const psbt = sat20SellOrder?.data?.psbt;
      const signedPsbts = await btcWallet?.signPsbt(psbt, { chain: 'sat20' });
      console.log('Successfully fetched UTXO info:', signedPsbts);
      const orders = [{
        assets_name: assetInfo.assetName,
        raw: signedPsbts,
      }];
      
      const res = await marketApi.submitBatchOrders({
        address,
        orders: orders,
      });
      if (res.code === 200) {
        console.log('Sell order submitted successfully');
      } else {
        console.error('Failed to submit sell order:', res.message);
      }

    } catch (error) {
      console.error("Error during sell process:", error);
      return;
    }
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
            disabled={loading}
          />
          <button
            onClick={handleMaxClick}
            className={`px-2 py-2 h-10 bg-zinc-800 text-zinc-300 text-sm rounded whitespace-nowrap ${loading ? 'cursor-not-allowed opacity-50' : 'hover:bg-zinc-600'}`}
            disabled={loading}
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
            disabled={loading}
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


        {quantity && price && calculatedBTC > 0 && !loading && (
          <div className="mt-4 pt-4 border-t border-zinc-700">
            <p className="font-medium text-gray-400 text-sm">
              You will receive: <span className="font-semibold text-zinc-200">{calculatedBTC} sats</span>
            </p>
          </div>
        )}
      </div>

      <button
        onClick={handleSell}
        className={`w-full mt-4 py-3 rounded-xl text-zinc-200 text-sm font-semibold ${!isSellValid || loading
          ? "bg-gray-700 cursor-not-allowed opacity-50"
          : "btn-gradient-sell"
          }`}
        disabled={!isSellValid || loading}
      >
        {loading ? "Loading Balance..." : `Sell ${assetInfo.assetName}`}
      </button>
    </div>
  );
};

export default SellOrder;