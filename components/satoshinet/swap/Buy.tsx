'use client';

import React, { useState, useMemo, useEffect } from "react";
import { useCommonStore, useWalletStore } from "@/store";
import { WalletConnectBus } from "@/components/wallet/WalletConnectBus";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@iconify/react';
import { BtcPrice } from "../../BtcPrice";
import { useTranslation } from 'react-i18next';
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface BuyProps {
  contractUrl: string;
  assetInfo: { assetLogo: string; assetName: string; AssetId: string; floorPrice: number };
  onSellSuccess?: () => void;
  tickerInfo?: any;
  assetBalance: { availableAmt: number; lockedAmt: number };
  balanceLoading: boolean;
}

const Buy = ({ contractUrl, assetInfo, onSellSuccess, tickerInfo = {}, assetBalance, balanceLoading }: BuyProps) => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState<string>(""); // sats
  const [slippage, setSlippage] = useState<string>("0"); // 滑点百分比，默认0%
  const [isBuying, setIsBuying] = useState(false);
  const { getBalance, balance } = useWalletStore();
  const { satsnetHeight } = useCommonStore();
  const displayBalance = Number(balance.availableAmt) + Number(balance.lockedAmt);


  // 获取池子状态（价格）
  const { data: swapData } = useQuery({
    queryKey: ["swapData", contractUrl],
    queryFn: async () => {
      if (!contractUrl) return null;
      const result = await window.sat20.getDeployedContractStatus(contractUrl);
      return result?.contractStatus ? JSON.parse(result?.contractStatus) : null;
    },
    enabled: !!contractUrl,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });

  console.log('swapData', swapData);
  const contractK = useMemo(() => {
    return swapData?.Contract?.k || 0;
  }, [swapData]);
  const assetAmtRaw = useMemo(() => {
    return swapData?.AssetAmtInPool || { Precision: 0, Value: 0 };
  }, [swapData]);
  const assetAmt = useMemo(() => {
    return assetAmtRaw.Value / Math.pow(10, assetAmtRaw.Precision);
  }, [assetAmtRaw]);
  const satValue = useMemo(() => {
    return swapData?.SatsValueInPool || 0;
  }, [swapData]);
  const currentPrice = useMemo(() => {
    if (!satValue || !assetAmt) return 0;
    return Number((satValue / assetAmt).toFixed(10));
  }, [satValue, assetAmt]);

  // AMM swap公式计算本次买入能获得的资产数量
  const receiveAsset = useMemo(() => {
    const amtNum = Number(amount);
    if (!satValue || !assetAmt || !amtNum || !contractK) return 0;
    const newSatValue = satValue + amtNum;
    const newAssetAmt = contractK / newSatValue;
    const assetOut = assetAmt - newAssetAmt;
    return assetOut > 0 ? assetOut : 0;
  }, [satValue, assetAmt, amount, contractK]);

  // 滑点保护下的最小可接受资产数量
  const minReceiveAsset = useMemo(() => {
    const slip = Number(slippage);
    return Math.floor(receiveAsset * (1 - slip / 100));
  }, [receiveAsset, slippage]);

  const isBuyValid = useMemo(() => {
    return amount !== "" && Number(amount) > 0 && Number(amount) <= balance.availableAmt && !balanceLoading;
  }, [amount, balance.availableAmt, balanceLoading]);

  const handleQuickAmount = (value: string) => {
    setAmount(value);
  };
  const handleQuickSlippage = (value: string) => {
    setSlippage(value);
  };

  const amtNum = Number(amount);
  const serviceFee = Math.max(10, Math.ceil(amtNum * 0.008));

  const handleBuy = async () => {
    if (satsnetHeight < swapData?.enableBlock) {
      toast.error('Please wait for the contract to be enabled');
      return;
    }
    if (!isBuyValid) {
      toast.error(t("common.swap_enterValidAmount"));
      return;
    }
    setIsBuying(true);
    try {
      // 构造合约参数
      const paramObj: any = {
        orderType: 2, // buy
        assetName: assetInfo.assetName,
        amt: 0,
      };
      if (Number(slippage) > 0) {
        paramObj.amt = minReceiveAsset.toString(); // 只有滑点>0时才传amt
      }
      const params = {
        action: "swap",
        param: JSON.stringify(paramObj),
      };
      // 发送交易
      const result = await window.sat20.invokeContractV2_SatsNet(
        contractUrl,
        JSON.stringify(params),
        "::", // 买入资产用::
        amount,
        "1",
        {
          action: "swap",
          orderType: 2,
          assetName: assetInfo.assetName,
          amt: minReceiveAsset.toString(),
          unitPrice: currentPrice.toString(),
          quantity: amount,
          slippage: slippage,
          serviceFee: serviceFee,
        }
      );
      const { txId } = result;
      if (txId) {
        toast.success(`Swap成功，txid: ${txId}`);
        setAmount("");
        setSlippage("0");
        if (onSellSuccess) onSellSuccess();
      } else {
        toast.error("Swap失败");
      }
    } catch (error) {
      toast.error("Swap失败");
    }
    setIsBuying(false);
  };

  const isLoading = balanceLoading || isBuying;

  return (
    <div className="p-4 bg-zinc-900 text-zinc-200 rounded-xl shadow-lg border border-zinc-700">
      {/* 输入框 */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-400">{t('common.swap_balance')} : {displayBalance.toLocaleString()} sats</div>
      </div>
      <div className="relative mb-4">
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-transparent border border-zinc-600 rounded-lg px-4 py-2 text-lg text-white"
          placeholder="输入买入数量 (sats)"
          min={1}
        />
        <div className="absolute right-4 top-2/4 transform -translate-y-2/4 flex items-center gap-2">
          <span className="text-sm text-gray-400">sats</span>
        </div>
      </div>
      {/* 快捷金额按钮 */}
      <div className="flex gap-2 mb-4">
        {["1000", "5000", "10000", "50000"].map((value) => (
          <button
            key={value}
            onClick={() => handleQuickAmount(value)}
            className={`px-4 py-2 rounded bg-zinc-800 text-sm ${amount === value ? 'bg-blue-500 text-white' : 'text-gray-400'}`}
          >
            {value}
          </button>
        ))}
      </div>
      {/* 滑点输入 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-gray-400">滑点保护</span>
        <Input
          type="number"
          value={slippage}
          onChange={(e) => setSlippage(e.target.value)}
          className="w-20 bg-transparent border border-zinc-600 rounded-lg px-2 py-1 text-sm text-white"
          min={0.1}
          step={0.1}
        />
        <span className="text-sm text-gray-400">%</span>
        {["0.5", "1", "2"].map((value) => (
          <button
            key={value}
            onClick={() => handleQuickSlippage(value)}
            className={`px-2 py-1 rounded bg-zinc-800 text-xs ${slippage === value ? 'bg-blue-500 text-white' : 'text-gray-400'}`}
          >
            {value}%
          </button>
        ))}
      </div>
      {/* 预估最小可接受成交量 */}
      <div className="flex justify-between mb-2 text-sm text-gray-400">
        <span>当前价格: <span className="text-white">{currentPrice || '--'}</span> sats/{tickerInfo?.displayname}</span>
        <span>最少买到: <span className="text-white">{minReceiveAsset || '--'}</span> {tickerInfo?.displayname}</span>
      </div>
      <div className="flex justify-end mb-2 text-sm text-gray-400">
        <span>服务费: <span className="text-white">{serviceFee || '--'}</span> sats</span>
      </div>
      <WalletConnectBus asChild>
        <Button
          type="button"
          onClick={handleBuy}
          className={`w-full mt-4 text-sm font-semibold transition-all duration-200 ${!isBuyValid || isLoading ? "bg-gray-600 hover:bg-gray-600 cursor-not-allowed opacity-60" : "btn-gradient"}`}
          disabled={(!isBuyValid || isLoading)}
          size="lg"
        >
          {isBuying ? t('common.swap_buyingAsset') : t('common.swap_confirmBuy', { ticker: tickerInfo?.displayname })}
        </Button>
      </WalletConnectBus>
    </div>
  );
};

export default Buy;