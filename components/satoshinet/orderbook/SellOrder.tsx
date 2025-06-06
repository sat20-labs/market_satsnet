import React, { useState, useMemo, useEffect } from "react";
import { SellUtxoInfo } from "@/types";
import { useAssetStore } from '@/store/asset';
import { useTranslation } from 'react-i18next';

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
  tickerInfo?: any;
  assetBalance: { availableAmt: number; lockedAmt: number };
  balanceLoading: boolean;
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

  // 1. 生成所有utxo字符串
  const utxos: string[] = [];
  for (let i = 0; i < batchQuantity; i++) {
    const vout = i;
    const utxo = `${txid}:${vout}`;
    console.log(`Asset split successful. UTXO created: ${utxo}`);
    utxos.push(utxo);
  }

  // 2. 批量获取所有utxo信息
  console.log(`Attempting to fetch UTXO info for all:`, utxos);
  const utxoDataArr: any = await retryAsyncOperation(
    clientApi.getUtxosInfo,
    [utxos],
    { delayMs: 2000, maxAttempts: 15 }
  );

  if (!utxoDataArr || !Array.isArray(utxoDataArr) || utxoDataArr.length !== utxos.length) {
    throw new Error(`Failed to fetch all UTXO info after multiple attempts.`);
  }

  // 3. 组装sellUtxoInfos
  const sellUtxoInfos: SellUtxoInfo[] = utxoDataArr.map((utxoData: any) => ({
    ...utxoData,
    Price: Number(price) * Number(quantity),
  }));

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

// Helper function: Submit signed order with translation
const submitSignedOrder = async (
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
      console.log('Sell order submitted successfully');
      toast.success(t('common.sellSuccess'));
      return true;
    } else {
      const errorMsg = res.message || t('sellOrder.sellFailed');
      console.error('Failed to submit sell order:', errorMsg);
      toast.error(`${t('common.orderSubmissionFailed')} ${errorMsg}`);
      throw new Error(errorMsg);
    }
  } catch (error) {
    console.error('Error in submitSignedOrder:', error);
    return false;
  }
};

const SellOrder = ({ assetInfo, onSellSuccess, tickerInfo = {}, assetBalance, balanceLoading }: SellOrderProps) => {
  const { t } = useTranslation();
  const { address, btcWallet } = useReactWalletStore();
  const { network } = useCommonStore();
  const [isSelling, setIsSelling] = useState(false);
  const queryClient = useQueryClient();
  const [batchQuantity, setBatchQuantity] = useState(1);
  const [quantity, setQuantity] = useState<number | "">("");
  const [price, setPrice] = useState<number | "">("");
  const totalQuantity = useMemo(() => {
    return Number(quantity) * batchQuantity;
  }, [quantity, batchQuantity]);
  const batchQuantityMax = useMemo(() => {
    return Math.floor(assetBalance.availableAmt / Number(quantity));
  }, [assetBalance.availableAmt, quantity]);
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
    Number(quantity) <= assetBalance.availableAmt &&
    !balanceLoading,
    [quantity, price, assetBalance.availableAmt, balanceLoading]);

  const handleMaxClick = () => {
    if (!balanceLoading) {
      setQuantity(assetBalance.availableAmt);
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
      if (Number(totalQuantity) > assetBalance.availableAmt) toast.error(t('common.insufficientBalance'));
      else if (Number(totalQuantity) <= 0) toast.error(t('common.quantityPositive'));
      else if (Number(price) <= 0) toast.error(t('common.pricePositive'));
      return;
    }
    if (!address || !network || !btcWallet) {
      console.error("Missing address, network, or wallet connection.");
      toast.error(t('common.walletNotConnected'));
      return;
    }

    setIsSelling(true);
    const sellQuantity = Number(quantity);
    const sellPrice = Number(price);

    try {
      const [sellUtxoInfos, utxos] = await prepareSellData(assetInfo.assetName, sellQuantity, sellPrice, batchQuantity);
      const signedPsbts = await buildAndSignOrder(sellUtxoInfos, address, network, btcWallet);
      const submissionSuccess = await submitSignedOrder(address, assetInfo.assetName, signedPsbts, t);

      if (submissionSuccess) {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
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

  const displayBalance = assetBalance.availableAmt + assetBalance.lockedAmt;
  const displayAvailableAmt = assetBalance.availableAmt
  console.log("assetBalance", assetBalance);

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
           {t('common.balance')} <span className="ml-2"> {displayBalance.toLocaleString()} {tickerInfo?.displayname}</span>
          </p>
        </div>
      </div>

      {/* Quantity Input */}
      <div className="mb-4 space-y-1.5">
        <label htmlFor="sell-quantity" className="block text-sm text-gray-400 mb-1">
         {t('common.quantity')} ({tickerInfo?.displayname}):
        </label>
        <div className="flex items-center gap-2">
          <Input
            id="sell-quantity"
            type="text"
            inputMode="decimal"
            value={quantity}
            onChange={handleQuantityChange}
            placeholder={t('common.quantity')}
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
        <label htmlFor="sell-price" className="block text-sm text-gray-400 mb-1">
         {t('common.unitPrice', { ticker: tickerInfo?.displayname })}:
        </label>
        <div className="flex items-center gap-2">
          <Input
            id="sell-price"
            type="text"
            inputMode="decimal"
            value={price}
            onChange={handlePriceChange}
            placeholder={t('common.unitPrice', { ticker: tickerInfo?.displayname })}
            className="h-10"
            min="0"
            disabled={isLoading}
            autoComplete="off"
          />
        </div>
      </div>
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
          <span className="gap-1">{displayAvailableAmt.toLocaleString()} {tickerInfo?.displayname} </span>
        </p>

        {!balanceLoading && quantity !== "" && Number(quantity) > assetBalance.availableAmt && (
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
             {t('common.estReceive')}: <span className="font-semibold text-zinc-200 gap-2">{calculatedBTC} {t('common.sats')}</span>
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
          {isSelling ? t('common.processing') : t('common.listsell', { ticker: tickerInfo?.displayname })}
        </Button>
      </WalletConnectBus>
    </div>
  );
};

export default SellOrder;