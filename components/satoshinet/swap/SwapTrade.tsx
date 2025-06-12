'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectItem,SelectTrigger, SelectContent, SelectValue  } from '@/components/ui/select';
import BuySellToggle from "@/components/satoshinet/orderbook/BuySellToggle";
import Buy from './Buy';
import Sell from './Sell'; // Adjusted path to locate Sell
import LiquidityProviders from './LiquidityProviders'; // Import the new component

interface SwapProps {
  assetInfo: { assetLogo: string; assetName: string; AssetId: string; floorPrice: number };
  tickerInfo?: any;
  assetBalance: { availableAmt: number; lockedAmt: number };
  balanceLoading: boolean;
  onSellSuccess?: () => void;
}

const Trade = ({ assetInfo, tickerInfo, assetBalance, balanceLoading, onSellSuccess }: SwapProps) => {
  const [protocol, setProtocol] = useState<'ORDX' | 'Runes' | ''>('');
  const [asset, setAsset] = useState<string>('');
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');

  const handleProtocolChange = (value: 'ORDX' | 'Runes') => {
    setProtocol(value);
    setAsset(''); // 重置资产选择
  };

  const handleAssetChange = (value: string) => {
    setAsset(value);
  };

  const handleSwap = () => {
    if (!protocol || !asset) {
      alert('Please select a protocol and an asset to proceed.');
      return;
    }
    alert(`Swapping asset ${asset} using protocol ${protocol}`);
  };

  return (  
    <div>
      <BuySellToggle mode={mode} onChange={setMode} />
      {/* Conditionally render BuyOrder or SellOrder */}
      {mode === "buy" ? (
        <Buy
          assetInfo={assetInfo}
          tickerInfo={tickerInfo}
          assetBalance={assetBalance}
          balanceLoading={balanceLoading}
        />
      ) : (
        <Sell
          assetInfo={assetInfo}
          tickerInfo={tickerInfo}
          assetBalance={assetBalance}
          balanceLoading={balanceLoading}
          onSellSuccess={onSellSuccess}
        />
      )}
      {/* Add Liquidity Providers List */}
      {/* <LiquidityProviders /> */}
    </div>
  );
};

export default Trade;