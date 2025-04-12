'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';

interface OrderBookHeaderProps {
  activeTab: "takeOrder" | "makeOrder";
  onTabChange: (tab: "takeOrder" | "makeOrder") => void;
  onRefresh: () => void;
  onSettingsChange: (settings: { showOngoingTrades: boolean; maxBidPrice: number }) => void; // 新增回调
}

const OrderBookHeader = ({ activeTab, onTabChange, onRefresh, onSettingsChange }: OrderBookHeaderProps) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // 控制弹窗显示
  const [showOngoingTrades, setShowOngoingTrades] = useState(false); // 是否显示进行中的交易
  const [maxBidPrice, setMaxBidPrice] = useState<number>(0); // 最高报价价格

  const handleSettingsSave = () => {
    onSettingsChange({ showOngoingTrades, maxBidPrice }); // 保存设置
    setIsSettingsOpen(false); // 关闭弹窗
  };

  return (
    <div className="flex items-center justify-between bg-transparent border-b-1 border-zinc-800 pt-6 rounded-t-lg gap-4">
      {/* Tab 切换按钮 */}
      <div className="flex gap-4">
        <button
          className={`text-sm sm:text-base font-medium ${
            activeTab === "takeOrder" ? "text-blue-500 border-b-2 border-blue-500" : "text-gray-400"
          }`}
          onClick={() => onTabChange("takeOrder")}
        >
          Take Order
        </button>
        <button
          className={`text-sm sm:text-base font-medium ${
            activeTab === "makeOrder" ? "text-blue-500 border-b-2 border-blue-500" : "text-gray-400"
          }`}
          onClick={() => onTabChange("makeOrder")}
        >
          Make Order
        </button>
      </div>

      {/* 设置和刷新图标 */}
      <div className="flex gap-4 items-center">
        <button
          className="text-gray-400 hover:text-white transition-colors"
          onClick={() => setIsSettingsOpen(true)} // 打开设置弹窗
          aria-label="Settings"
        >
          <Icon icon="mdi:cog-outline" className="text-lg sm:text-xl" />
        </button>
        <button
          className="text-gray-400 hover:text-white transition-colors"
          onClick={onRefresh}
          aria-label="Refresh"
        >
          <Icon icon="mdi:refresh" className="text-lg sm:text-xl" />
        </button>
      </div>

      {/* 设置弹窗 */}
      {isSettingsOpen && (
        <div className="absolute top-16 right-4 bg-zinc-900 text-zinc-300 p-4 rounded-lg shadow-xl w-72">
          <h3 className="text-sm font-medium mb-4">Settings</h3>
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm">Show pending transactions</label>
            <input
              type="checkbox"
              checked={showOngoingTrades}
              onChange={(e) => setShowOngoingTrades(e.target.checked)}
              className="toggle-checkbox"
            />
          </div>
          <div className="mb-4">
            <label className="text-sm">Max price per item</label>
            <div className="flex items-center bg-zinc-800 rounded px-2 py-1">              
              <input
                type="number"
                value={maxBidPrice}
                onChange={(e) => setMaxBidPrice(Number(e.target.value))}
                placeholder="sats"
                className="bg-transparent text-sm py-2 text-white w-full outline-none"
              />
              <span className="text-sm text-gray-400 ml-2">sats</span>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsSettingsOpen(false)} // 关闭弹窗
              className="px-4 py-2 text-sm bg-gray-700 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSettingsSave} // 保存设置
              className="px-4 py-2 text-sm bg-blue-500 rounded hover:bg-blue-600"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderBookHeader;