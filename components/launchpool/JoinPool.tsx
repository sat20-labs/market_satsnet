'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { Icon } from "@iconify/react";
import { useTranslation } from 'react-i18next';
import { contractService } from '@/domain/services/contract';
import { useCommonStore } from '@/store/common';
interface JoinPoolProps {
  closeModal: () => void;
  poolData: any;
}

const JoinPool = ({ closeModal, poolData }: JoinPoolProps) => {
  const { t } = useTranslation(); // Specify the namespace
  const { btcFeeRate } = useCommonStore((state) => state);
  const limit = Number(poolData?.limit) || 1;
  const [amount, setAmount] = useState('');
  const [satsCost, setSatsCost] = useState(0);
  const { address } = useReactWalletStore();
  const [minted, setMinted] = useState(0);
  const [maxJoin, setMaxJoin] = useState(limit);
  const [loading, setLoading] = useState(false);

  const infoList = [
    { label: t('pages.joinPool.asset_name'), value: poolData?.assetName.Ticker },
    { label: t('pages.joinPool.asset_protocol'), value: poolData?.assetName.Protocol },
    { label: t('pages.joinPool.binding_sat'), value: poolData?.bindingSat },
    { label: t('pages.joinPool.contract_type'), value: poolData?.contractType },
    { label: t('pages.joinPool.contract_url'), value: poolData?.contractURL },
    { label: t('pages.joinPool.enable_block'), value: poolData?.enableBlock },
    { label: t('pages.joinPool.start_block'), value: poolData?.startBlock },
    { label: t('pages.joinPool.launch_ration'), value: poolData?.launchRation },
    { label: t('pages.joinPool.max_supply'), value: poolData?.maxSupply },
    { label: t('pages.joinPool.limit'), value: poolData?.limit },
  ];

  useEffect(() => {
    const fetchMinted = async () => {
      if (!address || !poolData?.contractURL) return;
      setLoading(true);
      try {
        const data = await contractService.getContractStatusByAddress(poolData.contractURL, address);
        const mintedAmt = Number(data?.valid?.MintHistory?.[0]?.Amt || 0);
        setMinted(mintedAmt);
        setMaxJoin(Math.max(limit - mintedAmt, 0));
        setAmount(prev => {
          const n = Number(prev);
          if (n > limit - mintedAmt) return String(Math.max(limit - mintedAmt, 0));
          return prev;
        });
      } catch (e) {
        setMinted(0);
        setMaxJoin(limit);
      } finally {
        setLoading(false);
      }
    };
    fetchMinted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, poolData?.contractURL, limit]);

  useEffect(() => {
    const bindingSat = Number(poolData?.bindingSat);
    if (bindingSat > 0) {
      const numAmount = Number(amount);
      if (numAmount > 0) {
        const cost = Math.floor((numAmount + bindingSat - 1) / bindingSat);
        setSatsCost(cost);
      } else {
        setSatsCost(0);
      }
    }
  }, [amount, poolData?.bindingSat]);

  const handleConfirm = async () => {
    if (Number(amount) > maxJoin) {
      toast.error(t('pages.joinPool.amount_error', { maxJoin }));
      return;
    }
    const params = {
      action: 'mint',
      param: amount.toString()
    };
    const result = await window.sat20.invokeContract_SatsNet(
      poolData.contractURL, JSON.stringify(params), btcFeeRate.value.toString());
    if (result.txId) {
      toast.success(t('pages.joinPool.success', { amount, txId: result.txId }));
      closeModal();
    } else {
      toast.error(t('pages.joinPool.failure'));
    }
  };

  return (
    <div className="p-6 w-full sm:w-[1280px] max-w-10/12  mx-auto bg-zinc-900 rounded-lg shadow-lg relative">
      <div className="relative flex justify-between items-center mb-4 gap-4 border-b border-zinc-700 pb-4">
        <h2 className="flex justify-start items-center text-2xl font-bold">
          <Icon icon="lucide:plus" className="w-8 h-8 mr-2 text-zinc-400" />
          {t('pages.joinPool.title')}
        </h2>
        <button
          className="absolute top-0 right-0 text-zinc-400 hover:text-white"
          onClick={closeModal}
        >
          ✕
        </button>
      </div>

      {/* Add max-height and overflow-y-auto for scrollable content */}
      <div className="max-h-[60vh] overflow-y-auto pr-2">
        <div className="mb-4 grid grid-cols-1 gap-y-2 text-sm text-zinc-300">
          {infoList.map(({ label, value }) => (
            <div key={label} className="border-b py-2 border-zinc-700/50">
              <span className="font-semibold text-zinc-400 whitespace-nowrap">{label}:</span>
              <span className="truncate pl-2 text-zinc-100 whitespace-break-spaces" title={value}>{value ?? '-'}</span>
            </div>
          ))}
        </div>

        <div className="mb-6">
          <label className="block mb-2 text-zinc-300 font-semibold" htmlFor="amount">{t('pages.joinPool.amount_label')}</label>
          <div className="text-zinc-400 text-sm mb-1">
            {t('pages.joinPool.max_join')}: <span className="text-zinc-100 font-bold">{loading ? t('pages.joinPool.loading') : maxJoin}</span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              id="amount"
              type="number"
              placeholder={t('pages.joinPool.amount_placeholder')}
              value={amount}
              min={1}
              max={maxJoin}
              onChange={e => setAmount(e.target.value)}
              className="mb-2 w-full"
              disabled={loading || maxJoin === 0}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-10 mb-2 whitespace-nowrap bg-zinc-800 hover:bg-zinc-700"
              onClick={() => setAmount(String(maxJoin))}
              disabled={loading || maxJoin === 0}
            >
              Max
            </Button>
          </div>
          <div className="text-zinc-400 text-sm">{t('pages.joinPool.current_amount')}: <span className="text-zinc-100 font-bold">{amount || 0}</span></div>
          <div className="text-zinc-400 text-sm">{t('pages.joinPool.sats_cost')}: <span className="text-zinc-100 font-bold">{satsCost}</span></div>
        </div>

        <div className="flex justify-start mb-2 gap-4">
          <Button variant="outline" className="w-40 sm:w-48 h-11 text-zinc-300 text-base btn-gradient" onClick={handleConfirm}>
            {t('pages.joinPool.confirm')}
          </Button>
          <Button variant="outline" className="w-40 sm:w-48 h-11 text-zinc-300 text-base" onClick={closeModal}>
            {t('pages.joinPool.cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default JoinPool;
