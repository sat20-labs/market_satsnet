'use client';

import React, { useState, useMemo, useEffect } from "react";
import { useCommonStore, useWalletStore } from "@/store";
import { WalletConnectBus } from "@/components/wallet/WalletConnectBus";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BtcPrice } from "../../BtcPrice";
import { useTranslation } from 'react-i18next';

interface SellProps {
    assetInfo: { assetLogo: string; assetName: string; AssetId: string; floorPrice: number };
    onSellSuccess?: () => void;
    tickerInfo?: any;
    assetBalance: { availableAmt: number; lockedAmt: number };
    balanceLoading: boolean;
  }

const Sell =  ({ assetInfo, onSellSuccess, tickerInfo = {}, assetBalance, balanceLoading }: SellProps) => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState<string>('0.0');
  const [btcReceived, setBtcReceived] = useState<string>('-');
  const [priceImpact, setPriceImpact] = useState<string>('-');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSelling, setIsSelling] = useState<boolean>(false);

  const { getBalance, balance } = useWalletStore();
  const displayBalance = assetBalance.availableAmt + assetBalance.lockedAmt;
  
  const [quantity, setQuantity] = useState<number | "">("");
  const [price, setPrice] = useState<number>(5); // Default price set to 5 sats
    
  useEffect(() => {
    // Simulate fetching price from an API
    const fetchPrice = async () => {
      try {
        const response = await fetch('/api/getPrice'); // Replace with actual API endpoint
        const data = await response.json();
        setPrice(data.price || 5); // Update price or fallback to default 5 sats
      } catch (error) {
        console.error('Failed to fetch price:', error);
      }
    };

    fetchPrice();
  }, []);

  const totalQuantity = useMemo(() => {
    return quantity ? Number(quantity) * price : 0;
  }, [quantity, price]);

  const batchQuantityMax = useMemo(() => {
    return quantity ? Math.floor(assetBalance.availableAmt / Number(quantity)) : 0;
  }, [assetBalance.availableAmt, quantity]);

  const calculatedBTC = useMemo(() => {
    const numAmount = parseFloat(amount); // Use the user's input amount
    const numPrice = Number(price);
    if (numAmount > 0 && numPrice > 0) {
      return Math.round(numAmount * numPrice).toLocaleString(); // Round to nearest integer and format
    }
    return '0'; // Return 0 sats if calculation is invalid
  }, [amount, price]);

  const isSellValid = useMemo(() => {
    const numAmount = parseFloat(amount);
    return numAmount > 0 && numAmount <= assetBalance.availableAmt; // Ensure valid amount
  }, [amount, assetBalance.availableAmt]);

  const handleQuickAmount = (percentage: number) => {
    const totalBalance = assetBalance.availableAmt; // Use actual available balance
    const calculatedAmount = ((totalBalance * percentage) / 100).toFixed(2);
    setAmount(calculatedAmount);

    // Simulate BTC Received and Price Impact
    const simulatedBtc = (parseFloat(calculatedAmount) * 0.00001).toFixed(6); // Adjust rate as needed
    const simulatedImpact = (percentage * 0.01).toFixed(2); // Adjust impact calculation
    setBtcReceived(simulatedBtc);
    setPriceImpact(simulatedImpact);
  };

  const handleSell = async () => {
    if (!isSellValid) return;

    setIsLoading(true);
    setIsSelling(true);

    try {
      // Simulate sell process
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Replace with actual API call
      alert(t('common.swap_sell_success', { amount, ticker: tickerInfo?.displayname }));
      if (onSellSuccess) onSellSuccess();
    } catch (error) {
      console.error("Sell failed:", error);
      alert(t('common.swap_sell_failed'));
    } finally {
      setIsLoading(false);
      setIsSelling(false);
    }
  };

  const handleConnect = () => {
    alert('Connect wallet functionality goes here.');
  };

  return (
    <div className="p-4 bg-[#0E0E10] text-zinc-200 rounded-xl shadow-lg border border-zinc-700">
      {/* 输入框 */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-400">
            {t('common.swap_sell_balance')} <span className="ml-2"> {displayBalance.toLocaleString()}</span>
            <span> ${tickerInfo?.displayname}</span></div>
        {/* <div className="text-sm text-gray-400">~$0.00</div> */}
      </div>
      <div className="relative mb-4">
        <Input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-transparent border border-zinc-600 rounded-lg px-4 py-2 text-lg text-white"
          placeholder={t('common.swap_sell_enterAmount')}
        />
        <div className="absolute right-4 top-2/4 transform -translate-y-2/4 flex items-center gap-2">
          <span className="text-sm text-gray-400">${tickerInfo?.displayname}</span>
        </div>
      </div>

      {/* 快捷百分比按钮 */}
      <div className="flex gap-2 mb-4">
        {[25, 50, 75, 100].map((percentage) => (
          <button
            key={percentage}
            onClick={() => handleQuickAmount(percentage)}
            className={`px-4 py-2 rounded bg-zinc-800 text-sm ${
              parseFloat(amount) === (100 * percentage) / 100
                ? 'bg-blue-500 text-white'
                : 'text-gray-400'
            }`}
          >
            {percentage}%
          </button>
        ))}
      </div>

      {/* BTC Received 和 Price Impact */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex justify-between">
          <span className="text-sm text-gray-400">{t('common.swap_sell_btcReceived')}</span>
          <span className="text-sm text-white"><span className="font-semibold text-zinc-200">{calculatedBTC} {t('common.sats')}</span></span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-400">{t('common.swap_sell_priceImpact')}</span>
          <span className="text-sm text-white">{priceImpact}%</span>
        </div>
      </div>

      {/* Connect 按钮 */}
      <WalletConnectBus asChild>
        <Button
          type="button"
          onClick={handleSell}
          className={`w-full mt-4 text-sm font-semibold transition-all duration-200 ${!isSellValid || isLoading
            ? "bg-gray-600 hover:bg-gray-600 cursor-not-allowed opacity-60"
            : "btn-gradient"
            }`}
          disabled={(!isSellValid || isLoading)}
          size="lg"
        >
          {isSelling ? t('common.swap_sell_processing') : t('common.swap_sell_sellButton', { ticker: tickerInfo?.displayname })}
        </Button>
      </WalletConnectBus>
    </div>
  );
};

export default Sell;