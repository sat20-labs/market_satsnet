'use client';

import React, { useState, useMemo, useEffect } from "react";
import { useCommonStore, useWalletStore } from "@/store";
import { WalletConnectBus } from "@/components/wallet/WalletConnectBus";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { useQuery } from "@tanstack/react-query";
import { sleep } from "radash";
import { toast } from "sonner";

interface SellProps {
  contractUrl: string;
  assetInfo: { assetLogo: string; assetName: string; AssetId: string; floorPrice: number };
  onSellSuccess?: () => void;
  tickerInfo?: any;
  assetBalance: { availableAmt: number; lockedAmt: number };
  balanceLoading: boolean;
}

const Sell = ({ contractUrl, assetInfo, onSellSuccess, tickerInfo = {}, assetBalance, balanceLoading }: SellProps) => {

  const { t } = useTranslation();
  const [amount, setAmount] = useState<string>(""); // sats
  const [slippage, setSlippage] = useState<string>("0"); // 滑点百分比，默认0%
  const [isSelling, setIsSelling] = useState<boolean>(false);
  const { satsnetHeight } = useCommonStore();
  const displayBalance = assetBalance.availableAmt + assetBalance.lockedAmt;


  console.log('contractUrl', contractUrl);
  const { data: ammData } = useQuery({
    queryKey: ["ammData", contractUrl],
    queryFn: async () => {
      if (!contractUrl) return null;
      const result = await window.sat20.getDeployedContractStatus(contractUrl);
      return result?.contractStatus ? JSON.parse(result?.contractStatus) : null;
    },
    enabled: !!contractUrl,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });
  const contractK = useMemo(() => {
    return ammData?.Contract?.k || 0;
  }, [ammData]);
  const assetAmtRaw = useMemo(() => {
    return ammData?.AssetAmtInPool || { Precision: 0, Value: 0 };
  }, [ammData]);
  const assetAmt = useMemo(() => {
    return assetAmtRaw.Value / Math.pow(10, assetAmtRaw.Precision);
  }, [assetAmtRaw]);
  const satValue = useMemo(() => {
    return ammData?.SatsValueInPool || 0;
  }, [ammData]);
  console.log('ammData', ammData);
  // 获取当前卖出价格（取买一价）
  const currentPrice = useMemo(() => {
    if (!satValue || !assetAmt) return 0;
    return Number((satValue / assetAmt).toFixed(10));
  }, [satValue, assetAmt]);

  // AMM swap公式计算本次卖出能收到的聪数量
  const receiveSats = useMemo(() => {
    const amtNum = Number(amount);
    if (!satValue || !assetAmt || !amtNum || !contractK) return 0;
    const newAssetAmt = assetAmt + amtNum;
    const newSatValue = contractK / newAssetAmt;
    const satsOut = satValue - newSatValue;
    return satsOut > 0 ? satsOut : 0;
  }, [satValue, assetAmt, amount, contractK]);

  // 滑点保护下的最小可接受聪数量
  const minReceiveSats = useMemo(() => {
    const slip = Number(slippage);
    return Math.floor(receiveSats * (1 - slip / 100));
  }, [receiveSats, slippage]);
  const isSellValid = useMemo(() => {
    const numAmount = Number(amount);
    return numAmount > 0 && numAmount <= assetBalance.availableAmt && !balanceLoading;
  }, [amount, assetBalance.availableAmt, balanceLoading]);
  
  console.log('isSellValid', isSellValid);
  console.log('isSellValid', amount);
  console.log('isSellValid', assetBalance);
  console.log('isSellValid', balanceLoading);
  const handleQuickAmount = (value: string) => {
    setAmount(value);
  };
  const handleQuickSlippage = (value: string) => {
    setSlippage(value);
  };

  const handleSell = async () => {
    if (satsnetHeight < ammData?.enableBlock) {
      toast.error('Please wait for the contract to be enabled');
      return;
    }
    // 具体错误提示
    const numAmount = Number(amount);
    if (!amount) {
      toast.error("Please enter an amount");
      return;
    }
    if (isNaN(numAmount)) {
      toast.error("Amount must be a number");
      return;
    }
    if (numAmount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    if (numAmount > assetBalance.availableAmt) {
      toast.error("Amount exceeds available balance");
      return;
    }
    if (balanceLoading) {
      toast.error("Balance is loading, please wait");
      return;
    }
    setIsSelling(true);
    try {
      // 构造合约参数
      const paramObj: any = {
        orderType: 1, // sell
        assetName: assetInfo.assetName,
        amt: '0',
      };
      if (Number(slippage) > 0) {
        paramObj.amt = minReceiveSats.toString();
      }
      const params = {
        action: "swap",
        param: JSON.stringify(paramObj),
      };
      // 发送交易
      const result = await window.sat20.invokeContractV2_SatsNet(
        contractUrl,
        JSON.stringify(params),
        assetInfo.assetName,
        amount.toString(),
        "1",
        {
          action: "swap",
          orderType: 1,
          assetName: assetInfo.assetName,
          amt: minReceiveSats.toString(),
          unitPrice: currentPrice.toString(),
          quantity: amount,
          slippage: slippage,
        }
      );
      const { txId } = result;
      if (txId) {
        toast.success(`Swap成功，txid: ${txId}`);
        setAmount("");
        setSlippage("0");
        await sleep(1000);
        onSellSuccess?.();
      } else {
        toast.error("Swap失败");
      }
    } catch (error) {
      toast.error("Swap失败");
    }
    setIsSelling(false);
  };

  const isLoading = balanceLoading || isSelling;

  return (
    <div className="p-4 bg-zinc-900 text-zinc-200 rounded-xl shadow-lg border border-zinc-700">
      {/* 池子信息 */}
      <div className="flex items-center justify-between mb-2 text-sm text-gray-400">
        <span>池子资产数量: <span className="text-white">{assetAmt}</span> {tickerInfo?.displayname}</span>
        <span>池子聪数量: <span className="text-white">{satValue}</span> sats</span>
      </div>
      {/* 输入框 */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-400">
          {t('common.swap_sell_balance')} <span className="ml-2"> {displayBalance.toLocaleString()}</span>
          <span> {tickerInfo?.displayname}</span></div>
      </div>
      <div className="relative mb-4">
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-transparent border border-zinc-600 rounded-lg px-4 py-2 text-lg text-white"
          placeholder="输入卖出数量"
          min={1}
        />
        <div className="absolute right-4 top-2/4 transform -translate-y-2/4 flex items-center gap-2">
          <span className="text-sm text-gray-400">{tickerInfo?.displayname}</span>
        </div>
      </div>
      {/* 快捷金额按钮 */}
      <div className="flex gap-2 mb-4">
        {[0.25, 0.5, 0.75, 1].map((percent) => {
          const value = Math.floor(assetBalance.availableAmt * percent).toString();
          return (
            <button
              key={percent}
              onClick={() => handleQuickAmount(value)}
              className={`px-4 py-2 rounded bg-zinc-800 text-sm ${amount === value ? 'bg-blue-500 text-white' : 'text-gray-400'}`}
            >
              {Math.round(percent * 100)}%
            </button>
          );
        })}
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
        <span>最少获得: <span className="text-white">{minReceiveSats || '--'}</span> sats</span>
      </div>
      <WalletConnectBus asChild>
        <Button
          type="button"
          onClick={handleSell}
          className={`w-full mt-4 text-sm font-semibold transition-all duration-200 ${isLoading ? "bg-gray-600 hover:bg-gray-600 cursor-not-allowed opacity-60" : "btn-gradient"}`}
          disabled={isLoading}
          size="lg"
        >
          {isSelling ? t('common.swap_sell_processing') : t('common.swap_sell_sellButton', { ticker: tickerInfo?.displayname })}
        </Button>
      </WalletConnectBus>
    </div>
  );
};

export default Sell;