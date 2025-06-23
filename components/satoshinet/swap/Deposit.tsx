import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import { useAssetBalance } from '@/application/useAssetBalanceService';
import { toast } from 'sonner';

interface DepositProps {
  contractUrl: string;
  assetInfo: { assetLogo: string; assetName: string; AssetId: string; floorPrice: number };
  tickerInfo?: any;
  hideAssetInfo?: boolean;
}

const Deposit: React.FC<DepositProps> = ({ contractUrl, assetInfo, tickerInfo }) => {
  const [amount, setAmount] = useState('');
  const { address } = useReactWalletStore();
  const { balance: assetBalance } = useAssetBalance(address, assetInfo.assetName);
  const displayAssetBalance = assetBalance.availableAmt;

  const depositHandler = async () => {
    console.log(amount);
    const params = {action: "deposit", param: JSON.stringify({orderType: 6, assetName: assetInfo.assetName, amt: amount})};
    const serviceFee = 10;
    const result = await window.sat20.invokeContractV2(
      contractUrl,
      JSON.stringify(params),
      assetInfo.assetName,
      amount,
      serviceFee.toString(),
      {
        action: "deposit",
        orderType: 6,
        assetName: assetInfo.assetName,
        amt: amount,
      }
    );
    const { txId } = result;
    if (txId) {
      toast.success(`Deposit successful, txid: ${txId}`);
      setAmount("");
    } else {
      toast.error("Deposit failed");
    }
  }

  const handleMaxClick = () => {
    setAmount(displayAssetBalance.toString());
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="mb-2 mx-4 py-2 rounded-lg relative">
          <div className="flex justify-between items-center text-xs text-zinc-500 mb-1 mx-2">
            <span className="py-2 uppercase">充值金额</span>
            <span className="text-xs text-zinc-500">
              余额: {displayAssetBalance.toLocaleString()} {assetInfo.assetName}
              <button
                onClick={handleMaxClick}
                className="ml-2 px-2 py-1 rounded-md bg-zinc-800 text-xs hover:bg-purple-500 hover:text-white"
              >
                最大
              </button>
            </span>
          </div>
          <div className="relative w-full">
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full input-swap bg-transparent border-none rounded-lg px-4 py-2 text-xl sm:text-3xl font-bold text-white pr-16"
              placeholder="请输入充值金额"
              min={1}
            />
          </div>
        </div>
        <Button type="button" className="w-full my-4 text-sm font-semibold transition-all duration-200 btn-gradient" onClick={depositHandler}>充值</Button>
      </div>
    </div>
  );
};

export default Deposit; 