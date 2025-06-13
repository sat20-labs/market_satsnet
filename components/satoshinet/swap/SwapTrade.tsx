'use client';

import { useState } from 'react';
import BuySellToggle from "@/components/satoshinet/orderbook/BuySellToggle";
import Buy from './Buy';
import Sell from './Sell'; // Adjusted path to locate Sell
import LiquidityProviders from './LiquidityProviders'; // Import the new component
import { useQuery } from '@tanstack/react-query';

interface SwapProps {
  assetInfo: { assetLogo: string; assetName: string; AssetId: string; floorPrice: number };
  tickerInfo?: any;
  assetBalance: { availableAmt: number; lockedAmt: number };
  balanceLoading: boolean;
  onSellSuccess?: () => void;
}
const getAmmContractUrl = async (assetName: string) => {
  const result = await window.sat20.getDeployedContractsInServer();
  const { contractURLs = [] } = result;
  const list = contractURLs.filter(c => c.indexOf(`${assetName}_amm.tc`) > -1);
  return list[0];
}

const Trade = ({ assetInfo, tickerInfo, assetBalance, balanceLoading, onSellSuccess }: SwapProps) => {
  const [protocol, setProtocol] = useState<'ORDX' | 'Runes' | ''>('');
  const [asset, setAsset] = useState<string>('');
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');

  const {
    data: ammContractUrl,
  } = useQuery({
    queryKey: ["ammContractUrl", tickerInfo.displayname],
    queryFn: () => getAmmContractUrl(tickerInfo.displayname),
    staleTime: 10 * 1000,
    refetchInterval: 10000,
  });

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
          contractUrl={ammContractUrl}
          assetInfo={assetInfo}
          tickerInfo={tickerInfo}
          assetBalance={assetBalance}
          balanceLoading={balanceLoading}
        />
      ) : (
        <Sell
          contractUrl={ammContractUrl}
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