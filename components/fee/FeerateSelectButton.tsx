'use client';

import { Icon } from '@iconify/react';
import { useEffect, useState, useMemo } from 'react';
import { useCommonStore } from '@/store';
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

export const FeerateSelectButton = () => {
  const { t } = useTranslation();
  const { network } = useReactWalletStore((state) => state);
  const { chain } = useCommonStore();
  const [isOpen, setIsOpen] = useState(false);
  const [fee, setFee] = useState({ value: 1, type: 'Normal' });
  const { setFeeRate, feeRate } = useCommonStore((state) => state);

  const { data: feeRateData, isLoading } = useQuery({
    queryKey: ['getRecommendedFees', chain, network],
    queryFn: marketApi.getRecommendedFees,
    refetchInterval: 1000 * 60 * 10,
    select: (data) => {
      if (data?.code === 200) {
        return data.data;
      }
      return {};
    },
  });

  const handleOk = () => {
    setFeeRate({ value: fee.value, type: fee.type });
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
    if (feeRateData?.halfHourFee && !feeRate.value) {
      setFee({ value: feeRateData.halfHourFee, type: 'Normal' });
      setFeeRate({ value: feeRateData.halfHourFee, type: 'Normal' });
    }
  }, [feeRateData, setFeeRate, feeRate.value]);

  useEffect(() => {
    if (isOpen) {
      setFee({ value: feeRate.value, type: feeRate.type ?? 'Normal' });
    }
  }, [isOpen, feeRate]);

  return (
    <Button
      variant="ghost"
      disabled={isLoading}
      className="bg-transparent sm:px-2 px-8 sm:gap-2 gap-3 text-xs sm:text-base text-zinc-300 border border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100"
    >
      {isLoading ? (
        <Icon icon="eos-icons:loading" className="text-xl0" />
      ) : (
        <Icon icon="mdi:gas-station" className="text-xl0" />
      )}
      <span className='mr-4 sm:mr-1'>10 sats/tx</span>
    </Button>
  );
};
