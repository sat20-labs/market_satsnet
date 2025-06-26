import React, { useState, useMemo, useEffect } from "react";
import { SellUtxoInfo } from "@/types";
import { useAssetStore } from '@/store/asset';
import { useTranslation } from 'react-i18next';

import { clientApi, marketApi } from "@/api";
import { useCommonStore, useWalletStore } from "@/store";
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import { WalletConnectBus } from "@/components/wallet/WalletConnectBus";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { Slider } from "@/components/ui/slider"

interface BuyOrderProps {
  assetInfo: { assetLogo: string; assetName: string; AssetId: string; floorPrice: number };
  onSellSuccess?: () => void;
  tickerInfo?: any;
  assetBalance: { availableAmt: number; lockedAmt: number };
  balanceLoading: boolean;
}

interface AssetInfo {
  Name: string;
  Amount: number;
  Precision: number;
  BindingSat: number;
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

// Helper function: Prepare buy data (split UTXO and get info)
const prepareBuyData = async (amount: number, price: number, targetAsset: AssetInfo, batchQuantity: number): Promise<[SellUtxoInfo[], string[]]> => {
  const totalPrice = amount * price;
  const splitRes = await window.sat20.batchSendAssets_SatsNet('::', totalPrice, batchQuantity);

  if (!splitRes?.txId) {
    toast.error('Failed to split asset.');
    throw new Error('Failed to split asset or txId missing.');
  }
  const txid = splitRes.txId;

  const buyUtxoInfos: SellUtxoInfo[] = []
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
    buyUtxoInfos.push({
      ...utxoData,
      Price: totalPrice,
      TargetAsset: {
        Name: targetAsset.Name,
        Amount: amount.toString(),
        BindingSat: targetAsset.BindingSat,
        Precision: targetAsset.Precision
      },
    })
  }
  console.log('Successfully fetched UTXO info:', buyUtxoInfos);
  return [buyUtxoInfos, utxos];
};

// Helper function: Build and sign the buy order
const buildAndSignBuyOrder = async (
  buyUtxoInfos: SellUtxoInfo[],
  address: string,
  network: string,
  btcWallet: any
): Promise<string[]> => {
  console.log('Building buy order...');
  const sat20BuyOrder = await window.sat20.buildBatchSellOrder_SatsNet(
    buyUtxoInfos.map((v) => JSON.stringify(v)),
    address,
    network,
  );
  const psbt = sat20BuyOrder?.data?.psbt;
  if (!psbt) {
    toast.error('Failed to build the buy order.');
    throw new Error('Failed to build buy order or PSBT missing.');
  }
  toast.info("Please sign the transaction in your wallet.");
  const signedPsbt = await btcWallet.signPsbt(psbt, { chain: 'sat20' });
  if (!signedPsbt) {
    toast.error('Transaction signing failed or was cancelled.');
    throw new Error('Failed to sign PSBT.');
  }
  const batchSignedPsbts = await window.sat20.splitBatchSignedPsbt_SatsNet(signedPsbt, network);
  return batchSignedPsbts?.data?.psbts;
};

// Helper function: Submit signed buy order
const submitSignedBuyOrder = async (
  address: string,
  assetName: string,
  signedPsbts: string[],
  t: any
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
      console.log('Buy order submitted successfully');
      toast.success(t('buyOrder.buySuccess'));
      return true;
    } else {
      const errorMsg = res.message || t('buyOrder.buyFailed');
      console.error('Failed to submit buy order:', errorMsg);
      toast.error(`${t('common.orderSubmissionFailed')} ${errorMsg}`);
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

const BuyOrder = ({ assetInfo, onSellSuccess, tickerInfo = {}, balanceLoading }: BuyOrderProps) => {
  const { t } = useTranslation();
  const { address, btcWallet } = useReactWalletStore();
  const { network } = useCommonStore();
  const [isBuying, setIsBuying] = useState(false);
  const queryClient = useQueryClient();
  const { getBalance, balance } = useWalletStore();
  const [quantity, setQuantity] = useState<number | "">("");
  const [price, setPrice] = useState<number | "">("");
  const [batchQuantity, setBatchQuantity] = useState(1);
  const batchQuantityMax = useMemo(() => {
    if (quantity === "" || Number(quantity) === 0) return 1;
    return Math.max(1, Math.floor(balance.availableAmt / (Number(quantity) * Number(price))));
  }, [balance.availableAmt, quantity, price]);

  const totalQuantity = useMemo(() => {
    return Number(quantity) * batchQuantity;
  }, [quantity, batchQuantity]);

  const calculatedBTC = useMemo(() => {
    const numQuantity = Number(totalQuantity);
    const numPrice = Number(price);
    if (numQuantity > 0 && numPrice > 0) {
      return numQuantity * numPrice;
    }
    return 0;
  }, [totalQuantity, price]);

  const isBuyValid = useMemo(() =>
    quantity !== "" &&
    price !== "" &&
    Number(quantity) > 0 &&
    Number(price) > 0 &&
    totalQuantity <= balance.availableAmt &&
    !balanceLoading,
    [quantity, price, totalQuantity, balance.availableAmt, balanceLoading]);

  const lockBuyUtxo = async (utxo: string) => {
    const res = await window.sat20.lockUtxo_SatsNet(address, utxo, 'buy')
    console.log(res);
    await getBalance();
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

  const handleBuy = async () => {
    if (!isBuyValid) {
      console.warn("Buy attempt with invalid input or state.");
      if (totalQuantity > balance.availableAmt) toast.error(t('buyOrder.insufficientBalance'));
      else if (Number(quantity) <= 0) toast.error(t('buyOrder.quantityPositive'));
      else if (Number(price) <= 0) toast.error(t('buyOrder.pricePositive'));
      return;
    }
    if (!address || !network || !btcWallet) {
      console.error("Missing address, network, or wallet connection.");
      toast.error("Wallet not connected or network not selected.");
      return;
    }
    setIsBuying(true);
    const buyQuantity = Number(quantity);
    const buyPrice = Number(price);
    console.log(tickerInfo);

    try {
      const targetAsset = {
        Name: tickerInfo.name,
        Amount: buyQuantity,
        BindingSat: tickerInfo.n,
        Precision: tickerInfo.divisibility || 0
      }
      const [buyUtxoInfos, utxos] = await prepareBuyData(buyQuantity, buyPrice, targetAsset, batchQuantity);
      const signedPsbts = await buildAndSignBuyOrder(buyUtxoInfos, address, network, btcWallet);
      const submissionSuccess = await submitSignedBuyOrder(address, assetInfo.assetName, signedPsbts, t);
      if (submissionSuccess) {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        for (const utxo of utxos) {
          try {
            await lockBuyUtxo(utxo);
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
      console.error("Error during buy process:", error);
      toast.error(`Buy process failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsBuying(false);
    }
  };

  const displayBalance = Number(balance.availableAmt) + Number(balance.lockedAmt);
  const displayAvailableAmt = Number(balance.availableAmt)
  const isLoading = balanceLoading || isBuying;
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
            {/* {t('common.balance')} <span className="ml-2"> {displayBalance.toLocaleString()}</span> */}
            {t('common.balance')} <span className="ml-2">{displayBalance.toLocaleString()} {t('common.sats')}</span>
          </p>
        </div>
      </div>

      {/* Quantity Input */}
      <div className="mb-4 space-y-1.5">
        <label htmlFor="buy-quantity" className="block text-sm text-gray-400 mb-1">
          {t('common.quantity')} ({tickerInfo?.displayname}):
        </label>
        <div className="flex items-center gap-2">
          <Input
            id="buy-quantity"
            type="text"
            inputMode="decimal"
            value={quantity}
            onChange={handleQuantityChange}
            placeholder={`${t('common.quantity')}`}
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
            {t('common.max')}
          </Button>
        </div>
      </div>

      {/* Price Input */}
      <div className="mb-6 space-y-1.5">
        <label htmlFor="buy-price" className="block text-sm text-gray-400 mb-1">
          {t('common.unitPrice', { ticker: ticker })}:
        </label>
        <div className="flex items-center gap-2">
          <Input
            id="buy-price"
            type="text"
            inputMode="decimal"
            value={price}
            onChange={handlePriceChange}
            placeholder={`${t('common.unitPrice', { ticker: ticker })}`}
            className="h-10"
            min="0"
            disabled={isLoading}
            autoComplete="off"
          />
        </div>
      </div>


      {/* Repeat 批量滑块 */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-1">{t('common.repeat')}:</label>
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
            max={Math.min(batchQuantityMax, 100)}
            value={batchQuantity}
            onChange={(e) => {
              const value = Math.min(Math.max(Number(e.target.value), 1), Math.min(batchQuantityMax, 100));
              setBatchQuantity(value);
            }}
            className="h-10 text-center"
            style={{
              width: `${Math.max(batchQuantity.toString().length, 2)}ch`, // 根据输入长度动态调整宽度
              minWidth: '8ch', // 设置最小宽度
            }}
            disabled={!quantity}
          />
          <span className="text-sm text-gray-400">{batchQuantity}</span>
        </div>
      </div>

      <div className="gap-2 mb-4 bg-zinc-800/50 rounded-lg p-4 min-h-[100px] text-sm">
        <p className="flex justify-between gap-1 text-gray-400">
          <span>{t('common.availableBalance')} </span>
          <span className="gap-1">{displayAvailableAmt.toLocaleString()} {t('common.sats')}</span>
        </p>
        {!balanceLoading && quantity !== "" && totalQuantity > balance.availableAmt && (
          <p className="text-red-500 font-medium mt-2">
            {t('common.insufficientBalance')}
          </p>
        )}
        {quantity !== "" && Number(quantity) <= 0 && (
          <p className="text-red-500 font-medium mt-2">
            {t('common.quantityPositive')}
          </p>
        )}
        {price !== "" && Number(price) <= 0 && (
          <p className="text-red-500 font-medium mt-2">
            {t('common.pricePositive')} 
          </p>
        )}
        {calculatedBTC > 0 && !isLoading && (
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <p className="flex justify-between font-medium text-gray-400">
              {t('common.estPay')} <span className="font-semibold text-zinc-200 gap-2">{calculatedBTC} {t('common.sats')}</span>
            </p>
          </div>
        )}
      </div>
      <WalletConnectBus asChild>
        <Button
          type="button"
          onClick={handleBuy}
          className={`w-full mt-4 text-sm font-semibold transition-all duration-200 ${!isBuyValid || isLoading
            ? "bg-gray-600 hover:bg-gray-600 cursor-not-allowed opacity-60"
            : "btn-gradient"
            }`}
          disabled={(!isBuyValid || isLoading)}
          size="lg"
        >
          {isBuying ? t('common.processing') : t('common.listbuy', { ticker: tickerInfo?.displayname })}
        </Button>
      </WalletConnectBus>
    </div>
  );
};

export default BuyOrder;