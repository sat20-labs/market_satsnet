import React, { useState } from "react";
import { Button } from "@/components/ui/button"; 
import { Input } from "@/components/ui/input";
import { Icon } from "@iconify/react";
import { BtcPrice } from '../BtcPrice';
import { clientApi, marketApi } from '@/api'; // 假设 API 方法在此路径
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';

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

const SellOrderModal = ({
  assetInfo,
  availableBalance = 1000, // 如果未传入值，默认设置为 0
  onClose,
  onSubmit,
}: SellOrderModalProps) => {
  const [quantity, setQuantity] = useState<number | "">("");
  const [price, setPrice] = useState<number | "">("");
  const [batchQuantity, setBatchQuantity] = useState<number>(1); // 批量挂单数量，默认值为 1
  const [loading, setLoading] = useState(false); // 挂单加载状态
  const { address, network, btcWallet } = useReactWalletStore((state) => state);

  // 动态计算滑动条的最大值
  const maxBatchQuantity = quantity ? Math.floor(availableBalance / (quantity as number)) : 1;

  // 校验逻辑
  const isSellValid =
    quantity !== "" &&
    price !== "" &&
    (quantity as number) > 0 &&
    batchQuantity > 0 &&
    (quantity as number) * batchQuantity <= availableBalance;

  // 计算用户可以获得的收入 (将单价从 sats 转换为 BTC)
  const calculatedBTC =
    ((quantity as number) * (price as number) * batchQuantity) / 100000000;

  // 处理点击 "Max" 按钮
  const handleMaxClick = () => {
    setQuantity(availableBalance);
    setBatchQuantity(1); // 默认设置批量挂单为 1
  };

  const handleSellSubmit = async () => {
    if (!isSellValid || !address || !network) return;
  
    setLoading(true);
    try {
      const sellUtxoInfos: Array<{ [key: string]: any; Price: number }> = [];
  
      // 批量生成挂单信息
      for (let i = 0; i < batchQuantity; i++) {
        if (!assetInfo.assetName || !(quantity > 0)) {
          throw new Error("Missing required information: Asset Key or Quantity.");
        }
  
        // 调用拆分资产接口
        const splitRes = await window.sat20.splitAsset(assetInfo.assetName, quantity as number);
        if (!splitRes?.txId) {
          throw new Error('Failed to split asset or txId missing.');
        }
        const txid = splitRes.txId;
        const vout = 0;
        const utxo = `${txid}:${vout}`;
        console.log(`Asset split successful. UTXO created: ${utxo}`);
  
        // 获取 UTXO 信息
        const utxoData: any = await clientApi.getUtxoInfo(utxo);
        if (!utxoData) {
          throw new Error("Failed to fetch UTXO data.");
        }
  
        // 格式化资产名称为 protocol:f.assetName
        const formattedAssetName = `ordx:f:${assetInfo.assetName}`;
  
        sellUtxoInfos.push({
          ...utxoData,
          Price: price,
          AssetName: formattedAssetName, // 使用格式化后的资产名称
        });
      }
  
      // 构建批量挂单订单
      const sat20SellOrder = await window.sat20.buildBatchSellOrder(
        sellUtxoInfos.map((v) => JSON.stringify(v)),
        address,
        network,
      );
      const psbt = sat20SellOrder?.data?.psbt;
      if (!psbt) {
        throw new Error('Failed to build batch sell order.');
      }
  
      // 签名交易
      const signedPsbts = await btcWallet?.signPsbt(psbt, { chain: 'sat20' });
      if (!signedPsbts) {
        throw new Error('Failed to sign PSBT.');
      }
  
      // 提交挂单
      const orders = sellUtxoInfos.map((info) => ({
        assets_name: info.AssetName, // 使用格式化后的资产名称
        raw: signedPsbts,
      }));
      const res = await marketApi.submitBatchOrders({
        address,
        orders: orders,
      });
  
      if (res.code === 200) {
        console.log('Sell order submitted successfully');
        onSubmit(quantity as number, price as number, batchQuantity);
        onClose(); // 关闭弹窗
      } else {
        throw new Error(res.message || 'Failed to submit sell order.');
      }
    } catch (error) {
      console.error("Error during sell process:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-end sm:items-center z-50">
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
            Available Balance: {availableBalance}
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