import React, { useState } from "react";
import OrderBookHeader from "@/components/satoshinet/orderbook/OrderBookHearder";
import BuySellToggle from "@/components/satoshinet/orderbook/BuySellToggle";
import TakeOrder from "@/components/satoshinet/orderbook/TakeOrder";
import MakeOrder from "@/components/satoshinet/orderbook/MakeOrder";
import BuyOrder from './orderbook/BuyOrder';
import SellOrder from './orderbook/SellOrder';

interface AssetInfoProps {
  assetData: {
    assetId: string;
    assetName: string;
    assetType: string;
    protocol: string;
    assetLogo: string;
    floorPrice: string;
    floorPriceUSD: string;
    volume: string;
    volumeUSD: string;
    marketCap: string;
    marketCapUSD: string;
    transactions: number;
    holders: number;
    mintProgress: string;
  };
}

const orders = [
  { quantity: 20000, price: 26.5, totalBTC: 0.0053, totalUSD: 444.38 },
  { quantity: 30000, price: 26.8, totalBTC: 0.00804, totalUSD: 674.11 },
  { quantity: 50000, price: 29.0, totalBTC: 0.0145, totalUSD: 1215.75 },
  { quantity: 10551, price: 29.5, totalBTC: 0.003112, totalUSD: 260.93 },
  { quantity: 10551, price: 29.9, totalBTC: 0.003154, totalUSD: 264.45 },
  { quantity: 10551, price: 30.0, totalBTC: 0.003165, totalUSD: 265.37 },
  { quantity: 10876, price: 30.0, totalBTC: 0.003262, totalUSD: 273.50 },
  { quantity: 6547, price: 31.0, totalBTC: 0.002029, totalUSD: 170.12 },
];

const OrderBookPage = ({ assetData }: AssetInfoProps) => {
  const [activeTab, setActiveTab] = useState<"takeOrder" | "makeOrder">("takeOrder");
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const userWallet = {
    btcBalance: 0.5, // 用户钱包中的 BTC 余额
    assetBalance: 1000, // 用户持有的资产数量
  };

  const handleTabChange = (tab: "takeOrder" | "makeOrder") => {
    setActiveTab(tab);
    setMode("buy"); // 切换标签时默认选中 "Buy"
  };

  const [settings, setSettings] = useState({
    showOngoingTrades: false,
    maxBidPrice: 0,
  });

  const handleSettingsChange = (newSettings: { showOngoingTrades: boolean; maxBidPrice: number }) => {
    setSettings(newSettings);
    console.log("Updated Settings:", newSettings);
  };

  <div>
    {/* 根据 settings 过滤订单簿 */}
    {settings.showOngoingTrades && <p>显示进行中交易...</p>}
    {settings.maxBidPrice > 0 && <p>最高报价价格: {settings.maxBidPrice} sats</p>}
  </div>

  return (
    <div className="max-w-full mx-auto p-4 bg-[#0E0E10] text-zinc-200 rounded-2xl shadow-lg border border-zinc-700 w-full h-full">
      {/* Header */}
      <OrderBookHeader
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onRefresh={() => console.log("Refreshing order book...")}
        onSettingsChange={handleSettingsChange} // 处理设置更改
      />

      {/* Buy/Sell Toggle */}
      {activeTab === "takeOrder" ? (
        <BuySellToggle mode={mode} onChange={setMode} disableSell={true} />
      ) : (
        <BuySellToggle mode={mode} onChange={setMode} disableSell={false} />)

      }

      {/* Conditional Rendering for TakeOrder and MakeOrder */}
      {activeTab === "takeOrder" ? (
        <TakeOrder mode={mode} setMode={setMode} assetInfo={{
          assetLogo: assetData.assetLogo,
          assetName: assetData.assetName,
          AssetId: assetData.assetId,
          floorPrice: parseFloat(assetData.floorPrice),
        }} userWallet={userWallet} />
      ) : (
        <div>
          {mode === "buy" ? (
            <BuyOrder
              userWallet={userWallet}
              assetInfo={{
                assetLogo: assetData.assetLogo,
                assetName: assetData.assetName,
                AssetId: assetData.assetId,
                floorPrice: parseFloat(assetData.floorPrice),
              }}
            />
          ) : (
            <SellOrder
              assetInfo={{
                assetLogo: assetData.assetLogo,
                assetName: assetData.assetName,
                AssetId: assetData.assetId,
                floorPrice: parseFloat(assetData.floorPrice),
              }}
            />
          )}
        </div>
      )}
      <div className="mt-4 text-sm text-gray-400">
        {/* 根据 settings 过滤订单簿 */}
        {settings.showOngoingTrades && <p>显示进行中交易...</p>}
        {settings.maxBidPrice > 0 && <p>最高报价价格: {settings.maxBidPrice} sats</p>}
      </div>
    </div>
  );
};

export default OrderBookPage;