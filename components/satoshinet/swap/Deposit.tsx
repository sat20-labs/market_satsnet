import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

interface DepositProps {
  contractUrl: string;
  assetInfo: { assetLogo: string; assetName: string; AssetId: string; floorPrice: number };
  tickerInfo?: any;
  hideAssetInfo?: boolean;
}

const Deposit: React.FC<DepositProps> = ({ contractUrl, assetInfo, tickerInfo }) => {
  const [amount, setAmount] = useState('');
  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="mb-2 mx-4 py-2 rounded-lg relative">
          <div className="flex justify-between items-center text-xs text-zinc-500 mb-1 mx-2">
            <span className="py-2 uppercase">充值金额</span>
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
        <Button type="button" className="w-full my-4 text-sm font-semibold transition-all duration-200 btn-gradient">充值</Button>
      </div>
    </div>
  );
};

export default Deposit; 