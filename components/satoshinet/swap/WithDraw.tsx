import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import { useAssetBalance } from '@/application/useAssetBalanceService';
import { toast } from 'sonner';
import { sleep } from 'radash';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

interface WithDrawProps {
  contractUrl: string;
  asset: string;
  ticker: string;
  assetBalance: any;
  onWithdrawSuccess: () => void;
}

interface WithdrawParams {
  amount: string;
  assetName: string;
  contractUrl: string;
}

const WithDraw: React.FC<WithDrawProps> = ({ contractUrl, asset, ticker, assetBalance, onWithdrawSuccess }) => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const { address } = useReactWalletStore();

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
        '1',
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

  const formatName = (name: string) => {
    return name.split('f:')[1] || name;
  };

  const handleWithdraw = () => {
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
    setAmount(displayAssetBalance.toString());
  };

  return (
    <div className="w-full">
      <div className="mb-6 bg-zinc-900 sm:p-2 rounded-xl shadow-lg shadow-sky-500/50 border border-zinc-700 ">
        <div className="mb-2 mx-4 py-2 rounded-lg relative">
          <div className="flex justify-between items-center text-xs text-zinc-500 mb-1 mx-2">
            <span className="py-2 uppercase">{t('common.withdraw')}</span>
            <span className="text-xs text-zinc-500">
              {t('common.balance')}: {displayAssetBalance.toLocaleString()} {ticker}
              <button
                onClick={handleMaxClick}
                className="ml-2 px-2 py-1 rounded-md bg-zinc-800 text-xs hover:bg-purple-500 hover:text-white"
                disabled={withdrawMutation.isPending}
              >
                {t('common.max')}
              </button>
            </span>
          </div>
          <div className="relative w-full">
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full input-swap bg-transparent border-none rounded-lg px-4 py-2 text-xl sm:text-3xl font-bold text-white pr-16"
              placeholder={t('common.enterAssetAmount')}
              min={1}
              disabled={withdrawMutation.isPending}
            />
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