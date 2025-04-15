import React, { useState, useMemo } from "react";
import { SellUtxoInfo } from "@/types";
import { useAssetStore } from '@/store/asset';
import { AssetItem } from "@/store/asset";
import { clientApi, marketApi } from "@/api";
import { useCommonStore } from "@/store";
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import { WalletConnectBus } from "@/components/wallet/WalletConnectBus";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
      const errorMsg = `${asyncFn.name} failed after ${maxAttempts} attempts.`;
      console.error(errorMsg);
      toast.error(`Operation failed after multiple retries. Please try again later.`);
      throw lastError || new Error(errorMsg);
    }

    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  throw new Error('Retry logic failed unexpectedly.');
}

// Helper function: Handle numeric input changes
const handleNumericInput = (
  value: string,
  setter: React.Dispatch<React.SetStateAction<number | "">>
) => {
  // Allow empty string, integers, and decimals
  if (value === "" || /^\d*\.?\d*$/.test(value)) {
    // Prevent leading zeros unless it's "0." or just "0"
    if (value.length > 1 && value.startsWith('0') && !value.startsWith('0.')) {
      setter(Number(value.substring(1)));
    } else {
      // Store as number if valid and not empty, otherwise store empty string
      setter(value === "" ? "" : Number(value) >= 0 ? Number(value) : "");
    }
  }
};

// Helper function: Prepare sell data (split UTXO and get info)
const prepareSellData = async (assetName: string, quantity: number, price: number): Promise<SellUtxoInfo[]> => {
  console.log(`Splitting asset ${assetName} for quantity ${quantity}`);
  const splitRes = await window.sat20.splitAsset(assetName, quantity);
  if (!splitRes?.txId) {
    toast.error('Failed to split asset.');
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
    { delayMs: 2000, maxAttempts: 15 }
  );

  if (!utxoData) {
    throw new Error(`Failed to fetch UTXO info for ${utxo} after multiple attempts.`);
  }

  if (!utxoData.script || !utxoData.value) {
    toast.error('Received invalid UTXO data format.');
    throw new Error('Invalid UTXO data format received.');
  }

  const sellUtxoInfos: SellUtxoInfo[] = [{
    ...utxoData,
    Price: Number(price) * Number(quantity),
  }];
  console.log('Successfully fetched UTXO info:', sellUtxoInfos);
  return sellUtxoInfos;
};

// Helper function: Build and sign the order
const buildAndSignOrder = async (
  sellUtxoInfos: SellUtxoInfo[],
  address: string,
  network: string,
  btcWallet: any
): Promise<string> => {
  console.log('Building sell order...');
  const sat20SellOrder = await window.sat20.buildBatchSellOrder(
    sellUtxoInfos.map((v) => JSON.stringify(v)),
    address,
    network,
  );
  const psbt = sat20SellOrder?.data?.psbt;
  if (!psbt) {
    toast.error('Failed to build the sell order.');
    throw new Error('Failed to build sell order or PSBT missing.');
  }
  console.log('Sell order built, signing PSBT...');
  toast.info("Please sign the transaction in your wallet.");
  const signedPsbts = await btcWallet.signPsbt(psbt, { chain: 'sat20' });
  if (!signedPsbts) {
    toast.error('Transaction signing failed or was cancelled.');
    throw new Error('Failed to sign PSBT.');
  }
  console.log('PSBT signed successfully:', signedPsbts);
  return signedPsbts;
};

