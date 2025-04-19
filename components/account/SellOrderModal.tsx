import React, { useState, useMemo } from "react";
import { SellUtxoInfo } from "@/types";
import { Button } from "@/components/ui/button"; 
import { Input } from "@/components/ui/input";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { BtcPrice } from '../BtcPrice';
import { clientApi, marketApi } from '@/api'; // 假设 API 方法在此路径
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';

import { useAssetStore } from '@/store/asset';
import { AssetItem } from "@/store/asset";
import { useCommonStore } from "@/store";
import { WalletConnectBus } from "@/components/wallet/WalletConnectBus";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQueryClient } from "@tanstack/react-query";

interface SellOrderModalProps {
  assetInfo: { assetName: string; assetBalance: number };
  availableBalance?: number; // 可用余额，默认为 0
  onClose: () => void;
  onSubmit: (quantity: number, price: number, batchQuantity: number) => void; // 增加批量挂单数量
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
  const splitRes = await window.sat20.splitBatchAsset(assetName, quantity);
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

const SellOrderModal = ({
  assetInfo,
  //availableBalance = 1000, // 如果未传入值，默认设置为 0
  onClose,
  onSubmit,
}: SellOrderModalProps) => {
  const [quantity, setQuantity] = useState<number | "">("");
  const [price, setPrice] = useState<number | "">("");
  const [batchQuantity, setBatchQuantity] = useState<number>(1); // 批量挂单数量，默认值为 1
  const [loading, setLoading] = useState(false); // 挂单加载状态

  const { loading: balanceLoading, assets } = useAssetStore();
  const { address, btcWallet } = useReactWalletStore();
  const { network } = useCommonStore();
  const [isSelling, setIsSelling] = useState(false);
  const queryClient = useQueryClient();

  const userAssetBalance = useMemo(() => {
      if (!assetInfo.assetName || balanceLoading) return 0;
      const parts = assetInfo.assetName.split(':');
      const protocol = parts[0] || 'plain';
      const protocolKey = protocol as keyof typeof assets;
      const protocolAssets = Array.isArray(assets[protocolKey]) ? assets[protocolKey] : [];
      const userAsset = protocolAssets.find((asset: AssetItem) => asset.key === assetInfo.assetName);
      console.log("User Asset:", userAsset); // 调试日志
      return userAsset ? userAsset.amount : 0;
    }, [assetInfo.assetName, assets, balanceLoading]);

  console.log("Test User Asset Balance:", userAssetBalance); // 调试日志

  // // 动态计算滑动条的最大值
  // const maxBatchQuantity = quantity ? Math.floor(availableBalance / (quantity as number)) : 1;

  // 校验逻辑

    const isSellValid = useMemo(() =>
        quantity !== "" &&
        price !== "" &&
        Number(quantity) > 0 &&
        Number(price) > 0 &&
        Number(quantity) <= userAssetBalance &&
        batchQuantity > 0 &&
        !balanceLoading,
        [quantity, price, userAssetBalance, balanceLoading]);

    const maxBatchQuantity = quantity ? Math.floor(userAssetBalance / (quantity as number)) : 1;      

  // 计算用户可以获得的收入 (将单价从 sats 转换为 BTC)
  const calculatedBTC =
    ((quantity as number) * (price as number) * batchQuantity) / 100000000;

  // 处理点击 "Max" 按钮
  const handleMaxClick = () => {
    if (!balanceLoading) {
      setQuantity(userAssetBalance);
      setBatchQuantity(1); // 默认设置批量挂单为 1
    }
  };

    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      handleNumericInput(e.target.value, setQuantity);
    };
  
    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      handleNumericInput(e.target.value, setPrice);
    };


  const handleSellSubmit = async () => {
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
    setLoading(true);
  
    try {
      const sellQuantity = Number(quantity);
      const sellPrice = Number(price);
  
      // **1. 批量拆分 UTXO**
      console.log(`Splitting asset ${assetInfo.assetName} into ${batchQuantity} UTXOs...`);
      const splitRes = await window.sat20.splitBatchAsset(
        assetInfo.assetName,
        sellQuantity,
        batchQuantity
      );
      if (!splitRes?.txIds || splitRes.txIds.length !== batchQuantity) {
        throw new Error("Failed to split assets or mismatch in UTXO count.");
      }
      console.log(`Batch split successful. Generated UTXOs:`, splitRes.txIds);
  
      // **2. 构建批量挂单信息**
      const sellUtxoInfos: SellUtxoInfo[] = splitRes.txIds.map((txId: string) => ({
        txId,
        vout: 0,
        Price: sellPrice,
      }));
  
      // **3. 构建批量挂单订单**
      console.log("Building batch sell order...");
      const sat20SellOrder = await window.sat20.buildBatchSellOrder(
        sellUtxoInfos.map((v) => JSON.stringify(v)),
        address,
        network
      );
      const psbt = sat20SellOrder?.data?.psbt;
      if (!psbt) {
        throw new Error("Failed to build batch sell order.");
      }
      console.log("Batch sell order built successfully.");
  
      // **4. 批量签名订单**
      console.log("Signing batch PSBT...");
      toast.info("Please sign the transaction in your wallet.");
      const signedPsbts = await btcWallet.signPsbt(psbt, { chain: "sat20" });
      if (!signedPsbts) {
        throw new Error("Failed to sign batch PSBT.");
      }
      console.log("Batch PSBT signed successfully.");
  
      // **5. 提交批量挂单**
      console.log("Submitting batch sell orders...");
      const orders = sellUtxoInfos.map((info) => ({
        assets_name: assetInfo.assetName,
        raw: signedPsbts,
      }));
      const res = await marketApi.submitBatchOrders({
        address,
        orders,
      });
  
      if (res.code === 200) {
        console.log("Sell order submitted successfully.");
        toast.success("Sell order submitted successfully!");
        onSubmit(sellQuantity, sellPrice, batchQuantity);
        onClose(); // 关闭弹窗
      } else {
        throw new Error(res.message || "Failed to submit sell order.");
      }
    } catch (error) {
      console.error("Error during sell process:", error);
      toast.error("Failed to submit sell order. Please try again.");
    } finally {
      setLoading(false);
      setIsSelling(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex justify-center items-end sm:items-center z-50">
      <div className="bg-zinc-900 p-6 rounded-t-lg md:rounded-lg w-full max-w-md relative">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
          onClick={onClose}
        >
          <Icon icon="mdi:close" className="text-xl" />
        </button>
        {/* 资产信息展示 */}
        <div className="my-5 font-mono rounded-lg border-1 border-zinc-800 p-4">
          <h3 className="text-xl text-zinc-400 first-letter:uppercase">{assetInfo.assetName} Information</h3>
          {/* <p className="text-sm text-zinc-400">
            <strong>Asset Name:</strong> {assetInfo.assetName}
          </p> */}
          <p className="text-lg text-zinc-400">
            Asset Balance: {assetInfo.assetBalance}
          </p>
          <p className="text-lg text-zinc-400">
            Available Balance: {userAssetBalance}
          </p>
        </div>

        {/* 数量输入 */}
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-1">Quantity to Sell :</label>
          <div className="flex items-center gap-0">
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              placeholder="Enter quantity"
              className="w-full bg-zinc-800 text-zinc-200 p-2 rounded"
            />
            <Button
              onClick={handleMaxClick}
              className="px-2 py-2 h-[36px] border-1 border-l-zinc-800 border-zinc-700 bg-zinc-900 text-zinc-300 text-sm rounded hover:bg-zinc-800"
            >
              Max
            </Button>
            <span className="text-sm text-gray-400">{assetInfo.assetName}</span>
          </div>
        </div>

        

        {/* 单价输入 */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-1">Unit Price :</label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              placeholder="Enter price"
              className="w-full bg-zinc-800 text-white p-2 rounded"
            />
            <span className="text-sm text-gray-400">sats</span>
          </div>
        </div>

        {/* 批量挂单数量滑动条 */}
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-1">Repeat :</label>
          <div className="flex items-center gap-4">
            <Input
              type="range"
              min="1"
              max={maxBatchQuantity} // 动态设置最大值
              value={batchQuantity}
              onChange={(e) => setBatchQuantity(Number(e.target.value))}
              className="w-full"
            />
            <span className="text-sm text-gray-400">{batchQuantity}</span>
          </div>
        </div>

        {/* 验证消息 */}
        {!isSellValid && (
          <p className="text-red-500 text-sm font-medium mb-4">
            Invalid quantity, batch quantity, or price. Ensure the total quantity does not exceed your available balance.
          </p>
        )}

        {/* 收益计算 */}
        {quantity && price && batchQuantity && (
          <div className="mb-4">
            <div className="flex justify-between font-medium text-gray-400">
              <span>You will receive: </span>
              <span>{calculatedBTC.toFixed(8)} BTC</span>
            </div>
            <div className="text-sm text-right text-gray-400 gap-2">
              <span>$</span>
              <span>
                <BtcPrice btc={calculatedBTC} />
              </span>
            </div>
          </div>
        )}

        {/* 提交按钮 */}
        <Button
          className={`w-full py-3 rounded-xl text-zinc-200 text-sm font-semibold ${
            isSellValid && !loading ? "btn-gradient hover:bg-zinc-700" : "bg-gray-700 cursor-not-allowed"
          }`}
          disabled={!isSellValid || loading}
          onClick={handleSellSubmit}
        >
          {loading ? "Submitting..." : "Submit"}
        </Button>
      </div>
    </div>
  );
};

export default SellOrderModal;