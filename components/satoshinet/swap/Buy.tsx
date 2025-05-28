'use client';

import React, { useState, useMemo, useEffect } from "react";
import { useCommonStore, useWalletStore } from "@/store";
import { WalletConnectBus } from "@/components/wallet/WalletConnectBus";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@iconify/react';
import { BtcPrice } from "../../BtcPrice";

interface BuyProps {
    assetInfo: { assetLogo: string; assetName: string; AssetId: string; floorPrice: number };
    onSellSuccess?: () => void;
    tickerInfo?: any;
    assetBalance: { availableAmt: number; lockedAmt: number };
    balanceLoading: boolean;
  }

const Buy =({ assetInfo, onSellSuccess, tickerInfo = {}, assetBalance, balanceLoading }: BuyProps) => {
  const [amount, setAmount] = useState<string>('0.003');
  const [tokensReceived, setTokensReceived] = useState<number>(858.9);
  const [priceImpact, setPriceImpact] = useState<number>(0.16);
  const { getBalance, balance } = useWalletStore();
  const displayBalance = Number(balance.availableAmt) + Number(balance.lockedAmt);

  const isBuyValid = useMemo(() =>
      amount !== "" &&
      tokensReceived > 0 &&
      Number(amount) > 0 &&
      tokensReceived <= balance.availableAmt &&
      !balanceLoading,
      [amount, tokensReceived, balance.availableAmt, balanceLoading]);
      
  const handleQuickAmount = (value: string) => {
    setAmount(value);
    // 模拟计算 Tokens Received 和 Price Impact
    const simulatedTokens = parseFloat(value) * 286300; // 假设汇率
    const simulatedImpact = parseFloat(value) * 0.05; // 假设价格影响
    setTokensReceived(simulatedTokens);
    setPriceImpact(simulatedImpact);
  };

  const handleBuy = async () => {
    // 这里可以添加购买逻辑
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount to buy.');
      return;
    }
  }

  const [isBuying, setIsBuying] = useState(false);
  const isLoading = balanceLoading || isBuying;

  return (
    <div className="p-4 bg-[#0E0E10] text-zinc-200 rounded-xl shadow-lg border border-zinc-700">
      {/* 输入框 */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-400">Your Balance: {displayBalance.toLocaleString()} sats</div>
        <div className="text-sm text-gray-400">~$<BtcPrice btc={displayBalance/1e8} /></div>
      </div>
      <div className="relative mb-4">
        <Input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-transparent border border-zinc-600 rounded-lg px-4 py-2 text-lg text-white"
        />
        <div className="absolute right-4 top-2/4 transform -translate-y-2/4 flex items-center gap-2">
          <span className="text-sm text-gray-400">BTC</span>
           <Icon icon="cryptocurrency:btc" className="text-sm custom-btc-small-icon" />
        </div>
      </div>

      {/* 快捷金额按钮 */}
      <div className="flex gap-2 mb-4">
        {['0.0001', '0.0005', '0.0015', '0.003'].map((value) => (
          <button
            key={value}
            onClick={() => handleQuickAmount(value)}
            className={`px-4 py-2 rounded bg-zinc-800 text-sm ${
              amount === value ? 'bg-blue-500 text-white' : 'text-gray-400'
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      {/* Tokens Received 和 Price Impact */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex justify-between">
          <span className="text-sm text-gray-400">Tokens Received</span>
          <span className="text-sm text-white">~ {tokensReceived.toFixed(1)} {tickerInfo?.displayname}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-400">Price Impact</span>
          <span className="text-sm text-white">{priceImpact.toFixed(2)}%</span>
        </div>
      </div>

      <WalletConnectBus asChild>
              <Button
                type="button"
                onClick={handleBuy}
                className={`w-full mt-4 text-sm font-semibold transition-all duration-200 ${!isBuyValid || isLoading
                  ? "bg-gray-600 hover:bg-gray-600 cursor-not-allowed opacity-60"
                  : "btn-gradient"
                  }`}
                disabled={(!isBuyValid || isLoading)}
                size="lg"
              >
                {isBuying ? "Processing..." : `Buy ${tickerInfo?.displayname}`}
              </Button>
            </WalletConnectBus>
    </div>
  );
};

export default Buy;