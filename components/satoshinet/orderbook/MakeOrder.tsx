import React, { useState } from "react";
import BuyOrder from "./BuyOrder";
import SellOrder from "./SellOrder";
import BuySellToggle from "@/components/satoshinet/orderbook/BuySellToggle";
interface MakeOrderProps {
  assetInfo: { assetLogo: string; assetName: string; AssetId: string; floorPrice: number };
}

const MakeOrder = ({ assetInfo }: MakeOrderProps) => {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  return (
    <div>
      <BuySellToggle mode={mode} onChange={setMode} />
      {/* Conditionally render BuyOrder or SellOrder */}
      {mode === "buy" ? (
        <BuyOrder
          assetInfo={assetInfo}
        />
      ) : (
        <SellOrder
          assetInfo={assetInfo}
        />
      )}
    </div>
  );
};

export default MakeOrder;