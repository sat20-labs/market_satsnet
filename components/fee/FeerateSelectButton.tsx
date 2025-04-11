'use client';

import {
  Button,
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalBody,
  useDisclosure,
} from '@nextui-org/react';
import { Icon } from '@iconify/react';
import { useEffect, useState, useMemo } from 'react';
import { useCommonStore } from '@/store';
import { BtcFeeRate } from './BtcFeeRate';
import useSWR from 'swr';
import { useTranslation } from 'react-i18next';
import { getRecommendedFees } from '@/api';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';

export const FeerateSelectButton = () => {
  const { t } = useTranslation();
  const { network } = useReactWalletStore((state) => state);
  const { chain } = useCommonStore();
  const { isOpen, onClose, onOpenChange, onOpen } = useDisclosure();
  const [fee, setFee] = useState({ value: 1, type: 'Normal' });

  const { data, isLoading } = useSWR(
    `getRecommendedFees-${chain}-${network}`,
    () => getRecommendedFees(),
    {
      refreshInterval: 1000 * 60 * 10, // 10 minutes
    },
  );
  const feeRateData = useMemo(() => {
    if (data?.code === 200) {
      return data.data;
    } 
      return {};
  }, [data]);
  const { setFeeRate, feeRate } = useCommonStore((state) => state);
  const handleOk = () => {
    setFeeRate({ value: fee.value, type: fee.type });
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };
  const feeChange = (fee: any) => {
    console.log('fee', fee);
    setFee(fee);
  };
  useEffect(() => {
    if (feeRateData?.halfHourFee) {
      let feeRate = feeRateData?.halfHourFee;
      if (feeRate) {
        feeRate = feeRateData?.halfHourFee;
        setFeeRate({ value: feeRate || 1, type: 'Normal' });
      }
    }
  }, [feeRateData]);

  return (
    <div>
      <Button
        variant="ghost"
        isLoading={isLoading}
        className="bg-transparent sm:px-2 px-[6px] sm:gap-2 gap-[1px] text-xs sm:text-base text-zinc-300 border border-zinc-700"
        onClick={() => onOpen()}
      >
        <Icon icon="mdi:gas-station" className="text-xl0" />
        {feeRate.value}{' sat'}
        <span  className="hidden sm:inline dark:text-gray-400 text-slate-600">/vB</span>
      </Button>
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          <ModalHeader className="flex flex-col gap-2">
            {t('common.gas_fee')}
          </ModalHeader>
          <ModalBody>
            <BtcFeeRate
              onChange={feeChange}
              value={feeRate.value}
              feeType={feeRate.type}
              feeRateData={feeRateData}
            />
          </ModalBody>
          <ModalFooter>
            <Button color="danger" variant="light" onPress={handleCancel}>
              {t('common.close')}
            </Button>
            <Button color="primary" onPress={handleOk}>
              {t('common.ok')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};
