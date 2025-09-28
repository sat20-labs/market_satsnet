import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import { useAssetBalance } from '@/application/useAssetBalanceService';
import { toast } from 'sonner';
import { sleep } from 'radash';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { ButtonRefresh } from '@/components/buttons/ButtonRefresh';
import { useCommonStore } from '@/store/common';

interface WithDrawProps {
  contractUrl: string;
  asset: string;
  ticker: string;
  assetBalance: any;
  onWithdrawSuccess: () => void;
  refresh: () => void;
  isRefreshing: boolean;
  tickerInfo?: any;
  swapData?: any;
}

interface WithdrawParams {
  amount: string;
  assetName: string;
  contractUrl: string;
}

const WithDraw: React.FC<WithDrawProps> = ({
  contractUrl,
  asset,
  ticker,
  assetBalance,
  onWithdrawSuccess,
  refresh,
  isRefreshing,
  tickerInfo,
  swapData
}) => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const { address } = useReactWalletStore();
  const divisibility = tickerInfo?.divisibility || 0;
  const { btcFeeRate } = useCommonStore((state) => state);
  const displayAssetBalance = assetBalance.availableAmt + assetBalance.lockedAmt;

  const withdrawMutation = useMutation({
    mutationFn: async ({ amount, assetName, contractUrl }: WithdrawParams) => {
      // 获取合约参数
      const paramsResult = await window.sat20.getParamForInvokeContract('amm.tc', 'withdraw');
      console.log('paramsResult', paramsResult);

      const params = {
        action: "withdraw",
        param: JSON.stringify({
          orderType: 7,
          assetName: assetName,
          amt: amount
        })
      };

      const result = await window.sat20.invokeContractV2_SatsNet(
        contractUrl,
        JSON.stringify(params),
        assetName,
        amount,
        btcFeeRate.value.toString(),
        {
          action: "withdraw",
          orderType: 7,
          quantity: amount,
          assetName: assetName,
        }
      );

      if (!result.txId) {
        throw new Error("Withdraw failed: No transaction ID received");
      }

      return result;
    },
    onSuccess: async (data) => {
      toast.success(`Withdraw successful, txid: ${data.txId}`);
      setAmount("");
      onWithdrawSuccess();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Withdraw failed");
    }
  });

  const handleAmountChange = (value: string) => {
    if (!value) {
      setAmount('');
      return;
    }

    if (divisibility === 0) {
      const intValue = parseInt(value);
      setAmount(intValue ? intValue.toString() : '');
      return;
    }

    const parts = value.split('.');
    if (parts.length === 1) {
      setAmount(parts[0]);
    } else if (parts.length === 2) {
      setAmount(`${parts[0]}.${parts[1].slice(0, divisibility)}`);
    }
  };

  const handleWithdraw = () => {
    // 检查是否为流动性开放状态
    if (swapData?.status === 101) {
      toast.error(t('common.liquidityOpen'));
      return;
    }
    
    if (!amount || !asset || !contractUrl) {
      toast.error("Please enter a valid amount");
      return;
    }

    withdrawMutation.mutate({
      amount,
      assetName: asset,
      contractUrl
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
        {/* <div className="absolute top-2 right-2 z-10">
          <ButtonRefresh
            onRefresh={refresh}
            loading={isRefreshing}
            className="bg-zinc-800/50"
          />
        </div> */}
        <div className="mb-2 mx-4 py-2 rounded-lg relative">
          <div className="flex justify-between items-center text-xs text-zinc-500 mb-1 mx-2">
            <span className="py-2 uppercase">{t('common.withdraw')}</span>
            
            <span className="flex items-center text-xs text-zinc-500">
              {/* {t('common.balance')}: {displayAssetBalance.toLocaleString()} {ticker} */}
              <button
                onClick={handleMaxClick}
                className="mr-2 px-2 py-1 rounded-md bg-zinc-800 text-xs hover:bg-purple-500 hover:text-white"
                disabled={withdrawMutation.isPending}
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
                // 当 divisibility 为 0 时，阻止输入小数点
                if (divisibility === 0 && e.key === '.') {
                  e.preventDefault();
                }
              }}
              disabled={withdrawMutation.isPending}
            />
            <p className='text-xs font-medium text-zinc-500 mb-2'><span className='bg-zinc-800 hover:bg-purple-500 text-zinc-500 hover:text-white p-1 px-2 mr-1 rounded-md'>L 2</span> {t('common.balance')}: {displayAssetBalance.toLocaleString()} {ticker}</p>
          </div>
        </div>
      </div>
      <Button
        type="button"
        size="lg"
        className="w-full my-4 text-sm font-semibold transition-all duration-200 btn-gradient"
        onClick={handleWithdraw}
        disabled={withdrawMutation.isPending}
      >
        {withdrawMutation.isPending ? t('common.withdrawing') : t('common.withdraw')}
      </Button>
    </div>
  );
};

export default WithDraw; 