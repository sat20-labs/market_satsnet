import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import DepthPanel from "./DepthPanel";
import MyOrdersPanel from "./MyOrdersPanel";
import TradeHistoryPanel from "./TradeHistoryPanel";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import { useTranslation } from 'react-i18next';

const getSwapContractUrl = async (assetName: string) => {
  const result = await window.sat20.getDeployedContractsInServer();
  const { contractURLs = [] } = result;
  const list = contractURLs.filter(c => c.indexOf(`${assetName}_swap.tc`) > -1);
  console.log('list', list);
  return list[0];
}


interface OrderBookProps {
  tickerInfo: any;
  assetInfo: { assetLogo: string; assetName: string; AssetId: string; floorPrice: number };
  assetBalance: { availableAmt: number; lockedAmt: number };
  balanceLoading: boolean;
  onSellSuccess?: () => void;
}

export default function OrderBook({
  tickerInfo,
  assetInfo,
  assetBalance,
  balanceLoading,
  onSellSuccess
}: OrderBookProps) {
  const { t } = useTranslation();

  const {
    data: swapContractUrl,
    isLoading: isContractUrlLoading,
  } = useQuery({
    queryKey: ["swapContractUrl", tickerInfo.displayname],
    queryFn: () => getSwapContractUrl(tickerInfo.displayname),
    staleTime: 10 * 1000,
    refetchInterval: 10000,
  });



  // 处理 loading 和未找到合约的 UI
  if (isContractUrlLoading) {
    return <div className="w-full mt-4 text-center text-gray-400">加载中...</div>;
  }
  if (!swapContractUrl) {
    return (
      <div className="w-full mt-4">
        <div className="mb-4 p-4 bg-red-100 text-red-700 border border-red-300 rounded">
          未找到合约，请联系管理员添加
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="depth" className="w-full mt-4">
      <TabsList className="mb-2">
        <TabsTrigger value="depth">{t('common.limitorder_depth')}</TabsTrigger>
        <TabsTrigger value="myOrders">{t('common.limitorder_myorders')}</TabsTrigger> {/* Update label for My Orders */}
        <TabsTrigger value="trades">{t('common.limitorder_history')}</TabsTrigger> {/* Update label for History */}
      </TabsList>

      <TabsContent value="depth">
        <DepthPanel
          contractURL={swapContractUrl}
          assetInfo={assetInfo}
          tickerInfo={tickerInfo}
          assetBalance={assetBalance}
          balanceLoading={balanceLoading}
          onOrderSuccess={onSellSuccess}
        />
      </TabsContent>

      <TabsContent value="myOrders">
        <MyOrdersPanel contractURL={swapContractUrl} tickerInfo={tickerInfo} assetInfo={assetInfo} />
      </TabsContent>

      <TabsContent value="trades">
        <TradeHistoryPanel contractURL={swapContractUrl} />
      </TabsContent>
    </Tabs>
  );
}
