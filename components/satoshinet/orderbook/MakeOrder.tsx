import React, { useState } from "react";
import BuyOrder from "./BuyOrder";
import SellOrder from "./SellOrder";
import BuySellToggle from "@/components/satoshinet/orderbook/BuySellToggle";

interface MakeOrderProps {
  assetInfo: { assetLogo: string; assetName: string; AssetId: string; floorPrice: number };
  tickerInfo?: any;
  assetBalance: { availableAmt: number; lockedAmt: number };
  balanceLoading: boolean;
  onSellSuccess?: () => void;
}

const MakeOrder = ({ assetInfo, tickerInfo, assetBalance, balanceLoading, onSellSuccess }: MakeOrderProps) => {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  return (
    <div>
      <BuySellToggle mode={mode} source="makeorder" onChange={setMode} />
      {/* Conditionally render BuyOrder or SellOrder */}
      {mode === "buy" ? (
        <BuyOrder
          assetInfo={assetInfo}
          tickerInfo={tickerInfo}
          assetBalance={assetBalance}
          balanceLoading={balanceLoading}
        />
      ) : (
        <SellOrder
          assetInfo={assetInfo}
          tickerInfo={tickerInfo}
          assetBalance={assetBalance}
          balanceLoading={balanceLoading}
          onSellSuccess={onSellSuccess}
        />
      )}
    </div>
  );
};

export default MakeOrder;