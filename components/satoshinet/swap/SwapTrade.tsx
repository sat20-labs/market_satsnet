'use client';

import { useState } from 'react';
import BuySellToggle from "@/components/satoshinet/orderbook/BuySellToggle";
import Buy from './Buy';
import Sell from './Sell';
import LiquidityProviders from './LiquidityProviders';
import { useQuery } from '@tanstack/react-query';
import SwapMyOrdersPanel from "@/components/satoshinet/swap/SwapMyOrdersPanel";
import Swap from './Swap';

interface SwapProps {
  assetInfo: { assetLogo: string; assetName: string; AssetId: string; floorPrice: number };
  tickerInfo?: any;
  onSellSuccess?: () => void;
}
const getAmmContractUrl = async (assetName: string) => {
  const result = await window.sat20.getDeployedContractsInServer();
  const { contractURLs = [] } = result;
  const list = contractURLs.filter(c => c.indexOf(`${assetName}_amm.tc`) > -1);
  return list[0];
}

const Trade = ({ assetInfo, tickerInfo, onSellSuccess }: SwapProps) => {
  const [protocol, setProtocol] = useState<'ORDX' | 'Runes' | ''>('');
  const [asset, setAsset] = useState<string>('');
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');

  const {
    data: ammContractUrl,
    isLoading: isContractUrlLoading,
  } = useQuery({
    queryKey: ["ammContractUrl", tickerInfo.displayname],
    queryFn: () => getAmmContractUrl(tickerInfo.displayname),
    staleTime: 10 * 1000,
    refetchInterval: 10000,
  });

 // 处理 loading 和未找到合约的 UI
 if (isContractUrlLoading) {
  return <div className="w-full mt-4 text-center text-gray-400">加载中...</div>;
}
if (!ammContractUrl) {
  return (
    <div className="w-full mt-4">
      <div className="mb-4 p-4 bg-red-100 text-red-700 border border-red-300 rounded">
        未找到合约，请联系管理员添加
      </div>
    </div>
  );
}

  return (
    <div>
      <Swap
        contractUrl={ammContractUrl}
        assetInfo={assetInfo}
        tickerInfo={tickerInfo}
        onSellSuccess={onSellSuccess}
      />
      {/* 我的订单单独展示 */}
      {ammContractUrl && (
        <div className="mt-8">
          <SwapMyOrdersPanel contractURL={ammContractUrl} />
        </div>
      )}
      {/* Add Liquidity Providers List */}
      {/* <LiquidityProviders /> */}
    </div>
  );
};

export default Trade;