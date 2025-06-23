import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import { useAssetBalance } from '@/application/useAssetBalanceService';
import { toast } from 'sonner';
import { sleep } from 'radash';

interface WithDrawProps {
  contractUrl: string;
  assetInfo: { assetLogo: string; assetName: string; AssetId: string; floorPrice: number };
  tickerInfo?: any;
  hideAssetInfo?: boolean;
}

const WithDraw: React.FC<WithDrawProps> = ({ contractUrl, assetInfo, tickerInfo }) => {
  const [amount, setAmount] = useState('');
  const { address } = useReactWalletStore();
  const { balance: assetBalance } = useAssetBalance(address, assetInfo.assetName);
  const displayAssetBalance = assetBalance.availableAmt + assetBalance.lockedAmt;

  // TODO: 实现提取池子资金的逻辑
  const withdrawHandler = async () => {
    console.log(amount);
    const paramsResult = await window.sat20.getParamForInvokeContract('amm.tc', 'withdraw');
    console.log('paramsResult',paramsResult);
    const params = {action: "withdraw", param: JSON.stringify({orderType: 7, assetName: assetInfo.assetName, amt: amount})};
    const serviceFee = 10;
    const result = await window.sat20.invokeContractV2_SatsNet(
      contractUrl,
      JSON.stringify(params),
      assetInfo.assetName,
      amount,
      serviceFee.toString(),
    );
    const { txId } = result;
    if (txId) {
      toast.success(`Withdraw successful, txid: ${txId}`);
      await sleep(1000);
      // getBalance();
    } else {
      toast.error("Withdraw failed");
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
            <span className="py-2 uppercase">提取金额</span>
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
              placeholder="请输入提取金额"
              min={1}
            />
          </div>
        </div>
        <Button type="button" className="w-full my-4 text-sm font-semibold transition-all duration-200 btn-gradient" onClick={withdrawHandler}>提取</Button>
      </div>
    </div>
  );
};

export default WithDraw; 