import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import { useAssetBalance } from '@/application/useAssetBalanceService';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { ButtonRefresh } from '@/components/buttons/ButtonRefresh';
import { useCommonStore } from '@/store/common';
import { generateMempoolUrl } from '@/utils/url';
import { Chain, LptAmount } from '@/types';
import { hideStr } from '@/utils';

interface RemoveLiquidityProps {
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
  onRemoveLiquiditySuccess: () => void;
  refresh: () => void;
  isRefreshing: boolean;
  tickerInfo?: any;
  swapData?: any;
  lptAmt?: LptAmount | null;
  operationHistory?: string[] | null;
}

interface RemoveLiquidityParams {
  assetName: string;
  contractUrl: string;
}

const RemoveLiquidity: React.FC<RemoveLiquidityProps> = ({
  contractUrl,
  asset,
  ticker,
  assetBalance,
  satsBalance,
  onRemoveLiquiditySuccess,
  refresh,
  isRefreshing,
  tickerInfo,
  swapData,
  lptAmt,
  operationHistory
}) => {
  const { t } = useTranslation();
  const { address } = useReactWalletStore();
  const divisibility = tickerInfo?.divisibility || 0;
  const { btcFeeRate, network } = useCommonStore((state) => state);
  const [removeAmount, setRemoveAmount] = useState('');
  
  // 使用 lptAmt 作为可用的流动性代币余额
  const displayLptBalance = useMemo(() => {
    if (!lptAmt?.Value) return 0;
    const precision = lptAmt.Precision || 0;
    return lptAmt.Value / Math.pow(10, precision);
  }, [lptAmt]);
  
  // 检查用户是否有 LPT（是否加入了池子）
  const hasLpt = displayLptBalance > 0;

  // 处理输入变化
  const handleAmountChange = (value: string) => {
    if (!value) {
      setRemoveAmount('');
      return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) {
      return;
    }

    // 限制最大值为用户持有的 LPT 数量
    if (numValue > displayLptBalance) {
      setRemoveAmount(displayLptBalance.toString());
      return;
    }

    // 限制最小值为 1
    if (numValue < 1) {
      setRemoveAmount('1');
      return;
    }

    setRemoveAmount(value);
  };

  // 处理最大按钮点击
  const handleMaxClick = () => {
    setRemoveAmount(displayLptBalance.toString());
  };

  const removeLiquidityMutation = useMutation({
    mutationFn: async ({ assetName, contractUrl }: Omit<RemoveLiquidityParams, 'lptAmt'>) => {
      // 使用用户输入的 LPT 数量
      const userLptAmt = removeAmount || displayLptBalance.toString();
      
      const params = {
        action: "removeliq",
        param: JSON.stringify({
          orderType: 10,
          assetName: assetName,
          lptAmt: userLptAmt
        })
      };

      window.sat20.invokeContractV2_SatsNet(
        contractUrl,
        JSON.stringify(params),
        assetName,
        '0',
        btcFeeRate.value.toString(),
        {
          action: "removeliq",
          orderType: 10,
          quantity: '0',
          assetName: assetName,
          lptAmt: userLptAmt,
        }
      );

      return { success: true };
    },
    onSuccess: async (data) => {
      toast.success(`Remove Liquidity successful`);
      setRemoveAmount('');
      onRemoveLiquiditySuccess();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Remove Liquidity failed");
    }
  });






  const handleRemoveLiquidity = () => {
    if (!hasLpt || !asset || !contractUrl) {
      toast.error("No liquidity to remove");
      return;
    }

    const amountToRemove = parseFloat(removeAmount);
    if (!removeAmount || isNaN(amountToRemove) || amountToRemove < 1) {
      toast.error("Please enter a valid amount (minimum 1)");
      return;
    }

    if (amountToRemove > displayLptBalance) {
      toast.error("Amount exceeds your LPT balance");
      return;
    }

    removeLiquidityMutation.mutate({
      assetName: asset,
      contractUrl
    });
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
          
          {!hasLpt ? (
            <div className="w-full p-4 text-center text-zinc-400">
              <p>You haven&apos;t added liquidity to this pool yet.</p>
              <p className="text-sm mt-2">Add liquidity first to be able to remove it.</p>
            </div>
          ) : (
            <>
              <div className="relative w-full">
                <input
                  type="number"
                  value={removeAmount}
                  onChange={e => handleAmountChange(e.target.value)}
                  className="w-full input-swap bg-transparent border-none rounded-lg px-4 py-2 text-xl sm:text-3xl font-bold text-white pr-16 mb-4"
                  placeholder="0"
                  min={1}
                  max={displayLptBalance}
                  step="1"
                  disabled={removeLiquidityMutation.isPending}
                />
                <span className="absolute top-1/3 right-4 sm:mr-10 transform -translate-y-1/2 text-zinc-600 text-sm">
                  LPT
                </span>
                <p className='text-xs font-medium text-zinc-500 mb-2'>
                  {t('common.balance')}: {displayLptBalance.toLocaleString()} LPT
                </p>
              </div>

            </>
          )}

        </div>
      </div>
      <Button
        type="button"
        size="lg"
        className="w-full my-4 text-sm font-semibold transition-all duration-200 btn-gradient"
        onClick={handleRemoveLiquidity}
        disabled={!hasLpt || removeLiquidityMutation.isPending || !removeAmount || parseFloat(removeAmount) < 1}
      >
        {removeLiquidityMutation.isPending ? t('common.unstaking') : t('common.unstake')}
      </Button>

      {/* Operation History */}
      {operationHistory && operationHistory.length > 0 && (
        <div className="mt-4 p-4 bg-zinc-800/50 rounded-lg">
          <h4 className="text-sm font-medium text-zinc-300 mb-2">Remove Liquidity History</h4>
          <div className="space-y-2">
            {operationHistory.map((txId, index) => (
              <div key={index} className="flex items-center text-xs">
                <a
                  href={generateMempoolUrl({ 
                    network: network, 
                    path: `tx/${txId}`, 
                    chain: Chain.SATNET, 
                    env: 'dev' 
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline font-mono"
                >
                  {hideStr(txId, 8)}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RemoveLiquidity;
