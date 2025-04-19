import React, { useState, useEffect } from "react";
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


const OrderBookPage = ({ assetData }: AssetInfoProps) => {
  //const { asset, activeTab, mode } = router.query; // 获取 URL 中的参数
  const [query, setQuery] = useState<Record<string, string | undefined>>({});  

  const [activeTab, setActiveTab] = useState<"takeOrder" | "makeOrder">("takeOrder");
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const userWallet = {
    btcBalance: 0.5, // 用户钱包中的 BTC 余额
    assetBalance: 1000, // 用户持有的资产数量
    address: '', // 用户钱包地址'';
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

  useEffect(() => {
    // 解析 URL 参数
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      setQuery({
        asset: searchParams.get("asset") ?? undefined,
        activeTabSet: searchParams.get("activeTabSet") ?? undefined,
        modeSet: searchParams.get("modeSet") ?? undefined,
      });
    }
  }, []);

  const { asset, activeTabSet, modeSet } = query;

  useEffect(() => {
    console.log("URL Parameters:", query);
  
    // 更新 activeTab
    if (activeTabSet === "makeOrder" || activeTabSet === "takeOrder") {
      setActiveTab(activeTabSet as "takeOrder" | "makeOrder");
    }
  }, [activeTabSet]);
  
  useEffect(() => {
    // 更新 mode
    if (modeSet === "sell" || modeSet === "buy") {
      setMode(modeSet as "sell" | "buy");
    }
  }, [modeSet]);
  

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
        <BuySellToggle mode={'sell'} onChange={setMode} disableBuy={true} />)

      }
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