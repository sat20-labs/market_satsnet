'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import { Button } from "@/components/ui/button"; 
import { Input } from "@/components/ui/input";
import { useTranslation } from 'react-i18next';
// 新增导入

interface OrderBookHeaderProps {
  activeTab: "takeOrder" | "makeOrder" | "swap" | "limitOrder";
  onTabChange: (tab: "takeOrder" | "makeOrder" | "swap" | "limitOrder") => void;
  onRefresh: () => void;
  onSettingsChange: (settings: { showOngoingTrades: boolean; maxBidPrice: number }) => void;
}

const OrderBookHeader = ({ activeTab, onTabChange, onRefresh, onSettingsChange }: OrderBookHeaderProps) => {
  const { t } = useTranslation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // 控制弹窗显示
  const [showOngoingTrades, setShowOngoingTrades] = useState(false); // 是否显示进行中的交易
  const [maxBidPrice, setMaxBidPrice] = useState<number>(0); // 最高报价价格

  const handleSettingsSave = () => {
    onSettingsChange({ showOngoingTrades, maxBidPrice }); // 保存设置
    setIsSettingsOpen(false); // 关闭弹窗
  };
  const handleRefresh = () => {
    onRefresh();
  };  
  return (
    <div className="flex items-center justify-between bg-transparent border-b-1 border-zinc-800 pt-6 rounded-t-lg gap-4">
      {/* Tab 切换按钮 */}
      <div className="flex gap-4">
        <button
          className={`text-sm sm:text-base font-medium pb-2 ${activeTab === "takeOrder" ? "text-zinc-200 border-b-2 border-purple-500" : "text-gray-400"
            }`}
          onClick={() => onTabChange("takeOrder")}
        >
          {t("common.takeorder")}
        </button>
        <button
          className={`text-sm sm:text-base font-medium pb-2 ${activeTab === "makeOrder" ? "text-zinc-200 border-b-2 border-purple-500" : "text-gray-400"
            }`}
          onClick={() => onTabChange("makeOrder")}
        >
          {t("common.makeorder")}
        </button>
         {/* 新增 ListOrder 标签 */}
         <button
          className={`text-sm sm:text-base font-medium pb-2 ${activeTab === "limitOrder" ? "text-zinc-200 border-b-2 border-purple-500" : "text-gray-400"
            }`}
          onClick={() => onTabChange("limitOrder")}
        >
         {t("common.limitorder")}
        </button>
        {/* SWAP UI */}
        <button
          className={`flex justify-center items-center text-sm sm:text-base font-medium pb-2 ${
            activeTab === "swap" ? "border-b-2 border-purple-500" : "text-gray-400"
          }`}
          onClick={() => onTabChange("swap")}
        >
         <span>{t("common.swap")}</span><Icon icon="token-branded:xrune" color='red' className="w-6 h-6" />
        </button>
       
      </div>

      {/* 设置和刷新图标 */}
      <div className="flex gap-4 items-center">
        {activeTab === "takeOrder" && ( // 仅在 Take Order 下显示 Settings 图标
          <button
            className="text-gray-400 hover:text-white transition-colors"
            onClick={() => setIsSettingsOpen(true)} // 打开设置弹窗
            aria-label="Settings"
          >
            <Icon icon="mdi:tune-vertical-variant" className="text-lg sm:text-xl" />
          </button>
        )}
        <button
          className="text-gray-400 hover:text-white transition-colors"
          onClick={handleRefresh}
          aria-label="Refresh"
        >
          <Icon icon="mdi:refresh" className="text-lg sm:text-xl" />
        </button>
      </div>

      {/* 设置弹窗 */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-30">
        <div
          className={`bg-zinc-900 text-zinc-300 p-4 rounded-xl z-40 shadow-2xl transition-transform duration-300 ease-in-out ${window.innerWidth >= 640
              ? "absolute top-16 right-4 w-72" // PC 靠右上弹出
              : "fixed bottom-0 left-2 w-[96%] rounded-t-lg" // 移动端从底部弹出
            }`}
        >
          <h3 className="flex justify-start items-center text-base font-medium mb-2 gap-1"> <Icon icon="mdi:cog-outline" className="text-lg sm:text-xl" />Settings</h3>
          
          <div className="flex items-center justify-between mb-4 border-t-1 border-zinc-700 pt-2">
            <label className="text-sm">Show pending transactions</label>
            <input
              type="checkbox"
              checked={showOngoingTrades}
              onChange={(e) => setShowOngoingTrades(e.target.checked)}
              className="toggle-checkbox"
            />
          </div>
          <div className="mb-4">
            <label className="text-sm">Item price limit</label>
            <div className="flex items-center rounded  py-1">
              <Input
                type="number"
                value={maxBidPrice}
                onChange={(e) => setMaxBidPrice(Number(e.target.value))}
                placeholder="sats"
                className="bg-transparent text-sm py-2 text-white w-full outline-none"
              />
              <span className="text-sm text-gray-400 ml-2">sats</span>
            </div>
          </div>
          <div className="flex justify-start gap-2">
            <Button
              onClick={() => setIsSettingsOpen(false)} // 关闭弹窗
              className="px-4 py-2 text-sm w-1/2"
              variant={"outline"}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSettingsSave} // 保存设置
              className="px-4 py-2 text-sm btn-gradient w-1/2"
            >
              Save
            </Button>
          </div>
        </div>
        </div> // 背景遮罩
      )}
    </div>
    
  );
};

export default OrderBookHeader;
