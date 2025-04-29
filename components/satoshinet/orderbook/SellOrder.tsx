import React, { useState, useMemo, useEffect } from "react";
import { SellUtxoInfo } from "@/types";
import { useAssetStore } from '@/store/asset';

import { clientApi, marketApi } from "@/api";
import { useCommonStore } from "@/store";
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import { WalletConnectBus } from "@/components/wallet/WalletConnectBus";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { Slider } from "@/components/ui/slider"

interface SellOrderProps {
  assetInfo: { assetLogo: string; assetName: string; AssetId: string; floorPrice: number };
  onSellSuccess?: () => void;
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
const prepareSellData = async (assetName: string, quantity: number, price: number, batchQuantity: number): Promise<[SellUtxoInfo[], string[]]> => {
  console.log(`Splitting asset ${assetName} for quantity ${quantity}`);
  const splitRes = await window.sat20.batchSendAssets_SatsNet(assetName, quantity, batchQuantity);
  console.log('splitRes', splitRes);

  if (!splitRes?.txId) {
    toast.error('Failed to split asset.');
    throw new Error('Failed to split asset or txId missing.');
  }
  const txid = splitRes.txId;

  const sellUtxoInfos: SellUtxoInfo[] = []
  const utxos: string[] = []
  for (let i = 0; i < batchQuantity; i++) {
    const vout = i;
    const utxo = `${txid}:${vout}`;
    console.log(`Asset split successful. UTXO created: ${utxo}`);
    utxos.push(utxo);
    console.log(`Attempting to fetch UTXO info for ${utxo}...`);
    const utxoData: any = await retryAsyncOperation(
      clientApi.getUtxoInfo,
      [utxo],
      { delayMs: 2000, maxAttempts: 15 }
    );

    if (!utxoData) {
      throw new Error(`Failed to fetch UTXO info for ${utxo} after multiple attempts.`);
    }
    sellUtxoInfos.push({
      ...utxoData,
      Price: Number(price) * Number(quantity),
    })
  }
  console.log('Successfully fetched UTXO info:', sellUtxoInfos);
  return [sellUtxoInfos, utxos];
};

// Helper function: Build and sign the order
const buildAndSignOrder = async (
  sellUtxoInfos: SellUtxoInfo[],
  address: string,
  network: string,
  btcWallet: any
): Promise<string[]> => {
  console.log('Building sell order...');
  const sat20SellOrder = await window.sat20.buildBatchSellOrder_SatsNet(
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
  const signedPsbt = await btcWallet.signPsbt(psbt, { chain: 'sat20' });
  if (!signedPsbt) {
    toast.error('Transaction signing failed or was cancelled.');
    throw new Error('Failed to sign PSBT.');
  }
  const batchSignedPsbts = await window.sat20.splitBatchSignedPsbt_SatsNet(signedPsbt, network);
  return batchSignedPsbts?.data?.psbts;
};



const submitSignedOrder = async (
  address: string,
  assetName: string,
  signedPsbts: string[]
): Promise<boolean> => {
  console.log('Submitting signed order...');
  const orders = signedPsbts.map((psbt) => ({
    assets_name: assetName,
    raw: psbt,
  }));
  try {
    const res = await marketApi.submitBatchOrders({
      address,
      orders: orders,
    });

    if (res.code === 200) {
      console.log('Sell order submitted successfully');
      toast.success('Sell order submitted successfully!');
      return true;
    } else {
      const errorMsg = res.message || 'Failed to submit sell order';
      console.error('Failed to submit sell order:', errorMsg);
      toast.error(`Order submission failed: ${errorMsg}`);
      throw new Error(errorMsg);
    }
  } catch (error) {
    console.error('Error in submitSignedOrder:', error);
    return false;
  }
};

interface AssetBalance {
  availableAmt: number,
  lockedAmt: number
}
const SellOrder = ({ assetInfo, onSellSuccess }: SellOrderProps) => {
  const { loading: balanceLoading, assets } = useAssetStore();
  const { address, btcWallet } = useReactWalletStore();
  const { network } = useCommonStore();
  const [isSelling, setIsSelling] = useState(false);
  const queryClient = useQueryClient();
  const [batchQuantity, setBatchQuantity] = useState(1);
  const [balance, setBalance] = useState<AssetBalance>({
    availableAmt: 0,
    lockedAmt: 0
  });
  const [tickerInfo, setTickerInfo] = useState<any>(null);
  const [quantity, setQuantity] = useState<number | "">("");
  const [price, setPrice] = useState<number | "">("");
  const totalQuantity = useMemo(() => {
    return Number(quantity) * batchQuantity;
  }, [quantity, batchQuantity]);
  const batchQuantityMax = useMemo(() => {
    return Math.floor(balance.availableAmt / Number(quantity));
  }, [balance.availableAmt, quantity]);
  const calculatedBTC = useMemo(() => {
    const numQuantity = Number(totalQuantity);
    const numPrice = Number(price);
    if (numQuantity > 0 && numPrice > 0) {
      return numQuantity * numPrice;
    }
    return 0;
  }, [totalQuantity, price]);

  const isSellValid = useMemo(() =>
    quantity !== "" &&
    price !== "" &&
    Number(quantity) > 0 &&
    Number(price) > 0 &&
    Number(quantity) <= balance.availableAmt &&
    !balanceLoading,
    [quantity, price, balance.availableAmt, balanceLoading]);

  const getAssetAmount = async () => {
    console.log('getAssetAmount', assetInfo.assetName);

    const amountRes = await window.sat20.getAssetAmount_SatsNet(address, assetInfo.assetName)
    setBalance({
      availableAmt: Number(amountRes.availableAmt),
      lockedAmt: Number(amountRes.lockedAmt)
    })
  }
  useEffect(() => {
    const fetchTickerInfo = async () => {
      const infoRes = await window.sat20.getTickerInfo(assetInfo.assetName)
      if (infoRes?.ticker) {
        const { ticker } = infoRes
        const result = JSON.parse(ticker)
        setTickerInfo(result)
      }
    }
    fetchTickerInfo()
  }, [address, assetInfo.assetName]);
  useEffect(() => {
    getAssetAmount();
  }, [address, assetInfo.assetName]);
  const lockSellUtxo = async (utxo: string) => {
    const res = await window.sat20.lockUtxo_SatsNet(address, utxo, 'sell')
    console.log(res);

    await getAssetAmount();
  }

  const handleMaxClick = () => {
    if (!balanceLoading) {
      setQuantity(balance.availableAmt);
      setBatchQuantity(1);
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleNumericInput(e.target.value, setQuantity);
    setBatchQuantity(1);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleNumericInput(e.target.value, setPrice);
  };

  const handleSell = async () => {

    if (!isSellValid) {
      console.warn("Sell attempt with invalid input or state.");
      if (Number(totalQuantity) > balance.availableAmt) toast.error("Insufficient balance.");
      else if (Number(totalQuantity) <= 0) toast.error("Quantity must be positive.");
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
      const [sellUtxoInfos, utxos] = await prepareSellData(assetInfo.assetName, sellQuantity, sellPrice, batchQuantity);
      const signedPsbts = await buildAndSignOrder(sellUtxoInfos, address, network, btcWallet);
      const submissionSuccess = await submitSignedOrder(address, assetInfo.assetName, signedPsbts);

      if (submissionSuccess) {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        for (const utxo of utxos) {
          try {
            await lockSellUtxo(utxo);
          } catch (lockError) {
            console.error(`Failed to lock UTXO ${utxo}:`, lockError);
            toast.error(`Order submitted, but failed to lock UTXO ${utxo}. Please check manually.`);
          }
        }
        setQuantity("");
        setPrice("");
        setBatchQuantity(1);

        if (onSellSuccess) {
          onSellSuccess();
        }
      } else {
        console.log("Order submission failed.");
      }

    } catch (error: any) {
      console.error("Error during sell process:", error);
      toast.error(`Sell process failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSelling(false);
    }
  };

  const displayBalance = balance.availableAmt + balance.lockedAmt;
  const displayAvailableAmt = balance.availableAmt
  const isLoading = balanceLoading || isSelling;
  const ticker = useMemo(() => assetInfo.assetName.split(':').pop() || assetInfo.assetName, [assetInfo.assetName]);

  return (
    <div>
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
              {typeof tickerInfo?.displayname === 'string'
                ? tickerInfo?.displayname.slice(0, 1).toUpperCase()
                : '?'}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="leading-relaxed min-w-0">
          <p className="text-sm sm:text-base text-zinc-200 font-medium break-all">
            {tickerInfo?.displayname}
          </p>
          <p className="text-sm text-gray-400">
            Your Balance: <span className="ml-2"> {displayBalance.toLocaleString()}</span>
          </p>
        </div>
      </div>

      {/* Quantity Input */}
      <div className="mb-4 space-y-1.5">
        <label htmlFor="sell-quantity" className="block text-sm text-gray-400 mb-1">
          Quantity ({tickerInfo?.displayname}):
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
        <label htmlFor="sell-price" className="block text-sm text-gray-400 mb-1">Unit Price (sats/{tickerInfo?.displayname}):</label>
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
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-1">Repeat :</label>
        <div className="flex items-center gap-4">
        <Slider
            disabled={!quantity}
            defaultValue={[1]}
            max={Math.min(batchQuantityMax, 100)} // 限制最大值为 100
            min={1}
            step={1}
            value={[batchQuantity]}
            onValueChange={(value) => setBatchQuantity(value[0])}
          />
          <Input
            type="number"
            min={1}
            max={Math.min(batchQuantityMax, 100)} // 同步限制输入框的最大值
            value={batchQuantity}
            onChange={(e) => {
              const value = Math.min(Math.max(Number(e.target.value), 1), Math.min(batchQuantityMax, 100));
              setBatchQuantity(value);
            }}
            className="w-16 h-10 text-center"
            disabled={!quantity}
          />
          <span className="text-sm text-gray-400">{batchQuantity}</span>
        </div>
      </div>
      <div className="gap-2 mb-4 bg-zinc-800/50 rounded-lg p-4 min-h-[100px] text-sm">
        <p className="flex justify-between gap-1 text-gray-400">
          <span>Available Balance: </span>
          <span className="gap-1">{displayAvailableAmt.toLocaleString()} </span>
        </p>

        {!balanceLoading && quantity !== "" && Number(quantity) > balance.availableAmt && (
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
          <div className="mt-4 pt-4 border-t border-zinc-800">
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
            : "btn-gradient"
            }`}
          disabled={(!isSellValid || isLoading)}
          size="lg"
        >
          {isSelling ? "Processing..." : `Sell ${tickerInfo?.displayname}`}
        </Button>
      </WalletConnectBus>
    </div>
  );
};

export default SellOrder;