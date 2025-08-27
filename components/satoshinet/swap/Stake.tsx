import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { ButtonRefresh } from '@/components/buttons/ButtonRefresh';
import { useCommonStore } from '@/store';

interface StakeProps {
  asset: string;
  ticker: string;
  contractUrl: string;
  refresh: () => void;
  isRefreshing: boolean;
  tickerInfo?: any;
  swapData?: any;
  assetBalance: {
    availableAmt: number;
    lockedAmt: number;
  };
  satsBalance: {
    availableAmt: number;
    lockedAmt: number;
  };
}

interface StakeParams {
  amount: string;
  asset: string;
  contractUrl: string;
  value: string;
}

const Stake: React.FC<StakeProps> = ({ contractUrl, asset, ticker, refresh, isRefreshing, tickerInfo, swapData, assetBalance, satsBalance }) => {
  const { t } = useTranslation();
  const { btcFeeRate } = useCommonStore();
  const [amount, setAmount] = useState('');
  const [value, setValue] = useState('');
  const { address } = useReactWalletStore();
  const divisibility = tickerInfo?.divisibility || 0;

  const stakeMutation = useMutation({
    mutationFn: async ({ amount, asset, contractUrl, value }: StakeParams) => {
      const params = {
        action: "stake",
        param: JSON.stringify({
          orderType: 9,
          assetName: asset,
          amt: amount,
          value: parseInt(value)
        })
      };
      
      window.sat20.invokeContractV2_SatsNet(
        contractUrl,
        JSON.stringify(params),
        asset,
        amount,
        btcFeeRate.value.toString(),
        {
          action: "stake",
          orderType: 9,
          assetName: asset,
          amt: amount,
          value: parseInt(value),
          quantity: amount,
        }
      );

      return {success: true};
    },
    onSuccess: async (data) => {
      toast.success(`Stake successful`);
      setAmount("");
      refresh();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Stake failed");
    }
  });

  const displayAssetBalance = assetBalance?.availableAmt ?? 0;

  // 获取池子中的资产数量和聪数量
  const assetAmtInPool = useMemo(() => {
    if (!swapData?.AssetAmtInPool) return 0;
    return swapData.AssetAmtInPool.Value / Math.pow(10, swapData.AssetAmtInPool.Precision);
  }, [swapData?.AssetAmtInPool]);
  const satValueInPool = useMemo(() => swapData?.SatsValueInPool || 0, [swapData?.SatsValueInPool]);

  // 根据amt计算对应的value（按照池子中资产和聪的比例）
  const calculateValueFromAmount = (amt: number) => {
    if (!assetAmtInPool || !satValueInPool) return 0;
    // 按照池子中资产和聪的比例计算
    const ratio = amt / assetAmtInPool;
    return Math.ceil(ratio * satValueInPool);
  };

  // 根据value计算对应的amt
  const calculateAmountFromValue = (val: number) => {
    if (!assetAmtInPool || !satValueInPool) return 0;
    // 按照池子中资产和聪的比例计算
    const ratio = val / satValueInPool;
    return ratio * assetAmtInPool;
  };

  // 计算当前输入的value
  const calculatedValue = useMemo(() => {
    if (!amount) return 0;
    return calculateValueFromAmount(Number(amount));
  }, [amount, assetAmtInPool, satValueInPool]);

  // 计算当前输入的amount
  const calculatedAmount = useMemo(() => {
    if (!value) return 0;
    return calculateAmountFromValue(Number(value));
  }, [value, assetAmtInPool, satValueInPool]);

  const handleAmountChange = (value: string) => {
    if (!value) {
      setAmount('');
      setValue('');
      return;
    }

    if (divisibility === 0) {
      const intValue = parseInt(value);
      setAmount(intValue ? intValue.toString() : '');
    } else {
      const parts = value.split('.');
      if (parts.length === 1) {
        setAmount(parts[0]);
      } else if (parts.length === 2) {
        setAmount(`${parts[0]}.${parts[1].slice(0, divisibility)}`);
      }
    }

    // 根据输入的amount计算对应的value
    const calculatedValue = calculateValueFromAmount(Number(value));
    setValue(calculatedValue.toString());
  };





  const handleStake = () => {
    if (!amount || !value || !asset || !contractUrl) {
      toast.error("Please enter a valid amount and value");
      return;
    }
    
    stakeMutation.mutate({ amount, asset, contractUrl, value: value });
  };

  const handleMaxClick = () => {
    if (divisibility === 0) {
      setAmount(Math.floor(displayAssetBalance).toString());
    } else {
      setAmount(displayAssetBalance.toFixed(divisibility));
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6 bg-zinc-900 sm:p-2 rounded-xl shadow-lg shadow-sky-500/50 border border-zinc-700 relative">
        <div className="mb-2 mx-4 py-2 rounded-lg relative">
          <div className="flex justify-between items-center text-xs text-zinc-500 mb-1 mx-2">
            <span className="py-2 uppercase">{t('common.stake')}</span>
            <span className="flex items-center text-xs text-zinc-500">
              <button
                onClick={handleMaxClick}
                className="mr-2 px-2 py-1 rounded-md bg-zinc-800 text-xs hover:bg-purple-500 hover:text-white"
              >
                {t('common.max')}
              </button>
              <ButtonRefresh
                onRefresh={refresh}
                loading={isRefreshing}
                className="bg-zinc-800/50"
              />
            </span>
          </div>
          <div className="relative w-full">
            <input
              type="number"
              value={amount}
              onChange={e => handleAmountChange(e.target.value)}
              className="w-full input-swap bg-transparent border-none rounded-lg px-4 py-2 text-xl sm:text-3xl font-bold text-white pr-16 mb-4"
              placeholder={t('common.enterAssetAmount')} 
              min={1}
              step={divisibility === 0 ? "1" : `0.${"0".repeat(divisibility-1)}1`}
              onKeyDown={(e) => {
                if (divisibility === 0 && e.key === '.') {
                  e.preventDefault();
                }
              }}
              disabled={stakeMutation.isPending}
            />
            <p className='text-xs font-medium text-zinc-500 mb-2'>
              {/* <span className='bg-zinc-800 hover:bg-purple-500 text-zinc-500 hover:text-white p-1 px-2 mr-1 rounded-md'>L 1</span> */}
              {t('common.balance')}: {displayAssetBalance.toLocaleString()} {ticker}
            </p>
          </div>
          
          {/* Value display for calculated satoshi amount */}
          <div className="relative w-full mt-4">
            <input
              type="number"
              value={value}
              className="w-full input-swap border-none rounded-lg px-4 py-2 text-lg sm:text-2xl font-bold text-white pr-16 mb-4 bg-zinc-800/50"
              placeholder="Calculated satoshi amount" 
              readOnly
              disabled={stakeMutation.isPending}
            />
            <p className='text-xs font-medium text-zinc-500 mb-2'>
              <span className='bg-zinc-800 hover:bg-purple-500 text-zinc-500 hover:text-white p-1 px-2 mr-1 rounded-md'>BTC</span>
              {t('common.balance')}: {(satsBalance.availableAmt + satsBalance.lockedAmt).toLocaleString()} sats
            </p>
          </div>
        </div>        
      </div>
      <Button 
        type="button" 
        size="lg" 
        className="w-full my-4 text-sm font-semibold transition-all duration-200 btn-gradient" 
        onClick={handleStake}
        disabled={stakeMutation.isPending}
      >
        {stakeMutation.isPending ? t('common.staking') : t('common.stake')}
      </Button> 
    </div>
  );
};

export default Stake;
