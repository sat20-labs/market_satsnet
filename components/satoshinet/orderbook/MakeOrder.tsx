import React from "react";
import BuyOrder from "./BuyOrder";
import SellOrder from "./SellOrder";

interface MakeOrderProps {
  mode: "buy" | "sell";
  userWallet: { btcBalance: number; assetBalance: number };
  assetInfo: { assetLogo: string; assetName: string; AssetId: string; floorPrice: number };
}

const MakeOrder = ({ mode, userWallet, assetInfo }: MakeOrderProps) => {
  return (
    <div>
      {/* Conditionally render BuyOrder or SellOrder */}
      {mode === "buy" ? (
        <BuyOrder
          userWallet={userWallet}
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