// Helper function: Submit the signed order
const submitSignedOrder = async (
  address: string,
  assetName: string,
  signedPsbts: string
): Promise<void> => {
  console.log('Submitting signed order...');
  const orders = [{
    assets_name: assetName,
    raw: signedPsbts,
  }];
  const res = await marketApi.submitBatchOrders({
    address,
    orders: orders,
  });

  if (res.code === 200) {
    console.log('Sell order submitted successfully');
    toast.success('Sell order submitted successfully!');
  } else {
    const errorMsg = res.message || 'Failed to submit sell order';
    console.error('Failed to submit sell order:', errorMsg);
    toast.error(`Order submission failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }
};

const SellOrder = ({ assetInfo }: SellOrderProps) => {
  const { loading: balanceLoading, assets } = useAssetStore();
  const { address, btcWallet } = useReactWalletStore();
  const { network } = useCommonStore();
  const [isSelling, setIsSelling] = useState(false);

  const userAssetBalance = useMemo(() => {
    if (!assetInfo.assetName || balanceLoading) return 0;
    const parts = assetInfo.assetName.split(':');
    const protocol = parts[0] || 'plain';
    const protocolKey = protocol as keyof typeof assets;
    const protocolAssets = Array.isArray(assets[protocolKey]) ? assets[protocolKey] : [];
    const userAsset = protocolAssets.find((asset: AssetItem) => asset.key === assetInfo.assetName);
    return userAsset ? userAsset.amount : 0;
  }, [assetInfo.assetName, assets, balanceLoading]);

  const [quantity, setQuantity] = useState<number | "">("");
  const [price, setPrice] = useState<number | "">("");

  const calculatedBTC = useMemo(() => {
    const numQuantity = Number(quantity);
    const numPrice = Number(price);
    if (numQuantity > 0 && numPrice > 0) {
      return numQuantity * numPrice;
    }
    return 0;
  }, [quantity, price]);

  const isSellValid = useMemo(() =>
    quantity !== "" &&
    price !== "" &&
    Number(quantity) > 0 &&
    Number(price) > 0 &&
    Number(quantity) <= userAssetBalance &&
    !balanceLoading,
    [quantity, price, userAssetBalance, balanceLoading]);

  const handleMaxClick = () => {
    if (!balanceLoading) {
      setQuantity(userAssetBalance);
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleNumericInput(e.target.value, setQuantity);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleNumericInput(e.target.value, setPrice);
  };

  const handleSell = async () => {
    if (!isSellValid) {
      console.warn("Sell attempt with invalid input or state.");
      if (Number(quantity) > userAssetBalance) toast.error("Insufficient balance.");
      else if (Number(quantity) <= 0) toast.error("Quantity must be positive.");
      else if (Number(price) <= 0) toast.error("Price must be positive.");
      return;
    }
    if (!address || !network || !btcWallet) {
      console.error("Missing address, network, or wallet connection.");
      toast.error("Wallet not connected or network not selected.");
      return;
    }

    setIsSelling(true);
    const sellQuantity = Number(quantity);
    const sellPrice = Number(price);

    try {
      const sellUtxoInfos = await prepareSellData(assetInfo.assetName, sellQuantity, sellPrice);
      const signedPsbts = await buildAndSignOrder(sellUtxoInfos, address, network, btcWallet);
      await submitSignedOrder(address, assetInfo.assetName, signedPsbts);

      setQuantity("");
      setPrice("");

    } catch (error: any) {
      console.error("Error during sell process:", error);
    } finally {
      setIsSelling(false);
    }
  };

  const displayBalance = balanceLoading ? "Loading..." : userAssetBalance;
  const isLoading = balanceLoading || isSelling;
  const ticker = useMemo(() => assetInfo.assetName.split(':').pop() || assetInfo.assetName, [assetInfo.assetName]);

  return (
    <div>
      <div className="flex items-center gap-4 mb-6 p-4 bg-zinc-800/50 rounded-lg">
        <img src={assetInfo.assetLogo} alt={ticker} className="w-10 h-10 rounded-full object-cover" />
        <div className="leading-relaxed min-w-0">
          <p className="text-sm sm:text-base text-zinc-200 font-medium break-all">
            {ticker}
          </p>
          <p className="text-sm text-gray-400">
            Your Balance: {displayBalance}
          </p>
        </div>
      </div>

      {/* Quantity Input */}
      <div className="mb-4 space-y-1.5">
        <label htmlFor="sell-quantity" className="block text-sm text-gray-400 mb-1">
          Quantity ({ticker}):
        </label>
        <div className="flex items-center gap-2">
          <Input
            id="sell-quantity"
            type="text"
            inputMode="decimal"
            value={quantity}
            onChange={handleQuantityChange}
            placeholder="Enter quantity"
            className="h-10"
            min="0"
            disabled={isLoading}
            autoComplete="off"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleMaxClick}
            className={`h-10 whitespace-nowrap ${balanceLoading ? 'opacity-50' : ''}`}
            disabled={balanceLoading}
          >
            Max
          </Button>
        </div>
      </div>

      {/* Price Input */}
      <div className="mb-6 space-y-1.5">
        <label htmlFor="sell-price" className="block text-sm text-gray-400 mb-1">Unit Price (sats/{ticker}):</label>
        <div className="flex items-center gap-2">
          <Input
            id="sell-price"
            type="text"
            inputMode="decimal"
            value={price}
            onChange={handlePriceChange}
            placeholder="Enter price per unit"
            className="h-10"
            min="0"
            disabled={isLoading}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="gap-2 mb-4 bg-zinc-800/50 rounded-lg p-4 min-h-[100px] text-sm">
        <p className="flex justify-between gap-1 text-gray-400">
          <span>Available Balance: </span>
          <span className="gap-1">{displayBalance} {ticker}</span>
        </p>

        {!balanceLoading && quantity !== "" && Number(quantity) > userAssetBalance && (
          <p className="text-red-500 font-medium mt-2">
            Insufficient balance.
          </p>
        )}
        {quantity !== "" && Number(quantity) <= 0 && (
          <p className="text-red-500 font-medium mt-2">
            Quantity must be positive.
          </p>
        )}
        {price !== "" && Number(price) <= 0 && (
          <p className="text-red-500 font-medium mt-2">
            Price must be positive.
          </p>
        )}

        {calculatedBTC > 0 && !isLoading && (
          <div className="mt-4 pt-4 border-t border-zinc-700">
            <p className="font-medium text-gray-400">
              Est. Receive: <span className="font-semibold text-zinc-200">{calculatedBTC} sats</span>
            </p>
          </div>
        )}
      </div>
      <WalletConnectBus asChild>
        <Button
          type="button"
          onClick={handleSell}
          className={`w-full mt-4 text-sm font-semibold transition-all duration-200 ${!isSellValid || isLoading
            ? "bg-gray-600 hover:bg-gray-600 cursor-not-allowed opacity-60"
            : "btn-gradient-sell hover:opacity-90 active:opacity-80"
            }`}
          disabled={(!isSellValid || isLoading)}
          size="lg"
        >
          {isSelling ? "Processing..." : `Sell ${ticker}`}
        </Button>
      </WalletConnectBus>
    </div>
  );
};

export default SellOrder;