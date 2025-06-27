import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useQueryKey } from '@/lib/hooks/useQueryKey';
import { ButtonRefresh } from '@/components/buttons/ButtonRefresh';

interface DepositProps {
  asset: string;
  ticker: string;
  contractUrl: string;
  refresh: () => void;
  isRefreshing: boolean;
  tickerInfo?: any;
}

interface DepositParams {
  amount: string;
  asset: string;
  contractUrl: string;
}

const Deposit: React.FC<DepositProps> = ({ contractUrl, asset, ticker, refresh, isRefreshing, tickerInfo }) => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const { address } = useReactWalletStore();
  const queryClient = useQueryClient();
  const divisibility = tickerInfo?.divisibility || 0;
  
  const queryKey = useQueryKey(['assetBalance', address, asset]);

  const { data: assetBalance } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!address || !asset) return { availableAmt: 0, lockedAmt: 0 };
      const res = await window.sat20.getAssetAmount(address, asset);
      return { 
        availableAmt: Number(res.availableAmt), 
        lockedAmt: Number(res.lockedAmt) 
      };
    },
    enabled: !!address && !!asset,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const depositMutation = useMutation({
    mutationFn: async ({ amount, asset, contractUrl }: DepositParams) => {
      const params = {
        action: "deposit",
        param: JSON.stringify({
          orderType: 6,
          assetName: asset,
          amt: amount
        })
      };
      const btcFeeRate = 1;
      
      const result = await window.sat20.invokeContractV2(
        contractUrl,
        JSON.stringify(params),
        asset,
        amount,
        btcFeeRate.toString(),
        {
          action: "deposit",
          orderType: 6,
          assetName: asset,
          amt: amount,
          quantity: amount,
        }
      );

      if (!result.txId) {
        throw new Error("Deposit failed: No transaction ID received");
      }

      return result;
    },
    onSuccess: async (data) => {
      toast.success(`Deposit successful, txid: ${data.txId}`);
      setAmount("");
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Deposit failed");
    }
  });

  const displayAssetBalance = assetBalance?.availableAmt ?? 0;

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

  const handleDeposit = () => {
    if (!amount || !asset || !contractUrl) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    depositMutation.mutate({ amount, asset, contractUrl });
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
            <span className="py-2 uppercase">{t('common.deposit')}</span>
            <span className="flex items-center text-xs text-zinc-500">
              {/* {t('common.balance')}: {displayAssetBalance.toLocaleString()} {ticker} */}
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
              disabled={depositMutation.isPending}
            />
            <p className='text-xs font-medium text-zinc-500 mb-2'><span className='bg-zinc-800 hover:bg-purple-500 text-zinc-500 hover:text-white p-1 px-2 mr-1 rounded-md'>L 1</span>{t('common.balance')}: {displayAssetBalance.toLocaleString()} {ticker}</p>
          </div>
        </div>        
      </div>
      <Button 
        type="button" 
        size="lg" 
        className="w-full my-4 text-sm font-semibold transition-all duration-200 btn-gradient" 
        onClick={handleDeposit}
        disabled={depositMutation.isPending}
      >
        {depositMutation.isPending ? t('common.depositing') : t('common.deposit')}
      </Button> 
    </div>
  );
};

export default Deposit; 