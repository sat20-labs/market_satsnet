import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import SellOrder from "@/components/satoshinet/orderbook/SellOrder";
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
interface SellOrderAssetInfo {
  assetLogo: string;
  assetName: string;
  displayname: string;
  AssetId: string;
  floorPrice: number;
}

interface SellOrderModalProps {
  assetInfo: SellOrderAssetInfo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tickerInfo: any;
}



const SellOrderModal = ({
  assetInfo,
  open,
  onOpenChange,
  tickerInfo,
}: SellOrderModalProps) => {
  console.log("tickerInfo", tickerInfo);
  
  const { address } = useReactWalletStore();
  const handleCloseModal = () => {
    onOpenChange(false);
  };
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [assetBalance, setAssetBalance] = useState({ availableAmt: 0, lockedAmt: 0 });
  useEffect(() => {
    if (!address || !assetInfo.assetName) return;
    setBalanceLoading(true);
    window.sat20.getAssetAmount_SatsNet(address, assetInfo.assetName)
      .then(res => setAssetBalance({ availableAmt: Number(res.availableAmt), lockedAmt: Number(res.lockedAmt) }))
      .finally(() => setBalanceLoading(false));
  }, [address, assetInfo.assetName]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-zinc-900 border-zinc-800 text-zinc-200">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Sell {tickerInfo.displayname || assetInfo.assetName}</DialogTitle>
        </DialogHeader>
        <div className="pt-4">
          <SellOrder assetInfo={assetInfo}
           onSellSuccess={handleCloseModal} 
           assetBalance={assetBalance} 
           balanceLoading={balanceLoading} 
           tickerInfo={tickerInfo}
           />
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default SellOrderModal;