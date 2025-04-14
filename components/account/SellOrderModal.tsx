import React, { useState } from "react";
import { Icon } from "@iconify/react";
import { BtcPrice } from '../BtcPrice';

interface SellOrderModalProps {
  assetInfo: { assetName: string; assetBalance: number };
  availableBalance?: number; // 可用余额，默认为 0
  onClose: () => void;
  onSubmit: (quantity: number, price: number, batchQuantity: number) => void; // 增加批量挂单数量
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
  const calculatedBTC = ((quantity as number) * (price as number) * (batchQuantity as number)) /100000000;
  // 处理点击 "Max" 按钮
  const handleMaxClick = () => {
    setQuantity(availableBalance);
    setBatchQuantity(1); // 默认设置批量挂单为 1
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-end md:items-center z-50">
      <div className="bg-zinc-900 p-6 rounded-t-lg md:rounded-lg w-full max-w-md relative">
        {/* 关闭按钮 */}
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
          onClick={onClose}
        >
          <Icon icon="mdi:close" className="text-xl" />
        </button>

        {/* 数量输入 */}
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-1">Quantity to Sell:</label>
          <div className="flex items-center gap-0">
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              placeholder="Enter quantity"
              className="w-full bg-zinc-800 text-zinc-200 p-2 rounded"
            />
            <button
              onClick={handleMaxClick}
              className="px-2 py-2 h-[42px] border-1 border-l-zinc-800 border-zinc-700  bg-zinc-900 text-zinc-300 text-sm rounded hover:bg-zinc-800"
            >
              Max
            </button>
            <span className="text-sm text-gray-400">{assetInfo.assetName}</span>
          </div>
        </div>

        {/* 单价输入 */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-1">Unit Price:</label>
          <div className="flex items-center gap-2">
            <input
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
          <label className="block text-sm text-gray-400 mb-1">Repeat List:</label>
          <div className="flex items-center gap-4">
            <input
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
            Invalid quantity or price. Ensure quantity is less than or equal to your available balance.
          </p>
        )}

        {/* 收益计算 */}
        {quantity && price && (
          <div className="mb-4">
            <div className="flex justify-between font-medium text-gray-400">
              <span>You will receive: </span><span>{calculatedBTC} BTC</span>
              
            </div>
            <div className="text-sm text-right text-gray-400 gap-2">
              <span>$</span><span><BtcPrice btc={calculatedBTC} /></span>
            </div>
            
          </div>
        )}

        {/* 提交按钮 */}
        <button
          className={`w-full py-3 rounded-xl text-zinc-200 text-sm font-semibold ${
            isSellValid ? "btn-gradient hover:bg-zinc-700" : "bg-gray-700 cursor-not-allowed"
          }`}
          disabled={!isSellValid}
          onClick={() => {
            if (isSellValid) {
                onSubmit(quantity as number, price as number, batchQuantity as number);
            }
          }}
        >
          Submit
        </button>
      </div>
    </div>
  );
};

export default SellOrderModal;