import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import SellOrder from "@/components/satoshinet/orderbook/SellOrder";

interface SellOrderAssetInfo {
  assetLogo: string;
  assetName: string;
  AssetId: string;
  floorPrice: number;
}

interface SellOrderModalProps {
  assetInfo: SellOrderAssetInfo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}



const SellOrderModal = ({
  assetInfo,
  open,
  onOpenChange,
}: SellOrderModalProps) => {
  const handleCloseModal = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-zinc-900 border-zinc-800 text-zinc-200">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Sell {assetInfo.assetName.split(':').pop() || assetInfo.assetName}</DialogTitle>
        </DialogHeader>
        <div className="pt-4">
          <SellOrder assetInfo={assetInfo} onSellSuccess={handleCloseModal} />
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default SellOrderModal;