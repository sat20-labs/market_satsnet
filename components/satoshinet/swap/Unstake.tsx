import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import { useAssetBalance } from '@/application/useAssetBalanceService';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { ButtonRefresh } from '@/components/buttons/ButtonRefresh';
import { useCommonStore } from '@/store/common';
import { Checkbox } from '@/components/ui/checkbox';

interface UnstakeProps {
  contractUrl: string;
  asset: string;
  ticker: string;
  assetBalance: {
    availableAmt: number;
    lockedAmt: number;
  };
  satsBalance: {
    availableAmt: number;
    lockedAmt: number;
  };
  onUnstakeSuccess: () => void;
  refresh: () => void;
  isRefreshing: boolean;
  tickerInfo?: any;
  swapData?: any;
}

interface UnstakeParams {
  amount: string;
  assetName: string;
  contractUrl: string;
  value: string;
  toL1: boolean;
}

const Unstake: React.FC<UnstakeProps> = ({
  contractUrl,
  asset,
  ticker,
  assetBalance,
  satsBalance,
  onUnstakeSuccess,
  refresh,
  isRefreshing,
  tickerInfo,
  swapData
}) => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [value, setValue] = useState('');
  const [toL1, setToL1] = useState(false);
  const { address } = useReactWalletStore();
  const divisibility = tickerInfo?.divisibility || 0;
  const { btcFeeRate } = useCommonStore((state) => state);
  const displayAssetBalance = assetBalance.availableAmt + assetBalance.lockedAmt;

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

  const unstakeMutation = useMutation({
    mutationFn: async ({ amount, assetName, contractUrl, value, toL1 }: UnstakeParams) => {
      const params = {
        action: "unstake",
        param: JSON.stringify({
          orderType: 10,
          assetName: assetName,
          amt: amount,
          value: parseInt(value),
          toL1: toL1
        })
      };

      window.sat20.invokeContractV2_SatsNet(
        contractUrl,
        JSON.stringify(params),
        assetName,
        amount,
        btcFeeRate.value.toString(),
        {
          action: "unstake",
          orderType: 10,
          quantity: amount,
          assetName: assetName,
          value: parseInt(value),
          toL1: toL1,
        }
      );

      return {success: true};
    },
    onSuccess: async (data) => {
      toast.success(`Unstake successful`);
      setAmount("");
      setToL1(false);
      onUnstakeSuccess();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Unstake failed");
    }
  });

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





  const handleUnstake = () => {
    if (!amount || !value || !asset || !contractUrl) {
      toast.error("Please enter a valid amount and value");
      return;
    }

    unstakeMutation.mutate({
      amount,
      assetName: asset,
      contractUrl,
      value: value,
      toL1
    });
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
            <span className="py-2 uppercase">{t('common.unstake')}</span>
            
            <span className="flex items-center text-xs text-zinc-500">
              <button
                onClick={handleMaxClick}
                className="mr-2 px-2 py-1 rounded-md bg-zinc-800 text-xs hover:bg-purple-500 hover:text-white"
                disabled={unstakeMutation.isPending}
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
              disabled={unstakeMutation.isPending}
            />
            <p className='text-xs font-medium text-zinc-500 mb-2'>
              {/* <span className='bg-zinc-800 hover:bg-purple-500 text-zinc-500 hover:text-white p-1 px-2 mr-1 rounded-md'>L 2</span>  */}
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
              disabled={unstakeMutation.isPending}
            />

          </div>

          {/* ToL1 checkbox */}
          <div className="flex items-center space-x-2 mt-4">
            <Checkbox
              id="toL1"
              checked={toL1}
              onCheckedChange={(checked) => setToL1(checked as boolean)}
              disabled={unstakeMutation.isPending}
            />
            <label
              htmlFor="toL1"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-zinc-300"
            >
              Withdraw to L1
            </label>
          </div>
        </div>
      </div>
      <Button
        type="button"
        size="lg"
        className="w-full my-4 text-sm font-semibold transition-all duration-200 btn-gradient"
        onClick={handleUnstake}
        disabled={unstakeMutation.isPending}
      >
        {unstakeMutation.isPending ? t('common.unstaking') : t('common.unstake')}
      </Button>
    </div>
  );
};

export default Unstake;
