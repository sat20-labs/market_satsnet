'use client';

import { Icon } from '@iconify/react';
import { useEffect, useState, useMemo } from 'react';
import { useCommonStore } from '@/store';
import { BtcFeeRate } from './BtcFeeRate';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { marketApi } from '@/api';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { clientApi } from '@/api';

export const BtcFeerateSelectButton = () => {
  const { t } = useTranslation();
  const { network } = useReactWalletStore((state) => state);
  const { chain } = useCommonStore();
  const [isOpen, setIsOpen] = useState(false);
  const [fee, setFee] = useState({ value: 1, type: 'Normal' });
  const { setBtcFeeRate, btcFeeRate } = useCommonStore((state) => state);

  const { data: feeRateData, isLoading: isFeeRateLoading } = useQuery({
    queryKey: ['btcFeeRate'],
    queryFn: () => clientApi.getRecommendedFees(),
    refetchInterval: 600000, // 增加到10分钟，减少刷新频率
    refetchIntervalInBackground: false, // 禁止后台刷新
  });

  const handleOk = () => {
    setBtcFeeRate({ value: fee.value, type: fee.type });
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const feeChange = (fee: any) => {
    console.log('fee', fee);
    setFee(fee);
  };

  useEffect(() => {
    if (feeRateData?.halfHourFee && !btcFeeRate.value) {
      setFee({ value: feeRateData.halfHourFee, type: 'Normal' });
      setBtcFeeRate({ value: feeRateData.halfHourFee, type: 'Normal' });
    }
  }, [feeRateData, setBtcFeeRate, btcFeeRate.value]);

  useEffect(() => {
    if (isOpen) {
      setFee({ value: btcFeeRate.value, type: btcFeeRate.type ?? 'Normal' });
    }
  }, [isOpen, btcFeeRate]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild disabled>
        <Button
          variant="ghost"
          disabled={isFeeRateLoading}
          className="bg-transparent sm:px-2 px-8 sm:gap-2 gap-3 text-xs sm:text-sm text-zinc-400 border border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100"
        >
          {isFeeRateLoading ? (
            <Icon icon="eos-icons:loading" className="text-xl0" />
          ) : (
            <Icon icon="mdi:gas-station" className="text-xl0" />
          )}
          {btcFeeRate.value}
          <span className="hidden sm:inline dark:text-gray-400 text-slate-600">sats/vB</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('common.gas_fee')}</DialogTitle>
        </DialogHeader>
        <BtcFeeRate
          onChange={feeChange}
          value={fee.value}
          feeType={fee.type}
          feeRateData={feeRateData}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={handleCancel}>
            {t('common.close')}
          </Button>
          <Button onClick={handleOk}>
            {t('common.ok')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
