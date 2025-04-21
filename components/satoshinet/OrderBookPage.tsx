import React, { useState, useEffect, useMemo } from "react";
import OrderBookHeader from "@/components/satoshinet/orderbook/OrderBookHearder";
import BuySellToggle from "@/components/satoshinet/orderbook/BuySellToggle";
import TakeOrder from "@/components/satoshinet/orderbook/TakeOrder";
import MakeOrder from "@/components/satoshinet/orderbook/MakeOrder";
import BuyOrder from './orderbook/BuyOrder';
import SellOrder from './orderbook/SellOrder';
import { useWalletStore } from '@/store';
import { satsToBitcoin, formatBtcAmount } from '@/utils';


interface AssetInfoProps {
  assetData: {
    assetId: string;
    assetName: string;
    assetType: string;
    protocol: string;
    assetLogo: string;
    floorPrice: string;
    volume: string;  
    marketCap: string;
    transactions: number;
    holders: number;
    mintProgress: string;
  };
}

const OrderBookPage = ({ assetData }: AssetInfoProps) => {  
  const [activeTab, setActiveTab] = useState<"takeOrder" | "makeOrder">("takeOrder");
  const [mode, setMode] = useState<"buy" | "sell">("buy");

  const { getBalance, balance } = useWalletStore();

  const showAmount = useMemo(() => {
      const btcValue = satsToBitcoin(balance.availableAmt);
      return formatBtcAmount(btcValue);
    }, [balance]);

  const userWallet = {
    btcBalance: typeof showAmount === "string" ? parseFloat(showAmount) : showAmount || 0, // 用户钱包中的 BTC 余额
    assetBalance: 1000, // 用户持有的资产数量
    address: '', // 用户钱包地址
  };

  const handleTabChange = (tab: "takeOrder" | "makeOrder") => {
    setActiveTab(tab);
    if (tab === "makeOrder") {
      setMode("sell"); // 切换到 Make Order 时强制设置为 sell
    } else if (tab === "takeOrder") {
      setMode("buy"); // 切换回 Take Order 时默认设置为 buy
    }
  };

  const [settings, setSettings] = useState({
    showOngoingTrades: false,
    maxBidPrice: 0,
  });

  const handleSettingsChange = (newSettings: { showOngoingTrades: boolean; maxBidPrice: number }) => {
    setSettings(newSettings);
    console.log("Updated Settings:", newSettings);
  };

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
        <BuySellToggle mode={mode} onChange={setMode} disableBuy={false} />
      )}
      {activeTab === "takeOrder" ? (
        <TakeOrder mode={mode} setMode={setMode} assetInfo={{
          assetLogo: assetData.assetLogo,
          assetName: assetData.assetName,
          AssetId: assetData.assetId,
          floorPrice: parseFloat(assetData.floorPrice),
        }} />
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
        {settings.showOngoingTrades && <p>Show pending transactions...</p>}
        {settings.maxBidPrice > 0 && <p>Item price limit: {settings.maxBidPrice} sats</p>}
      </div>
    </div>
  );
};

export default OrderBookPage;