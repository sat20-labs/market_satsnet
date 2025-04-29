import React, { useState } from "react";
import BuyOrder from "./BuyOrder";
import SellOrder from "./SellOrder";
import BuySellToggle from "@/components/satoshinet/orderbook/BuySellToggle";

interface MakeOrderProps {
  assetInfo: { assetLogo: string; assetName: string; AssetId: string; floorPrice: number };
  tickerInfo?: any;
}

const MakeOrder = ({ assetInfo, tickerInfo }: MakeOrderProps) => {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  return (
    <div>
      <BuySellToggle mode={mode} onChange={setMode} />
      {/* Conditionally render BuyOrder or SellOrder */}
      {mode === "buy" ? (
        <BuyOrder
          assetInfo={assetInfo}
          tickerInfo={tickerInfo}
        />
      ) : (
        <SellOrder
          assetInfo={assetInfo}
          tickerInfo={tickerInfo}
        />
      )}
    </div>
  );
};

export default MakeOrder;